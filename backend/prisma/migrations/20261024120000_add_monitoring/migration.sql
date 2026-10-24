-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('NORMAL', 'WATCH', 'URGENT');

-- CreateTable
CREATE TABLE "vital_readings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatureC" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "systolicBP" INTEGER,
    "diastolicBP" INTEGER,
    "oxygenSaturation" INTEGER,
    "notes" TEXT,
    "alertLevel" "AlertLevel" NOT NULL DEFAULT 'NORMAL',
    "alerts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_check_ins" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "feverOrChills" BOOLEAN NOT NULL DEFAULT false,
    "confusion" BOOLEAN NOT NULL DEFAULT false,
    "breathingTrouble" BOOLEAN NOT NULL DEFAULT false,
    "skinChanges" BOOLEAN NOT NULL DEFAULT false,
    "severePain" BOOLEAN NOT NULL DEFAULT false,
    "reducedUrine" BOOLEAN NOT NULL DEFAULT false,
    "woundWorse" BOOLEAN NOT NULL DEFAULT false,
    "notEatingDrinking" BOOLEAN NOT NULL DEFAULT false,
    "feelsWorse" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "alertLevel" "AlertLevel" NOT NULL DEFAULT 'NORMAL',
    "alerts" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vital_readings_patientId_recordedAt_idx" ON "vital_readings"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "daily_check_ins_patientId_createdAt_idx" ON "daily_check_ins"("patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "vital_readings" ADD CONSTRAINT "vital_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_check_ins" ADD CONSTRAINT "daily_check_ins_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

