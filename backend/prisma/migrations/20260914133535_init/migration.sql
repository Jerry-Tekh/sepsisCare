-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PathwayStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('ASSISTANT', 'CAREGIVER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SafetyQueryStatus" AS ENUM ('OPEN', 'RED_FLAG_TRIGGERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QueryMessageRole" AS ENUM ('CHW', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "PreventionTrack" AS ENUM ('PRIMARY', 'SECONDARY', 'COMBINED', 'GENERAL');

-- CreateEnum
CREATE TYPE "TargetAudience" AS ENUM ('CHW', 'CAREGIVER', 'BOTH');

-- CreateEnum
CREATE TYPE "MaterialSource" AS ENUM ('SYSTEM_AUTO', 'CHW_REQUEST');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "location" TEXT,
    "relationshipToCaregiver" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_pathways" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pathways" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pathwayName" TEXT NOT NULL,
    "status" "PathwayStatus" NOT NULL DEFAULT 'ACTIVE',
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_profiles" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "riskData" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_queries" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Safety Query',
    "status" "SafetyQueryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_query_messages" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "role" "QueryMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_query_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "microlearning_materials" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "preventionTrack" "PreventionTrack" NOT NULL DEFAULT 'GENERAL',
    "targetAudience" "TargetAudience" NOT NULL DEFAULT 'BOTH',
    "contentData" JSONB NOT NULL,
    "isAutoRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isAssigned" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" "MaterialSource" NOT NULL DEFAULT 'SYSTEM_AUTO',
    "triggerContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "microlearning_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "patients_caregiverId_idx" ON "patients"("caregiverId");

-- CreateIndex
CREATE INDEX "onboarding_sessions_patientId_idx" ON "onboarding_sessions"("patientId");

-- CreateIndex
CREATE INDEX "onboarding_messages_sessionId_idx" ON "onboarding_messages"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_pathways_name_key" ON "clinical_pathways"("name");

-- CreateIndex
CREATE INDEX "patient_pathways_patientId_idx" ON "patient_pathways"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_pathways_patientId_pathwayName_key" ON "patient_pathways"("patientId", "pathwayName");

-- CreateIndex
CREATE INDEX "risk_profiles_patientId_idx" ON "risk_profiles"("patientId");

-- CreateIndex
CREATE INDEX "safety_queries_patientId_idx" ON "safety_queries"("patientId");

-- CreateIndex
CREATE INDEX "safety_queries_caregiverId_idx" ON "safety_queries"("caregiverId");

-- CreateIndex
CREATE INDEX "safety_query_messages_queryId_idx" ON "safety_query_messages"("queryId");

-- CreateIndex
CREATE INDEX "microlearning_materials_patientId_idx" ON "microlearning_materials"("patientId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_messages" ADD CONSTRAINT "onboarding_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "onboarding_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathways" ADD CONSTRAINT "patient_pathways_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_profiles" ADD CONSTRAINT "risk_profiles_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_queries" ADD CONSTRAINT "safety_queries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_queries" ADD CONSTRAINT "safety_queries_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_query_messages" ADD CONSTRAINT "safety_query_messages_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "safety_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "microlearning_materials" ADD CONSTRAINT "microlearning_materials_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
