-- Add foreign key constraint from admin_logs to profiles
ALTER TABLE public.admin_logs
ADD CONSTRAINT admin_logs_admin_user_id_fkey 
FOREIGN KEY (admin_user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;