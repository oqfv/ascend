"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/field";
import { NativeSelect, Segmented } from "@/components/controls";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  restartTour,
  savePreferences,
  saveTheme,
  setMonthlyReport,
  type DeleteState,
  type SettingsState,
} from "@/app/(app)/settings/actions";

export function PreferencesForm({
  displayName,
  prefs,
}: {
  displayName: string;
  prefs: { timezone: string; weekStartsOn: number; journalEnabled: boolean; hideCompleted: boolean; reviewReminderTime: string | null };
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(savePreferences, {});
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [prefs.timezone];
    return list.includes(prefs.timezone) ? list : [prefs.timezone, ...list];
  }, [prefs.timezone]);
  useEffect(() => {
    if (state.ok) toast.success("Settings saved");
  }, [state]);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4">
      <Field label="Display name" error={e.displayName}>
        {(p) => <Input {...p} name="displayName" defaultValue={displayName} maxLength={60} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Timezone" hint="Decides when your day starts and ends." error={e.timezone}>
          {(p) => (
            <NativeSelect {...p} name="timezone" defaultValue={prefs.timezone}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll("_", " ")}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Weeks start on" error={e.weekStartsOn}>
          {(p) => (
            <NativeSelect {...p} name="weekStartsOn" defaultValue={String(prefs.weekStartsOn)}>
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
              <option value="6">Saturday</option>
            </NativeSelect>
          )}
        </Field>
      </div>
      <Field
        label="Daily review prompt"
        hint="After this time, Today shows a link to review your day. Leave empty to turn it off."
        error={e.reviewReminderTime}
      >
        {(p) => <Input {...p} type="time" name="reviewReminderTime" defaultValue={prefs.reviewReminderTime ?? ""} className="w-40" />}
      </Field>
      <SwitchRow name="journalEnabled" defaultChecked={prefs.journalEnabled} title="Journal" description="Mood, energy, sleep and notes in your daily review." />
      <SwitchRow name="hideCompleted" defaultChecked={prefs.hideCompleted} title="Hide finished habits on Today" description="You can still show them with one click." />
      {/* Gamification is stored but has no screens yet; keep the value as it is. */}
      <input type="hidden" name="gamificationEnabled" value="on" />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}

function SwitchRow({ name, defaultChecked, title, description }: { name: string; defaultChecked: boolean; title: string; description: string }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <Switch name={name} defaultChecked={defaultChecked} aria-label={title} />
    </label>
  );
}

export function ThemeForm() {
  const { theme, setTheme } = useTheme();
  return (
    <Segmented
      label="Theme"
      value={(theme as "light" | "dark" | "system") ?? "system"}
      onChange={(t) => {
        setTheme(t);
        void saveTheme(t);
      }}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "Match device" },
      ]}
    />
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});
  useEffect(() => {
    if (state.ok) toast.success("Password changed. Other devices were signed out.");
  }, [state]);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" key={state.ok ? "done" : "form"}>
      <Field label="Current password" error={e.currentPassword}>
        {(p) => <PasswordInput {...p} name="currentPassword" autoComplete="current-password" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 8 characters." error={e.newPassword}>
          {(p) => <PasswordInput {...p} name="newPassword" autoComplete="new-password" />}
        </Field>
        <Field label="Repeat new password" error={e.confirm}>
          {(p) => <PasswordInput {...p} name="confirm" autoComplete="new-password" />}
        </Field>
      </div>
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

export function EmailForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changeEmail, {});
  useEffect(() => {
    if (state.ok) toast.success("Email saved");
  }, [state]);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" key={state.ok ? "done" : "form"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={e.email}>
          {(p) => <Input {...p} type="email" name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} defaultValue={email ?? ""} />}
        </Field>
        <Field label="Current password" error={e.password}>
          {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" />}
        </Field>
      </div>
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : email ? "Change email" : "Add email"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="grid gap-4">
      <p className="text-muted-foreground">
        This removes your account, every habit, every entry and your journal, right away. It can&apos;t be undone. Download your data first if you want a copy.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Type your username (${username})`}>{(p) => <Input {...p} name="confirm" autoComplete="off" autoCapitalize="none" spellCheck={false} />}</Field>
        <Field label="Current password">{(p) => <PasswordInput {...p} name="password" autoComplete="current-password" />}</Field>
      </div>
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      <div>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </form>
  );
}

/** Saves as soon as it is switched, like the theme. */
export function MonthlyReportForm({ on, email }: { on: boolean; email: string | null }) {
  const [checked, setChecked] = useState(on);
  const [pending, start] = useTransition();
  function change(next: boolean) {
    setChecked(next);
    start(async () => {
      await setMonthlyReport(next);
      toast.success(next ? "Monthly report on. The first one arrives on the 1st." : "Monthly report off");
    });
  }
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
      <span>
        <span className="block font-medium">Email me a monthly report</span>
        <span className="block text-sm text-muted-foreground">
          {email ? `Sent to ${email} on the 1st of each month.` : "Add your email above to turn this on."}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={change} disabled={!email || pending} aria-label="Email me a monthly report" />
    </label>
  );
}

export function RestartTourButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(() => restartTour())}>
      {pending ? "Opening…" : "Show the tour again"}
    </Button>
  );
}
