#!/usr/bin/env node
/**
 * Tests for describeAuthError.
 *
 * WHY THIS EXISTS
 *   Signup failed on fieldms.com.au and the screen said only "Signup failed".
 *   That is the FALLBACK string, which appears when the error carries no
 *   message at all — so the one piece of information that would have
 *   explained it was thrown away by the error handler itself.
 *
 *   The cause: `err instanceof Error ? err.message : ''`. A PostgrestError
 *   from supabase-js is a plain object, not an Error subclass, so every
 *   database failure fell through to the fallback. The case below named
 *   "a PostgrestError is a plain object" is the regression guard.
 *
 * Run: node scripts/auth-error-tests.mjs   (part of npm run audit:all)
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { describeAuthError } from '../lib/auth-errors.ts'

const FALLBACK = 'Signup failed'

test('a PostgrestError is a plain object, not an Error', () => {
  // Exactly the shape supabase-js returns from a failed .from()/.rpc() call.
  const pgError = {
    code: '42501',
    message: 'permission denied for function create_tenant_with_owner',
    details: null,
    hint: null,
  }
  const out = describeAuthError(pgError, FALLBACK)
  assert.notEqual(out, FALLBACK, 'must not discard a PostgrestError message')
  assert.match(out, /permission denied/)
})

test('the email rate limit explains itself, including that no account was made', () => {
  const out = describeAuthError(new Error('email rate limit exceeded'), FALLBACK)
  assert.match(out, /confirmation email/i)
  assert.match(out, /not created/i, 'the user must be told the account does not exist')
  assert.match(out, /SMTP/i, 'and how it gets fixed')
})

test('over_email_send_rate_limit is recognised by code as well as by text', () => {
  const out = describeAuthError({ code: 'over_email_send_rate_limit', message: '' }, FALLBACK)
  assert.match(out, /confirmation email/i)
  assert.notEqual(out, FALLBACK)
})

test('a failed confirmation send is not blamed on the user', () => {
  const out = describeAuthError(new Error('Error sending confirmation email'), FALLBACK)
  assert.match(out, /not your details/i)
})

test('an unreachable project is named rather than looking like a form bug', () => {
  assert.match(describeAuthError(new TypeError('Failed to fetch'), FALLBACK), /Cannot reach/)
})

test('ordinary auth errors still read the way they did', () => {
  assert.match(describeAuthError(new Error('Invalid login credentials'), FALLBACK), /do not match/)
  assert.match(describeAuthError(new Error('Email not confirmed'), FALLBACK), /Confirm your email/)
  assert.match(describeAuthError(new Error('otp_expired'), FALLBACK), /expired/)
})

test('a plain string error is read', () => {
  assert.match(describeAuthError('Invalid login credentials', FALLBACK), /do not match/)
})

test('a genuinely empty error still falls back rather than showing nothing', () => {
  assert.equal(describeAuthError(null, FALLBACK), FALLBACK)
  assert.equal(describeAuthError({}, FALLBACK), FALLBACK)
  assert.equal(describeAuthError(undefined, FALLBACK), FALLBACK)
})
