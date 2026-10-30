import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/page-header";
import { DateNav } from "@/components/date-nav";
import { DayBoard } from "@/components/today/day-board";
import { Quote } from "@/components/quote";
import { QuickAdd } from "@/components/today/quick-add";
import { WelcomeTour } from "@/components/today/welcome-tour";
import { loadDay, type DayView } from "@/lib/data/day";
import { isISODate, minutesNowIn } from "@/lib/domain/dates";
import { formatDay, greetingFor, weekdayName } from "@/lib/format";
import { quoteFor } from "@/lib/quotes";
import { requireUser } from "@/lib/session";
import { hasRealEmail } from "@/lib/auth";

export const metadata: Metadata = { title: "Today" };

/** The one fact the day turns on, from the data: what is left and what comes next. */
function factLine(view: DayView): string {
  const steps = view.items.filter((i) => i.kind === "day");
  const done = steps.filter((i) => i.complete).length;
  if (!view.hasHabits) return "You have no habits yet.";
  if (view.items.length === 0) return `Nothing is scheduled on ${weekdayName(view.date)}.`;
  if (view.date > view.today) return `${steps.length} scheduled.`;
  if (view.date < view.today) {
    const missed = steps.filter((i) => i.status === "missed").length;
    return `${done} of ${steps.length} done${missed ? `, ${missed} missed` : ""}.`;
  }
  if (steps.length > 0 && done === steps.length) return `All ${steps.length} done for today.`;
  const next = [...view.items]
    .filter((i) => !i.complete)
    .sort((a, b) => (a.reminderTime ?? "99").localeCompare(b.reminderTime ?? "99"))[0];
  const count = steps.length ? `${done} of ${steps.length} done.` : "";
  return `${count} ${next ? `${next.name} is next.` : ""}`.trim();
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const { date: raw } = await searchParams;
  const date = raw && isISODate(raw) ? raw : user.today;
  const view = await loadDay(user.id, date, user.today, user.prefs.weekStartsOn);
  const isToday = date === user.today;
  const first = user.displayName.split(" ")[0] || user.username;
  const now = minutesNowIn(user.prefs.timezone);
  const reviewAt = user.prefs.reviewReminderTime?.split(":").map(Number);
  const reviewOpen = isToday && view.items.length > 0 && reviewAt !== undefined && now >= reviewAt[0] * 60 + reviewAt[1];

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="anim-rise font-display text-[36px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[44px]">
            {isToday ? `${greetingFor(now)}, ${first}.` : formatDay(date, "long")}
          </h1>
          <p className="anim-rise mt-2 text-base text-muted-foreground [--d:120ms]">
            {isToday && <span>{formatDay(date, "long")}. </span>}
            {factLine(view)}
            {reviewOpen && (
              <>
                {" "}
                <Link href="/reviews?view=day" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Review your day
                </Link>
              </>
            )}
          </p>
        </div>
        <DateNav date={date} today={user.today} basePath="/today" />
      </div>
      {/* Accounts made before sign-up asked for an email have no way to reset a forgotten password. */}
      {!hasRealEmail(user.email) && (
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-data-soft px-4 py-3">
          <span>Add your email so you can reset your password if you ever forget it.</span>
          <Link href="/settings#email" className="font-medium underline underline-offset-4">
            Add email
          </Link>
        </p>
      )}
      {isToday && <Quote quote={quoteFor(user.today)} className="mt-6 rounded-xl bg-surface px-4 py-3.5" />}
      {view.hasHabits && (
        <div className="mt-6">
          <QuickAdd startDate={user.today} />
        </div>
      )}
      <DayBoard key={date} view={view} hideCompleted={user.prefs.hideCompleted} />
      {!user.prefs.tourDoneAt && <WelcomeTour hasEmail={hasRealEmail(user.email)} />}
    </Page>
  );
}
