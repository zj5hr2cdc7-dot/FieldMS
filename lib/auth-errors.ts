/**
 * Auth error messages. No imports, no I/O, so it can be unit tested directly
 * the way lib/rate-calculator.ts and lib/job-costing.ts are.
 *
 * Split out of lib/auth.ts after signup on fieldms.com.au failed with nothing
 * on screen but the fallback string. The handler was the thing hiding the
 * cause, and a handler that can hide a cause should be testable.
 */

/**
 * Turn an auth error into something a human can act on.
 *
 * The common failure in development is not a wrong password: it is that the
 * Supabase project is unreachable (paused on the free tier, deleted, or the
 * URL in .env.local is wrong). supabase-js surfaces that as a bare
 * "Failed to fetch", which looks like a bug in the login form. Name it.
 */

/**
 * Read a message off anything supabase-js throws.
 *
 * This used to be `err instanceof Error ? err.message : ''`, which quietly
 * threw away the message for every PostgrestError: those are PLAIN OBJECTS,
 * not Error subclasses. So any database failure surfaced as the bare fallback
 * string — "Signup failed" — with the actual cause discarded, which is how a
 * rate-limited confirmation email ended up looking like an unexplained bug.
 * Never narrow to `instanceof Error` for a supabase-js error again.
 */
function extractMessage(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    const parts = [o.message, o.error_description, o.error, o.hint, o.details, o.code]
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    if (parts.length > 0) return parts.join(' ')
  }
  return ''
}
export function describeAuthError(err: unknown, fallback: string): string {
  const message = extractMessage(err)

  // Signup dies here when Supabase cannot send the confirmation email, and
  // GoTrue then does NOT create the user, so the account silently does not
  // exist. With Supabase's built-in sender the project cap is 2 emails an
  // hour, which is why this reads as "it worked twice and then stopped".
  // The real fix is custom SMTP; the message says which so the next person
  // does not have to trace it from an empty error.
  if (/over_email_send_rate_limit|email rate limit/i.test(message)) {
    return 'Too many sign-ups in the last hour, so the confirmation email could not be sent and the account was not created. Wait an hour and try again, or configure custom SMTP in Supabase to lift the limit.'
  }
  if (/error sending (confirmation|magic link|recovery)?\s*email|smtp/i.test(message)) {
    return 'We could not send the confirmation email, so the account was not created. This is an email configuration problem on our side, not your details.'
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Cannot reach the FieldMS server. Check your connection, and if you are running locally check that the Supabase project is awake and NEXT_PUBLIC_SUPABASE_URL is correct.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password do not match an account.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email address first. Check your inbox for the verification link.'
  }
  if (/same as the old password|should be different/i.test(message)) {
    return 'That is the password you already have. Choose a different one.'
  }
  if (/otp_expired|expired/i.test(message)) {
    return 'That code or link has expired. Request a new one.'
  }
  if (/invalid.*(token|code|otp)|token.*(invalid|not found)/i.test(message)) {
    return 'That code is not right. Check the email and try again.'
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return message || fallback
}