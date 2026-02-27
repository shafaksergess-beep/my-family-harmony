-- Add push_token to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
