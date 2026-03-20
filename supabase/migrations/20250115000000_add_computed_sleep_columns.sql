-- ============================================================
-- RestEasy — Migration 002: Add computed sleep efficiency columns
-- Created: 2025-01-15
-- Description: Add generated columns for sleep efficiency calculation
-- ============================================================

-- Add computed columns to sleep_entries
ALTER TABLE public.sleep_entries
  ADD COLUMN IF NOT EXISTS time_in_bed_minutes INTEGER
    GENERATED ALWAYS AS (
      GREATEST(0, EXTRACT(EPOCH FROM (out_of_bed_time - bedtime)) / 60)::INTEGER
    ) STORED,
  ADD COLUMN IF NOT EXISTS total_sleep_minutes INTEGER
    GENERATED ALWAYS AS (
      GREATEST(0,
        (EXTRACT(EPOCH FROM (out_of_bed_time - bedtime)) / 60)::INTEGER
        - sleep_onset_minutes
        - waso_minutes
      )
    ) STORED,
  ADD COLUMN IF NOT EXISTS sleep_efficiency NUMERIC(5,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN EXTRACT(EPOCH FROM (out_of_bed_time - bedtime)) > 0
        THEN ROUND(
          (
            EXTRACT(EPOCH FROM (out_of_bed_time - bedtime)) / 60
            - sleep_onset_minutes
            - waso_minutes
          ) / (EXTRACT(EPOCH FROM (out_of_bed_time - bedtime)) / 60) * 100,
          2
        )
        ELSE 0
      END
    ) STORED;

-- Add window_minutes to sleep_windows
ALTER TABLE public.sleep_windows
  ADD COLUMN IF NOT EXISTS window_minutes INTEGER
    GENERATED ALWAYS AS (
      EXTRACT(EPOCH FROM (prescribed_wake_time - prescribed_bedtime)) / 60 +
      CASE WHEN prescribed_wake_time < prescribed_bedtime THEN 1440 ELSE 0 END
    )::INTEGER STORED;

-- Create a view for weekly summary
CREATE OR REPLACE VIEW public.weekly_sleep_summary AS
SELECT
  user_id,
  program_week,
  COUNT(*) AS entry_count,
  ROUND(AVG(sleep_efficiency), 1) AS avg_efficiency,
  ROUND(AVG(total_sleep_minutes), 0) AS avg_sleep_minutes,
  ROUND(AVG(sleep_onset_minutes), 0) AS avg_onset_minutes,
  ROUND(AVG(wake_count), 1) AS avg_wake_count,
  MIN(entry_date) AS week_start,
  MAX(entry_date) AS week_end
FROM public.sleep_entries
GROUP BY user_id, program_week;

-- Grant access to the view
ALTER VIEW public.weekly_sleep_summary OWNER TO postgres;
