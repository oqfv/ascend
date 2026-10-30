import type { Metadata } from "next";
import { Page, PageHeader } from "@/components/page-header";
import { ImportFlow } from "@/components/habits/import-flow";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Import habits" };

export default async function ImportPage() {
  const user = await requireUser();
  const existing = await db.habit.findMany({ where: { userId: user.id }, select: { name: true } });
  return (
    <Page className="max-w-[960px]">
      <PageHeader
        title="Import habits"
        description="Upload a CSV. You'll see every row checked before anything is added, and nothing you already have is changed."
      />
      <ImportFlow today={user.today} existingNames={existing.map((h) => h.name)} />
    </Page>
  );
}
