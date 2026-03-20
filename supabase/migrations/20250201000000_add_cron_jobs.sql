-- ============================================================
-- RestEasy — Migration 003: Cron Jobs for Push Notifications
-- Created: 2025-02-01
-- Description: Schedule daily push notifications using pg_cron
-- ============================================================

-- Enable pg_cron extension (requires Supabase Pro)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Morning Journal Reminder ─────────────────────────────────────────────────
-- Sends at 08:00 UTC every day
SELECT cron.schedule(
  'morning-journal-reminder',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"morning_reminder"}'::jsonb
  );
  $$
);

-- ─── Bedtime Reminder ─────────────────────────────────────────────────────────
-- Sends at 22:00 UTC every day
-- Note: This is a global reminder; per-user timing would require a custom function
SELECT cron.schedule(
  'bedtime-reminder',
  '0 22 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"bedtime_reminder"}'::jsonb
  );
  $$
);

-- ─── Weekly Review Reminder ───────────────────────────────────────────────────
-- Sends every Sunday at 09:00 UTC
SELECT cron.schedule(
  'weekly-review-reminder',
  '0 9 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"type":"weekly_review"}'::jsonb
  );
  $$
);
