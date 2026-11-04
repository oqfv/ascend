-- Workouts: custom exercises, one workout per day, and its sets.
CREATE TABLE "custom_exercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Other',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_exercise_pkey" PRIMARY KEY ("id"),
    CONSTRAINT custom_exercise_name_length CHECK (char_length("name") BETWEEN 1 AND 60)
);
CREATE TABLE "workout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "workout_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workout_set" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workout_set_pkey" PRIMARY KEY ("id"),
    CONSTRAINT workout_set_reps CHECK ("reps" BETWEEN 1 AND 500),
    CONSTRAINT workout_set_weight CHECK ("weightKg" >= 0 AND "weightKg" <= 1000)
);
CREATE UNIQUE INDEX "custom_exercise_userId_name_key" ON "custom_exercise"("userId", "name");
CREATE UNIQUE INDEX "workout_userId_date_key" ON "workout"("userId", "date");
CREATE INDEX "workout_set_workoutId_idx" ON "workout_set"("workoutId");
CREATE INDEX "workout_set_userId_exercise_idx" ON "workout_set"("userId", "exercise");
ALTER TABLE "custom_exercise" ADD CONSTRAINT "custom_exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout" ADD CONSTRAINT "workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same protection as every other table: no Data API access, the app role only.
ALTER TABLE "custom_exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_set" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "custom_exercise", "workout", "workout_set" TO ascend_app;
CREATE POLICY app_server_access ON "custom_exercise" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
CREATE POLICY app_server_access ON "workout" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
CREATE POLICY app_server_access ON "workout_set" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
