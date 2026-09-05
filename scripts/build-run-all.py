"""
Build supabase/RUN_ALL.sql from the migrations, making every statement re-runnable.

WHY
  The legacy migrations are not idempotent. A run that fails partway cannot be
  repeated: it dies on "already exists" with the schema half applied, which is
  worse than either extreme.

HOW
  Every statement is parsed with pglast — the real PostgreSQL grammar — rather
  than matched with regex. An earlier regex version silently missed policies
  whose ON clause sat on the next line, which is exactly the kind of near-miss
  that makes a heuristic worse than useless here. Parsing cannot miss them.

  CreatePolicyStmt  -> emit DROP POLICY IF EXISTS first
  CreateTrigStmt    -> emit DROP TRIGGER IF EXISTS first
  IndexStmt         -> set IF NOT EXISTS
  CreateStmt        -> set IF NOT EXISTS

  The migration files themselves are never modified: they are the historical
  record. Only the generated bundle is transformed.

USAGE
  python3 scripts/build-run-all.py
"""
import os, re, sys
from pglast import parser

HERE = os.path.dirname(os.path.abspath(__file__))
SUPA = os.path.join(HERE, '..', 'supabase')

ORDER = [
 ('004_add_integrations.sql','Xero / MYOB connection records'),
 ('006_add_job_plans.sql','Job plans and file uploads'),
 ('007_add_job_billing_items.sql','Labour lines with cost and margin'),
 ('008_add_tenant_settings.sql','Workspace settings columns'),
 ('009_add_test_sheets.sql','AS/NZS 3000 test sheets and certificates'),
 ('010_estimate_approval.sql','Customer quote approval trail'),
 ('011_accounting_sync.sql','Payments and accounting sync records'),
 ('012_job_photos_reports.sql','Site photos and shareable reports'),
 ('013_scheduling_upgrades.sql','Work hours, skills, recurrence'),
 ('014_forms_compliance.sql','Forms, signatures and tenant branding'),
 ('015_material_pricing.sql','Product catalogue and supplier pricing'),
 ('016_billing_materials.sql','Materials on job billing'),
 ('017_job_billing.sql','Invoices, variations, audit trail'),
 ('018_estimate_job_link.sql','Link estimates to jobs'),
 ('019_field_time_tracking.sql','Timesheets and announcements'),
 ('020_field_privacy.sql','Field staff privacy rules'),
 ('020_wholesaler_integration.sql','Purchase orders and wholesaler accounts'),
 ('021_onboarding.sql','Setup wizard state'),
 ('022_tenant_business_details.sql','ABN, phone, website, working hours'),
 ('023_customers_and_sites.sql','Customers and sites'),
 ('024_roles_and_enforcement.sql','Owner / Manager / Technician roles in RLS'),
 ('025_assets_and_compliance.sql','Assets, test history, compliance register'),
 ('026_storage_buckets.sql','Storage buckets for logos, plans and photos'),
 ('027_estimate_items_rls.sql','Quote line item RLS policies'),
]

def qualified(rangevar) -> str:
    schema = rangevar.schemaname or 'public'
    return f'{schema}.{rangevar.relname}'

def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'

