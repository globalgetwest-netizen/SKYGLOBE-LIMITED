-- ═══════════════════════════════════════════════════════════════════════════
-- SKYGLOBEGROUP SECURITY LOCKDOWN — fixes Supabase advisor criticals:
--   • rls_disabled_in_public
--   • sensitive_columns_exposed
--
-- WHAT THIS DOES
--   Enables Row-Level Security on EVERY table in the public schema and adds
--   NO policies. Result: the public REST API (anon key) can no longer read,
--   edit or delete ANY row in ANY table. Only the SERVICE ROLE key (which
--   bypasses RLS) still has access — and that key lives only in the server's
--   environment variables, never in the browser.
--
-- ⚠️ RUN ORDER — DO THIS FIRST OR THE SITE BREAKS:
--   1. Supabase Dashboard → Project Settings → API → copy the *service_role*
--      key (the SECRET one, not anon/public).
--   2. Render Dashboard → your service → Environment → set
--         SUPABASE_KEY = <service_role key>
--      and let it redeploy. (Same for fly.io later: fly secrets set …)
--   3. THEN run this file in Supabase → SQL Editor.
--   4. Supabase → Advisors → Rerun checks → both criticals disappear.
--
-- Idempotent — safe to run again anytime (also covers tables created later).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Verify: every row should show rls_enabled = true
select tablename, rowsecurity as rls_enabled
from pg_tables where schemaname = 'public' order by tablename;
