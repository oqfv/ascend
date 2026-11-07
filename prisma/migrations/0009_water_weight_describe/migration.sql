-- Foods found by describing a meal come from CalorieNinjas.
ALTER TABLE "food_entry" DROP CONSTRAINT food_entry_source;
ALTER TABLE "food_entry" ADD CONSTRAINT food_entry_source CHECK ("source" IN ('off', 'usda', 'manual', 'gemini', 'ninjas'));

-- A daily water goal, and one water total per day.
ALTER TABLE "nutrition_profile" ADD COLUMN "waterTargetMl" INTEGER;
ALTER TABLE "nutrition_profile" ADD CONSTRAINT nutrition_profile_water CHECK ("waterTargetMl" IS NULL OR "waterTargetMl" BETWEEN 500 AND 8000);

CREATE TABLE "water_log" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ml" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "water_log_pkey" PRIMARY KEY ("userId", "date"),
    CONSTRAINT water_log_ml CHECK ("ml" BETWEEN 0 AND 20000)
);

-- Body weight, one reading per day.
CREATE TABLE "body_weight" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "body_weight_pkey" PRIMARY KEY ("userId", "date"),
    CONSTRAINT body_weight_kg CHECK ("kg" BETWEEN 25 AND 350)
);

ALTER TABLE "water_log" ADD CONSTRAINT "water_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "body_weight" ADD CONSTRAINT "body_weight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same protection as every other table: no Data API access, the app role only.
ALTER TABLE "water_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "body_weight" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "water_log", "body_weight" TO ascend_app;
CREATE POLICY app_server_access ON "water_log" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
CREATE POLICY app_server_access ON "body_weight" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