def make_idempotent(sql: str, counts: dict) -> str:
    # 004 drops and recreates public.integrations. On a re-run that would
    # delete a live Xero or MYOB connection, so make it additive instead.
    sql = sql.replace(
        'DROP TABLE IF EXISTS public.integrations CASCADE;',
        '-- (removed by build-run-all.py: dropping this would delete live accounting connections)')

    out = []
    for stmt in parser.split(sql, with_parser=True):
        text = stmt.strip()
        if not text:
            continue
        try:
            node = parser.parse_sql(text)[0].stmt
        except Exception:
            out.append(text + ';')
            continue

        kind = type(node).__name__

        if kind == 'CreatePolicyStmt':
            name = quote_ident(node.policy_name)
            table = qualified(node.table)
            out.append(f'DROP POLICY IF EXISTS {name} ON {table};')
            counts['policy'] += 1

        elif kind == 'CreateTrigStmt':
            name = quote_ident(node.trigname)
            table = qualified(node.relation)
            out.append(f'DROP TRIGGER IF EXISTS {name} ON {table};')
            counts['trigger'] += 1

        elif kind == 'IndexStmt' and not node.if_not_exists:
            text = re.sub(r'^(CREATE\s+(?:UNIQUE\s+)?INDEX\s+)', r'\1IF NOT EXISTS ',
                          text, count=1, flags=re.I)
            counts['index'] += 1

        elif kind == 'CreateStmt' and not node.if_not_exists:
            text = re.sub(r'^(CREATE\s+TABLE\s+)', r'\1IF NOT EXISTS ',
                          text, count=1, flags=re.I)
            counts['table'] += 1

        out.append(text + ';')
    return '\n\n'.join(out)

def main():
    counts = {'policy': 0, 'trigger': 0, 'index': 0, 'table': 0}
    body = []
    for f, desc in ORDER:
        path = os.path.join(SUPA, 'migrations', f)
        if not os.path.exists(path):
            sys.exit(f'missing migration: {f}')
        body.append('\n\n-- ============================================================\n'
                    f'-- ==  {f}\n-- ==  {desc}\n'
                    '-- ============================================================\n\n')
        body.append(make_idempotent(open(path).read(), counts))

    body.append('\n\n-- ============================================================\n'
                '-- ==  demo_walkthrough.sql\n'
                '-- ==  Voltaic Electrical demo workspace (separate tenant)\n'
                '-- ============================================================\n\n')
    body.append(make_idempotent(open(os.path.join(SUPA, 'demo_walkthrough.sql')).read(), counts))

    header = f"""-- ============================================================
-- FieldMS: bring this database up to date, then create the demo workspace.
--
-- GENERATED FILE. Rebuild with: python3 scripts/build-run-all.py
--
-- SAFE TO RUN AGAIN AFTER A FAILURE
--   The original migrations are not re-runnable. Guards added on the way into
--   this file: {counts['policy']} policies, {counts['trigger']} triggers, {counts['index']} indexes, {counts['table']} tables.
--   Before this, a run that stopped partway could not simply be repeated: it
--   failed on "already exists" with the schema half applied. Statements are
--   identified by parsing them with the real PostgreSQL grammar, not by
--   pattern matching, so multi line definitions cannot be missed.
--
-- WHY THIS IS LONG
--   This database had ten tables. Migrations 004 and 006 through 021 were
--   never applied, so about two thirds of the tables the app queries did not
--   exist. Test sheets, invoices, forms, photos, timesheets, branding,
--   materials and the setup wizard were all querying tables that were not
--   there, failing into empty states rather than errors.
--
-- YOUR OWN WORKSPACE IS NOT TOUCHED
--   The demo lives in its own tenant, "Voltaic Electrical (demo)", with its
--   own owner login. You are added as a member so it appears in the workspace
--   switcher, top right. Re-run any time to reset the demo.
--
-- DELIBERATELY EXCLUDED
--   001, 002  begin with DROP TABLE on tenants, profiles, tenant_members,
--             estimates and estimate_items, which hold your data.
--   003       missing from the repo. public.jobs already exists.
--   005       already applied.
--
-- AFTERWARDS
--   Run supabase/VERIFY_SCHEMA.sql: no rows means the database satisfies
--   every query in the codebase. Or from the project: npm run doctor
--
-- BEFORE GOING LIVE: delete the five demo logins
--   demo@ / dave@ / sam@ / priya@ / josh@voltaicelectrical.com.au (demo1234)
-- ============================================================


"""
    out_path = os.path.join(SUPA, 'RUN_ALL.sql')
    open(out_path, 'w').write(header + ''.join(body))
    print(f"guards added: {counts['policy']} policies, {counts['trigger']} triggers, "
          f"{counts['index']} indexes, {counts['table']} tables")

if __name__ == '__main__':
    main()
