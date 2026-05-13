CREATE TABLE IF NOT EXISTS public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','success')),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  link_url text,
  link_label text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active announcements"
ON public.system_announcements FOR SELECT
TO authenticated
USING (
  active = true
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at > now())
);

CREATE POLICY "Super admins can view all announcements"
ON public.system_announcements FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can insert announcements"
ON public.system_announcements FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can update announcements"
ON public.system_announcements FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can delete announcements"
ON public.system_announcements FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_system_announcements_active
  ON public.system_announcements(active, starts_at, ends_at);