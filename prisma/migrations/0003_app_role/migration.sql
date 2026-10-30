-- The app connects as its own least-privilege role, ascend_app (created once per environment
-- with a secret password; see docs/SETUP.md). It may read and write rows, never change schema.
-- RLS stays on for every table: ascend_app gets a policy, anon and authenticated get none.

GRANT USAGE ON SCHEMA public TO ascend_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ascend_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ascend_app;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user','session','account','verification','rate_limit','user_preference',
    'category','habit','habit_schedule','sub_habit','habit_log','sub_habit_log','daily_review']
  LOOP
    EXECUTE format('CREATE POLICY app_server_access ON %I FOR ALL TO ascend_app USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
