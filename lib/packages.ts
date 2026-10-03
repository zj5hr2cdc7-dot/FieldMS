/**
 * Job packages — reusable bundles of labour and materials.
 *
 * The problem: the same small job gets priced over and over. Swap a
 * powerpoint, add a downlight, replace an RCD. Each time somebody re-enters
 * the same run of cable, the same hour or two, the same part. A package
 * records that shape once; applying it to a job writes the billing lines.
 *
 * WHERE THE MONEY IS CALCULATED
 *   Not here. Reads and writes of the packages themselves are plain Supabase
 *   calls from the browser, protected by the RLS in migration 028. But
 *   *applying* a package goes through /api/packages/apply, because that is
 *   where prices get decided, and a price decided in the browser is a price
 *   the customer can edit with the dev tools. The server resolves every
 *   material price itself and ignores anything the client suggests.
 *
 * WHO CAN DO WHAT
 *   Read: any member of the tenant.
 *   Create, edit, delete, apply: owner and manager only.
 *   Enforced in the database (is_office) and again in the API route, not in
 *   the React that calls this.
 */

import { createClient } from '@/utils/supabase/client'
import type { JobPackage, JobPackageItem, JobPackageWithItems, PackageItemKind } from '@/types/database'

// ── Reads ──────────────────────────────────────────────────────────────────

