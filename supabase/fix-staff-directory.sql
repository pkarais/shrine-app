-- ============================================================
-- Fix staff_directory table - Add UUID and profile connection
-- ============================================================

-- Step 1: Add ID column (UUID primary key) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_directory' AND column_name = 'id'
  ) THEN
    ALTER TABLE staff_directory 
    ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Step 2: Add profile_id column that references profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_directory' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE staff_directory 
    ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_directory_profile_id ON staff_directory(profile_id);

-- Step 4: Populate profile_id by matching staff_directory.name with profiles.full_name
UPDATE staff_directory sd
SET profile_id = p.id
FROM profiles p
WHERE sd.profile_id IS NULL 
  AND LOWER(sd.name) = LOWER(p.full_name)
  AND p.role IN ('operations', 'security');

-- Step 5: Add RLS policies for staff_directory if not exists
ALTER TABLE staff_directory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_directory' AND policyname = 'staff_directory_select'
  ) THEN
    CREATE POLICY staff_directory_select ON staff_directory 
    FOR SELECT TO authenticated USING (true);
  END IF;

  -- Insert policy (managers only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_directory' AND policyname = 'staff_directory_insert'
  ) THEN
    CREATE POLICY staff_directory_insert ON staff_directory 
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  -- Update policy (managers only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_directory' AND policyname = 'staff_directory_update'
  ) THEN
    CREATE POLICY staff_directory_update ON staff_directory 
    FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Delete policy (managers only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff_directory' AND policyname = 'staff_directory_delete'
  ) THEN
    CREATE POLICY staff_directory_delete ON staff_directory 
    FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Step 6: Update schema.sql comment to reflect changes
COMMENT ON TABLE staff_directory IS 'Staff directory with UUID IDs and profile connections for badge awarding';

-- Step 7: Verify the changes
SELECT 
  'staff_directory now has:' as message,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'staff_directory') as column_count,
  (SELECT COUNT(*) FROM staff_directory) as staff_count,
  (SELECT COUNT(*) FROM staff_directory WHERE profile_id IS NOT NULL) as linked_profiles;
