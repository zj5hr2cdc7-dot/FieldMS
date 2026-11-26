#!/usr/bin/env node
/**
 * Tests for the trial access decision.
 *
 * WHY IT MATTERS THAT THESE ARE PINNED
 *   There are two copies of this logic: accessStatusFrom() here, and
 *   fieldms_access() in migration 040. The browser reads the SQL one, server
 *   routes read the TypeScript one. If they drift, a workspace gets locked
 *   out of the API while the UI says it is fine, or the reverse. The truth
 *   table below is the contract both sides owe.
 *
 *   The failure that would hurt most is locking out a PAYING business, so
 *   the ambiguous cases here all resolve in the customer's favour.
 *
 * Run: node scripts/trial-access-tests.mjs   (part of npm run audit:all)
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { accessStatusFrom, ACTIVE_SUBSCRIPTION_STATES } from '../lib/trial-access.ts'

const NOW = new Date('2026-11-26T00:00:00Z')
const past = '2026-11-01T00:00:00Z'
const future = '2026-12-24T00:00:00Z'

test('an active subscription is subscribed, whatever the trial says', () => {
  for (const s of ['active', 'trialing', 'past_due']) {
    assert.equal(accessStatusFrom({ subscriptionStatus: s, trialEndsAt: past, now: NOW }), 'subscribed', s)
  }
})

test('past_due still counts as paying', () => {
  // A failed card is a dunning problem. Locking a business out of its own
  // compliance records mid-week over a declined payment is the wrong trade,
  // and the terms say we email first and retry.
  assert.equal(accessStatusFrom({ subscriptionStatus: 'past_due', trialEndsAt: past, now: NOW }), 'subscribed')
})

test('a dead subscription falls back to the trial dates', () => {
  for (const s of ['canceled', 'unpaid', 'incomplete_expired', 'paused']) {
    assert.equal(accessStatusFrom({ subscriptionStatus: s, trialEndsAt: future, now: NOW }), 'trial', s)
    assert.equal(accessStatusFrom({ subscriptionStatus: s, trialEndsAt: past, now: NOW }), 'expired', s)
  }
})

test('no subscription: the trial date decides', () => {
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: future, now: NOW }), 'trial')
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: past, now: NOW }), 'expired')
})

test('a null trial date means the trial never started, not that it ended', () => {
  // Matches the SQL: `t_end IS NULL OR t_end > now()` -> trial.
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: null, now: NOW }), 'trial')
  assert.equal(accessStatusFrom({ subscriptionStatus: undefined, trialEndsAt: undefined, now: NOW }), 'trial')
})

test('a malformed date fails open rather than locking someone out', () => {
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: 'not-a-date', now: NOW }), 'trial')
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: '', now: NOW }), 'trial')
})

test('the boundary: expiry is exclusive, so the last second is still trial', () => {
  const edge = '2026-11-26T00:00:00Z'
  assert.equal(accessStatusFrom({ subscriptionStatus: null, trialEndsAt: edge, now: NOW }), 'expired',
    'exactly at the deadline is over, matching t_end > now()')
  assert.equal(
    accessStatusFrom({ subscriptionStatus: null, trialEndsAt: '2026-11-26T00:00:01Z', now: NOW }),
    'trial', 'one second before the deadline is still inside the trial')
})

test('the active-state list is the one the SQL uses', () => {
  assert.deepEqual([...ACTIVE_SUBSCRIPTION_STATES], ['active', 'trialing', 'past_due'])
})
