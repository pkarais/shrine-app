-- ============================================================
-- Archive tables for daily wipe-and-archive workflow
-- ============================================================
-- Manager hits "Archive & Clear" → rows are copied here and the
-- live tables are emptied so the weekly view starts fresh.
-- Archived rows keep all original columns + archived_at + archived_by.
-- ============================================================

-- ── messages_archive ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages_archive (
  id            UUID PRIMARY KEY,
  sender_id     UUID,
  recipient_id  UUID,
  content       TEXT,
  media_urls    JSONB DEFAULT '[]',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL,
  archived_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by   UUID
);
CREATE INDEX IF NOT EXISTS idx_messages_archive_created
  ON messages_archive (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_archive_pair
  ON messages_archive (sender_id, recipient_id);

-- ── group_messages_archive ───────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages_archive (
  id              UUID PRIMARY KEY,
  conversation_id UUID,
  sender_id       UUID,
  content         TEXT,
  media_urls      JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL,
  archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by     UUID
);
CREATE INDEX IF NOT EXISTS idx_group_messages_archive_created
  ON group_messages_archive (created_at DESC);

-- ── incidents_archive ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents_archive (
  id                          UUID PRIMARY KEY,
  user_id                     UUID,
  event_id                    BIGINT,
  incident_date               TIMESTAMPTZ,
  report_date                 TIMESTAMPTZ,
  shift                       TEXT,
  location                    TEXT,
  incident_types              TEXT[],
  description                 TEXT,
  involved_person_name        TEXT,
  involved_person_description TEXT,
  involved_person_contact     TEXT,
  witness_name                TEXT,
  witness_contact             TEXT,
  witness_statement           TEXT,
  actions_taken               TEXT[],
  authorities_contacted       BOOLEAN,
  agency_contacted            TEXT[],
  officer_name_badge          TEXT,
  case_number                 TEXT,
  evidence_photos             BOOLEAN,
  evidence_footage            BOOLEAN,
  evidence_statements         BOOLEAN,
  camera_location             TEXT,
  follow_up_required          TEXT[],
  follow_up_details           TEXT,
  severity                    TEXT,
  media_urls                  JSONB DEFAULT '[]',
  created_at                  TIMESTAMPTZ NOT NULL,
  archived_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_by                 UUID
);
CREATE INDEX IF NOT EXISTS idx_incidents_archive_created
  ON incidents_archive (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_archive_severity
  ON incidents_archive (severity);

-- ── archive_runs (audit log of every archive action) ─────────
CREATE TABLE IF NOT EXISTS archive_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         TEXT NOT NULL,  -- 'messages' | 'group_messages' | 'incidents' | 'all'
  rows_archived INT NOT NULL DEFAULT 0,
  cutoff        TIMESTAMPTZ,    -- only rows created_at <= cutoff were archived
  triggered_by  UUID,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note          TEXT
);
CREATE INDEX IF NOT EXISTS idx_archive_runs_at
  ON archive_runs (triggered_at DESC);

-- RLS: read access for managers only (service role bypasses).
ALTER TABLE messages_archive       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents_archive      ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_runs           ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- messages_archive
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages_archive' AND policyname='messages_archive_manager_read') THEN
    CREATE POLICY messages_archive_manager_read ON messages_archive
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager'));
  END IF;
  -- group_messages_archive
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_messages_archive' AND policyname='group_messages_archive_manager_read') THEN
    CREATE POLICY group_messages_archive_manager_read ON group_messages_archive
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager'));
  END IF;
  -- incidents_archive
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='incidents_archive' AND policyname='incidents_archive_manager_read') THEN
    CREATE POLICY incidents_archive_manager_read ON incidents_archive
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager'));
  END IF;
  -- archive_runs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='archive_runs' AND policyname='archive_runs_manager_read') THEN
    CREATE POLICY archive_runs_manager_read ON archive_runs
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager'));
  END IF;
END $$;
