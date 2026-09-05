-- ============================================================
-- FieldMS: reset a workspace and reseed it as a demo account.
--
-- WHAT THIS DOES
--   1. Resolves the owner and workspace from the email in v_email below.
--   2. DELETES every operational row in that workspace (jobs, quotes,
--      invoices, forms, photos, timesheets, pricing history).
--   3. Reseeds it as "Voltaic Electrical", a small Australian electrical
--      contractor, with a crew, 25 jobs, quotes, invoices and compliance.
--
-- THIS IS DESTRUCTIVE AND CANNOT BE UNDONE.
-- Take a backup first: Supabase dashboard, Database, Backups.
--
-- HOW TO RUN
--   Supabase dashboard, SQL Editor, paste this whole file, Run.
--   It runs as postgres so RLS does not block it.
--   Safe to run more than once: it wipes and reseeds the same workspace.
--
-- SCOPE
--   Everything is keyed to a single tenant_id. No other workspace is touched.
--   Your own login, password and workspace record are left alone.
--
-- PREREQUISITES
--   pgcrypto must be available for crypt() and gen_salt(), used only when
--   seeding the demo crew logins. On Supabase it is installed by default.
--   If you hit "function crypt does not exist", either run
--     CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
--   or set v_make_crew to FALSE below to skip the crew entirely.
--
--   Note: this repo has no migration for the public.jobs table (the
--   migrations jump from 002 to 004). The table exists in the live database
--   but is not in version control, so a fresh project will not have it.
-- ============================================================

DO $$
DECLARE
  -- ── CHANGE THIS if you want to reset a different account ──
  v_email    TEXT := 'jack.gapes@outlook.com';

  v_user     UUID;
  v_tenant   UUID;
  v_deleted  BIGINT;
  t          TEXT;

  -- Deterministic crew ids so re-runs reuse the same people
  v_crew_1   UUID := 'e1000000-0000-4000-8000-000000000001'; -- Dave Nguyen, leading hand
  v_crew_2   UUID := 'e1000000-0000-4000-8000-000000000002'; -- Sam Ellis, electrician
  v_crew_3   UUID := 'e1000000-0000-4000-8000-000000000003'; -- Priya Raman, electrician
  v_crew_4   UUID := 'e1000000-0000-4000-8000-000000000004'; -- Josh Tapu, apprentice

  -- Optional: set to FALSE to skip creating demo crew logins
  v_make_crew BOOLEAN := TRUE;
  v_crew_pw   TEXT := 'demo1234';
