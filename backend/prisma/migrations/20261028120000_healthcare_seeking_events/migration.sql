CREATE TABLE "healthcare_seeking_events" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "recordedById" TEXT,
  "recognizedAt" TIMESTAMP(3) NOT NULL,
  "arrivedAt" TIMESTAMP(3),
  "arrivalRecordedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "healthcare_seeking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "healthcare_seeking_events_patientId_recognizedAt_idx"
  ON "healthcare_seeking_events"("patientId", "recognizedAt");
CREATE INDEX "healthcare_seeking_events_recordedById_createdAt_idx"
  ON "healthcare_seeking_events"("recordedById", "createdAt");

ALTER TABLE "healthcare_seeking_events"
  ADD CONSTRAINT "healthcare_seeking_events_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "healthcare_seeking_events"
  ADD CONSTRAINT "healthcare_seeking_events_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
