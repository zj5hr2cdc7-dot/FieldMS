-- ============================================================
-- Fix "Database error querying schema" on sign in.
--
-- WHAT HAPPENED
--   demo_walkthrough.sql inserts the five demo crew straight into auth.users,
--   listing only the columns it cared about. Supabase's token columns have no
--   default, so those rows were created with NULL in:
--
--     confirmation_token, recovery_token, email_change_token_new,
--     email_change_token_current, phone_change_token, reauthentication_token,
--     email_change, phone_change
--
--   GoTrue (the auth service) is written in Go and scans those columns into
--   plain strings, which cannot hold NULL. The scan fails before it gets as
--   far as checking anyone's password, and the failure is reported as
--   "Database error querying schema".
--
--   It breaks sign in for EVERY account, not just the demo ones, because the
--   query that trips over the bad rows runs on any authentication attempt.
--   Creating auth users by hand is the recognised cause; GoTrue's own inserts
--   always write empty strings rather than NULL.
--
-- WHAT THIS DOES
--   Replaces NULL with the empty string that GoTrue expects. It only touches
--   rows that are already broken, so it is safe to run against accounts that
--   were created properly through sign up, and safe to run more than once.
--
-- Read-only for anything that is already correct.
-- ============================================================

UPDATE auth.users SET confirmation_token         = '' WHERE confirmation_token         IS NULL;
UPDATE auth.users SET recovery_token             = '' WHERE recovery_token             IS NULL;
UPDATE auth.users SET email_change_token_new     = '' WHERE email_change_token_new     IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET phone_change_token         = '' WHERE phone_change_token         IS NULL;
UPDATE auth.users SET reauthentication_token     = '' WHERE reauthentication_token     IS NULL;
UPDATE auth.users SET email_change              = '' WHERE email_change              IS NULL;
UPDATE auth.users SET phone_change              = '' WHERE phone_change              IS NULL;

-- Confirm: this should return zero rows once the fix has run.
SELECT email,
       (confirmation_token         IS NULL) AS bad_confirmation,
       (recovery_token             IS NULL) AS bad_recovery,
       (email_change_token_new     IS NULL) AS bad_change_new,
       (email_change_token_current IS NULL) AS bad_change_current,
       (phone_change_token         IS NULL) AS bad_phone_change,
       (reauthentication_token     IS NULL) AS bad_reauth,
       (email_change               IS NULL) AS bad_email_change,
       (phone_change               IS NULL) AS bad_phone
  FROM auth.users
 WHERE confirmation_token IS NULL
    OR recovery_token IS NULL
    OR email_change_token_new IS NULL
    OR email_change_token_current IS NULL
    OR phone_change_token IS NULL
    OR reauthentication_token IS NULL
    OR email_change IS NULL
    OR phone_change IS NULL;
