CREATE TABLE public.languages (
  code text PRIMARY KEY CHECK (code ~ '^[a-z]{2,8}(-[a-z0-9]{2,8})?$'),
  name text NOT NULL,
  native_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read languages" ON public.languages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admins insert languages" ON public.languages FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins update languages" ON public.languages FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins delete custom languages" ON public.languages FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()) AND NOT is_builtin);

CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language_code, key)
);
GRANT SELECT ON public.translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.translations TO authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read translations" ON public.translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admins insert translations" ON public.translations FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins update translations" ON public.translations FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins delete translations" ON public.translations FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_languages_updated BEFORE UPDATE ON public.languages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_translations_updated BEFORE UPDATE ON public.translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.languages (code, name, native_name, is_active, is_builtin) VALUES
 ('en','English','English',true,true), ('fr','French','Français',true,true);

UPDATE public.profiles SET preferred_language = 'en' WHERE preferred_language = 'bota';
UPDATE public.families SET primary_language = 'en' WHERE primary_language = 'bota';