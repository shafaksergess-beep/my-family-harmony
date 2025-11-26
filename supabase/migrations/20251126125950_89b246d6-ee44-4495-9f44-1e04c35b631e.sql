-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FAMILIES TABLE (Multi-tenant core)
-- ============================================================================
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  heritage_info TEXT,
  meeting_day TEXT DEFAULT 'last_saturday',
  meeting_time TIME DEFAULT '13:00:00',
  mandatory_contribution DECIMAL(10,2) DEFAULT 25000.00,
  njangi_amount DECIMAL(10,2) DEFAULT 25000.00,
  loan_interest_rate DECIMAL(5,2) DEFAULT 2.5,
  share_value DECIMAL(10,2) DEFAULT 50000.00,
  primary_language TEXT DEFAULT 'en',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for families
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER ROLES ENUM
-- ============================================================================
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'family_head',
  'treasurer',
  'loan_committee',
  'member',
  'guest'
);

-- ============================================================================
-- PROFILES TABLE (Extended user info)
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  is_working BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- SUPER ADMINS TABLE
-- ============================================================================
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS for super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view super admin list"
  ON public.super_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FAMILY MEMBERS TABLE (Links users to families)
-- ============================================================================
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.user_role DEFAULT 'member',
  house_name TEXT,
  is_house_representative BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- RLS for family_members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all family members"
  ON public.family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins sa
      WHERE sa.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can view members in their families"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family heads can manage their family members"
  ON public.family_members FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = check_user_id
  );
$$;

-- Function to check if user has role in a family
CREATE OR REPLACE FUNCTION public.has_family_role(
  check_user_id UUID,
  check_family_id UUID,
  check_role public.user_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = check_user_id
      AND family_id = check_family_id
      AND role = check_role
  );
$$;

-- Function to get user's families
CREATE OR REPLACE FUNCTION public.get_user_families(check_user_id UUID)
RETURNS TABLE (
  family_id UUID,
  family_name TEXT,
  family_slug TEXT,
  user_role public.user_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.name,
    f.slug,
    fm.role
  FROM public.families f
  INNER JOIN public.family_members fm ON f.id = fm.family_id
  WHERE fm.user_id = check_user_id AND f.is_active = true
  ORDER BY f.name;
$$;

-- ============================================================================
-- RLS POLICIES FOR FAMILIES
-- ============================================================================

-- Super admins can do everything
CREATE POLICY "Super admins can view all families"
  ON public.families FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert families"
  ON public.families FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all families"
  ON public.families FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete families"
  ON public.families FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Family members can view their own families
CREATE POLICY "Members can view their families"
  ON public.families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid()
    )
  );

-- Family heads can update their family
CREATE POLICY "Family heads can update their family"
  ON public.families FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = auth.uid() AND role = 'family_head'
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX idx_super_admins_user_id ON public.super_admins(user_id);
CREATE INDEX idx_families_slug ON public.families(slug);
CREATE INDEX idx_families_is_active ON public.families(is_active);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Create a sample family
INSERT INTO public.families (name, slug, description, heritage_info)
VALUES (
  'Wonya Kotto Family',
  'wonya-kotto',
  'Descendants of Wonya Kotto, united in heritage and prosperity',
  'The Wonya Kotto family values unity, shared property, education, and Christian heritage from Bota Land.'
);