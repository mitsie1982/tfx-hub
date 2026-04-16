-- Manual SQL migration for scheduling/calendar feature
CREATE TABLE IF NOT EXISTS "Availability" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contractorId" VARCHAR(255) NOT NULL,
  "start" TIMESTAMP NOT NULL,
  "end" TIMESTAMP NOT NULL,
  "isBooked" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" VARCHAR(255) NOT NULL,
  "contractorId" VARCHAR(255) NOT NULL,
  "clientId" VARCHAR(255) NOT NULL,
  "slotId" UUID NOT NULL,
  "start" TIMESTAMP NOT NULL,
  "end" TIMESTAMP NOT NULL,
  "calendarEventId" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
