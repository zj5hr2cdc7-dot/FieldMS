/**
 * One sample job for a new workspace: a sample customer, a job booked for
 * tomorrow and a priced quote linked to it, so an owner can click through
 * quote → job → test sheet → invoice before entering anything real.
 *
 * Everything created is flagged is_sample (migration 033) and removed by
 * removeSampleData(). The sample customer has no email or phone, so no
 * reminder or message can ever go to a real person from it.
 */
import { createClient } from '@/utils/supabase/client'

const SAMPLE_CUSTOMER = 'Sample customer (Jane Citizen)'
const SAMPLE_ADDRESS = '12 Example Street, Southport QLD 4215'

const QUOTE_ITEMS = [
  { name: 'Remove old board, install new switchboard (labour, 6 hrs)', quantity: 6, unit_price: 95 },
  { name: 'Testing, labelling and compliance certificate (labour, 1 hr)', quantity: 1, unit_price: 95 },
  { name: 'Switchboard enclosure, main switch and RCBOs (sample price)', quantity: 1, unit_price: 650 },
  { name: 'Sundries: cable, lugs, labels (sample price)', quantity: 1, unit_price: 60 },
]

export async function hasSampleData(tenantId: string): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_sample', true)
  return (count ?? 0) > 0
}

/** Creates the sample job (once). Returns the job id. */
export async function createSampleJob(tenantId: string, userId: string): Promise<string> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_sample', true)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id as string

  // Re-use a sample customer left behind by an earlier, partly removed run.
  let customerId: string | null = null
  const { data: oldCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_sample', true)
    .limit(1)
    .maybeSingle()
  if (oldCustomer) {
    customerId = oldCustomer.id as string
  } else {
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        name: SAMPLE_CUSTOMER,
        kind: 'residential',
        billing_address: SAMPLE_ADDRESS,
        notes: 'Sample customer created by FieldMS. Remove it from the dashboard when you are done.',
        is_sample: true,
      })
      .select('id')
      .single()
    if (error) throw error
    customerId = customer.id as string
  }

  const tomorrow = new Date(Date.now() + 86_400_000)
  const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      title: 'SAMPLE: Switchboard upgrade',
      description:
        'This is a sample job so you can see how FieldMS works. Try opening the quote, adding a test sheet, ' +
        'and creating an invoice. Nothing is sent to anyone. Remove it from the dashboard when you are done.',
      priority: 'medium',
      estimated_hours: 7,
      due_date: dueDate,
      scheduled_start: '08:00',
      status: 'open',
      created_by: userId,
      customer_id: customerId,
      customer_name: SAMPLE_CUSTOMER,
      customer_address: SAMPLE_ADDRESS,
      is_sample: true,
    })
    .select('id')
    .single()
  if (jobError) throw jobError

  const items = QUOTE_ITEMS.map((i) => ({ ...i, total: Math.round(i.quantity * i.unit_price * 100) / 100 }))
  const total = items.reduce((s, i) => s + i.total, 0)

  const { data: estimate, error: estError } = await supabase
    .from('estimates')
    .insert({
      business_id: tenantId,
      customer_name: SAMPLE_CUSTOMER,
      status: 'draft',
      total,
      job_id: job.id,
      is_sample: true,
    })
    .select('id')
    .single()
  if (estError) throw estError

  const { error: itemsError } = await supabase
    .from('estimate_items')
    .insert(items.map((i) => ({ estimate_id: estimate.id, ...i })))
  if (itemsError) throw itemsError

  return job.id as string
}

/** Removes everything flagged as sample data for this workspace. */
export async function removeSampleData(tenantId: string): Promise<void> {
  const supabase = createClient()
  // Quotes first (their items cascade), then jobs (job children cascade or
  // are unlinked), then the customer.
  const steps = [
    supabase.from('estimates').delete().eq('business_id', tenantId).eq('is_sample', true),
    supabase.from('jobs').delete().eq('tenant_id', tenantId).eq('is_sample', true),
    supabase.from('customers').delete().eq('tenant_id', tenantId).eq('is_sample', true),
  ]
  for (const step of steps) {
    const { error } = await step
    if (error) throw error
  }
}
