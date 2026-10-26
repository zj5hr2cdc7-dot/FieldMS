/**
 * Job costing: quoted versus actual, and the gross margin between them.
 *
 * GROSS, NOT NET, NOT CASH
 *   Everything here is gross profit: revenue minus direct job costs. It knows
 *   nothing about business overheads, so it is NOT net profit, and it counts
 *   invoiced revenue rather than money received, so it is NOT cash. Those are
 *   three different numbers and conflating them is how a business feels rich
 *   and runs out of money in the same month. The field names say which is
 *   which, and the UI repeats it.
 *
 * NOT COSTED IS NOT ZERO
 *   Hours with no cost rate are counted separately as `uncostedHours` and kept
 *   out of `actualLabourCost`. Treating them as free would make every
 *   uncosted job look perfectly profitable, which is the single most dangerous
 *   thing this module could do.
 *
 * Pure functions, no I/O, no Supabase. Same shape as lib/rate-calculator.ts so
 * the server, the page and the tests cannot disagree about the arithmetic.
 */

/** A frozen snapshot of the quoted position. One row of job_cost_baselines. */
export interface CostBaseline {
  reason: 'quote_accepted' | 'variation_approved' | 'manual'
  quotedRevenueExGst: number
  quotedLabourCost: number
  quotedMaterialCost: number
  quotedOtherCost: number
  quotedHours: number
}

/** One approved time entry, already resolved to hours and a cost rate. */
export interface CostedTimeEntry {
  hours: number
  /** Null when no cost rate was in force. Counted as uncosted, never as zero. */
  costRate: number | null
}

/** A material line as actually purchased. */
export interface MaterialCostLine {
  quantity: number
  /** What the supplier quoted on the purchase order. */
  quotedUnitCost: number
  /** What the supplier actually invoiced. Null means not reconciled yet. */
  actualUnitCost: number | null
}

export interface OtherCostLine {
  kind: string
  amountExGst: number
}

export interface JobCostInputs {
  /** Every baseline captured for the job: acceptance, then each variation. */
  baselines: CostBaseline[]
  /** Approved time entries only. Unapproved hours are not a cost yet. */
  time: CostedTimeEntry[]
  materials: MaterialCostLine[]
  otherCosts: OtherCostLine[]
  /** Invoiced ex GST, excluding credit notes, which arrive negative. */
  invoicedRevenueExGst: number
  /** Ex GST value of completed work not yet on an invoice. */
  unbilledRevenueExGst: number
  /** Tenant target. Null means not set, which is not the same as zero. */
  targetMarginPercent: number | null
}

export interface JobCostResult {
  // Quoted, summed across the original acceptance and every approved variation
  quotedRevenueExGst: number
  quotedCost: number
  quotedGrossProfit: number
  quotedMarginPercent: number
  quotedHours: number

  // Actual
  actualLabourCost: number
  actualMaterialCost: number
  actualOtherCost: number
  actualCost: number
  actualHours: number
  /** Hours worked with no cost rate in force. Excluded from actualLabourCost. */
  uncostedHours: number

  // Revenue
  invoicedRevenueExGst: number
  unbilledRevenueExGst: number
  /** Invoiced plus unbilled: the full value of work done. */
  recognisedRevenueExGst: number

  // The answer
  actualGrossProfit: number
  actualMarginPercent: number
  /** Positive means the job cost more than quoted. */
  costVariance: number
  hoursVariance: number
  /** Supplier invoices above the PO price. Where margin quietly disappears. */
  materialPriceVariance: number

  belowTarget: boolean
  /** True when any figure above rests on incomplete data. */
  incomplete: boolean
  warnings: string[]
}

const num = (n: number | null | undefined): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)

/** Margin as a share of revenue. Zero revenue has no margin, not 0%. */
function marginPercent(profit: number, revenue: number): number {
  return revenue > 0 ? (profit / revenue) * 100 : 0
}

