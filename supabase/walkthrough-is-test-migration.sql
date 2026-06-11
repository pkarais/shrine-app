-- Add is_test column to walkthroughs and walkthrough_archive tables
-- This allows distinguishing test/fake submissions from real staff walkthroughs.
-- Test data can be purged; real data is preserved forever in the archive.

ALTER TABLE public.walkthroughs
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.walkthrough_archive
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Index for fast filtering of test vs real data
CREATE INDEX IF NOT EXISTS idx_walkthroughs_is_test ON walkthroughs (is_test);
CREATE INDEX IF NOT EXISTS idx_walkthrough_archive_is_test ON walkthrough_archive (is_test);
