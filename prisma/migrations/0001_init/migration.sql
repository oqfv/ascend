-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKDAYS', 'INTERVAL', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('CHECKBOX', 'DURATION', 'COUNT', 'QUANTITY');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "username" TEXT,
    "displayUsername" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "gamificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "journalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "hideCompleted" BOOLEAN NOT NULL DEFAULT false,
    "reviewReminderTime" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_schedule" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "weekdays" INTEGER[],
    "intervalDays" INTEGER,
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "targetType" "TargetType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetUnit" TEXT,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "requireSubHabits" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_habit" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetUnit" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "activeFrom" DATE NOT NULL,
    "archivedOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "occurrence" INTEGER NOT NULL DEFAULT 0,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "habit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_habit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "subHabitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "occurrence" INTEGER NOT NULL DEFAULT 0,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sub_habit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reflection" TEXT,
    "mood" INTEGER,
    "energy" INTEGER,
    "sleepQuality" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "category_userId_name_key" ON "category"("userId", "name");

-- CreateIndex
CREATE INDEX "habit_userId_archivedOn_idx" ON "habit"("userId", "archivedOn");

-- CreateIndex
CREATE INDEX "habit_categoryId_idx" ON "habit"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "habit_schedule_habitId_effectiveFrom_key" ON "habit_schedule"("habitId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "sub_habit_habitId_idx" ON "sub_habit"("habitId");

-- CreateIndex
CREATE INDEX "habit_log_userId_date_idx" ON "habit_log"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_log_habitId_date_occurrence_key" ON "habit_log"("habitId", "date", "occurrence");

-- CreateIndex
CREATE INDEX "sub_habit_log_userId_date_idx" ON "sub_habit_log"("userId", "date");

-- CreateIndex
CREATE INDEX "sub_habit_log_habitId_date_idx" ON "sub_habit_log"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sub_habit_log_subHabitId_date_occurrence_key" ON "sub_habit_log"("subHabitId", "date", "occurrence");

-- CreateIndex
CREATE UNIQUE INDEX "daily_review_userId_date_key" ON "daily_review"("userId", "date");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit" ADD CONSTRAINT "habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit" ADD CONSTRAINT "habit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_schedule" ADD CONSTRAINT "habit_schedule_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_habit" ADD CONSTRAINT "sub_habit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_log" ADD CONSTRAINT "habit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_log" ADD CONSTRAINT "habit_log_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_habit_log" ADD CONSTRAINT "sub_habit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_habit_log" ADD CONSTRAINT "sub_habit_log_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_habit_log" ADD CONSTRAINT "sub_habit_log_subHabitId_fkey" FOREIGN KEY ("subHabitId") REFERENCES "sub_habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_review" ADD CONSTRAINT "daily_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

