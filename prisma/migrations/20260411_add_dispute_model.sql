// Migration SQL for Dispute model
CREATE TABLE IF NOT EXISTS "Dispute" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" VARCHAR(255) NOT NULL,
  "parties" TEXT[] NOT NULL,
  "chatHistory" JSONB,
  "status" VARCHAR(32) NOT NULL,
  "resolution" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
