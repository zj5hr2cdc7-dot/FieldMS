-- ============================================================
-- Repair hand-inserted auth users. Fixes "Database error querying schema".
--
-- Diagnostic that produced this file:
--   total_users 9, users_with_null_tokens 7, users_without_identity 7
--
-- TWO SEPARATE FAULTS, BOTH MINE, BOTH FROM demo_walkthrough.sql
--
-- 1. NULL token columns.
--    The seed inserted into auth.users listing only the columns it cared
--    about. Supabase's token columns have no default, so they were left NULL.
--    GoTrue is written in Go and scans them into plain strings, which cannot
--    hold NULL. The scan fails before any password is checked.
--
-- 2. No auth.identities rows.
--    GoTrue's password grant joins auth.users to auth.identities. A user with
--    no identity row has no email credential as far as auth is concerned.
--    Signing up through the app creates this row automatically; inserting a
--    user by hand does not.
--
-- Either one alone produces the same unhelpful 500. Both are fixed below.
--
-- Only touches rows that are already broken. Safe on accounts created
-- properly through sign up, and safe to run more than once.
-- ============================================================

-- ── 1. Token columns: NULL is not a string ──────────────────
UPDATE auth.users SET confirmation_token         = '' WHERE confirmation_token         IS NULL;
UPDATE auth.users SET recovery_token             = '' WHERE recovery_token             IS NULL;
UPDATE auth.users SET email_change_token_new     = '' WHERE email_change_token_new     IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET phone_change_token         = '' WHERE phone_change_token         IS NULL;
UPDATE auth.users SET reauthentication_token     = '' WHERE reauthentication_token     IS NULL;
UPDATE auth.users SET email_change               = '' WHERE email_change               IS NULL;
UPDATE auth.users SET phone_change               = '' WHERE phone_change               IS NULL;

-- ── 2. The missing email identity for each affected user ────
-- provider_id is the provider's own id for this user; for the email provider
-- that is the user's uuid as text. identity_data must carry sub and email:
-- GoTrue reads them back out of the jsonb when it builds the session.
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
SELECT u.id::text,
       u.id,
       jsonb_build_object(
         'sub', u.id::text,
         'email', u.email,
         'email_verified', true,
         'phone_verified', false
       ),
       'email',
       NOW(), NOW(), NOW()
  FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

-- ── 3. Confirm. Both counts must be 0. ──────────────────────
SELECT
  (SELECT count(*) FROM auth.users) AS total_users,
  (SELECT count(*) FROM auth.users
     WHERE confirmation_token IS NULL OR recovery_token IS NULL
        OR email_change_token_new IS NULL OR email_change_token_current IS NULL
        OR phone_change_token IS NULL OR reauthentication_token IS NULL
        OR email_change IS NULL OR phone_change IS NULL) AS users_with_null_tokens,
  (SELECT count(*) FROM auth.users u
     WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)) AS users_without_identity;
