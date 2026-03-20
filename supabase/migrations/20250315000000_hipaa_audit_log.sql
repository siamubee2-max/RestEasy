-- ============================================================
-- RestEasy — Migration 006: HIPAA Audit Log
-- Created: 2025-03-15
-- ============================================================

-- ─── Audit Log Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  table_name   TEXT,
  record_id    UUID,
  ip_address   INET,
  user_agent   TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only service role can read audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.audit_log
  FOR ALL
  USING (false);  -- No direct user access; only via Edge Functions

-- ─── Audit Trigger Function ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_sleep_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.sleep_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_data_access();

CREATE TRIGGER audit_isi_scores
  AFTER INSERT OR UPDATE OR DELETE ON public.isi_scores
  FOR EACH ROW EXECUTE FUNCTION public.log_data_access();

-- ─── Data Retention Policy ────────────────────────────────────────────────────
-- Auto-delete audit logs older than 7 years (HIPAA requirement)
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 2 1 * *',  -- 1st of each month at 2am
  $$
    DELETE FROM public.audit_log
    WHERE created_at < NOW() - INTERVAL '7 years';
  $$
);

-- ─── Encryption Flag Column ───────────────────────────────────────────────────
ALTER TABLE public.sleep_entries
  ADD COLUMN IF NOT EXISTS _encrypted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS _encryption_version SMALLINT DEFAULT 0;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action, table_name);
