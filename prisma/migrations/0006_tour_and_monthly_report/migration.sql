-- The welcome tour and the optional monthly report email.
ALTER TABLE "user_preference"
  ADD COLUMN "tourDoneAt" TIMESTAMPTZ(3),
  ADD COLUMN "monthlyReport" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "monthlyReportSentFor" TEXT;

-- People who signed up before the tour existed already know their way around.
UPDATE "user_preference" SET "tourDoneAt" = CURRENT_TIMESTAMP;
