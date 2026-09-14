-- ============================================================
-- FieldMS demo workspace: Voltaic Electrical.
--
-- A separate workspace, not a takeover of yours.
--
--   Your own workspace is never read, never written, never deleted. The demo
--   lives in its own tenant with its own owner login, so you can keep it
--   around indefinitely, show it to anyone, break it, and re-run this file to
--   put it back — all without touching real data.
--
--   You are added as an owner of the demo workspace too, so it appears in the
--   workspace switcher in the top right. Flip between your business and the
--   demo without signing out.
--
-- SIGN IN
--   Demo owner      demo@voltaicelectrical.com.au   / demo1234
--   Manager         dave@voltaicelectrical.com.au   / demo1234
--   Technicians     sam@ / priya@ / josh@voltaicelectrical.com.au / demo1234
--   Or just switch workspace while signed in as yourself.
--
-- WHAT IS IN IT
--   Voltaic Electrical, Brisbane. Owner plus four crew, two to five jobs a
--   day across the week, compliance in order and the money reconciled.
--
--   5 people      owner + leading hand + 2 electricians + apprentice
--   12 customers  residential, commercial, strata, agent, builder
--   18 sites      several customers with multiple addresses
--   30 assets     switchboards, RCDs, exit & emergency, solar, EV.
--                 Deliberately staged: 8 overdue, 8 due within 60 days
--   41 jobs       this week Mon to Fri, plus 8 weeks of history
--   9 test sheets 8 completed with real circuit results, 1 in progress
--   16 invoices   paid, part paid, overdue and outstanding
--   timesheets    the current week for all four crew
--
-- Dates hang off the current week, so it always looks like "this week"
-- whenever you run it. Re-run any time to reset the demo to a clean state.
--
-- PREREQUISITE: run RUN_ALL.sql, or migrations 004 and 006 to 026, first.
-- ============================================================

DO $$
DECLARE
  -- Your login. Used only to add you to the demo workspace so it shows up in
  -- your switcher. Your own workspace is not touched.
  v_you_email TEXT := 'jack.gapes@outlook.com';
  v_you UUID;

  -- The demo workspace and its people. Fixed ids so re-runs reuse them.
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000'; -- demo@
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001'; -- manager
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002'; -- electrician
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003'; -- electrician
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004'; -- apprentice
  v_pw     TEXT := 'demo1234';

  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
  t TEXT;
