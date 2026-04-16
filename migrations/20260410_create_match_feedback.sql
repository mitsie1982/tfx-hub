-- migrations/20260410_create_match_feedback.sql
-- Step 2: Feedback Data Model for Matching Engine

CREATE TABLE IF NOT EXISTS match_feedback (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    professional_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    match_score NUMERIC,
    outcome VARCHAR(32), -- e.g. 'completed', 'cancelled', 'rejected'
    client_rating NUMERIC, -- 1-5
    professional_rating NUMERIC, -- 1-5
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_feedback_job ON match_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_professional ON match_feedback(professional_id);
