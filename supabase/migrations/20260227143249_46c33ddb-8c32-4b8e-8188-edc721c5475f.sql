
-- Create a function to auto-generate share numbers
CREATE OR REPLACE FUNCTION public.generate_share_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next number for this family
  SELECT COALESCE(MAX(
    CASE 
      WHEN share_number ~ '^SH-[0-9]+$' 
      THEN CAST(SUBSTRING(share_number FROM 4) AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1
  INTO next_num
  FROM public.shares
  WHERE family_id = NEW.family_id;
  
  NEW.share_number := 'SH-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate share numbers on insert
CREATE TRIGGER auto_generate_share_number
  BEFORE INSERT ON public.shares
  FOR EACH ROW
  WHEN (NEW.share_number IS NULL OR NEW.share_number = '')
  EXECUTE FUNCTION public.generate_share_number();

-- Make share_number have a default so it can be omitted
ALTER TABLE public.shares ALTER COLUMN share_number SET DEFAULT '';

-- Update existing shares that don't have SH-XXX format
DO $$
DECLARE
  rec RECORD;
  counter INTEGER;
  current_family UUID := NULL;
BEGIN
  counter := 0;
  FOR rec IN 
    SELECT id, family_id 
    FROM public.shares 
    WHERE share_number !~ '^SH-[0-9]+$' OR share_number IS NULL OR share_number = ''
    ORDER BY family_id, created_at
  LOOP
    IF current_family IS DISTINCT FROM rec.family_id THEN
      current_family := rec.family_id;
      -- Get max existing SH-XXX number for this family
      SELECT COALESCE(MAX(
        CASE 
          WHEN share_number ~ '^SH-[0-9]+$' 
          THEN CAST(SUBSTRING(share_number FROM 4) AS INTEGER)
          ELSE 0 
        END
      ), 0) INTO counter FROM public.shares WHERE family_id = rec.family_id;
    END IF;
    counter := counter + 1;
    UPDATE public.shares SET share_number = 'SH-' || LPAD(counter::TEXT, 3, '0') WHERE id = rec.id;
  END LOOP;
END;
$$;
