/**
 * Billing capabilities — thin compatibility layer over lib/roles.ts.
 *
 * The role model now lives in lib/roles.ts and is enforced by row level
 * security in migration 024. This file remains so existing imports keep
 * working, but it no longer decides anything on its own.
 */

import type { UserRole } from '@/types/database'
import { capabilities, normaliseRole, roleMeta, type Role } from '@/lib/roles'

export interface BillingCapabilities {
  viewCosts: boolean
  editPrices: boolean
  approveDiscounts: boolean
  createCredits: boolean
  deleteInvoices: boolean
  changeGst: boolean
  recordPayments: boolean
  approveVariations: boolean
  issueInvoices: boolean
}

export function billingCapabilities(role: UserRole | null | undefined): BillingCapabilities {
  const c = capabilities(role)
  return {
    viewCosts: c.seeCostAndProfit,
    editPrices: c.seeSalePricing && c.editAnyJob,
    approveDiscounts: c.approveDiscounts,
    createCredits: c.createCredits,
    deleteInvoices: c.voidInvoices,
    changeGst: c.changeGst,
    recordPayments: c.recordPayments,
    approveVariations: c.approveVariations,
    issueInvoices: c.invoice,
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: roleMeta('owner').label,
  manager: roleMeta('manager').label,
  technician: roleMeta('technician').label,
}

export function roleLabel(role: UserRole | null | undefined): string {
  return ROLE_LABELS[normaliseRole(role)]
}