BEGIN
  IF to_regclass('public.customers') IS NULL OR to_regclass('public.assets') IS NULL THEN
    RAISE EXCEPTION 'Run RUN_ALL.sql first: the customers and assets tables do not exist yet.';
  END IF;

  -- ── People ────────────────────────────────────────────────
  -- The token columns below have no default and GoTrue scans them into plain
  -- Go strings, which cannot hold NULL. Leaving them out produced rows that
  -- broke sign in for EVERY account with "Database error querying schema" —
  -- the query fails before any password is checked. GoTrue's own inserts write
  -- empty strings, so these must too. See FIX_AUTH_NULL_TOKENS.sql.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, phone_change_token, reauthentication_token,
    email_change, phone_change)
  SELECT c.id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
         c.email, crypt(v_pw, gen_salt('bf')), NOW(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', c.nm), NOW(), NOW(),
         '', '', '', '', '', '', '', ''
  FROM (VALUES
    (v_owner,'demo@voltaicelectrical.com.au','Alex Voltaic'),
    (v_dave, 'dave@voltaicelectrical.com.au','Dave Nguyen'),
    (v_sam,  'sam@voltaicelectrical.com.au','Sam Ellis'),
    (v_priya,'priya@voltaicelectrical.com.au','Priya Raman'),
    (v_josh, 'josh@voltaicelectrical.com.au','Josh Tapu')
  ) AS c(id,email,nm)
  ON CONFLICT (id) DO NOTHING;

  -- GoTrue's password grant joins auth.users to auth.identities. Signing up
  -- through the app creates this row; inserting a user by hand does not, and
  -- without it sign in fails with "Database error querying schema" for EVERY
  -- account. identity_data must carry sub and email — GoTrue reads them back
  -- out of the jsonb when building the session.
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  SELECT u.id::text, u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email,
                            'email_verified', true, 'phone_verified', false),
         'email', NOW(), NOW(), NOW()
    FROM auth.users u
   WHERE u.id IN (v_owner, v_dave, v_sam, v_priya, v_josh)
     AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);

  -- ── The workspace ─────────────────────────────────────────
  INSERT INTO public.tenants (id, name, slug, abn, phone, website,
                              work_day_start, work_day_end, working_days)
  VALUES (v_tenant, 'Voltaic Electrical (demo)', 'voltaic-electrical-demo',
          '54 812 447 903', '07 3268 4410', 'https://voltaicelectrical.com.au',
          '07:00', '16:00', ARRAY[1,2,3,4,5])
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, abn = EXCLUDED.abn, phone = EXCLUDED.phone,
    website = EXCLUDED.website, work_day_start = EXCLUDED.work_day_start,
    work_day_end = EXCLUDED.work_day_end, working_days = EXCLUDED.working_days;

  INSERT INTO public.profiles (id, full_name, email, default_tenant_id, phone, vehicle, qualifications, licences)
  SELECT c.id, c.nm, c.em, v_tenant, c.ph, c.veh, c.q, c.l
  FROM (VALUES
    (v_owner,'Alex Voltaic','demo@voltaicelectrical.com.au','0400 111 222','Amarok DEMO1',ARRAY['A Grade Electrical','Electrical Contractor'],ARRAY['QLD Electrical Contractor 88421']),
    (v_dave,'Dave Nguyen','dave@voltaicelectrical.com.au','0412 884 201','Hilux 1ABC234',ARRAY['A Grade Electrical','Test and Tag'],ARRAY['QLD Electrical Mechanic 88999']),
    (v_sam,'Sam Ellis','sam@voltaicelectrical.com.au','0413 992 118','Transit 2DEF567',ARRAY['A Grade Electrical'],ARRAY['QLD Electrical Mechanic 91223']),
    (v_priya,'Priya Raman','priya@voltaicelectrical.com.au','0431 507 664','Ranger 3GHI890',ARRAY['A Grade Electrical','Solar Accreditation'],ARRAY['QLD Electrical Mechanic 90887']),
    (v_josh,'Josh Tapu','josh@voltaicelectrical.com.au','0422 316 745','Shared van',ARRAY['3rd year apprentice'],ARRAY[]::TEXT[])
  ) AS c(id,nm,em,ph,veh,q,l)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, default_tenant_id = EXCLUDED.default_tenant_id,
    phone = EXCLUDED.phone, vehicle = EXCLUDED.vehicle,
    qualifications = EXCLUDED.qualifications, licences = EXCLUDED.licences;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  SELECT v_tenant, c.id, c.r FROM (VALUES
    (v_owner,'owner'), (v_dave,'manager'),
    (v_sam,'technician'), (v_priya,'technician'), (v_josh,'technician')
  ) AS c(id,r)
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Add you as an owner so the demo appears in your workspace switcher.
  -- Your own default_tenant_id is left alone: you still land in your business.
  SELECT id INTO v_you FROM auth.users WHERE lower(email) = lower(v_you_email);
  IF v_you IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant, v_you, 'owner')
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';
    RAISE NOTICE 'Added % to the demo workspace. Use the switcher, top right.', v_you_email;
  END IF;

  -- ── Reset the demo workspace only ─────────────────────────
  -- Scoped entirely to v_tenant, which nothing but this file writes to.
  IF to_regclass('public.job_invoice_items') IS NOT NULL THEN
    DELETE FROM public.job_invoice_items WHERE invoice_id IN
      (SELECT id FROM public.job_invoices WHERE tenant_id = v_tenant);
  END IF;
  DELETE FROM public.estimate_items WHERE estimate_id IN
    (SELECT id FROM public.estimates WHERE business_id = v_tenant);

  FOREACH t IN ARRAY ARRAY[
    'public.job_test_sheets','public.job_photos','public.job_reports','public.job_events',
    'public.job_billing_items','public.job_payments','public.job_variations','public.job_invoices',
    'public.time_entries','public.company_announcements','public.assets','public.sites',
    'public.customers','public.jobs'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %s WHERE tenant_id = $1', t) USING v_tenant;
    END IF;
  END LOOP;
  DELETE FROM public.estimates WHERE business_id = v_tenant;

  -- ── Setup marked complete, so no wizard on the way in ─────
  INSERT INTO public.tenant_onboarding (
    tenant_id, trades, business_size, gst_registered, timezone, currency,
    address, business_email, wholesaler_keys, accounting_provider,
    completed_steps, status, tour_completed, completed_at, technicians_see_all_jobs
  ) VALUES (
    v_tenant, ARRAY['electrical'], 'small', TRUE, 'Australia/Brisbane', 'AUD',
    '14 Kingsford Smith Dr, Hamilton QLD 4007', 'accounts@voltaicelectrical.com.au',
    ARRAY['middys','rexel'], 'xero',
    ARRAY['business','trades','branding','wholesalers','integrations','team','tour'],
    'completed', TRUE, NOW(), FALSE)
  ON CONFLICT (tenant_id) DO UPDATE SET
    trades = EXCLUDED.trades, business_size = EXCLUDED.business_size,
    gst_registered = EXCLUDED.gst_registered, address = EXCLUDED.address,
    business_email = EXCLUDED.business_email, wholesaler_keys = EXCLUDED.wholesaler_keys,
    accounting_provider = EXCLUDED.accounting_provider,
    completed_steps = EXCLUDED.completed_steps, status = 'completed',
    tour_completed = TRUE, technicians_see_all_jobs = FALSE;

  INSERT INTO public.tenant_branding (tenant_id, electrical_license, trading_name, business_address)
  VALUES (v_tenant, 'QLD Electrical Contractor 88421', 'Voltaic Electrical',
          '14 Kingsford Smith Dr, Hamilton QLD 4007')
  ON CONFLICT (tenant_id) DO UPDATE SET
    electrical_license = EXCLUDED.electrical_license,
    trading_name = EXCLUDED.trading_name;

  -- ── Customers ─────────────────────────────────────────────
  INSERT INTO public.customers (id, tenant_id, name, kind, email, phone, billing_address, marketing_consent, marketing_consent_source)
  SELECT ('c0000000-0000-4000-8000-' || lpad(c.n::text,12,'0'))::uuid,
         v_tenant, c.nm, c.k, c.em, c.ph, c.addr, c.consent, 'demo_seed'
  FROM (VALUES
    ( 1,'Northgate Business Park','commercial','facilities@northgatepark.com.au','07 3260 4477','460 Nudgee Rd, Hendra QLD','express'),
    ( 2,'Meridian Property','agent','repairs@meridianproperty.com.au','07 3010 8866','3 Toorak Rd, Hamilton QLD','express'),
    ( 3,'Portside Logistics','commercial','maintenance@portsidelog.com.au','07 3268 5510','120 MacArthur Ave, Pinkenba QLD','express'),
    ( 4,'Riverbend Cafe','commercial','hello@riverbendcafe.com.au','07 3862 9014','188 Racecourse Rd, Ascot QLD','implied'),
    ( 5,'Hamilton Wharf Apartments','strata','bc@hamiltonwharf.com.au','07 3268 1180','7 Hercules St, Hamilton QLD','express'),
    ( 6,'Lumen Retail Group','commercial','projects@lumenretail.com.au','07 3891 2200','Shop 4, 210 Given Tce, Paddington QLD','implied'),
    ( 7,'Hendra Joinery','builder','admin@hendrajoinery.com.au','07 3268 7742','9 Zillmere Rd, Boondall QLD','implied'),
    ( 8,'Acme Corp','commercial','accounts@acmecorp.com.au','07 3216 8890','14 Kingsford Smith Dr, Hamilton QLD','express'),
    ( 9,'The Fletchers','residential','jenny.fletcher@outlook.com','0417 220 986','31 Sandgate Rd, Clayfield QLD','implied'),
    (10,'M. Cavendish','residential','mcavendish@bigpond.com','0409 771 233','8 Rosebank Ave, Ascot QLD','implied'),
    (11,'T. Beaumont','residential','tbeaumont@outlook.com','0404 337 118','66 Alexandra Rd, Ascot QLD','declined'),
    (12,'D. Okafor','residential','dokafor@bigpond.com','0426 553 811','77 Days Rd, Grange QLD','implied')
  ) AS c(n,nm,k,em,ph,addr,consent);

  -- ── Sites ─────────────────────────────────────────────────
  INSERT INTO public.sites (id, tenant_id, customer_id, label, address, access_notes, switchboard_location)
  SELECT ('50000000-0000-4000-8000-' || lpad(s.n::text,12,'0'))::uuid,
         v_tenant, ('c0000000-0000-4000-8000-' || lpad(s.cust::text,12,'0'))::uuid,
         s.lbl, s.addr, s.access, s.sb
  FROM (VALUES
    ( 1, 1,'Main building','460 Nudgee Rd, Hendra QLD','Report to reception, sign in','Level 1 riser cupboard'),
    ( 2, 1,'Warehouse B','462 Nudgee Rd, Hendra QLD','Roller door 3, code 4417','North wall, near office'),
    ( 3, 2,'3 Toorak Rd','3 Toorak Rd, Hamilton QLD','Key safe by front gate, 2208','Garage'),
    ( 4, 2,'58 Barlow St Unit 3','3/58 Barlow St, Clayfield QLD','Tenant home after 3pm','Hallway cupboard'),
    ( 5, 2,'12 Oxford St','12 Oxford St, Bulimba QLD','Dog in yard, friendly','Side of house'),
    ( 6, 3,'Distribution centre','120 MacArthur Ave, Pinkenba QLD','Site induction required, hi vis and boots','MSB room, ground floor'),
    ( 7, 4,'Racecourse Rd cafe','188 Racecourse Rd, Ascot QLD','Before 7am or after 3pm only','Behind the coffee machine'),
    ( 8, 5,'Tower A common areas','7 Hercules St, Hamilton QLD','Building manager on site 8 to 4','Basement plant room'),
    ( 9, 5,'Tower B common areas','9 Hercules St, Hamilton QLD','Building manager on site 8 to 4','Basement plant room'),
    (10, 6,'Paddington store','Shop 4, 210 Given Tce, Paddington QLD','Trade access via rear lane','Store room'),
    (11, 6,'Newstead store','Shop 12, 15 Longland St, Newstead QLD','Centre management induction','Back of house'),
    (12, 7,'Boondall workshop','9 Zillmere Rd, Boondall QLD','Gate open 6am to 4pm','Workshop wall'),
    (13, 8,'Head office','14 Kingsford Smith Dr, Hamilton QLD','Reception, level 2','Comms room'),
    (14, 9,'Home','31 Sandgate Rd, Clayfield QLD',NULL,'Laundry'),
    (15,10,'Home','8 Rosebank Ave, Ascot QLD','Park in driveway','Garage'),
    (16,11,'Home','66 Alexandra Rd, Ascot QLD',NULL,'Pool pump shed'),
    (17,12,'Home','77 Days Rd, Grange QLD',NULL,'Under stairs'),
    (18, 3,'Yard office','118 MacArthur Ave, Pinkenba QLD','Same induction as main site','Portable office')
  ) AS s(n,cust,lbl,addr,access,sb);

  -- ── Assets ────────────────────────────────────────────────
  INSERT INTO public.assets (
    id, tenant_id, customer_id, site_id, asset_type, label, location_note,
    make, model, rating, test_interval_months, last_tested_at, next_test_due,
    typical_test_value, install_date)
  SELECT ('a0000000-0000-4000-8000-' || lpad(a.n::text,12,'0'))::uuid,
         v_tenant,
         ('c0000000-0000-4000-8000-' || lpad(a.cust::text,12,'0'))::uuid,
         ('50000000-0000-4000-8000-' || lpad(a.site::text,12,'0'))::uuid,
         a.typ, a.lbl, a.loc, a.mk, a.mdl, a.rt, a.iv,
         (CURRENT_DATE + a.last_off)::date, (CURRENT_DATE + a.due_off)::date,
         a.val, (CURRENT_DATE - (a.age_yrs * 365))::date
  FROM (VALUES
    ( 1, 1, 1,'switchboard','Main switchboard','Level 1 riser','Clipsal','MAX9','400V 3ph',12,-395,-30, 680.00, 8),
    ( 2, 1, 1,'exit_emergency','Exit & emergency, level 1','Throughout','Clevertronics','L10',NULL, 6,-210,-28, 940.00, 6),
    ( 3, 1, 2,'switchboard','Warehouse B board','North wall','NHP','Concept','400V 3ph',12,-400,-35, 620.00,10),
    ( 4, 3, 6,'switchroom','MSB, distribution centre','MSB room','Schneider','Prisma','800A 3ph',12,-410,-45,1450.00,12),
    ( 5, 3, 6,'exit_emergency','Exit & emergency, warehouse','Throughout','Clevertronics','L10',NULL, 6,-200,-18,1180.00, 7),
    ( 6, 5, 8,'switchboard','Tower A basement board','Plant room','NHP','Concept','400V 3ph',12,-390,-25, 720.00, 9),
    ( 7, 5, 8,'exit_emergency','Exit & emergency, Tower A','Common areas','Legrand','Emergi-Lite',NULL, 6,-195,-13, 860.00, 9),
    ( 8, 6,10,'switchboard','Paddington tenancy board','Store room','Clipsal','MAX9','230V 1ph',12,-380,-15, 480.00, 4),
    ( 9, 1, 1,'rcd','RCD bank, level 1','Main board','Clipsal','RCBO',NULL,12,-340, 25, 380.00, 8),
    (10, 2, 3,'switchboard','3 Toorak Rd board','Garage','Hager','Golf','230V 1ph',12,-330, 35, 420.00, 5),
    (11, 4, 7,'switchboard','Cafe main board','Behind machine','NHP','Concept','230V 1ph',12,-320, 45, 460.00, 6),
    (12, 5, 9,'switchboard','Tower B basement board','Plant room','NHP','Concept','400V 3ph',12,-325, 40, 720.00, 9),
    (13, 5, 9,'exit_emergency','Exit & emergency, Tower B','Common areas','Legrand','Emergi-Lite',NULL, 6,-140, 40, 860.00, 9),
    (14, 7,12,'switchboard','Workshop board','Workshop wall','Clipsal','MAX9','400V 3ph',12,-315, 50, 540.00, 7),
    (15, 8,13,'switchboard','Head office board','Comms room','Schneider','Acti9','400V 3ph',12,-310, 55, 680.00, 3),
    (16, 6,11,'switchboard','Newstead tenancy board','Back of house','Clipsal','MAX9','230V 1ph',12,-305, 58, 480.00, 2),
    (17, 1, 1,'test_and_tag','Office appliances, level 1','Throughout',NULL,NULL,NULL,12,-120,245, 540.00, 5),
    (18, 3, 6,'test_and_tag','Warehouse appliances','Throughout',NULL,NULL,NULL,12,-110,255, 780.00, 6),
    (19, 3,18,'switchboard','Yard office board','Portable office','Hager','Golf','230V 1ph',12,-100,265, 380.00, 4),
    (20, 2, 4,'switchboard','Unit 3 board','Hallway','Clipsal','MAX9','230V 1ph',12, -95,270, 380.00, 1),
    (21, 2, 5,'switchboard','12 Oxford St board','Side of house','Hager','Golf','230V 1ph',12, -90,275, 380.00, 3),
    (22, 9,14,'switchboard','House board','Laundry','Clipsal','MAX9','230V 1ph',12, -60,305, 340.00, 1),
    (23, 9,14,'rcd','Kitchen & power RCDs','Main board','Clipsal','RCBO',NULL,12, -60,305, 220.00, 1),
    (24,10,15,'evse','EV charger','Garage','Tesla','Wall Connector','7kW',12, -55,310, 260.00, 1),
    (25,10,15,'switchboard','House board','Garage','Hager','Golf','230V 1ph',12, -55,310, 340.00,15),
    (26,12,17,'switchboard','House board','Under stairs','Clipsal','MAX9','230V 1ph',12, -45,320, 340.00,12),
    (27, 4, 7,'rcd','Kitchen equipment RCDs','Main board','NHP','RCBO',NULL,12, -40,325, 280.00, 6),
    (28, 8,13,'solar_pv','Rooftop solar','Roof, north face','Fronius','Primo','10kW',24, -30,700, 420.00, 3),
    (29, 7,12,'generator','Backup generator','Rear of workshop','Kohler','20REZG','20kVA',12, -25,340, 560.00, 5),
    (30,11,16,'other','Pool pump circuit','Pump shed',NULL,NULL,'230V 1ph',12, -20,345, NULL, 4)
  ) AS a(n,cust,site,typ,lbl,loc,mk,mdl,rt,iv,last_off,due_off,val,age_yrs);

  -- One asset with no schedule at all, so the "nothing will ever fall due"
  -- gap is visible on the compliance page.
  UPDATE public.assets
     SET last_tested_at = NULL, next_test_due = NULL, test_interval_months = NULL
   WHERE id = 'a0000000-0000-4000-8000-000000000030';

  RAISE NOTICE 'Demo workspace: people, customers, sites and assets in.';
END $$;

-- ============================================================
-- Jobs
-- ============================================================
DO $$
DECLARE
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000';
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001';
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002';
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003';
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004';
  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  -- This week: Monday to Friday, two to five jobs a day.
  INSERT INTO public.jobs (
    id, tenant_id, customer_id, site_id, title, description, status, priority,
    estimated_hours, due_date, scheduled_start, quote_total, gst_rate,
    created_by, assigned_to, customer_name, customer_phone, customer_email,
    customer_address, created_at, updated_at)
  SELECT ('d0000000-0000-4000-8000-' || lpad(j.n::text,12,'0'))::uuid,
         v_tenant, c.id, s.id, j.title, j.descr, j.status, j.pri, j.hrs,
         (v_mon + j.day)::date,
         (v_mon + j.day)::timestamptz + j.start_at,
         j.total, 10.0, v_owner,
         CASE j.crew WHEN 1 THEN v_dave WHEN 2 THEN v_sam WHEN 3 THEN v_priya ELSE v_josh END,
         c.name, c.phone, c.email, s.address,
         (v_mon + j.day - 14)::timestamptz, NOW()
    FROM (VALUES
    ( 1, 0,'07:00'::time,'Switchboard upgrade','Replace ceramic fuse board with 18 way, 6 RCBOs, main switch and SPD.','completed','high',  8.0, 3480.00, 8,13,1),
    ( 2, 0,'07:30'::time,'Annual RCD test','RCD trip testing and certificate, level 1 main board.','completed','medium',  4.0,  380.00, 1, 1,2),
    ( 3, 0,'11:00'::time,'No power to GPOs','Half the kitchen circuits dead. Traced to a failed RCBO.','completed','urgent',  2.5,  420.00, 9,14,3),
    ( 4, 0,'12:30'::time,'Exit light repair','Two fittings failed discharge test, batteries replaced.','completed','medium',  3.0,  340.00, 5, 8,4),
    ( 5, 1,'07:00'::time,'Warehouse LED highbay','Replace 28 metal halide highbays with LED, EWP hire.','completed','medium',  8.5, 4200.00, 3, 6,1),
    ( 6, 1,'07:00'::time,'Exit & emergency, six monthly','Discharge test 34 fittings, log book updated.','completed','medium',  6.0, 1180.00, 3, 6,2),
    ( 7, 1,'07:30'::time,'EV charger install','7kW single phase wall charger, dedicated 32A circuit.','completed','medium',  7.5, 2650.00,10,15,3),
    ( 8, 1,'07:30'::time,'Smoke alarm compliance','Interconnected photoelectric alarms, 4 bedrooms.','completed','high',  4.0, 1240.00, 2, 3,4),
    ( 9, 1,'13:30'::time,'Fault find, cafe','RCD tripping overnight. Insulation testing all circuits.','completed','urgent',  2.0,  380.00, 4, 7,2),
    (10, 2,'07:00'::time,'Tower A board test','Annual test and certificate, basement main board.','completed','high',  6.0,  720.00, 5, 8,1),
    (11, 2,'07:00'::time,'Retail fitout stage 2','Track lighting, feature pendants, 14 GPOs. Stage 2 of a five day fitout, day three booked today.','in_progress','high',  8.5,14800.00, 6,10,3),
    (12, 2,'07:30'::time,'Hot water changeover','Decommission storage unit, new 20A circuit for heat pump.','completed','medium',  5.5, 1690.00,12,17,2),
    (13, 3,'07:00'::time,'MSB annual test','Distribution centre main switchboard, full test sheet.','in_progress','high',  8.0, 1450.00, 3, 6,1),
    (14, 3,'07:00'::time,'Data cabling, 12 points','Cat6 to 12 workstations, Fluke certification. Two day job, day one booked today.','open','medium',  9.0, 5340.00, 1, 1,2),
    (15, 2,'08:00'::time,'Ceiling fan install x4','Four DC fans with wall controllers.','open','low',  5.0, 1420.00,12,17,4),
    (16, 3,'08:00'::time,'Defect rectification','Bonding and labelling defects from level 2 inspection.','open','urgent',  4.0,  890.00, 7,12,4),
    (17, 4,'07:00'::time,'Three phase upgrade','Upgrade to three phase supply, coordinate with Energex. Three day job, day one booked today.','open','high',  9.0, 9450.00, 7,12,1),
    (18, 4,'07:30'::time,'Solar inverter fault','Fronius reporting State 522, rooftop MC4 connector.','open','high',  4.5,  780.00, 8,13,3),
    (19, 4,'07:30'::time,'Pool equipment circuit','New RCD protected circuit to pump and chlorinator.','open','medium',  6.5, 1980.00,11,16,2)
    ) AS j(n, day, start_at, title, descr, status, pri, hrs, total, cust, site, crew)
    JOIN public.customers c ON c.id = ('c0000000-0000-4000-8000-' || lpad(j.cust::text,12,'0'))::uuid
    JOIN public.sites s     ON s.id = ('50000000-0000-4000-8000-' || lpad(j.site::text,12,'0'))::uuid;

  -- Eight weeks of history so the dashboard and P&L have shape.
  INSERT INTO public.jobs (
    id, tenant_id, customer_id, site_id, title, description, status, priority,
    estimated_hours, due_date, scheduled_start, quote_total, gst_rate,
    created_by, assigned_to, customer_name, customer_phone, customer_email,
    customer_address, created_at, updated_at)
  SELECT ('d0000000-0000-4000-8000-' || lpad((100 + g.n)::text,12,'0'))::uuid,
         v_tenant, c.id, s.id,
         (ARRAY['Switchboard upgrade','Annual RCD test','Exit & emergency test','Fault find',
                'GPO additions','Lighting upgrade','Smoke alarm compliance','Test and tag',
                'Rewire, partial','EV charger install'])[1 + (g.n % 10)],
         'Completed work from the last two months.',
         'completed',
         (ARRAY['low','medium','high'])[1 + (g.n % 3)],
         (3 + (g.n % 8))::numeric,
         (v_mon - ((g.n % 40) + 5))::date,
         (v_mon - ((g.n % 40) + 5))::timestamptz + interval '7 hours',
         (380 + (g.n % 12) * 240)::numeric,
         10.0, v_owner,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (g.n % 4)],
         c.name, c.phone, c.email, s.address,
         (v_mon - ((g.n % 40) + 12))::timestamptz, NOW()
    FROM generate_series(1, 22) AS g(n)
    JOIN LATERAL (SELECT * FROM public.customers WHERE tenant_id = v_tenant
                   ORDER BY id OFFSET (g.n % 12) LIMIT 1) c ON TRUE
    JOIN LATERAL (SELECT * FROM public.sites WHERE customer_id = c.id
                   ORDER BY id LIMIT 1) s ON TRUE;

  RAISE NOTICE 'Demo workspace: 41 jobs in.';
