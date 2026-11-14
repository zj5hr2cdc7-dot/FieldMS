-- ============================================================
-- Set a password directly, without sending any email.
--
-- WHY THIS EXISTS
--   Supabase's built-in email sender is capped at 2 emails per hour for the
--   whole project (Authentication → Rate Limits → emails/h). Both dashboard
--   recovery options, "Send password recovery" and "Send magic link", go
--   through that sender, so once the cap is hit there is no way back into an
--   account from the UI. This is the way in that does not touch email.
--
--   The real fix is custom SMTP (Authentication → Emails → SMTP Settings),
--   after which recovery emails work normally and this file is only for
--   emergencies.
--
-- ⚠  TYPE YOUR OWN PASSWORD BELOW BEFORE RUNNING.
--   Replace BOTH placeholders. Do not paste a password into a chat window,
--   including to Claude, and do not commit this file with a real password in
--   it. Run it, then clear the SQL editor.
--
-- Uses the same bcrypt call as supabase/DISABLE_DEMO_USERS.sql, so the hash
-- is exactly what GoTrue writes itself.
-- ============================================================

-- 1. Check you are about to change the account you think you are.
SELECT id, email, confirmed_at, last_sign_in_at
FROM auth.users
WHERE email = 'PUT_YOUR_EMAIL_HERE';

-- 2. Set the password, and make sure nothing blocks the login.
BEGIN;

UPDATE auth.users
SET encrypted_password = extensions.crypt('PUT_YOUR_NEW_PASSWORD_HERE', extensions.gen_salt('bf')),
    -- A NULL confirmed_at means "email not confirmed", which blocks sign-in
    -- even with the right password. Harmless if it is already set.
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    banned_until       = NULL,
    updated_at         = NOW()
WHERE email = 'PUT_YOUR_EMAIL_HERE';

-- Old sessions keep working with the old token until it expires. Clearing
-- them means the new password is the only way in from now on.
DELETE FROM auth.sessions
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'PUT_YOUR_EMAIL_HERE');

COMMIT;

-- 3. Confirm. email_confirmed_at should be set and banned_until empty.
SELECT email, email_confirmed_at, banned_until, updated_at
FROM auth.users
WHERE email = 'PUT_YOUR_EMAIL_HERE';
