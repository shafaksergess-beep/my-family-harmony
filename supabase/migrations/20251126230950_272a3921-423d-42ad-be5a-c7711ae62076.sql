-- Drop existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.family_members 
    DROP CONSTRAINT family_members_user_id_fkey;
  END IF;
END $$;

-- Add foreign key relationship between family_members and profiles
ALTER TABLE public.family_members 
ADD CONSTRAINT family_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';