BEGIN
  -- ── 1. Resolve the account ────────────────────────────────
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No auth user found for %. Check the email in v_email.', v_email;
  END IF;

  SELECT default_tenant_id INTO v_tenant FROM public.profiles WHERE id = v_user;
  IF v_tenant IS NULL THEN
    SELECT tenant_id INTO v_tenant
    FROM public.tenant_members
    WHERE user_id = v_user
    ORDER BY created_at
    LIMIT 1;
  END IF;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'User % has no workspace. Sign up or run onboarding first.', v_email;
  END IF;

  RAISE NOTICE 'Resetting workspace % for %', v_tenant, v_email;

  -- ── 2. Wipe operational data, scoped to this tenant ───────
  -- Child rows that hang off jobs/estimates and have no tenant_id of their
  -- own are removed first, then the tenant-scoped tables. Tables are guarded
  -- with to_regclass so a missing migration does not abort the run.

  -- Children keyed by parent
  FOREACH t IN ARRAY ARRAY[
    'public.estimate_items|estimate_id|public.estimates|id|business_id',
    'public.estimate_approval_events|estimate_id|public.estimates|id|business_id'
  ] LOOP
    IF to_regclass(split_part(t, '|', 1)) IS NOT NULL
       AND to_regclass(split_part(t, '|', 3)) IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM %s WHERE %I IN (SELECT %I FROM %s WHERE %I = $1)',
        split_part(t, '|', 1), split_part(t, '|', 2),
        split_part(t, '|', 4), split_part(t, '|', 3), split_part(t, '|', 5)
      ) USING v_tenant;
    END IF;
  END LOOP;

  IF to_regclass('public.job_invoice_items') IS NOT NULL AND to_regclass('public.job_invoices') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_invoice_items WHERE invoice_id IN
             (SELECT id FROM public.job_invoices WHERE tenant_id = $1)' USING v_tenant;
  END IF;

  IF to_regclass('public.job_tracking_tokens') IS NOT NULL AND to_regclass('public.jobs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_tracking_tokens WHERE job_id IN
             (SELECT id FROM public.jobs WHERE tenant_id = $1)' USING v_tenant;
  END IF;

  IF to_regclass('public.purchase_order_items') IS NOT NULL AND to_regclass('public.purchase_orders') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.purchase_order_items WHERE purchase_order_id IN
             (SELECT id FROM public.purchase_orders WHERE tenant_id = $1)' USING v_tenant;
  END IF;

  IF to_regclass('public.form_signatures') IS NOT NULL AND to_regclass('public.form_submissions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.form_signatures WHERE submission_id IN
             (SELECT id FROM public.form_submissions WHERE tenant_id = $1)' USING v_tenant;
  END IF;

  IF to_regclass('public.tenant_material_kit_items') IS NOT NULL AND to_regclass('public.tenant_material_kits') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.tenant_material_kit_items WHERE kit_id IN
             (SELECT id FROM public.tenant_material_kits WHERE tenant_id = $1)' USING v_tenant;
  END IF;

  -- Tenant-scoped tables, children before parents
  FOREACH t IN ARRAY ARRAY[
    'public.job_location_updates',
    'public.job_events',
    'public.job_photos',
    'public.job_reports',
    'public.job_test_sheets',
    'public.job_billing_items',
    'public.job_payments',
    'public.job_variations',
    'public.job_invoices',
    'public.job_plans',
    'public.billing_audit_events',
    'public.form_audit_events',
    'public.form_submissions',
    'public.time_entries',
    'public.company_announcements',
    'public.accounting_sync_records',
    'public.sync_runs',
    'public.price_alerts',
    'public.price_changes',
    'public.price_snapshots',
    'public.tenant_price_overrides',
    'public.tenant_trade_prices',
    'public.tenant_favourite_products',
    'public.tenant_material_kits',
    'public.purchase_orders',
    'public.document_counters',
    'public.jobs'
  ] LOOP
    -- Guard on both the table and the column: this repo has tables that are
    -- global rather than tenant scoped, and a missing migration should skip
    -- rather than abort the whole reset.
    IF to_regclass(t) IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = split_part(t, '.', 1)
        AND table_name = split_part(t, '.', 2)
        AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('DELETE FROM %s WHERE tenant_id = $1', t) USING v_tenant;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      IF v_deleted > 0 THEN
        RAISE NOTICE '  cleared % rows from %', v_deleted, t;
      END IF;
    END IF;
  END LOOP;

  -- estimates uses business_id rather than tenant_id
  IF to_regclass('public.estimates') IS NOT NULL THEN
    DELETE FROM public.estimates WHERE business_id = v_tenant;
  END IF;

  -- ── 3. Brand the workspace ────────────────────────────────
  UPDATE public.tenants
     SET name = 'Voltaic Electrical',
         updated_at = NOW()
   WHERE id = v_tenant;

  INSERT INTO public.tenant_onboarding (
    tenant_id, trades, business_size, gst_registered, timezone, currency,
    address, business_email, wholesaler_keys, accounting_provider,
    completed_steps, status, tour_completed, completed_at, updated_at
  ) VALUES (
    v_tenant, ARRAY['electrical'], 'small', TRUE, 'Australia/Brisbane', 'AUD',
    '14 Kingsford Smith Dr, Hamilton QLD 4007', 'accounts@voltaicelectrical.com.au',
    ARRAY['middys', 'rexel'], 'xero',
    ARRAY['business','trades','wholesalers','accounting','team','tour'],
    'completed', TRUE, NOW(), NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    trades = EXCLUDED.trades,
    business_size = EXCLUDED.business_size,
    gst_registered = EXCLUDED.gst_registered,
    address = EXCLUDED.address,
    business_email = EXCLUDED.business_email,
    wholesaler_keys = EXCLUDED.wholesaler_keys,
    accounting_provider = EXCLUDED.accounting_provider,
    completed_steps = EXCLUDED.completed_steps,
    status = 'completed',
    tour_completed = TRUE,
    updated_at = NOW();

  -- ── 4. Demo crew ──────────────────────────────────────────
  -- Four extra logins so the Staff page and the field app have people in
  -- them. All share the password in v_crew_pw. Set v_make_crew to FALSE
  -- above if you would rather not create these.
  IF v_make_crew THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    SELECT c.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           c.email, crypt(v_crew_pw, gen_salt('bf')), NOW(),
           '{"provider":"email","providers":["email"]}'::jsonb,
           jsonb_build_object('full_name', c.name), NOW(), NOW()
    FROM (VALUES
      (v_crew_1, 'dave@voltaicelectrical.com.au',  'Dave Nguyen'),
      (v_crew_2, 'sam@voltaicelectrical.com.au',   'Sam Ellis'),
      (v_crew_3, 'priya@voltaicelectrical.com.au', 'Priya Raman'),
      (v_crew_4, 'josh@voltaicelectrical.com.au',  'Josh Tapu')
    ) AS c(id, email, name)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, default_tenant_id, phone, vehicle, qualifications, licences, created_at, updated_at)
    SELECT c.id, c.name, c.email, v_tenant, c.phone, c.vehicle, c.quals, c.lics, NOW(), NOW()
    FROM (VALUES
      (v_crew_1, 'Dave Nguyen',  'dave@voltaicelectrical.com.au',  '0412 884 201', 'Hilux, 1ABC234', ARRAY['A Grade Electrical','Test and Tag'], ARRAY['QLD Electrical Contractor 88421']),
      (v_crew_2, 'Sam Ellis',    'sam@voltaicelectrical.com.au',   '0413 992 118', 'Transit, 2DEF567', ARRAY['A Grade Electrical'], ARRAY['QLD Electrical Mechanic 91223']),
      (v_crew_3, 'Priya Raman',  'priya@voltaicelectrical.com.au', '0431 507 664', 'Ranger, 3GHI890', ARRAY['A Grade Electrical','Solar Accreditation'], ARRAY['QLD Electrical Mechanic 90887']),
      (v_crew_4, 'Josh Tapu',    'josh@voltaicelectrical.com.au',  '0422 316 745', 'Shared van', ARRAY['3rd year apprentice'], ARRAY[]::TEXT[])
    ) AS c(id, name, email, phone, vehicle, quals, lics)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      default_tenant_id = EXCLUDED.default_tenant_id,
      phone = EXCLUDED.phone,
      vehicle = EXCLUDED.vehicle,
      qualifications = EXCLUDED.qualifications,
      licences = EXCLUDED.licences,
      updated_at = NOW();

    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    SELECT v_tenant, c.id, c.role
    FROM (VALUES
      (v_crew_1, 'admin'),
      (v_crew_2, 'member'),
      (v_crew_3, 'member'),
      (v_crew_4, 'member')
    ) AS c(id, role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  ELSE
    v_crew_1 := v_user; v_crew_2 := v_user; v_crew_3 := v_user; v_crew_4 := v_user;
  END IF;

  -- Make sure the real owner is still the owner
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant, v_user, 'owner')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

  UPDATE public.profiles SET default_tenant_id = v_tenant WHERE id = v_user;

  -- ── 5. Jobs ───────────────────────────────────────────────
  -- 25 jobs spread across the last 10 weeks and the next 3, covering every
  -- status so the dashboard, schedule and pipeline all have something in them.
  INSERT INTO public.jobs (
    id, tenant_id, title, description, status, priority, estimated_hours,
    due_date, scheduled_start, quote_total, gst_rate, po_number,
    created_by, assigned_to,
    customer_name, customer_phone, customer_email, customer_address,
    created_at, updated_at
  )
  SELECT
    ('d0000000-0000-4000-8000-' || lpad(j.n::text, 12, '0'))::uuid,
    v_tenant, j.title, j.descr, j.status, j.priority, j.hours,
    (CURRENT_DATE + j.due_off)::date,
    (CURRENT_DATE + j.due_off)::timestamptz + j.start_time,
    j.total, 10.0, j.po,
    v_user,
    CASE j.crew WHEN 1 THEN v_crew_1 WHEN 2 THEN v_crew_2 WHEN 3 THEN v_crew_3 ELSE v_crew_4 END,
    j.cust, j.phone, j.email, j.addr,
    NOW() - ((70 - j.due_off) || ' days')::interval,
    NOW()
  FROM (VALUES
    ( 1,'Switchboard upgrade','Replace ceramic fuse board with 18 way board, 6 RCBOs, main switch and surge protection.','completed','high',9.0,-63,'08:00'::time,3480.00,'PO-88214',1,'Acme Corp','07 3216 8890','accounts@acmecorp.com.au','14 Kingsford Smith Dr, Hamilton QLD'),
    ( 2,'RCD testing, annual','Test and tag plus RCD trip testing across 42 outlets. Certificate issued.','completed','medium',6.0,-58,'07:30'::time,1180.00,NULL,2,'Bright Homes','07 3355 1120','maintenance@brighthomes.com.au','14 King St, Newstead QLD'),
    ( 3,'EV charger install','Supply and install 7kW single phase wall charger, dedicated 32A circuit, load management.','completed','medium',7.5,-54,'09:00'::time,2650.00,NULL,3,'M. Cavendish','0409 771 233','mcavendish@gmail.com','8 Rosebank Ave, Ascot QLD'),
    ( 4,'Kitchen rewire','Strip out and rewire kitchen, 8 new GPOs, under bench lighting, oven and cooktop circuits.','completed','high',22.0,-49,'07:00'::time,6890.00,NULL,1,'The Fletchers','0417 220 986','jenny.fletcher@outlook.com','31 Sandgate Rd, Clayfield QLD'),
    ( 5,'Emergency, no power','Loss of supply to half the house. Found failed neutral at the main link.','completed','urgent',3.0,-45,'18:30'::time,540.00,NULL,2,'S. Whitmore','0433 118 002','swhitmore@bigpond.com','2/19 Bonney Ave, Clayfield QLD'),
    ( 6,'Office lighting retrofit','Replace 64 fluorescent troffers with LED panels, new emergency lighting test.','completed','medium',26.0,-40,'06:30'::time,11240.00,'PO-77341',1,'Northgate Business Park','07 3260 4477','facilities@northgatepark.com.au','460 Nudgee Rd, Hendra QLD'),
    ( 7,'Ceiling fan install x4','Install four DC ceiling fans with wall controllers in existing loom points.','completed','low',5.0,-36,'08:30'::time,1420.00,NULL,4,'D. Okafor','0426 553 811','dokafor@gmail.com','77 Days Rd, Grange QLD'),
    ( 8,'Solar inverter fault','Fronius inverter reporting State 522. Isolated string fault at rooftop MC4 connector.','completed','high',4.5,-31,'10:00'::time,780.00,NULL,3,'R. Kaminski','0402 889 314','rkaminski@icloud.com','5 Hillcrest St, Wooloowin QLD'),
    ( 9,'Data cabling, 12 points','Cat6 to 12 workstations, patch panel termination and Fluke certification.','completed','medium',18.0,-26,'07:00'::time,5340.00,'PO-77502',2,'Northgate Business Park','07 3260 4477','facilities@northgatepark.com.au','460 Nudgee Rd, Hendra QLD'),
    (10,'Hot water changeover','Decommission storage unit, run new 20A circuit for heat pump, install timer.','completed','medium',5.5,-21,'08:00'::time,1690.00,NULL,1,'A. Petrides','0438 664 129','apetrides@hotmail.com','12 Buchanan St, Nundah QLD'),
    (11,'Switchboard fault, tripping','Main RCD tripping intermittently overnight. Insulation testing on all circuits.','in_progress','urgent',6.0,-3,'07:30'::time,1250.00,NULL,1,'Riverbend Cafe','07 3862 9014','hello@riverbendcafe.com.au','188 Racecourse Rd, Ascot QLD'),
    (12,'Shed subboard','Run 16mm SDI to detached shed, install 6 way subboard with RCBOs and external GPOs.','in_progress','medium',12.0,-1,'07:00'::time,3980.00,NULL,2,'G. Halloran','0447 209 553','ghalloran@gmail.com','40 Wellington St, Virginia QLD'),
    (13,'Retail fitout, stage 2','Lighting track, feature pendants, 14 GPOs and dedicated circuits for display fridges.','in_progress','high',34.0,0,'06:30'::time,14800.00,'PO-79118',3,'Lumen Retail Group','07 3891 2200','projects@lumenretail.com.au','Shop 4, 210 Given Tce, Paddington QLD'),
    (14,'Smoke alarm compliance','Interconnected photoelectric alarms to QLD standard, 6 bedrooms plus hallways.','in_progress','high',8.0,1,'08:00'::time,2340.00,NULL,4,'Meridian Property','07 3010 8866','repairs@meridianproperty.com.au','3 Toorak Rd, Hamilton QLD'),
    (15,'Pool equipment circuit','New RCD protected circuit to pool pump and chlorinator, bonding to AS/NZS 3000.','open','medium',6.5,3,'07:30'::time,1980.00,NULL,2,'T. Beaumont','0404 337 118','tbeaumont@outlook.com','66 Alexandra Rd, Ascot QLD'),
    (16,'Warehouse LED highbay','Replace 28 metal halide highbays with LED, new switching and daylight sensors.','open','medium',30.0,5,'06:00'::time,18600.00,'PO-79240',1,'Portside Logistics','07 3268 5510','maintenance@portsidelog.com.au','120 MacArthur Ave, Pinkenba QLD'),
    (17,'Apartment rewire, unit 3','Full rewire of two bedroom unit, new board, 14 GPOs, LED downlights throughout.','open','high',40.0,8,'07:00'::time,12400.00,NULL,3,'Meridian Property','07 3010 8866','repairs@meridianproperty.com.au','3/58 Barlow St, Clayfield QLD'),
    (18,'Security camera power','Install 6 PoE camera power points and UPS backed circuit for NVR cabinet.','open','low',9.0,10,'08:00'::time,2760.00,NULL,4,'Riverbend Cafe','07 3862 9014','hello@riverbendcafe.com.au','188 Racecourse Rd, Ascot QLD'),
    (19,'Three phase upgrade','Upgrade single phase to three phase supply, new mains, coordinate with Energex.','open','high',26.0,13,'07:00'::time,9450.00,NULL,1,'Hendra Joinery','07 3268 7742','admin@hendrajoinery.com.au','9 Zillmere Rd, Boondall QLD'),
    (20,'Outdoor lighting, garden','Low voltage garden lighting, transformer, timer and 4 wall mounted floods.','open','low',7.0,16,'09:00'::time,2180.00,NULL,4,'L. Marchetti','0415 882 067','lmarchetti@gmail.com','23 Bellevue Tce, Clayfield QLD'),
    (21,'Exit and emergency test','Six monthly discharge test on 34 fittings, log book updated and defects reported.','open','medium',6.0,19,'07:30'::time,1450.00,'PO-79411',2,'Northgate Business Park','07 3260 4477','facilities@northgatepark.com.au','460 Nudgee Rd, Hendra QLD'),
    (22,'Air con circuit, ducted','Dedicated 20A circuit and isolator for new ducted system. Electrical only.','open','medium',5.0,21,'08:00'::time,1340.00,NULL,3,'P. Nguyen','0468 220 774','pnguyen@live.com.au','11 Roseleigh St, Wavell Heights QLD'),
    (23,'Defect rectification','Rectify defects from level 2 inspection, bonding and labelling on the main board.','open','urgent',4.0,2,'07:00'::time,890.00,NULL,1,'Hendra Joinery','07 3268 7742','admin@hendrajoinery.com.au','9 Zillmere Rd, Boondall QLD'),
    (24,'Quote follow up, rewire','Site measure and quote for full rewire of 1950s post war home.','cancelled','low',2.0,-14,'10:00'::time,0.00,NULL,2,'K. Sorensen','0407 991 226','ksorensen@gmail.com','18 Hudson Rd, Albion QLD'),
    (25,'Garage GPO install','Client went with another trade before scheduling.','cancelled','low',3.0,-8,'09:00'::time,0.00,NULL,4,'B. Achterberg','0419 553 208','bachterberg@gmail.com','7 Kent St, Hamilton QLD')
  ) AS j(n, title, descr, status, priority, hours, due_off, start_time, total, po, crew, cust, phone, email, addr);

  -- ── 6. Quotes ─────────────────────────────────────────────
  INSERT INTO public.estimates (id, business_id, customer_name, status, total, created_at, updated_at)
  SELECT ('e0000000-0000-4000-8000-' || lpad(q.n::text, 12, '0'))::uuid,
         v_tenant, q.cust, q.status, q.total,
         NOW() - (q.age_days || ' days')::interval, NOW()
  FROM (VALUES
    ( 1,'Portside Logistics','approved',18600.00,34),
    ( 2,'Meridian Property','approved',12400.00,29),
    ( 3,'Hendra Joinery','approved',9450.00,24),
    ( 4,'Lumen Retail Group','approved',14800.00,41),
    ( 5,'T. Beaumont','sent',1980.00,9),
    ( 6,'L. Marchetti','sent',2180.00,7),
    ( 7,'P. Nguyen','sent',1340.00,5),
    ( 8,'Riverbend Cafe','sent',2760.00,4),
    ( 9,'Coorparoo Dental','sent',7320.00,3),
    (10,'K. Sorensen','declined',21800.00,18),
    (11,'B. Achterberg','declined',1120.00,12),
    (12,'Ascot Medical Centre','draft',5640.00,2),
    (13,'D. Okafor','draft',980.00,1),
    (14,'Northgate Business Park','draft',3410.00,1),
    (15,'Hamilton Wharf Apartments','draft',26400.00,0)
  ) AS q(n, cust, status, total, age_days);

  INSERT INTO public.estimate_items (estimate_id, name, quantity, unit_price, total)
  SELECT ('e0000000-0000-4000-8000-' || lpad(i.n::text, 12, '0'))::uuid,
         i.name, i.qty, i.price, i.qty * i.price
  FROM (VALUES
    ( 1,'LED highbay 150W',            28, 289.00),
    ( 1,'Labour, installation',        30, 110.00),
    ( 1,'Daylight sensor and controls', 4, 218.00),
    ( 2,'Rewire, per point',           38, 165.00),
    ( 2,'Switchboard, 12 way',          1, 1180.00),
    ( 2,'LED downlight',               22,  62.00),
    ( 3,'Three phase mains, 25mm',     40,  46.00),
    ( 3,'Labour, upgrade works',       26, 110.00),
    ( 3,'Energex coordination fee',     1, 690.00),
    ( 4,'Track lighting, 3m run',       8, 246.00),
    ( 4,'Feature pendant',             12, 198.00),
    ( 4,'Labour, fitout',              34, 110.00),
    ( 5,'RCBO 20A',                     2,  78.00),
    ( 5,'Labour, pool circuit',         6, 110.00),
    ( 5,'Equipotential bonding kit',    1, 240.00),
    ( 9,'Dedicated chair circuits',     4, 420.00),
    ( 9,'Labour, dental fitout',       38, 110.00),
    (15,'Common area LED upgrade',     84, 148.00),
    (15,'Labour, apartments',         110, 110.00)
  ) AS i(n, name, qty, price);

  -- ── 7. Invoices ───────────────────────────────────────────
  INSERT INTO public.job_invoices (
    tenant_id, job_id, invoice_number, kind, status,
    subtotal_ex_gst, gst_amount, total_inc_gst, amount_paid,
    due_date, issued_at, sent_at, created_by, created_at
  )
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(v.job_n::text, 12, '0'))::uuid,
         v.num, v.kind, v.status,
         v.sub, round(v.sub * 0.10, 2), round(v.sub * 1.10, 2), v.paid,
         (CURRENT_DATE + v.due_off)::date,
         NOW() - (v.age || ' days')::interval,
         NOW() - (v.age || ' days')::interval,
         v_user,
         NOW() - (v.age || ' days')::interval
  FROM (VALUES
    ( 1,'INV-1041','tax','paid',      3480.00, 3828.00, -33, 63),
    ( 2,'INV-1042','tax','paid',      1180.00, 1298.00, -28, 58),
    ( 3,'INV-1043','tax','paid',      2650.00, 2915.00, -24, 54),
    ( 4,'INV-1044','tax','paid',      6890.00, 7579.00, -19, 49),
    ( 5,'INV-1045','tax','paid',       540.00,  594.00, -15, 45),
    ( 6,'INV-1046','tax','paid',     11240.00,12364.00, -10, 40),
    ( 7,'INV-1047','tax','paid',      1420.00, 1562.00,  -6, 36),
    ( 8,'INV-1048','tax','overdue',    780.00,    0.00,  -9, 31),
    ( 9,'INV-1049','tax','overdue',   5340.00,    0.00,  -4, 26),
    (10,'INV-1050','tax','part_paid', 1690.00,  900.00,   4, 21),
    (13,'INV-1051','progress','sent', 7400.00,    0.00,  11,  6),
    (16,'INV-1052','deposit','sent',  4650.00,    0.00,  14,  3)
  ) AS v(job_n, num, kind, status, sub, paid, due_off, age);

  -- ── 8. Labour lines on the active jobs ────────────────────
  INSERT INTO public.job_billing_items (job_id, tenant_id, description, hours, rate_per_hour, markup_percent, revenue, cost, created_by)
  SELECT ('d0000000-0000-4000-8000-' || lpad(b.job_n::text, 12, '0'))::uuid,
         v_tenant, b.descr, b.hours, b.rate, b.markup,
         round(b.hours * b.rate * (1 + b.markup / 100), 2),
         round(b.hours * b.rate, 2),
         v_user
  FROM (VALUES
    (11,'Fault finding and insulation testing', 6.0, 110.00, 0.0),
    (12,'Subboard install, two hands',         12.0, 105.00, 5.0),
    (13,'Retail fitout, stage 2 labour',       34.0, 110.00, 8.0),
    (14,'Smoke alarm install and commission',   8.0, 105.00, 0.0),
    (16,'Highbay changeover, EWP work',        30.0, 125.00,10.0),
    (17,'Unit rewire, full',                   40.0, 110.00, 5.0)
  ) AS b(job_n, descr, hours, rate, markup);

  -- ── 9. Compliance: test sheets ────────────────────────────
  INSERT INTO public.job_test_sheets (
    tenant_id, job_id, status, installation_address, switchboard_location,
    supply_type, circuits, certificate_number, tested_by, tester_name,
    tester_license, test_date, completed_at, notes
  )
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(s.job_n::text, 12, '0'))::uuid,
         s.status, s.addr, s.sb, s.supply,
         s.circuits::jsonb, s.cert,
         v_crew_1, 'Dave Nguyen', 'QLD Electrical Contractor 88421',
         (CURRENT_DATE + s.day_off)::date,
         CASE WHEN s.status = 'completed' THEN NOW() + (s.day_off || ' days')::interval ELSE NULL END,
         s.notes
  FROM (VALUES
    ( 1,'completed','14 Kingsford Smith Dr, Hamilton QLD','Main switchboard, garage','230V single phase',
      '[{"circuit_ref":"C1","description":"Lighting, ground floor","cable_size":"1.5mm TPS","protection_type":"RCBO","protection_rating":"16A","earth_continuity_ohms":0.21,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":21,"rcd_trip_ma":28,"visual_pass":true,"notes":""},{"circuit_ref":"C2","description":"Power, kitchen","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.17,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":18,"rcd_trip_ma":26,"visual_pass":true,"notes":""},{"circuit_ref":"C3","description":"Oven","cable_size":"6mm TPS","protection_type":"RCBO","protection_rating":"32A","earth_continuity_ohms":0.11,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":24,"rcd_trip_ma":29,"visual_pass":true,"notes":""}]',
      'CERT-2026-0041',-63,'All circuits tested to AS/NZS 3000. Board labelled and photographed.'),
    ( 4,'completed','31 Sandgate Rd, Clayfield QLD','Main switchboard, hallway','230V single phase',
      '[{"circuit_ref":"K1","description":"Kitchen GPOs","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.19,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":19,"rcd_trip_ma":27,"visual_pass":true,"notes":""},{"circuit_ref":"K2","description":"Cooktop","cable_size":"6mm TPS","protection_type":"RCBO","protection_rating":"32A","earth_continuity_ohms":0.12,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":22,"rcd_trip_ma":30,"visual_pass":true,"notes":""}]',
      'CERT-2026-0044',-49,'Kitchen rewire certified. Client walkthrough completed.'),
    ( 6,'completed','460 Nudgee Rd, Hendra QLD','Distribution board, level 1','400V three phase',
      '[{"circuit_ref":"L1","description":"Office lighting, north","cable_size":"2.5mm TPS","protection_type":"MCB","protection_rating":"16A","earth_continuity_ohms":0.28,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":null,"rcd_trip_ma":null,"visual_pass":true,"notes":"Emergency fittings discharge tested"}]',
      'CERT-2026-0046',-40,'LED retrofit certified. Emergency lighting log book updated.'),
    (13,'draft','Shop 4, 210 Given Tce, Paddington QLD','Tenancy board','230V single phase',
      '[]','CERT-2026-0052',0,'Stage 2 in progress, testing to follow rough in.')
  ) AS s(job_n, status, addr, sb, supply, circuits, cert, day_off, notes);

  -- ── 10. Timesheets, last two weeks ────────────────────────
  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         CASE (d.n % 4) WHEN 0 THEN v_crew_1 WHEN 1 THEN v_crew_2 WHEN 2 THEN v_crew_3 ELSE v_crew_4 END,
         ('d0000000-0000-4000-8000-' || lpad((11 + (d.n % 4))::text, 12, '0'))::uuid,
         'shift',
         (CURRENT_DATE - (d.n / 4))::timestamptz + interval '7 hours',
         (CURRENT_DATE - (d.n / 4))::timestamptz + interval '15 hours 30 minutes',
         NULL,
         (d.n / 4) > 2
  FROM generate_series(0, 39) AS d(n)
  WHERE EXTRACT(dow FROM (CURRENT_DATE - (d.n / 4))) BETWEEN 1 AND 5;

  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         CASE (d.n % 4) WHEN 0 THEN v_crew_1 WHEN 1 THEN v_crew_2 WHEN 2 THEN v_crew_3 ELSE v_crew_4 END,
         NULL, 'travel',
         (CURRENT_DATE - (d.n / 4))::timestamptz + interval '6 hours 20 minutes',
         (CURRENT_DATE - (d.n / 4))::timestamptz + interval '7 hours',
         'Yard to site', (d.n / 4) > 2
  FROM generate_series(0, 23) AS d(n)
  WHERE EXTRACT(dow FROM (CURRENT_DATE - (d.n / 4))) BETWEEN 1 AND 5;

  -- ── 11. Noticeboard ───────────────────────────────────────
  INSERT INTO public.company_announcements (tenant_id, title, body, urgent, created_by, created_at)
  SELECT v_tenant, a.title, a.body, a.urgent, v_user, NOW() - (a.age || ' days')::interval
  FROM (VALUES
    ('Toolbox talk Monday 6:30am','Working at heights refresher in the yard before we head out. Bring your harness for inspection.', TRUE, 1),
    ('New wholesaler pricing is live','Middys and Rexel accounts are synced. Check the app for current pricing before you quote.', FALSE, 4),
    ('Timesheets close Sunday 8pm','Submit through the field app. Anything late lands in the following pay run.', FALSE, 6),
    ('Portside site induction required','Everyone on the Pinkenba job needs the online induction done before Monday.', TRUE, 9)
  ) AS a(title, body, urgent, age);

  RAISE NOTICE 'Done. Workspace % reseeded as Voltaic Electrical.', v_tenant;
  IF v_make_crew THEN
    RAISE NOTICE 'Crew logins: dave@ / sam@ / priya@ / josh@voltaicelectrical.com.au, password %', v_crew_pw;
  END IF;
END $$;
