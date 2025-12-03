-- Move pg_net extension from public to extensions schema
-- First ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop and recreate the extension in the correct schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;