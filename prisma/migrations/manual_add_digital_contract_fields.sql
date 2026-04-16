-- Manual SQL migration for digital contract fields on Job
ALTER TABLE "Job"
  ADD COLUMN "contractStatus" VARCHAR(32),
  ADD COLUMN "contractClientSigned" BOOLEAN DEFAULT FALSE,
  ADD COLUMN "contractContractorSigned" BOOLEAN DEFAULT FALSE,
  ADD COLUMN "contractDocument" TEXT;
