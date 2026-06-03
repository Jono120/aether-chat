ALTER TABLE error_reports
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'auto')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'triaged', 'resolved')),
  ADD COLUMN IF NOT EXISTS error_name TEXT,
  ADD COLUMN IF NOT EXISTS stack_snippet TEXT;

CREATE INDEX IF NOT EXISTS error_reports_status_created_idx
  ON error_reports (status, created_at DESC);