export function calculateJobCost(input: JobCostInputs): JobCostResult {
  const warnings: string[] = []

  // ── Quoted: the sum of every frozen baseline ──
  // Summed rather than taking the latest, because a variation baseline records
  // only what that variation added.
  const quotedRevenueExGst = input.baselines.reduce((t, b) => t + num(b.quotedRevenueExGst), 0)
  const quotedLabour = input.baselines.reduce((t, b) => t + num(b.quotedLabourCost), 0)
  const quotedMaterial = input.baselines.reduce((t, b) => t + num(b.quotedMaterialCost), 0)
  const quotedOther = input.baselines.reduce((t, b) => t + num(b.quotedOtherCost), 0)
  const quotedHours = input.baselines.reduce((t, b) => t + num(b.quotedHours), 0)
  const quotedCost = quotedLabour + quotedMaterial + quotedOther
  const quotedGrossProfit = quotedRevenueExGst - quotedCost

  // ── Actual labour, keeping uncosted hours visible ──
  let actualLabourCost = 0
  let actualHours = 0
  let uncostedHours = 0
  for (const t of input.time) {
    const h = num(t.hours)
    actualHours += h
    if (t.costRate == null) uncostedHours += h
    else actualLabourCost += h * num(t.costRate)
  }

  // ── Actual materials, preferring what was really invoiced ──
  let actualMaterialCost = 0
  let materialPriceVariance = 0
  let unreconciled = 0
  for (const m of input.materials) {
    const qty = num(m.quantity)
    const quoted = num(m.quotedUnitCost)
    if (m.actualUnitCost == null) {
      actualMaterialCost += qty * quoted
      unreconciled += 1
    } else {
      const actual = num(m.actualUnitCost)
      actualMaterialCost += qty * actual
      materialPriceVariance += qty * (actual - quoted)
    }
  }

  const actualOtherCost = input.otherCosts.reduce((t, c) => t + num(c.amountExGst), 0)
  const actualCost = actualLabourCost + actualMaterialCost + actualOtherCost

  const invoicedRevenueExGst = num(input.invoicedRevenueExGst)
  const unbilledRevenueExGst = num(input.unbilledRevenueExGst)
  const recognisedRevenueExGst = invoicedRevenueExGst + unbilledRevenueExGst

  const actualGrossProfit = recognisedRevenueExGst - actualCost
  const actualMarginPercent = marginPercent(actualGrossProfit, recognisedRevenueExGst)

  // ── Warnings: say what the number is resting on ──
  if (input.baselines.length === 0)
    warnings.push('No quoted baseline was captured for this job, so there is nothing to compare the actuals against.')
  if (uncostedHours > 0)
    warnings.push(
      `${uncostedHours.toLocaleString('en-AU')} hours have no cost rate and are excluded from the labour cost. Set cost rates to see the real margin.`
    )
  if (unreconciled > 0)
    warnings.push(`${unreconciled} material line${unreconciled === 1 ? '' : 's'} still use the quoted supplier price rather than the invoiced one.`)
  if (unbilledRevenueExGst > 0)
    warnings.push('This includes completed work that has not been invoiced yet, so it is not cash.')

  const incomplete = input.baselines.length === 0 || uncostedHours > 0 || unreconciled > 0

  return {
    quotedRevenueExGst,
    quotedCost,
    quotedGrossProfit,
    quotedMarginPercent: marginPercent(quotedGrossProfit, quotedRevenueExGst),
    quotedHours,

    actualLabourCost,
    actualMaterialCost,
    actualOtherCost,
    actualCost,
    actualHours,
    uncostedHours,

    invoicedRevenueExGst,
    unbilledRevenueExGst,
    recognisedRevenueExGst,

    actualGrossProfit,
    actualMarginPercent,
    costVariance: actualCost - quotedCost,
    hoursVariance: actualHours - quotedHours,
    materialPriceVariance,

    // A job is only "below target" when there is a target AND the figure is
    // trustworthy. Flagging a job whose hours are uncosted would send someone
    // chasing a margin problem that is really a data-entry problem.
    belowTarget:
      input.targetMarginPercent != null &&
      !incomplete &&
      recognisedRevenueExGst > 0 &&
      actualMarginPercent < input.targetMarginPercent,

    incomplete,
    warnings,
  }
}

/**
 * Pick the cost rate in force on a given date from a person's rate history.
 * Rates are effective-dated so a pay rise does not change last year's margins.
 */
export function rateOn(
  history: { costRate: number; effectiveFrom: string }[],
  isoDate: string
): number | null {
  const applicable = history
    .filter((r) => r.effectiveFrom <= isoDate)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))
  return applicable.length > 0 ? applicable[0].costRate : null
}
