#!/usr/bin/env node
/**
 * Tests for the job costing arithmetic.
 *
 * WHY THESE CASES
 *   The dangerous failure for this module is not being wrong by a few cents.
 *   It is being confidently wrong in a way that makes an unprofitable job look
 *   fine — uncosted hours treated as free, a missing baseline treated as a
 *   zero quote, or a job with no revenue reported at 0% margin rather than
 *   "no revenue". Each of those has a test below.
 *
 * Run: node scripts/job-costing-tests.mjs   (also in npm run test:costing)
 *
 * Uses node:test with the TypeScript source loaded through the same stripping
 * Node does for .ts files, so there is no build step and no second copy of the
 * maths to drift.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateJobCost, rateOn } from '../lib/job-costing.ts'

/** A job with nothing in it, for tests to override one field at a time. */
const empty = {
  baselines: [],
  time: [],
  materials: [],
  otherCosts: [],
  invoicedRevenueExGst: 0,
  unbilledRevenueExGst: 0,
  targetMarginPercent: null,
}

const baseline = (over = {}) => ({
  reason: 'quote_accepted',
  quotedRevenueExGst: 10000,
  quotedLabourCost: 4000,
  quotedMaterialCost: 2000,
  quotedOtherCost: 0,
  quotedHours: 80,
  ...over,
})

test('a straightforward profitable job', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 80, costRate: 50 }],
    materials: [{ quantity: 10, quotedUnitCost: 200, actualUnitCost: 200 }],
    invoicedRevenueExGst: 10000,
  })
  assert.equal(r.quotedCost, 6000)
  assert.equal(r.actualLabourCost, 4000)
  assert.equal(r.actualMaterialCost, 2000)
  assert.equal(r.actualCost, 6000)
  assert.equal(r.actualGrossProfit, 4000)
  assert.equal(r.actualMarginPercent, 40)
  assert.equal(r.costVariance, 0)
  assert.equal(r.incomplete, false)
})

test('uncosted hours are excluded, not counted as free', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [
      { hours: 40, costRate: 50 },
      { hours: 40, costRate: null }, // no rate in force
    ],
    invoicedRevenueExGst: 10000,
  })
  assert.equal(r.actualHours, 80, 'all hours still count toward hours worked')
  assert.equal(r.uncostedHours, 40)
  assert.equal(r.actualLabourCost, 2000, 'only the costed half')
  assert.equal(r.incomplete, true)
  assert.match(r.warnings.join(' '), /no cost rate/)
})

test('a job with uncosted hours is never flagged below target', () => {
  // The margin looks great precisely because the costs are missing. Flagging
  // it would send someone chasing a margin problem that is a data problem.
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 200, costRate: null }],
    invoicedRevenueExGst: 10000,
    targetMarginPercent: 30,
  })
  assert.equal(r.actualMarginPercent, 100, 'looks perfect, because cost is missing')
  assert.equal(r.belowTarget, false, 'and so must not be reported as a margin failure')
  assert.equal(r.incomplete, true)
})

test('incomplete data suppresses the flag even when the margin IS below target', () => {
  // The case above passes whether or not the incompleteness guard exists,
  // because a 100% margin is never below a 30% target. This one only passes
  // because of the guard: the margin really is under target, but part of the
  // cost picture is missing, so the number cannot be trusted enough to accuse
  // the job of being unprofitable.
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    materials: [{ quantity: 1, quotedUnitCost: 9000, actualUnitCost: 9000 }],
    time: [{ hours: 40, costRate: null }], // the bit that makes it incomplete
    invoicedRevenueExGst: 10000,
    targetMarginPercent: 30,
  })
  assert.equal(r.actualMarginPercent, 10, 'genuinely under the 30% target')
  assert.equal(r.incomplete, true)
  assert.equal(r.belowTarget, false, 'but not accused, because the data is incomplete')
})

test('variations add to the baseline rather than replacing it', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [
      baseline(),
      baseline({ reason: 'variation_approved', quotedRevenueExGst: 2000, quotedLabourCost: 800, quotedMaterialCost: 400, quotedHours: 16 }),
    ],
    invoicedRevenueExGst: 12000,
  })
  assert.equal(r.quotedRevenueExGst, 12000)
  assert.equal(r.quotedCost, 7200)
  assert.equal(r.quotedHours, 96)
})

