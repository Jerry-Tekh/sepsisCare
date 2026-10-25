CREATE TYPE "UserRole" AS ENUM ('CAREGIVER', 'ORGANIZATION_ADMIN');
CREATE TYPE "LearningGuideStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "VerifiedSourceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "healthcare_organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "healthcare_organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "healthcare_organizations_name_key" ON "healthcare_organizations"("name");

ALTER TABLE "users"
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CAREGIVER',
    ADD COLUMN "organizationId" TEXT;

CREATE TABLE "learning_guides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prognosisVector" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "pdfObjectKey" TEXT NOT NULL,
    "pdfOriginalName" TEXT NOT NULL,
    "pdfSizeBytes" INTEGER NOT NULL,
    "status" "LearningGuideStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learning_guides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verified_sources" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "status" "VerifiedSourceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verified_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guide_sources" (
    "guideId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    CONSTRAINT "guide_sources_pkey" PRIMARY KEY ("guideId", "sourceId")
);

CREATE UNIQUE INDEX "learning_guides_pdfObjectKey_key" ON "learning_guides"("pdfObjectKey");
CREATE INDEX "learning_guides_organizationId_status_createdAt_idx" ON "learning_guides"("organizationId", "status", "createdAt");
CREATE INDEX "learning_guides_prognosisVector_idx" ON "learning_guides"("prognosisVector");
CREATE UNIQUE INDEX "verified_sources_organizationId_url_key" ON "verified_sources"("organizationId", "url");
CREATE INDEX "verified_sources_organizationId_status_idx" ON "verified_sources"("organizationId", "status");

ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "healthcare_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_guides" ADD CONSTRAINT "learning_guides_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "healthcare_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_guides" ADD CONSTRAINT "learning_guides_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verified_sources" ADD CONSTRAINT "verified_sources_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "healthcare_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "verified_sources" ADD CONSTRAINT "verified_sources_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "verified_sources" ADD CONSTRAINT "verified_sources_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "guide_sources" ADD CONSTRAINT "guide_sources_guideId_fkey"
    FOREIGN KEY ("guideId") REFERENCES "learning_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guide_sources" ADD CONSTRAINT "guide_sources_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "verified_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
