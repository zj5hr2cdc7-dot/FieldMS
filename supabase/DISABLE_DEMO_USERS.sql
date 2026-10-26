-- ============================================================
-- Disable the five demo logins on a PUBLIC environment.
--
-- seed_demo / RUN_ALL create five real auth.users rows that all share the
-- password demo1234. On fieldms.com.au that is five working logins anyone
-- can find in the repo or guess.
--
-- Why disable rather than delete: the demo jobs, photos, test sheets and
-- quotes reference these users through created_by / uploaded_by / tested_by
-- foreign keys that do not cascade, so deleting the users fails or would
-- need the demo data removed first. Banning them and scrambling the password
-- kills the logins and keeps the demo data for recording walkthroughs.
--
-- Run in the Supabase SQL editor of the PRODUCTION project. Check the SELECT
-- output first.
-- ============================================================

-- 1. See exactly what will be changed.
SELECT id, email, banned_until, last_sign_in_at
FROM auth.users
WHERE email IN (
  'demo@voltaicelectrical.com.au', 'dave@voltaicelectrical.com.au',
  'sam@voltaicelectrical.com.au', 'priya@voltaicelectrical.com.au',
  'josh@voltaicelectrical.com.au'
);

-- 2. Ban the accounts, replace the shared password with a random one, and
--    end any live sessions.
BEGIN;

UPDATE auth.users
SET banned_until       = 'infinity',
    encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))
WHERE email IN (
  'demo@voltaicelectrical.com.au', 'dave@voltaicelectrical.com.au',
  'sam@voltaicelectrical.com.au', 'priya@voltaicelectrical.com.au',
  'josh@voltaicelectrical.com.au'
);

DELETE FROM auth.sessions
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'demo@voltaicelectrical.com.au', 'dave@voltaicelectrical.com.au',
    'sam@voltaicelectrical.com.au', 'priya@voltaicelectrical.com.au',
    'josh@voltaicelectrical.com.au'
  )
);

COMMIT;

-- 3. Confirm: banned_until should now read infinity for all five.
SELECT email, banned_until FROM auth.users
WHERE email LIKE '%@voltaicelectrical.com.au';
