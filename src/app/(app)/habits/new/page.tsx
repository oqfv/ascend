import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/page-header";
import { HabitForm } from "@/components/habits/habit-form";
import { defaultHabitValues } from "@/components/habits/form-values";
import { loadCategories } from "@/lib/data/habits";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "New habit" };

export default async function NewHabitPage() {
  const user = await requireUser();
  const categories = await loadCategories(user.id);
  return (
    <Page className="max-w-[960px]">
      <PageHeader title="New habit" description="A name is enough. Targets, steps and a schedule are there when you need them." />
      <HabitForm mode="create" initial={defaultHabitValues(user.today)} categories={categories} />
    </Page>
  );
}
