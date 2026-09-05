/**
 * Roles and capabilities — the single source of truth for who can do what.
 *
 * Modelled on ServiceM8's three security roles, which is the shape the trade
 * industry already understands, and the one Simpro, Tradify and AroFlo all
 * approximate:
 *
 *   Owner       the business owner. Everything, including cost and profit.
 *   Manager     office or ops. All jobs, clients, quotes and invoices, and
 *               sale pricing, but NOT cost or profit, and not account
 *               settings or billing.
 *   Technician  field staff. Their own jobs and schedule only. Cannot see
 *               other staff, cannot see any pricing beyond what's on the
 *               job they're on.
 *
 * The cost/profit split is the important one and the easiest to get wrong:
 * in ServiceM8 a Manager can quote and invoice all day but never sees what
 * the business paid for the materials. Margin is owner-only.
 *
 * IMPORTANT: this file describes intent for the UI. It is not security on its
 * own. Every capability that matters is also enforced by row level security in
 * migration 024, because anything enforced only in React can be bypassed by
 * anyone who opens a browser console.
 */

export type Role = 'owner' | 'manager' | 'technician'

/** Legacy values still present in older rows, mapped forward. */
const LEGACY: Record<string, Role> = {
  admin: 'manager',
  member: 'technician',
}

export function normaliseRole(role: string | null | undefined): Role {
  if (!role) return 'technician'
  if (role === 'owner' || role === 'manager' || role === 'technician') return role
  return LEGACY[role] ?? 'technician'
}

export interface RoleMeta {
  key: Role
  label: string
  shortLabel: string
  description: string
  /** Where this role lands after signing in. */
  home: string
}

export const ROLES: RoleMeta[] = [
  {
    key: 'owner',
    label: 'Business Owner',
    shortLabel: 'Owner',
    description:
      'Full access including cost, profit and margin, account settings, subscription and the ability to add staff.',
    home: '/dashboard',
  },
  {
    key: 'manager',
    label: 'Manager / Office',
    shortLabel: 'Manager',
    description:
      'All jobs, customers, schedules, quotes and invoices, and sale pricing. Cannot see cost or profit, and cannot change account settings.',
    home: '/dashboard',
  },
  {
    key: 'technician',
    label: 'Technician / Field staff',
    shortLabel: 'Technician',
    description:
      'The mobile field app. Their own jobs and schedule, site details, forms, photos, test sheets and timesheets.',
    home: '/field',
  },
]

export function roleMeta(role: Role): RoleMeta {
  return ROLES.find((r) => r.key === role) ?? ROLES[2]
}

// ── Capabilities ────────────────────────────────────────────

export interface Capabilities {
  // Visibility
  seeAllJobs: boolean          // vs only jobs assigned to me
  seeOtherStaff: boolean       // other people's schedules and timesheets
  seeCustomers: boolean        // the customer list and marketing
  seeSalePricing: boolean      // what the customer is charged
  seeCostAndProfit: boolean    // supplier cost, markup, margin. Owner only.
  seeReports: boolean

  // Doing
  createJobs: boolean
  editAnyJob: boolean
  quote: boolean
  invoice: boolean
  recordPayments: boolean
  approveVariations: boolean
  approveDiscounts: boolean
  createCredits: boolean
  voidInvoices: boolean
  changeGst: boolean

  // Running the business
  manageStaff: boolean         // invite, change roles, remove
  manageSettings: boolean      // branding, integrations, workspace, setup
  manageMaterials: boolean     // catalogue and price overrides
  exportCustomerData: boolean  // the marketing CSV
}

const OWNER: Capabilities = {
  seeAllJobs: true,
  seeOtherStaff: true,
  seeCustomers: true,
  seeSalePricing: true,
  seeCostAndProfit: true,
  seeReports: true,
  createJobs: true,
  editAnyJob: true,
  quote: true,
  invoice: true,
  recordPayments: true,
  approveVariations: true,
  approveDiscounts: true,
  createCredits: true,
  voidInvoices: true,
  changeGst: true,
  manageStaff: true,
  manageSettings: true,
  manageMaterials: true,
  exportCustomerData: true,
}

const MANAGER: Capabilities = {
  seeAllJobs: true,
  seeOtherStaff: true,
  seeCustomers: true,
  seeSalePricing: true,
  // The ServiceM8 line: a Manager quotes and invoices but never sees margin.
  seeCostAndProfit: false,
  seeReports: false,
  createJobs: true,
  editAnyJob: true,
  quote: true,
  invoice: true,
  recordPayments: true,
  approveVariations: true,
  // Discounts and credits move money, so they stay with the owner.
  approveDiscounts: false,
  createCredits: false,
  voidInvoices: false,
  changeGst: false,
  manageStaff: false,
  manageSettings: false,
  manageMaterials: true,
  exportCustomerData: false,
}

const TECHNICIAN: Capabilities = {
  seeAllJobs: false,
  seeOtherStaff: false,
  seeCustomers: false,
  // They see the total on the job they're standing in front of, nothing wider.
  seeSalePricing: false,
  seeCostAndProfit: false,
  seeReports: false,
  createJobs: false,
  editAnyJob: false,
  quote: false,
  invoice: false,
  // Field staff collect payment on site: that's the point of the field app.
  recordPayments: true,
  approveVariations: false,
  approveDiscounts: false,
  createCredits: false,
  voidInvoices: false,
  changeGst: false,
  manageStaff: false,
  manageSettings: false,
  manageMaterials: false,
  exportCustomerData: false,
}

const MATRIX: Record<Role, Capabilities> = {
  owner: OWNER,
  manager: MANAGER,
  technician: TECHNICIAN,
}

export function capabilities(role: string | null | undefined): Capabilities {
  return MATRIX[normaliseRole(role)]
}

export function can(role: string | null | undefined, capability: keyof Capabilities): boolean {
  return capabilities(role)[capability]
}

/** Which app shell this role belongs in. */
export function homeFor(role: string | null | undefined): string {
  return roleMeta(normaliseRole(role)).home
}

export function isOffice(role: string | null | undefined): boolean {
  const r = normaliseRole(role)
  return r === 'owner' || r === 'manager'
}

/**
 * Rows of the comparison table shown in Settings, so a business owner can see
 * exactly what each role gets before assigning one. Deliberately worded the
 * way an electrician would describe it rather than in capability names.
 */
export const CAPABILITY_MATRIX: { label: string; key: keyof Capabilities }[] = [
  { label: 'See every job in the business', key: 'seeAllJobs' },
  { label: 'See other staff schedules', key: 'seeOtherStaff' },
  { label: 'Customer list and history', key: 'seeCustomers' },
  { label: 'See what customers are charged', key: 'seeSalePricing' },
  { label: 'See supplier cost and profit', key: 'seeCostAndProfit' },
  { label: 'Reports', key: 'seeReports' },
  { label: 'Create and edit jobs', key: 'createJobs' },
  { label: 'Send quotes', key: 'quote' },
  { label: 'Send invoices', key: 'invoice' },
  { label: 'Take payment on site', key: 'recordPayments' },
  { label: 'Approve variations', key: 'approveVariations' },
  { label: 'Approve discounts', key: 'approveDiscounts' },
  { label: 'Void invoices and issue credits', key: 'voidInvoices' },
  { label: 'Add and remove staff', key: 'manageStaff' },
  { label: 'Change business settings', key: 'manageSettings' },
  { label: 'Export customer data', key: 'exportCustomerData' },
]