/** Packages for a tenant, newest first. Pass includeRetired for the full list. */
export async function listPackages(
  tenantId: string,
  { includeRetired = false }: { includeRetired?: boolean } = {}
): Promise<JobPackage[]> {
  const supabase = createClient()
  let query = supabase
    .from('job_packages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (!includeRetired) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** One package with its lines, in display order. */
export async function getPackage(packageId: string): Promise<JobPackageWithItems | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_packages')
    .select('*, items:job_package_items(*)')
    .eq('id', packageId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const pkg = data as JobPackageWithItems
  pkg.items = [...(pkg.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return pkg
}

/** Every package with its lines — for the management screen. */
export async function listPackagesWithItems(
  tenantId: string,
  { includeRetired = false }: { includeRetired?: boolean } = {}
): Promise<JobPackageWithItems[]> {
  const supabase = createClient()
  let query = supabase
    .from('job_packages')
    .select('*, items:job_package_items(*)')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (!includeRetired) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => {
    const pkg = row as JobPackageWithItems
    pkg.items = [...(pkg.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    return pkg
  })
}

// ── Writes ─────────────────────────────────────────────────────────────────

export interface PackageLineInput {
  kind: PackageItemKind
  description: string
  /** Labour. */
  hours?: number | null
  ratePerHour?: number | null
  /** Material. */
  masterProductId?: string | null
  quantity?: number | null
  unitCostOverride?: number | null
}

export interface SavePackageInput {
  tenantId: string
  userId: string
  name: string
  description?: string | null
  lines: PackageLineInput[]
}

/**
 * Validates a line before it reaches the database.
 *
 * The CHECK constraints in migration 028 are the real guard — this exists so
 * the user gets a sentence rather than a Postgres constraint name. Keep the
 * two in step: if you relax something here, relax it there too, and if they
 * disagree the database wins.
 */
export function validateLine(line: PackageLineInput): string | null {
  if (!line.description?.trim()) return 'Every line needs a description.'

  if (line.kind === 'labour') {
    if (!line.hours || line.hours <= 0) return 'Labour lines need hours greater than zero.'
    if (line.masterProductId) return 'A labour line cannot carry a material.'
    return null
  }

  if (!line.quantity || line.quantity <= 0) return 'Material lines need a quantity greater than zero.'
  // Without one of these the line would silently price at zero when applied.
  if (!line.masterProductId && (line.unitCostOverride === null || line.unitCostOverride === undefined)) {
    return 'A material line needs either a catalogue product or a fixed unit cost.'
  }
  return null
}

function toRow(line: PackageLineInput, packageId: string, tenantId: string, sortOrder: number) {
  const isLabour = line.kind === 'labour'
  return {
    package_id: packageId,
    tenant_id: tenantId,
    kind: line.kind,
    description: line.description.trim(),
    hours: isLabour ? line.hours ?? null : null,
    rate_per_hour: isLabour ? line.ratePerHour ?? null : null,
    master_product_id: isLabour ? null : line.masterProductId ?? null,
    quantity: isLabour ? null : line.quantity ?? null,
    unit_cost_override: isLabour ? null : line.unitCostOverride ?? null,
    sort_order: sortOrder,
  }
}

/** Creates a package and its lines. */
export async function createPackage(input: SavePackageInput): Promise<JobPackage> {
  for (const line of input.lines) {
    const problem = validateLine(line)
    if (problem) throw new Error(problem)
  }

  const supabase = createClient()
  const { data: pkg, error } = await supabase
    .from('job_packages')
    .insert({
      tenant_id: input.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_by: input.userId,
    })
    .select('*')
    .single()
  if (error) throw error

  if (input.lines.length) {
    const rows = input.lines.map((line, i) => toRow(line, pkg.id, input.tenantId, i))
    const { error: itemsError } = await supabase.from('job_package_items').insert(rows)
    if (itemsError) {
      // No transaction across two statements from the browser, so clean up
      // rather than leaving a package with no lines in it.
      await supabase.from('job_packages').delete().eq('id', pkg.id)
      throw itemsError
    }
  }

  return pkg as JobPackage
}

/** Replaces a package's name, description and lines. */
export async function updatePackage(
  packageId: string,
  input: SavePackageInput
): Promise<void> {
  for (const line of input.lines) {
    const problem = validateLine(line)
    if (problem) throw new Error(problem)
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('job_packages')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
  if (error) throw error

  const { error: delError } = await supabase
    .from('job_package_items')
    .delete()
    .eq('package_id', packageId)
  if (delError) throw delError

  if (input.lines.length) {
    const rows = input.lines.map((line, i) => toRow(line, packageId, input.tenantId, i))
    const { error: insError } = await supabase.from('job_package_items').insert(rows)
    if (insError) throw insError
  }
}

/**
 * Retires a package rather than deleting it, so jobs already billed from it
 * keep a meaningful reference. Pass active: true to bring one back.
 */
export async function setPackageActive(packageId: string, active: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_packages')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', packageId)
  if (error) throw error
}

/** Permanent. The lines cascade; billing lines keep their rows and null the link. */
export async function deletePackage(packageId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_packages').delete().eq('id', packageId)
  if (error) throw error
}

// ── Applying ───────────────────────────────────────────────────────────────

export interface ResolvedPackageLine {
  kind: PackageItemKind
  description: string
  hours: number | null
  ratePerHour: number | null
  quantity: number | null
  unitCost: number | null
  /** Where the price came from — 'Fixed price' or the live source label. */
  priceSource: string | null
  cost: number
  revenue: number
}

export interface PackagePreview {
  packageId: string
  packageName: string
  lines: ResolvedPackageLine[]
  totalCost: number
  totalRevenue: number
  /** Lines the server could not price. Shown rather than silently zeroed. */
  warnings: string[]
}

/**
 * Prices a package without writing anything, so the user sees exactly what
 * will be added and at what rates before committing.
 */
export async function previewPackage(args: {
  tenantId: string
  packageId: string
  markupPercent: number
  defaultRatePerHour: number
}): Promise<PackagePreview> {
  const response = await fetch('/api/packages/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...args, dryRun: true }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? 'Could not price this package')
  return body.preview as PackagePreview
}

/**
 * Applies a package to a job, appending the resolved lines to that job's
 * billing. Returns the preview that was actually written.
 *
 * Appends rather than replaces: saveBillingItems() in lib/billing.ts deletes
 * the job's existing lines before inserting, which is right for "save this
 * form" and very wrong for "add a package to what is already here".
 */
export async function applyPackageToJob(args: {
  tenantId: string
  jobId: string
  packageId: string
  markupPercent: number
  defaultRatePerHour: number
}): Promise<PackagePreview> {
  const response = await fetch('/api/packages/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...args, dryRun: false }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? 'Could not apply this package')
  return body.preview as PackagePreview
}

/** Removes every billing line a given package added to a job. */
export async function removePackageFromJob(jobId: string, packageId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_billing_items')
    .delete()
    .eq('job_id', jobId)
    .eq('source_package_id', packageId)
  if (error) throw error
}

/** Shared summary helper so the UI and the server agree on the arithmetic. */
export function summarise(items: JobPackageItem[]): { labourHours: number; materialLines: number } {
  return {
    labourHours: items.filter((i) => i.kind === 'labour').reduce((n, i) => n + Number(i.hours ?? 0), 0),
    materialLines: items.filter((i) => i.kind === 'material').length,
  }
}
