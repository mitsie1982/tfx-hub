CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  association_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  password_hash TEXT NOT NULL,
  is_bootstrap_admin BOOLEAN NOT NULL DEFAULT FALSE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  professional_id TEXT,
  trade TEXT,
  tier TEXT,
  rating NUMERIC(3,2) DEFAULT 4.50,
  completed_jobs INTEGER DEFAULT 0,
  active_quotes INTEGER DEFAULT 0,
  response_time TEXT DEFAULT '12 min',
  phone_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bootstrap_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  trade TEXT NOT NULL,
  status TEXT NOT NULL,
  budget TEXT,
  location TEXT,
  urgency TEXT DEFAULT 'Flexible',
  posted TEXT DEFAULT 'Recently added',
  lead_type TEXT DEFAULT 'Verified homeowner',
  match_score INTEGER DEFAULT 75,
  client_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL,
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contractor_events (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_access_audit (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT DEFAULT '',
  identifier TEXT,
  request_path TEXT,
  request_method TEXT,
  target_user_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  completed_stages TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_contractor_sessions (
  phone_number TEXT PRIMARY KEY,
  session_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_professional_shortlist (
  customer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (customer_user_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_trade ON jobs(status, trade);
CREATE INDEX IF NOT EXISTS idx_contractor_events_professional ON contractor_events(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_professional ON admin_actions(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_access_audit_created_at ON admin_access_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(lower(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_professional_shortlist_customer ON customer_professional_shortlist(customer_user_id, created_at DESC);
