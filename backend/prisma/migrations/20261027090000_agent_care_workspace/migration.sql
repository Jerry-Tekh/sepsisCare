CREATE TABLE "agent_memory" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_memory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "agent_memory_patientId_key" ON "agent_memory"("patientId");
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_memory_revisions" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_memory_revisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agent_memory_revisions_patientId_createdAt_idx" ON "agent_memory_revisions"("patientId", "createdAt");
ALTER TABLE "agent_memory_revisions" ADD CONSTRAINT "agent_memory_revisions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "care_plans" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "title" TEXT NOT NULL,
  "issue" TEXT NOT NULL,
  "planData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "care_plans_patientId_version_key" ON "care_plans"("patientId", "version");
CREATE INDEX "care_plans_patientId_isCurrent_idx" ON "care_plans"("patientId", "isCurrent");
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "care_plan_conversations" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "care_plan_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "care_plan_conversations_patientId_createdAt_idx" ON "care_plan_conversations"("patientId", "createdAt");
ALTER TABLE "care_plan_conversations" ADD CONSTRAINT "care_plan_conversations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "care_plan_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "care_plan_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "care_plan_messages_conversationId_createdAt_idx" ON "care_plan_messages"("conversationId", "createdAt");
ALTER TABLE "care_plan_messages" ADD CONSTRAINT "care_plan_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "care_plan_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "care_plan_check_ins" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "care_plan_check_ins_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "care_plan_check_ins_patientId_createdAt_idx" ON "care_plan_check_ins"("patientId", "createdAt");
ALTER TABLE "care_plan_check_ins" ADD CONSTRAINT "care_plan_check_ins_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "care_plan_check_ins" ADD CONSTRAINT "care_plan_check_ins_planId_fkey" FOREIGN KEY ("planId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "care_flags" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "epistemic" TEXT NOT NULL DEFAULT 'suspected',
  "evidence" JSONB NOT NULL,
  "doctorAsk" TEXT NOT NULL,
  "prevention" JSONB NOT NULL,
  "outcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "care_flags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "care_flags_patientId_status_createdAt_idx" ON "care_flags"("patientId", "status", "createdAt");
ALTER TABLE "care_flags" ADD CONSTRAINT "care_flags_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
