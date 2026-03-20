-- ============================================================
-- RestEasy — Migration 004: ISI Scores & Weekly Summary View
-- Created: 2025-03-01
-- ============================================================

-- ─── ISI Scores Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.isi_scores (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_week  SMALLINT NOT NULL CHECK (program_week BETWEEN 0 AND 6),
  score         SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 28),
  answers       JSONB NOT NULL DEFAULT '{}',
  scored_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, program_week)
);

ALTER TABLE public.isi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ISI scores"
  ON public.isi_scores
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Weekly Sleep Summary View ────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.weekly_sleep_summary AS
SELECT
  user_id,
  program_week,
  COUNT(*) AS entry_count,
  ROUND(AVG(sleep_efficiency)::numeric, 1) AS avg_efficiency,
  ROUND(AVG(sleep_onset_minutes)::numeric, 1) AS avg_onset_minutes,
  ROUND(AVG(wake_count)::numeric, 1) AS avg_wake_count,
  ROUND(AVG(total_sleep_minutes)::numeric, 1) AS avg_sleep_minutes,
  MIN(entry_date) AS week_start,
  MAX(entry_date) AS week_end
FROM public.sleep_entries
GROUP BY user_id, program_week;

-- ─── ISI Severity Function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_isi_severity(score SMALLINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN score <= 7  THEN 'none'
    WHEN score <= 14 THEN 'subthreshold'
    WHEN score <= 21 THEN 'moderate'
    ELSE 'severe'
  END;
$$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_isi_scores_user_week
  ON public.isi_scores (user_id, program_week);

CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_week
  ON public.sleep_entries (user_id, program_week);