END $$;

-- ============================================================
-- Compliance, money and timesheets
-- ============================================================
DO $$
DECLARE
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000';
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001';
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002';
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003';
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004';
  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
  v_pass JSONB;
BEGIN
  v_pass := '[
    {"circuit_ref":"C1","description":"Lighting, ground floor","cable_size":"1.5mm TPS","protection_type":"RCBO","protection_rating":"16A","earth_continuity_ohms":0.21,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":21,"rcd_trip_ma":28,"visual_pass":true,"notes":""},
    {"circuit_ref":"C2","description":"Power, kitchen","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.17,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":18,"rcd_trip_ma":26,"visual_pass":true,"notes":""},
    {"circuit_ref":"C3","description":"Power, general","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.19,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":23,"rcd_trip_ma":29,"visual_pass":true,"notes":""},
    {"circuit_ref":"C4","description":"Oven","cable_size":"6mm TPS","protection_type":"RCBO","protection_rating":"32A","earth_continuity_ohms":0.11,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":24,"rcd_trip_ma":30,"visual_pass":true,"notes":""},
    {"circuit_ref":"C5","description":"Air conditioning","cable_size":"4mm TPS","protection_type":"RCBO","protection_rating":"25A","earth_continuity_ohms":0.14,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":26,"rcd_trip_ma":29,"visual_pass":true,"notes":"Trip time trending up, monitor next visit"}
  ]'::jsonb;

  -- Completed test sheets. The trigger from migration 025 rolls each asset's
  -- next_test_due forward automatically as these land.
  INSERT INTO public.job_test_sheets (
    tenant_id, job_id, asset_id, status, installation_address, switchboard_location,
    supply_type, circuits, certificate_number, tested_by, tester_name,
    tester_license, test_date, completed_at, notes)
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(ts.job::text,12,'0'))::uuid,
         ('a0000000-0000-4000-8000-' || lpad(ts.asset::text,12,'0'))::uuid,
         'completed', s.address, s.switchboard_location, ts.supply,
         v_pass, ts.cert,
         CASE ts.crew WHEN 1 THEN v_dave WHEN 2 THEN v_sam ELSE v_priya END,
         CASE ts.crew WHEN 1 THEN 'Dave Nguyen' WHEN 2 THEN 'Sam Ellis' ELSE 'Priya Raman' END,
         CASE ts.crew WHEN 1 THEN 'QLD Electrical Mechanic 88999'
                      WHEN 2 THEN 'QLD Electrical Mechanic 91223'
                      ELSE 'QLD Electrical Mechanic 90887' END,
         (v_mon + ts.day)::date,
         (v_mon + ts.day)::timestamptz + interval '15 hours',
         ts.note
    FROM (VALUES
      ( 1, 1,'400V three phase','CERT-2026-0101',1, 0,'Board replaced and fully tested. Client walkthrough done.'),
      ( 2, 9,'230V single phase','CERT-2026-0102',1, 0,'All RCDs within limits. Certificate issued on site.'),
      ( 3,22,'230V single phase','CERT-2026-0103',3, 0,'Failed RCBO replaced, circuit retested clear.'),
      ( 4, 7,'230V single phase','CERT-2026-0104',2, 0,'Two fittings replaced, discharge test passed.'),
      ( 5, 3,'400V three phase','CERT-2026-0105',3, 1,'Highbay changeover certified.'),
      ( 6, 5,'400V three phase','CERT-2026-0106',3, 1,'34 fittings discharge tested, log book updated.'),
      (10, 6,'400V three phase','CERT-2026-0107',1, 2,'Tower A annual test complete.'),
      (12,26,'230V single phase','CERT-2026-0108',2, 2,'New heat pump circuit tested and certified.')
    ) AS ts(job, asset, supply, cert, crew, day, note)
    JOIN public.jobs j ON j.id = ('d0000000-0000-4000-8000-' || lpad(ts.job::text,12,'0'))::uuid
    JOIN public.sites s ON s.id = j.site_id;

  -- One in progress, so the draft state is visible too.
  INSERT INTO public.job_test_sheets (
    tenant_id, job_id, asset_id, status, installation_address, switchboard_location,
    supply_type, circuits, certificate_number, tester_name, test_date, notes)
  SELECT v_tenant, j.id, 'a0000000-0000-4000-8000-000000000004'::uuid, 'draft',
         s.address, s.switchboard_location, '400V three phase',
         '[]'::jsonb, 'CERT-2026-0109', 'Dave Nguyen', CURRENT_DATE,
         'Testing in progress, results to follow.'
    FROM public.jobs j JOIN public.sites s ON s.id = j.site_id
   WHERE j.id = 'd0000000-0000-4000-8000-000000000013';

  -- ── Invoices ──────────────────────────────────────────────
  INSERT INTO public.job_invoices (
    tenant_id, job_id, invoice_number, kind, status,
    subtotal_ex_gst, gst_amount, total_inc_gst, amount_paid,
    due_date, issued_at, sent_at, created_by, created_at)
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(v.job::text,12,'0'))::uuid,
         v.num, v.kind, v.st,
         v.sub, round(v.sub * 0.10, 2), round(v.sub * 1.10, 2),
         CASE v.st WHEN 'paid' THEN round(v.sub * 1.10, 2) ELSE v.paid END,
         (CURRENT_DATE + v.due_off)::date,
         (CURRENT_DATE - v.age)::timestamptz,
         (CURRENT_DATE - v.age)::timestamptz,
         v_owner, (CURRENT_DATE - v.age)::timestamptz
  FROM (VALUES
    (  1,'INV-1101','tax','paid',      3480.00,    0.00, -10, 24),
    (  2,'INV-1102','tax','paid',       380.00,    0.00, -10, 24),
    (  3,'INV-1103','tax','paid',       420.00,    0.00,  -9, 23),
    (  4,'INV-1104','tax','paid',       340.00,    0.00,  -9, 23),
    (  5,'INV-1105','tax','sent',      4200.00,    0.00,  20,  1),
    (  6,'INV-1106','tax','sent',      1180.00,    0.00,  20,  1),
    (  7,'INV-1107','tax','paid',      2650.00,    0.00,  -3, 17),
    (  8,'INV-1108','tax','part_paid', 1240.00,  600.00,  12,  9),
    (  9,'INV-1109','tax','paid',       380.00,    0.00,  -2, 16),
    ( 10,'INV-1110','tax','sent',       720.00,    0.00,  25,  0),
    ( 11,'INV-1111','progress','sent', 7400.00,    0.00,  18,  3),
    ( 12,'INV-1112','tax','overdue',   1690.00,    0.00,  -8, 38),
    (101,'INV-1090','tax','overdue',   2480.00,    0.00, -21, 51),
    (102,'INV-1091','tax','paid',      1720.00,    0.00, -30, 60),
    (103,'INV-1092','tax','paid',      3120.00,    0.00, -35, 65),
    (104,'INV-1093','tax','paid',       860.00,    0.00, -40, 70)
  ) AS v(job, num, kind, st, sub, paid, due_off, age)
  WHERE EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = ('d0000000-0000-4000-8000-' || lpad(v.job::text,12,'0'))::uuid);

  -- ── Labour on the active jobs ─────────────────────────────
  INSERT INTO public.job_billing_items (job_id, tenant_id, description, hours, rate_per_hour, markup_percent, revenue, cost, created_by)
  SELECT ('d0000000-0000-4000-8000-' || lpad(b.job::text,12,'0'))::uuid,
         v_tenant, b.descr, b.hrs, b.rate, b.mk,
         round(b.hrs * b.rate * (1 + b.mk/100), 2),
         round(b.hrs * b.rate * 0.62, 2), v_owner
  FROM (VALUES
    (11,'Retail fitout stage 2, two hands',34.0,110.00, 8.0),
    (13,'MSB annual test and certification', 8.0,125.00, 0.0),
    (14,'Structured cabling and certification',18.0,115.00, 5.0),
    (17,'Three phase upgrade labour',        26.0,120.00, 5.0),
    (19,'Pool circuit and bonding',           6.5,110.00, 0.0)
  ) AS b(job, descr, hrs, rate, mk)
  WHERE EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = ('d0000000-0000-4000-8000-' || lpad(b.job::text,12,'0'))::uuid);

  -- ── Timesheets for the week ───────────────────────────────
  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (d.n % 4)],
         NULL, 'shift',
         (v_mon + (d.n / 4))::timestamptz + interval '7 hours',
         (v_mon + (d.n / 4))::timestamptz + interval '15 hours 30 minutes',
         NULL, (v_mon + (d.n / 4)) < CURRENT_DATE
    FROM generate_series(0, 19) AS d(n)
   WHERE (v_mon + (d.n / 4)) <= CURRENT_DATE;

  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (d.n % 4)],
         NULL, 'travel',
         (v_mon + (d.n / 4))::timestamptz + interval '6 hours 20 minutes',
         (v_mon + (d.n / 4))::timestamptz + interval '7 hours',
         'Yard to first site', TRUE
    FROM generate_series(0, 19) AS d(n)
   WHERE (v_mon + (d.n / 4)) <= CURRENT_DATE;

  -- ── Noticeboard ───────────────────────────────────────────
  INSERT INTO public.company_announcements (tenant_id, title, body, urgent, created_by, created_at)
  SELECT v_tenant, a.t, a.b, a.u, v_owner, NOW() - (a.age || ' days')::interval
  FROM (VALUES
    ('Portside induction required','Everyone on the Pinkenba job needs the online induction done before Thursday.', TRUE, 1),
    ('Toolbox talk Monday 6:30am','Working at heights refresher in the yard. Bring your harness for inspection.', TRUE, 4),
    ('Timesheets close Sunday 8pm','Submit through the field app. Late ones land in the following pay run.', FALSE, 6),
    ('New Middys pricing loaded','Check the app for current pricing before you quote.', FALSE, 9)
  ) AS a(t,b,u,age);

  RAISE NOTICE '────────────────────────────────────────────────';
  RAISE NOTICE 'Demo workspace ready: Voltaic Electrical (demo)';
  RAISE NOTICE '  Switch to it from the workspace menu, top right.';
  RAISE NOTICE '  Or sign in as demo@voltaicelectrical.com.au / demo1234';
  RAISE NOTICE '  Crew: dave@ (manager), sam@ priya@ josh@ (technicians)';
  RAISE NOTICE '  Your own workspace was not touched.';
  RAISE NOTICE '────────────────────────────────────────────────';
END $$;
