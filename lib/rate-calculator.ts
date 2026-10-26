/**
 * Charge-out rate calculator.
 *
 * The question every tradie gets wrong at least once: "what do I charge per
 * hour?" The common mistake is charging wage-plus-a-bit and forgetting that
 * only some paid hours are billable, and that the van, insurance, phone,
 * software and accountant all have to be paid out of billable hours too.
 *
 *   cost per billable hour  = (labour cost + overheads) / billable hours
 *   charge-out rate         = cost per billable hour / (1 - profit margin)
 *
 * Margin, not markup: a 20% margin means 20% of the price is profit. Pure
 * functions, no I/O, so the page and any future server use agree.
 */

export interface RateInputs {
  /** People whose time is billed, including the owner if on the tools. */
  billableStaff: number
  /** Average hourly wage paid to each, before on-costs. */
  hourlyWage: number
  /** Super, workers comp, payroll tax, leave loading — % on top of wages. */
  onCostPercent: number
  /** Paid hours per person per week. */
  hoursPerWeek: number
  /** Working weeks per year after annual leave, public holidays, sick days. */
  weeksPerYear: number
  /** % of paid time that ends up on an invoice (travel, quoting, admin are not). */
  billablePercent: number
  /** Annual overheads: vehicles, fuel, insurance, rent, phones, software, accountant, tools. */
  annualOverheads: number
  /** Owner's salary if not already counted as a billable wage above. */
  ownerSalary: number
  /** Target profit margin as a % of the price. */
  profitMarginPercent: number
}

export const DEFAULT_RATE_INPUTS: RateInputs = {
  billableStaff: 1,
  hourlyWage: 45,
  onCostPercent: 18,
  hoursPerWeek: 40,
  weeksPerYear: 46,
  billablePercent: 70,
  annualOverheads: 45000,
  ownerSalary: 0,
  profitMarginPercent: 15,
}

/** Common overheads, to help someone who has never added them up. */
export const OVERHEAD_PROMPTS = [
  'Van repayments / lease',
  'Fuel, rego and servicing',
  'Public liability and tools insurance',
  'Licences and CPD',
  'Phones and internet',
  'Software and subscriptions',
  'Accountant and bookkeeping',
  'Tool replacement and test gear calibration',
  'Workshop or storage rent',
  'Advertising and website',
]

export interface RateResult {
  paidHoursPerYear: number
  billableHoursPerYear: number
  labourCostPerYear: number
  totalCostPerYear: number
  breakEvenRate: number
  chargeOutRate: number
  /** Rounded up to the next whole dollar. */
  suggestedRate: number
  profitPerYear: number
  revenuePerYear: number
  /** Overheads as a share of each billable hour. */
  overheadPerBillableHour: number
  warnings: string[]
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0))

export function calculateRate(raw: RateInputs): RateResult {
  const i = {
    billableStaff: clamp(raw.billableStaff, 0, 500),
    hourlyWage: clamp(raw.hourlyWage, 0, 1000),
    onCostPercent: clamp(raw.onCostPercent, 0, 100),
    hoursPerWeek: clamp(raw.hoursPerWeek, 0, 80),
    weeksPerYear: clamp(raw.weeksPerYear, 0, 52),
    billablePercent: clamp(raw.billablePercent, 0, 100),
    annualOverheads: clamp(raw.annualOverheads, 0, 1e8),
    ownerSalary: clamp(raw.ownerSalary, 0, 1e7),
    profitMarginPercent: clamp(raw.profitMarginPercent, 0, 90),
  }
  const warnings: string[] = []

  const paidHoursPerYear = i.billableStaff * i.hoursPerWeek * i.weeksPerYear
  const billableHoursPerYear = paidHoursPerYear * (i.billablePercent / 100)
  const labourCostPerYear = paidHoursPerYear * i.hourlyWage * (1 + i.onCostPercent / 100)
  const totalCostPerYear = labourCostPerYear + i.annualOverheads + i.ownerSalary

  const breakEvenRate = billableHoursPerYear > 0 ? totalCostPerYear / billableHoursPerYear : 0
  const chargeOutRate = breakEvenRate / (1 - i.profitMarginPercent / 100)
  const suggestedRate = Math.ceil(chargeOutRate)
  const revenuePerYear = suggestedRate * billableHoursPerYear
  const profitPerYear = revenuePerYear - totalCostPerYear

  if (billableHoursPerYear === 0) warnings.push('With no billable hours there is nothing to spread costs over.')
  if (i.billablePercent > 85)
    warnings.push('Over 85% billable is rare once travel, quoting and admin are counted. Most trade businesses sit at 60 to 75%.')
  if (i.weeksPerYear > 48)
    warnings.push('Allow for four weeks annual leave plus public holidays: 46 to 47 working weeks is typical.')
  if (i.annualOverheads === 0) warnings.push('No overheads entered. Even a one-van sole trader usually has $25k+ a year.')
  if (i.onCostPercent < 12 && i.hourlyWage > 0)
    warnings.push('Superannuation alone is 12% of ordinary time earnings; add workers comp and leave on top.')

  return {
    paidHoursPerYear,
    billableHoursPerYear,
    labourCostPerYear,
    totalCostPerYear,
    breakEvenRate,
    chargeOutRate,
    suggestedRate,
    profitPerYear,
    revenuePerYear,
    overheadPerBillableHour: billableHoursPerYear > 0 ? i.annualOverheads / billableHoursPerYear : 0,
    warnings,
  }
}

export function parseRateInputs(saved: unknown): RateInputs {
  const out = { ...DEFAULT_RATE_INPUTS }
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(out) as (keyof RateInputs)[]) {
      const v = (saved as Record<string, unknown>)[k]
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
  }
  return out
}
