-- Add new roles to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'family_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretary';