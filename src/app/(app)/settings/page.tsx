import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Page, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { DeleteAccountForm, EmailForm, MonthlyReportForm, PasswordForm, PreferencesForm, RestartTourButton, ThemeForm } from "@/components/settings/settings-forms";
import { hasRealEmail } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const email = hasRealEmail(user.email) ? user.email : null;
  return (
    <Page className="max-w-[1040px]">
      <PageHeader title="Settings" description={`Signed in as @${user.username}.`} />
      <div className="mt-8 grid gap-4">
        <Section title="Preferences" description="How Ascend counts your days and what it shows.">
          <PreferencesForm
            // Re-mount when saved values change, so uncontrolled fields pick up the new defaults.
            key={`${user.displayName}|${user.prefs.updatedAt.getTime()}`}
            displayName={user.displayName}
            prefs={{
              timezone: user.prefs.timezone,
              weekStartsOn: user.prefs.weekStartsOn,
              journalEnabled: user.prefs.journalEnabled,
              hideCompleted: user.prefs.hideCompleted,
              reviewReminderTime: user.prefs.reviewReminderTime,
            }}
          />
        </Section>
        <Section title="Appearance" description="Saved to your account, so it follows you to other devices.">
          <ThemeForm />
        </Section>
        <Section title="Password" description="Changing it signs you out everywhere else.">
          <PasswordForm />
        </Section>
        <Section
          id="email"
          title="Email"
          description={email ? "Where reset codes go, and your monthly report if you turn it on." : "Add one so you can reset your password if you forget it."}
        >
          <EmailForm email={email} />
        </Section>
        <Section id="report" title="Monthly report" description="How your month went, by email: completion, your best habit, your longest streak.">
          <MonthlyReportForm on={user.prefs.monthlyReport} email={email} />
        </Section>
        <Section title="Your data" description="CSV files you can open in any spreadsheet. Only you can download them.">
          <div className="flex flex-wrap gap-2">
            <LinkButton variant="secondary" href="/api/export/habits" prefetch={false}>
              <Download /> Habits
            </LinkButton>
            <LinkButton variant="secondary" href="/api/export/records" prefetch={false}>
              <Download /> All recorded entries
            </LinkButton>
          </div>
        </Section>
        <Section title="Notifications" description="What reminders do today.">
          <p className="text-muted-foreground">
            Reminder times show on your Today list, and the daily review link appears after the time you set above. Phone
            notifications aren&apos;t available yet.
          </p>
        </Section>
        <Section title="Welcome tour" description="The short walkthrough you saw when you joined.">
          <div>
            <RestartTourButton />
          </div>
        </Section>
        <Section title="Delete account" description="Permanent. Everything goes with it.">
          <DeleteAccountForm username={user.username} />
        </Section>
      </div>
    </Page>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 grid gap-4 rounded-2xl bg-surface p-5 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-base font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
