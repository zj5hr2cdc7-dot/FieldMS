import type { JobTestSheet, TestSheetCircuit } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

export function emptyCircuit(): TestSheetCircuit {
  return {
    circuit_ref: '',
    description: '',
    cable_size: '',
    protection_type: '',
    protection_rating: '',
    earth_continuity_ohms: '',
    insulation_resistance_mohms: '',
    polarity_pass: null,
    rcd_trip_ms: '',
    rcd_trip_ma: '',
    visual_pass: null,
    notes: '',
  }
}

// AS/NZS 3000 acceptance guidance used for inline validation hints
export const TEST_LIMITS = {
  // AS/NZS 3000 Table 8.1 — insulation resistance minimum 1 MΩ
  minInsulationResistanceMohms: 1,
  // RCD max trip time (ms) for Type I 30mA protective devices (AS/NZS 3000 §8.3.10)
  maxRcdTripMs: 300,
  // Earth continuity — practical acceptance threshold (Ω)
  maxEarthContinuityOhms: 0.5,
}

export type CircuitCheck = { field: string; ok: boolean; message: string }

export function checkCircuit(c: TestSheetCircuit): CircuitCheck[] {
  const checks: CircuitCheck[] = []
  const ir = parseFloat(c.insulation_resistance_mohms)
  if (!Number.isNaN(ir)) {
    checks.push({
      field: 'insulation_resistance_mohms',
      ok: ir >= TEST_LIMITS.minInsulationResistanceMohms,
      message: `Insulation resistance must be ≥ ${TEST_LIMITS.minInsulationResistanceMohms} MΩ (AS/NZS 3000 Table 8.1)`,
    })
  }
  const trip = parseFloat(c.rcd_trip_ms)
  if (!Number.isNaN(trip)) {
    checks.push({
      field: 'rcd_trip_ms',
      ok: trip <= TEST_LIMITS.maxRcdTripMs,
      message: `RCD trip time must be ≤ ${TEST_LIMITS.maxRcdTripMs} ms (AS/NZS 3000 §8.3.10)`,
    })
  }
  const earth = parseFloat(c.earth_continuity_ohms)
  if (!Number.isNaN(earth)) {
    checks.push({
      field: 'earth_continuity_ohms',
      ok: earth <= TEST_LIMITS.maxEarthContinuityOhms,
      message: `Earth continuity should be ≤ ${TEST_LIMITS.maxEarthContinuityOhms} Ω`,
    })
  }
  if (c.polarity_pass === false) {
    checks.push({ field: 'polarity_pass', ok: false, message: 'Polarity failed — rectify before energising' })
  }
  return checks
}

export function circuitHasFailures(c: TestSheetCircuit): boolean {
  return checkCircuit(c).some((check) => !check.ok)
}

export async function getTestSheetsForTenant(tenantId: string): Promise<JobTestSheet[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_test_sheets')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as JobTestSheet[]
}

export async function getTestSheetForJob(jobId: string): Promise<JobTestSheet | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_test_sheets')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data?.[0] as JobTestSheet) ?? null
}

export async function createTestSheet(
  tenantId: string,
  jobId: string,
  userId: string,
  fields: Partial<Pick<JobTestSheet, 'installation_address' | 'switchboard_location' | 'supply_type'>>
): Promise<JobTestSheet> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_test_sheets')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      tested_by: userId,
      circuits: [emptyCircuit()],
      ...fields,
    })
    .select()
    .single()
  if (error) throw error
  return data as JobTestSheet
}

export async function updateTestSheet(
  sheetId: string,
  updates: Partial<
    Pick<
      JobTestSheet,
      | 'installation_address'
      | 'switchboard_location'
      | 'supply_type'
      | 'circuits'
      | 'tester_name'
      | 'tester_license'
      | 'test_date'
      | 'notes'
    >
  >
): Promise<JobTestSheet> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_test_sheets')
    .update(updates)
    .eq('id', sheetId)
    .select()
    .single()
  if (error) throw error
  return data as JobTestSheet
}

/**
 * Completes a test sheet and issues a certificate number.
 * Fails if any circuit has out-of-spec results — a certificate must not be
 * issued over failing tests.
 */
export async function completeTestSheet(sheet: JobTestSheet): Promise<JobTestSheet> {
  const failing = sheet.circuits.filter(circuitHasFailures)
  if (failing.length > 0) {
    throw new Error(
      `Cannot issue certificate: ${failing.length} circuit(s) have failing test results. Rectify and re-test first.`
    )
  }
  if (!sheet.tester_name?.trim()) {
    throw new Error('Tester name is required before issuing a certificate.')
  }

  const supabase = createClient()
  const certificateNumber = `FMS-${new Date().getFullYear()}-${sheet.id.slice(0, 8).toUpperCase()}`

  const { data, error } = await supabase
    .from('job_test_sheets')
    .update({
      status: 'completed',
      certificate_number: certificateNumber,
      completed_at: new Date().toISOString(),
    })
    .eq('id', sheet.id)
    .select()
    .single()
  if (error) throw error
  return data as JobTestSheet
}

export function certificateUrl(sheet: JobTestSheet): string | null {
  if (!sheet.certificate_token) return null
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/certificate/${sheet.certificate_token}`
}
