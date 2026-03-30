-- ============================================================
-- MIGRATION: Setup pg_cron schedule for check-renewals
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- Approach: pg_cron + pg_net HTTP POST
-- Schedule: Daily at 08:00 UTC (cron: '0 8 * * *')
-- Target:   Edge Function 'check-renewals'
-- Auth:     Service role key stored in Vault
-- ============================================================

-- Step 0: Enable required extensions (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 1: Store the service role key in Vault (NEVER commit raw keys)
-- Replace <YOUR_SERVICE_ROLE_KEY> with your actual service role key.
-- You can find it in: Supabase Dashboard → Settings → API → service_role key
--
-- NOTE: If you've already stored this secret, skip this step.
-- The secret name 'service_role_key' is referenced by the cron job below.

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.REPLACE_WITH_YOUR_ACTUAL_SERVICE_ROLE_KEY',
  'service_role_key',
  'Supabase service role key for edge function invocation via pg_cron'
);

-- Step 2: Remove any existing schedule with the same name (idempotent)
SELECT cron.unschedule('daily-renewal-check')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-renewal-check'
);

-- Step 3: Create the cron job
-- Runs daily at 08:00 UTC. Calls check-renewals edge function via pg_net.
-- The edge function checks app_settings.renewal_cron_enabled and exits early if disabled.
SELECT cron.schedule(
  'daily-renewal-check',       -- job name (unique identifier)
  '0 8 * * *',                 -- cron expression: minute=0, hour=8, every day
  $$
  SELECT net.http_post(
    url     := 'https://zyaqtsmeeygcyqrvpyuy.supabase.co/functions/v1/check-renewals',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Step 4: Record the setup in app_settings for the admin UI
INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'cron_schedule_approach',
  'pg_cron + pg_net → POST check-renewals at 08:00 UTC daily. Job name: daily-renewal-check. Service role key stored in Vault as "service_role_key".',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO app_settings (key, value, updated_at)
VALUES ('cron_schedule_configured_at', NOW()::text, NOW())
ON CONFLICT (key) DO UPDATE SET
  value = NOW()::text,
  updated_at = NOW();

-- Step 5: Verify the job was created
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'daily-renewal-check';

-- ============================================================
-- VERIFICATION QUERIES (run after setup to confirm)
-- ============================================================

-- Check the job exists:
-- SELECT * FROM cron.job WHERE jobname = 'daily-renewal-check';

-- Check recent job runs (after the first 08:00 UTC):
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-renewal-check')
-- ORDER BY start_time DESC LIMIT 10;

-- Check the Vault secret exists (decrypted view):
-- SELECT name, created_at FROM vault.decrypted_secrets WHERE name = 'service_role_key';

-- Check app_settings for cron config:
-- SELECT * FROM app_settings WHERE key LIKE 'cron_%' OR key LIKE 'renewal_%';

-- ============================================================
-- ALTERNATIVE: Supabase Dashboard Edge Function Schedules
-- ============================================================
-- If pg_cron + pg_net is not available or you prefer the Dashboard:
--
-- 1. Go to: Supabase Dashboard → Edge Functions → check-renewals
-- 2. Click "Schedules" tab
-- 3. Add schedule: '0 8 * * *' (daily at 08:00 UTC)
-- 4. Save
--
-- Then run ONLY Steps 4-5 above to record in app_settings.
-- ============================================================

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================
-- If pg_cron is not available:
--   → Check if your Supabase plan supports pg_cron (Pro+ plans)
--   → Use Dashboard Edge Function Schedules instead
--
-- If pg_net is not available:
--   → Enable it: CREATE EXTENSION pg_net;
--   → Or use Dashboard Edge Function Schedules
--
-- If Vault is not available:
--   → You can inline the key (NOT recommended for production):
--   → Replace the vault.decrypted_secrets subquery with the literal key
--
-- If the function URL is wrong:
--   → Check your project ref in Dashboard → Settings → General
--   → URL format: https://<PROJECT_REF>.supabase.co/functions/v1/check-renewals
-- ============================================================