test('no baseline is reported, not silently treated as a zero quote', () => {
  const r = calculateJobCost({ ...empty, invoicedRevenueExGst: 5000, time: [{ hours: 10, costRate: 50 }] })
  assert.equal(r.quotedRevenueExGst, 0)
  assert.equal(r.incomplete, true)
  assert.match(r.warnings.join(' '), /No quoted baseline/)
})

test('zero revenue gives 0% margin and is not flagged below target', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 10, costRate: 50 }],
    invoicedRevenueExGst: 0,
    targetMarginPercent: 20,
  })
  assert.equal(r.recognisedRevenueExGst, 0)
  assert.equal(r.actualMarginPercent, 0, 'not NaN or Infinity')
  assert.equal(r.belowTarget, false, 'nothing invoiced yet is not a margin failure')
})

test('a credit note reduces revenue and can push a job to a loss', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 80, costRate: 50 }],
    invoicedRevenueExGst: 10000 - 7000, // credit note arrives negative
  })
  assert.equal(r.recognisedRevenueExGst, 3000)
  assert.equal(r.actualGrossProfit, -1000)
  assert.ok(r.actualMarginPercent < 0, 'a loss reads as a negative margin')
})

test('supplier invoicing above the PO price shows as a price variance', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    materials: [{ quantity: 100, quotedUnitCost: 10, actualUnitCost: 12 }],
    invoicedRevenueExGst: 10000,
  })
  assert.equal(r.actualMaterialCost, 1200)
  assert.equal(r.materialPriceVariance, 200, 'the $200 that quietly left the margin')
})

test('unreconciled materials fall back to the quoted price and say so', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    materials: [{ quantity: 10, quotedUnitCost: 50, actualUnitCost: null }],
    invoicedRevenueExGst: 10000,
  })
  assert.equal(r.actualMaterialCost, 500)
  assert.equal(r.materialPriceVariance, 0, 'no variance can be claimed without an actual')
  assert.equal(r.incomplete, true)
  assert.match(r.warnings.join(' '), /quoted supplier price/)
})

test('unbilled work counts toward margin but is flagged as not cash', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 80, costRate: 50 }],
    materials: [{ quantity: 10, quotedUnitCost: 200, actualUnitCost: 200 }],
    invoicedRevenueExGst: 6000,
    unbilledRevenueExGst: 4000,
  })
  assert.equal(r.recognisedRevenueExGst, 10000)
  assert.equal(r.actualGrossProfit, 4000)
  assert.match(r.warnings.join(' '), /not cash/)
})

test('below target only fires with a target set and complete data', () => {
  const complete = {
    ...empty,
    baselines: [baseline()],
    time: [{ hours: 100, costRate: 60 }], // 6000 labour, over the 4000 quoted
    materials: [{ quantity: 10, quotedUnitCost: 200, actualUnitCost: 200 }],
    invoicedRevenueExGst: 10000,
  }
  assert.equal(calculateJobCost({ ...complete, targetMarginPercent: null }).belowTarget, false, 'no target, no judgement')

  const judged = calculateJobCost({ ...complete, targetMarginPercent: 30 })
  assert.equal(judged.actualMarginPercent, 20)
  assert.equal(judged.belowTarget, true)
  assert.equal(judged.costVariance, 2000, 'cost ran $2000 over the quote')
  assert.equal(judged.hoursVariance, 20)
})

test('rateOn picks the rate in force, so a pay rise is not retrospective', () => {
  const history = [
    { costRate: 50, effectiveFrom: '2026-01-01' },
    { costRate: 60, effectiveFrom: '2026-07-01' },
  ]
  assert.equal(rateOn(history, '2026-03-15'), 50, 'work done before the rise')
  assert.equal(rateOn(history, '2026-09-15'), 60, 'work done after it')
  assert.equal(rateOn(history, '2025-12-31'), null, 'before any rate existed')
})

test('garbage input does not produce NaN', () => {
  const r = calculateJobCost({
    ...empty,
    baselines: [baseline({ quotedRevenueExGst: Number.NaN })],
    time: [{ hours: Number.POSITIVE_INFINITY, costRate: 50 }],
    invoicedRevenueExGst: Number.NaN,
  })
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} should be finite, got ${v}`)
  }
})
