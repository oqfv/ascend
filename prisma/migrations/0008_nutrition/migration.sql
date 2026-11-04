-- Nutrition: body details and targets, and the foods eaten each day.
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

CREATE TABLE "nutrition_profile" (
    "userId" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "activity" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "calorieTarget" INTEGER NOT NULL,
    "proteinTarget" INTEGER NOT NULL,
    "carbsTarget" INTEGER NOT NULL,
    "fatTarget" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "nutrition_profile_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT nutrition_profile_sex CHECK ("sex" IN ('male', 'female')),
    CONSTRAINT nutrition_profile_activity CHECK ("activity" IN ('sedentary', 'light', 'moderate', 'active', 'very')),
    CONSTRAINT nutrition_profile_goal CHECK ("goal" IN ('lose', 'keep', 'gain')),
    CONSTRAINT nutrition_profile_body CHECK ("heightCm" BETWEEN 100 AND 250 AND "weightKg" BETWEEN 25 AND 350),
    CONSTRAINT nutrition_profile_targets CHECK ("calorieTarget" BETWEEN 800 AND 8000 AND "proteinTarget" BETWEEN 0 AND 600 AND "carbsTarget" BETWEEN 0 AND 1500 AND "fatTarget" BETWEEN 0 AND 600)
);

CREATE TABLE "food_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "grams" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "per100Calories" DOUBLE PRECISION,
    "per100Protein" DOUBLE PRECISION,
    "per100Carbs" DOUBLE PRECISION,
    "per100Fat" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "food_entry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT food_entry_name_length CHECK (char_length("name") BETWEEN 1 AND 120),
    CONSTRAINT food_entry_amounts CHECK ("calories" BETWEEN 0 AND 20000 AND "protein" >= 0 AND "carbs" >= 0 AND "fat" >= 0 AND ("grams" IS NULL OR "grams" > 0)),
    CONSTRAINT food_entry_source CHECK ("source" IN ('off', 'usda', 'manual', 'gemini'))
);
CREATE INDEX "food_entry_userId_date_idx" ON "food_entry"("userId", "date");
CREATE INDEX "food_entry_userId_createdAt_idx" ON "food_entry"("userId", "createdAt");
ALTER TABLE "nutrition_profile" ADD CONSTRAINT "nutrition_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same protection as every other table: no Data API access, the app role only.
ALTER TABLE "nutrition_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_entry" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "nutrition_profile", "food_entry" TO ascend_app;
CREATE POLICY app_server_access ON "nutrition_profile" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
CREATE POLICY app_server_access ON "food_entry" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
