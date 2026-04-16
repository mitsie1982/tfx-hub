-- Create notification_failures table for persistence and retry
CREATE TABLE IF NOT EXISTS notification_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  job_id TEXT,
  error TEXT,
  trace_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);
