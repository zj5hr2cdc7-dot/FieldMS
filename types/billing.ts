// ── Job Billing hub types ───────────────────────────────────────────────────

export type VariationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed'

export interface JobVariation {
  id: string
  tenant_id: string
  job_id: string
  variation_number: number
  description: string
  reason: string | null
  material_cost: number
  labour_cost: number
  markup_percent: number
  total_ex_gst: number
  status: VariationStatus
  public_token: string | null
  approved_by_name: string | null
  approved_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type InvoiceKind = 'deposit' | 'progress' | 'tax' | 'final' | 'credit'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'part_paid' | 'paid' | 'overdue' | 'void'

export interface JobInvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort: number
}

export interface JobInvoice {
  id: string
  tenant_id: string
  job_id: string
  invoice_number: string | null
  kind: InvoiceKind
  status: InvoiceStatus
  subtotal_ex_gst: number
  gst_amount: number
  total_inc_gst: number
  discount: number
  amount_paid: number
  progress_percent: number | null
  public_token: string | null
  notes: string | null
  due_date: string | null
  issued_at: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: JobInvoiceItem[]
}

export interface BillingAuditEvent {
  id: string
  tenant_id: string
  job_id: string
  event_type: string
  actor_name: string | null
  amount: number | null
  reason: string | null
  meta: Record<string, unknown>
  created_at: string
}

/** Complete financial rollup for a single job's Billing dashboard. */
export interface JobFinancials {
  gstRate: number
  quotedValueExGst: number
  approvedVariationsExGst: number
  pendingVariationsExGst: number
  jobValueExGst: number          // quote + approved variations
  jobValueIncGst: number
  gstAmount: number
  materialCost: number
  labourCost: number
  totalCost: number
  grossMargin: number            // jobValueExGst - totalCost
  grossMarginPct: number | null
  depositReceived: number
  progressReceived: number
  totalPaid: number
  outstandingBalance: number     // jobValueIncGst - totalPaid
  customerCreditBalance: number  // overpayment, if any
  invoiceCount: number
  invoicedTotalIncGst: number
  lastInvoiceDate: string | null
  nextDueDate: string | null
  overdue: boolean
}
