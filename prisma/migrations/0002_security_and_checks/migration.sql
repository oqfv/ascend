-- Supabase exposes the public schema through its Data API. Ascend never uses that API: all
-- access goes through the app's server with its own database role. Enabling RLS with no
-- policies for anon/authenticated means the Data API can read and write nothing.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sub_habit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "habit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sub_habit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_review" ENABLE ROW LEVEL SECURITY;

-- Invariants the application relies on, enforced by the database as well.
ALTER TABLE "user_preference"
  ADD CONSTRAINT user_preference_week_start CHECK ("weekStartsOn" BETWEEN 0 AND 6),
  ADD CONSTRAINT user_preference_theme CHECK ("theme" IN ('light', 'dark', 'system'));

ALTER TABLE "habit"
  ADD CONSTRAINT habit_name_length CHECK (char_length("name") BETWEEN 1 AND 80),
  ADD CONSTRAINT habit_dates CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
  ADD CONSTRAINT habit_reminder_time CHECK ("reminderTime" IS NULL OR "reminderTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "habit_schedule"
  ADD CONSTRAINT habit_schedule_target CHECK ("targetValue" > 0),
  ADD CONSTRAINT habit_schedule_times CHECK ("timesPerDay" BETWEEN 1 AND 10),
  ADD CONSTRAINT habit_schedule_interval CHECK ("intervalDays" IS NULL OR "intervalDays" BETWEEN 1 AND 365),
  ADD CONSTRAINT habit_schedule_weekdays CHECK ("weekdays" <@ ARRAY[0,1,2,3,4,5,6]);

ALTER TABLE "sub_habit"
  ADD CONSTRAINT sub_habit_target CHECK ("targetValue" > 0);

ALTER TABLE "habit_log"
  ADD CONSTRAINT habit_log_value CHECK ("value" >= 0),
  ADD CONSTRAINT habit_log_occurrence CHECK ("occurrence" BETWEEN 0 AND 9);

ALTER TABLE "sub_habit_log"
  ADD CONSTRAINT sub_habit_log_value CHECK ("value" >= 0),
  ADD CONSTRAINT sub_habit_log_occurrence CHECK ("occurrence" BETWEEN 0 AND 9);

ALTER TABLE "daily_review"
  ADD CONSTRAINT daily_review_mood CHECK ("mood" IS NULL OR "mood" BETWEEN 1 AND 5),
  ADD CONSTRAINT daily_review_energy CHECK ("energy" IS NULL OR "energy" BETWEEN 1 AND 5),
  ADD CONSTRAINT daily_review_sleep CHECK ("sleepQuality" IS NULL OR "sleepQuality" BETWEEN 1 AND 5);
