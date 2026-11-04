import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Page } from "@/components/page-header";
import { WelcomeFlow } from "@/components/nutrition/welcome-flow";
import { loadNutritionProfile } from "@/lib/data/nutrition";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome to Nutrition" };

export default async function NutritionWelcomePage() {
  const user = await requireUser();
  // Someone who already set targets edits them on the targets page instead.
  if (await loadNutritionProfile(user.id)) redirect("/nutrition/targets");
  const name = user.displayName.split(" ")[0] || user.username;
  return (
    <Page className="py-10 lg:py-14">
      <WelcomeFlow year={Number(user.today.slice(0, 4))} name={name} />
    </Page>
  );
}
