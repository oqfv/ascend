import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { Page, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { TargetsForm } from "@/components/nutrition/targets-form";
import { loadNutritionProfile } from "@/lib/data/nutrition";
import type { Activity, Goal, Sex } from "@/lib/domain/nutrition";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Nutrition targets" };

export default async function TargetsPage() {
  const user = await requireUser();
  const p = await loadNutritionProfile(user.id);
  return (
    <Page className="max-w-[860px]">
      <LinkButton variant="ghost" href="/nutrition" className="-ml-3 mb-2">
        <ChevronLeft /> Nutrition
      </LinkButton>
      <PageHeader title="Daily targets" description="Ascend suggests calories and macros from your details. Only you can see them." />
      <div className="mt-6">
        <TargetsForm
          year={Number(user.today.slice(0, 4))}
          initial={p ? { sex: p.sex as Sex, birthYear: p.birthYear, heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity as Activity, goal: p.goal as Goal, calorieTarget: p.calorieTarget, proteinTarget: p.proteinTarget } : null}
        />
      </div>
    </Page>
  );
}
