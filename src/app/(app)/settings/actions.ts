"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth, hasRealEmail, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { addMonths, isValidTimeZone, startOfMonth, type ISODate } from "@/lib/domain/dates";
import { allow } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { checkPassword } from "@/lib/password";

export type SettingsState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const THEMES = ["light", "dark", "system"] as const;

export async function saveTheme(theme: string) {
  const user = await requireUser();
  if (!THEMES.includes(theme as (typeof THEMES)[number])) return;
  await db.userPreference.update({ where: { userId: user.id }, data: { theme } });
}

const prefsSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a name.").max(60, "Use at most 60 characters."),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone."),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
  reviewReminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 21:00.")
    .or(z.literal(""))
    .optional(),
  journalEnabled: z.boolean(),
  gamificationEnabled: z.boolean(),
  hideCompleted: z.boolean(),
});

export async function savePreferences(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = prefsSchema.safeParse({
    displayName: form.get("displayName"),
    timezone: form.get("timezone"),
    weekStartsOn: form.get("weekStartsOn"),
    reviewReminderTime: form.get("reviewReminderTime") ?? "",
    journalEnabled: form.get("journalEnabled") === "on",
    gamificationEnabled: form.get("gamificationEnabled") === "on",
    hideCompleted: form.get("hideCompleted") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { displayName, reviewReminderTime, ...prefs } = parsed.data;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name: displayName } }),
    db.userPreference.update({
      where: { userId: user.id },
      data: { ...prefs, reviewReminderTime: reviewReminderTime || null },
    }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords don't match." });

export async function changePassword(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: form.get("currentPassword"),
    newPassword: form.get("newPassword"),
    confirm: form.get("confirm"),
  });
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  if (!(await allow(`password:${user.id}`, 5, 15 * 60))) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError && (e.statusCode === 400 || e.statusCode === 401)) {
      return { fieldErrors: { currentPassword: "That isn't your current password." } };
    }
    return { error: "We couldn't change your password. Please try again." };
  }
  return { ok: true };
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address, like name@example.com."));

/** Sets or changes the address reset codes go to, after confirming the current password. */
export async function changeEmail(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = emailSchema.safeParse(String(form.get("email") ?? ""));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };
  if (!(await allow(`email:${user.id}`, 5, 15 * 60))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  if (!(await checkPassword(user.id, String(form.get("password") ?? "")))) return { fieldErrors: { password: "That isn't your current password." } };
  const email = parsed.data;
  const owner = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (owner && owner.id !== user.id) return { fieldErrors: { email: "This email is already used by another account." } };
  await db.user.update({ where: { id: user.id }, data: { email, emailVerified: false } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export type DeleteState = { error?: string };

/**
 * Deletes the account and everything in it: habits, entries, journal, settings and sessions all
 * cascade from the user row. Requires the password and typing the username.
 */
export async function deleteAccount(_: DeleteState, form: FormData): Promise<DeleteState> {
  const user = await requireUser();
  if (!(await allow(`delete:${user.id}`, 5, 15 * 60))) return { error: "Too many attempts. Wait 15 minutes and try again." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.username.toLowerCase()) {
    return { error: `Type your username, ${user.username}, to confirm.` };
  }
  if (!(await checkPassword(user.id, String(form.get("password") ?? "")))) return { error: "That isn't your current password." };
  await db.user.delete({ where: { id: user.id } });
  // The sessions went with the user row; clear the now-dead session cookies too.
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  redirect("/");
}

/** Ends the welcome tour, finished or skipped. Finishing can also switch on the monthly report. */
export async function finishTour(monthlyReport?: boolean) {
  const user = await requireUser();
  await db.userPreference.update({
    where: { userId: user.id },
    data: { tourDoneAt: new Date(), ...(monthlyReport ? reportOn(user.today) : {}) },
  });
  revalidatePath("/", "layout");
}

export async function restartTour() {
  const user = await requireUser();
  await db.userPreference.update({ where: { userId: user.id }, data: { tourDoneAt: null } });
  redirect("/today");
}

export async function setMonthlyReport(on: boolean) {
  const user = await requireUser();
  if (on && !hasRealEmail(user.email)) return;
  await db.userPreference.update({ where: { userId: user.id }, data: on ? reportOn(user.today) : { monthlyReport: false } });
  revalidatePath("/settings");
}

// Switching the report on marks last month as already sent, so the first email covers a whole month
// the user chose to be emailed about, not one that ended before they opted in.
function reportOn(today: ISODate) {
  return { monthlyReport: true, monthlyReportSentFor: addMonths(startOfMonth(today), -1).slice(0, 7) };
}
