-- Add UUID primary key and profile_id to staff_directory
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Clean up test profiles (but NOT pk@pkaras.com)
DELETE FROM profiles WHERE email IN ('security@shrine.org', 'operations@shrine.org', 'user@shrine.org', 'manager@shrine.org');
