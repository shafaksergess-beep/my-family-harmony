CREATE TABLE public.user_session_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  user_agent TEXT,
  device_label TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

CREATE INDEX idx_user_session_metadata_user ON public.user_session_metadata(user_id, last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_session_metadata TO authenticated;
GRANT ALL ON public.user_session_metadata TO service_role;

ALTER TABLE public.user_session_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own session metadata"
  ON public.user_session_metadata FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own session metadata"
  ON public.user_session_metadata FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);