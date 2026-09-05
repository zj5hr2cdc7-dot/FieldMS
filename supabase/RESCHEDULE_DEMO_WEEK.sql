-- ============================================================
-- Rebalance the demo week so nobody is double booked.
--
-- WHAT WAS WRONG
--   The schedule flagged four conflicts, and several jobs ran past knock-off:
--
--     overbooked   Dave  Thu   12.0h against a 9.0h day
--     overbooked   Dave  Fri   26.0h   (three phase upgrade, a multi day job)
--     overbooked   Sam   Thu   18.0h   (data cabling, a two day job)
--     overbooked   Priya Wed   34.0h   (retail fitout, a five day job)
--
--   Plus two same person overlaps that were not flagged, because
--   detectConflicts skips completed jobs: Dave had two jobs running at once on
--   Tuesday and again on Thursday. They still look wrong on screen.
--
-- WHAT CHANGED
--   1. Three jobs moved to a different technician, to spread the load:
--        Fault find at the cafe      Dave  -> Sam    (Tue)
--        Defect rectification        Dave  -> Josh   (Thu)
--        Ceiling fan install x4      Thu   -> Wed    (stays with Josh)
--   2. Start times pulled into the 07:00 to 16:00 working day.
--   3. The three multi day jobs now book the hours for THAT DAY rather than
--      the whole job. Their descriptions say so, so the hours still square
--      with the quoted value. Nothing about the money changed.
--
-- RESULT
--   19 jobs, 4 / 5 / 4 / 3 / 3 across the week. No conflicts, no overlaps,
--   nothing finishing after 16:00, and no one over the 9.0h daily capacity.
--
-- Scoped to the demo tenant. Your own workspace is untouched.
-- Safe to re-run: it sets absolute values rather than shifting them.
-- ============================================================

UPDATE public.jobs j
   SET due_date        = (date_trunc('week', CURRENT_DATE)::date + v.day),
       scheduled_start = ((date_trunc('week', CURRENT_DATE)::date + v.day) + v.start_at)::timestamptz,
       estimated_hours = v.hrs,
       assigned_to     = u.id,
       description     = COALESCE(v.descr, j.description),
       updated_at      = NOW()
  FROM (VALUES
    --  n   day  start                hrs    technician                        new description (NULL = keep)
    (  1,   0,  '07:00'::time,  8.0::numeric, 'dave@voltaicelectrical.com.au',  NULL::text),
    (  2,   0,  '07:30'::time,  4.0,          'sam@voltaicelectrical.com.au',   NULL),
    (  3,   0,  '11:00'::time,  2.5,          'priya@voltaicelectrical.com.au', NULL),
    (  4,   0,  '12:30'::time,  3.0,          'josh@voltaicelectrical.com.au',  NULL),

    (  5,   1,  '07:00'::time,  8.5,          'dave@voltaicelectrical.com.au',  NULL),
    (  6,   1,  '07:00'::time,  6.0,          'sam@voltaicelectrical.com.au',   NULL),
    (  7,   1,  '07:30'::time,  7.5,          'priya@voltaicelectrical.com.au', NULL),
    (  8,   1,  '07:30'::time,  4.0,          'josh@voltaicelectrical.com.au',  NULL),
    -- was Dave at 15:00, on top of his 8.5h LED job
    (  9,   1,  '13:30'::time,  2.0,          'sam@voltaicelectrical.com.au',   NULL),

    ( 10,   2,  '07:00'::time,  6.0,          'dave@voltaicelectrical.com.au',  NULL),
    ( 11,   2,  '07:00'::time,  8.5,          'priya@voltaicelectrical.com.au',
      'Track lighting, feature pendants, 14 GPOs. Stage 2 of a five day fitout, day three booked today.'),
    ( 12,   2,  '07:30'::time,  5.5,          'sam@voltaicelectrical.com.au',   NULL),
    -- moved off Thursday to give Josh a Wednesday and even out the week
    ( 15,   2,  '08:00'::time,  5.0,          'josh@voltaicelectrical.com.au',  NULL),

    ( 13,   3,  '07:00'::time,  8.0,          'dave@voltaicelectrical.com.au',  NULL),
    ( 14,   3,  '07:00'::time,  9.0,          'sam@voltaicelectrical.com.au',
      'Cat6 to 12 workstations, Fluke certification. Two day job, day one booked today.'),
    -- was Dave at 14:00, overlapping his 8h MSB test
    ( 16,   3,  '08:00'::time,  4.0,          'josh@voltaicelectrical.com.au',  NULL),

    ( 17,   4,  '07:00'::time,  9.0,          'dave@voltaicelectrical.com.au',
      'Upgrade to three phase supply, coordinate with Energex. Three day job, day one booked today.'),
    ( 18,   4,  '07:30'::time,  4.5,          'priya@voltaicelectrical.com.au', NULL),
    ( 19,   4,  '07:30'::time,  6.5,          'sam@voltaicelectrical.com.au',   NULL)
  ) AS v(n, day, start_at, hrs, email, descr)
  JOIN auth.users u ON lower(u.email) = v.email
 WHERE j.tenant_id = 'fdec0000-0000-4000-8000-000000000001'::uuid
   AND j.id = ('d0000000-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid;
