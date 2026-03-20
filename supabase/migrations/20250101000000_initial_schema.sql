-- ============================================================
-- RestEasy — Migration 001: Initial Schema
-- Created: 2025-01-01
-- Description: Base tables for profiles, sleep tracking, and modules
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT,
  locale              TEXT DEFAULT 'fr',
  timezone            TEXT DEFAULT 'Europe/Paris',
  program_week        INTEGER DEFAULT 1 CHECK (program_week BETWEEN 1 AND 6),
  program_started_at  TIMESTAMPTZ DEFAULT NOW(),
  is_premium          BOOLEAN DEFAULT FALSE,
  push_token          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sleep Windows ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sleep_windows (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_week          INTEGER NOT NULL CHECK (program_week BETWEEN 1 AND 6),
  prescribed_bedtime    TIME NOT NULL DEFAULT '23:30',
  prescribed_wake_time  TIME NOT NULL DEFAULT '06:00',
  avg_sleep_efficiency  NUMERIC(5,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, program_week)
);

-- ─── Sleep Entries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sleep_entries (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date            DATE NOT NULL,
  bedtime               TIMESTAMPTZ NOT NULL,
  sleep_onset_minutes   INTEGER NOT NULL DEFAULT 0 CHECK (sleep_onset_minutes >= 0),
  wake_count            INTEGER NOT NULL DEFAULT 0 CHECK (wake_count >= 0),
  waso_minutes          INTEGER NOT NULL DEFAULT 0 CHECK (waso_minutes >= 0),
  wake_time             TIMESTAMPTZ NOT NULL,
  out_of_bed_time       TIMESTAMPTZ NOT NULL,
  program_week          INTEGER NOT NULL CHECK (program_week BETWEEN 1 AND 6),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_date)
);

-- ─── Night Mode Sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.night_mode_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date  DATE NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_taken  TEXT CHECK (action_taken IN ('breathing', 'get_up', 'relaxation', 'dismissed')),
  duration_sec  INTEGER
);

-- ─── Module Progress ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, module_id)
);

-- ─── Triggers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'locale', 'fr')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.create_initial_sleep_window()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sleep_windows (user_id, program_week, prescribed_bedtime, prescribed_wake_time)
  VALUES (NEW.id, 1, '23:30', '06:00')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_initial_sleep_window();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "sleep_windows_own" ON public.sleep_windows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sleep_entries_own" ON public.sleep_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "night_mode_own" ON public.night_mode_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "module_progress_own" ON public.module_progress FOR ALL USING (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_date ON public.sleep_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_user_week ON public.sleep_entries (user_id, program_week);
CREATE INDEX IF NOT EXISTS idx_night_mode_user_date ON public.night_mode_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON public.module_progress (user_id);
