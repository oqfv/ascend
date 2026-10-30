import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/monthly-report";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

// The email's unsubscribe link lands here. Turning the report off takes a button press, not just a
// visit, because mail scanners open links on their own.

async function unsubscribe(form: FormData) {
  "use server";
  const userId = String(form.get("u") ?? "");
  if (!verifyUnsubscribe(userId, String(form.get("t") ?? ""))) return;
  await db.userPreference.updateMany({ where: { userId }, data: { monthlyReport: false } });
  revalidatePath("/unsubscribe");
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u = "", t = "" } = await searchParams;
  const valid = u !== "" && verifyUnsubscribe(u, t);
  const prefs = valid ? await db.userPreference.findUnique({ where: { userId: u }, select: { monthlyReport: true } }) : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <main className="w-full max-w-[420px]">
        <Link href="/" aria-label="Ascend home">
          <Wordmark />
        </Link>
        <h1 className="mt-10 text-3xl font-semibold tracking-[-0.02em]">Monthly report</h1>
        {!valid || !prefs ? (
          <p className="mt-3 text-base text-muted-foreground">
            This link doesn&apos;t work any more. You can turn the report off in{" "}
            <Link href="/settings#report" className="font-medium text-foreground underline underline-offset-4">
              Settings
            </Link>
            .
          </p>
        ) : prefs.monthlyReport ? (
          <form action={unsubscribe} className="mt-3 grid gap-5">
            <p className="text-base text-muted-foreground">Stop the monthly report email? Your habits and history stay as they are.</p>
            <input type="hidden" name="u" value={u} />
            <input type="hidden" name="t" value={t} />
            <div>
              <Button type="submit" size="lg">
                Unsubscribe
              </Button>
            </div>
          </form>
        ) : (
          <p role="status" className="mt-3 text-base text-muted-foreground">
            You&apos;re unsubscribed. No more monthly reports. You can turn them back on any time in{" "}
            <Link href="/settings#report" className="font-medium text-foreground underline underline-offset-4">
              Settings
            </Link>
            .
          </p>
        )}
      </main>
    </div>
  );
}
