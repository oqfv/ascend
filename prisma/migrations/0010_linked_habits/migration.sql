-- A habit can be linked to Nutrition so its progress fills itself in:
-- WATER (ml drunk), PROTEIN (grams eaten) or ON_TARGET (calories within 10% and protein reached).
ALTER TABLE "habit" ADD COLUMN "link" TEXT;
ALTER TABLE "habit" ADD CONSTRAINT "habit_link_check" CHECK ("link" IN ('WATER', 'PROTEIN', 'ON_TARGET'));
-- At most one live habit per link for each user.
CREATE UNIQUE INDEX "habit_userId_link_live_key" ON "habit" ("userId", "link") WHERE "link" IS NOT NULL AND "archivedOn" IS NULL;
