-- ============================================================
-- RestEasy — Migration 005: Badges & Streak System
-- Created: 2025-03-10
-- ============================================================

-- ─── User Badges Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id     TEXT NOT NULL,
  unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON public.user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Night Mode Sessions Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.night_mode_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  action_taken TEXT CHECK (action_taken IN ('got_up', 'relaxation', 'breathing', 'closed'))
);

ALTER TABLE public.night_mode_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own night sessions"
  ON public.night_mode_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Add push_token to profiles ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'fr';

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_night_sessions_user ON public.night_mode_sessions (user_id);
