-- Create trigger to notify admins when new profiles are created
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin notification for new user registration
  INSERT INTO public.admin_notifications (
    notification_type,
    title,
    message,
    data
  ) VALUES (
    'new_user',
    'New User Registered',
    NEW.full_name || ' (' || COALESCE(NEW.email, 'no email') || ') has created an account.',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'full_name', NEW.full_name,
      'phone', NEW.phone,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_new_user_notify_admin ON public.profiles;
CREATE TRIGGER on_new_user_notify_admin
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_new_user();