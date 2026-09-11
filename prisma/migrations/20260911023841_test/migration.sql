-- CreateEnum
CREATE TYPE "TemplateEntityType" AS ENUM ('SUBJECT', 'CATEGORY', 'TOPIC');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "TestTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "testType" "TestType" NOT NULL DEFAULT 'PRACTICE',
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "totalQuestions" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalMarks" DOUBLE PRECISION,
    "passingMarks" DOUBLE PRECISION,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "subjectId" TEXT,
    "examTag" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyMap" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelHi" TEXT,
    "entityType" "TemplateEntityType" NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "defaultWeight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyAlias" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "entityType" "TemplateEntityType" NOT NULL,
    "entityId" TEXT,
    "mapKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxonomyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestionStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timesShown" INTEGER NOT NULL DEFAULT 0,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "timesSkipped" INTEGER NOT NULL DEFAULT 0,
    "masteryLevel" INTEGER NOT NULL DEFAULT 0,
    "lastShownAt" TIMESTAMP(3),
    "lastCorrectAt" TIMESTAMP(3),
    "lastWrongAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestionStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestGenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "templateId" TEXT,
    "testId" TEXT,
    "params" JSONB NOT NULL,
    "sectionResult" JSONB NOT NULL,
    "questionIds" TEXT[],
    "success" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cooldownDays" INTEGER NOT NULL DEFAULT 14,
    "maxShowInWindow" INTEGER NOT NULL DEFAULT 2,
    "windowDays" INTEGER NOT NULL DEFAULT 30,
    "weightNeverSeen" INTEGER NOT NULL DEFAULT 100,
    "weightWrong" INTEGER NOT NULL DEFAULT 40,
    "weightLowMastery" INTEGER NOT NULL DEFAULT 20,
    "weightOverShown" INTEGER NOT NULL DEFAULT -50,
    "wrongBoostDays" INTEGER NOT NULL DEFAULT 21,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestTemplate_slug_key" ON "TestTemplate"("slug");

-- CreateIndex
CREATE INDEX "TestTemplate_status_testType_idx" ON "TestTemplate"("status", "testType");

-- CreateIndex
CREATE INDEX "TestTemplate_examTag_idx" ON "TestTemplate"("examTag");

-- CreateIndex
CREATE INDEX "TestTemplate_isFeatured_order_idx" ON "TestTemplate"("isFeatured", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyMap_key_key" ON "TaxonomyMap"("key");

-- CreateIndex
CREATE INDEX "TaxonomyMap_entityType_entityId_idx" ON "TaxonomyMap"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TaxonomyAlias_normalized_idx" ON "TaxonomyAlias"("normalized");

-- CreateIndex
CREATE INDEX "TaxonomyAlias_entityId_idx" ON "TaxonomyAlias"("entityId");

-- CreateIndex
CREATE INDEX "TaxonomyAlias_mapKey_idx" ON "TaxonomyAlias"("mapKey");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyAlias_entityType_normalized_key" ON "TaxonomyAlias"("entityType", "normalized");

-- CreateIndex
CREATE INDEX "UserQuestionStat_userId_lastShownAt_idx" ON "UserQuestionStat"("userId", "lastShownAt");

-- CreateIndex
CREATE INDEX "UserQuestionStat_userId_masteryLevel_idx" ON "UserQuestionStat"("userId", "masteryLevel");

-- CreateIndex
CREATE INDEX "UserQuestionStat_userId_cooldownUntil_idx" ON "UserQuestionStat"("userId", "cooldownUntil");

-- CreateIndex
CREATE INDEX "UserQuestionStat_questionId_idx" ON "UserQuestionStat"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionStat_userId_questionId_key" ON "UserQuestionStat"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "TestGenerationLog_testId_key" ON "TestGenerationLog"("testId");

-- CreateIndex
CREATE INDEX "TestGenerationLog_userId_createdAt_idx" ON "TestGenerationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TestGenerationLog_templateId_createdAt_idx" ON "TestGenerationLog"("templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationPolicy_name_key" ON "GenerationPolicy"("name");

-- AddForeignKey
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestGenerationLog" ADD CONSTRAINT "TestGenerationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestGenerationLog" ADD CONSTRAINT "TestGenerationLog_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;
