"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth, PASSWORD_MAX, PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidTimeZone } from "@/lib/domain/dates";
import { allow, clientIp } from "@/lib/rate-limit";

export type AuthState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "email" | "password" | "displayName", string>>;
  values?: { username?: string; email?: string; displayName?: string };
};

export type ResetState = {
  /** "code" once a code has been requested; "done" after the password is changed. */
  step?: "code" | "done";
  error?: string;
  fieldErrors?: Partial<Record<"email" | "code" | "password", string>>;
  values?: { email?: string };
};

const USERNAME_TAKEN = "This username is already taken. Please choose another one.";
const EMAIL_TAKEN = "This email is already used by another account. Sign in, or reset your password.";

const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Use at least ${USERNAME_MIN} characters.`)
  .max(USERNAME_MAX, `Use at most ${USERNAME_MAX} characters.`)
  .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, dots and underscores only.");

const emailSchema = z.string().trim().toLowerCase().min(1, "Enter your email address.").pipe(z.email("Enter a valid email address, like name@example.com."));

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`);

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(60, "Use at most 60 characters.").optional(),
  timezone: z.string().optional(),
});

function fieldErrors<K extends string>(error: z.ZodError): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as K;
    out[key] ??= issue.message;
  }
  return out;
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = {
    username: String(form.get("username") ?? ""),
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    displayName: String(form.get("displayName") ?? "") || undefined,
    timezone: String(form.get("timezone") ?? "") || undefined,
  };
  const values = { username: raw.username, email: raw.email, displayName: raw.displayName };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  if (!(await allow(`sign-up:${await clientIp()}`, 10, 60 * 60))) {
    return { error: "Too many accounts created from this network. Try again in an hour.", values };
  }

  const { username, email, password, displayName } = parsed.data;
  const normalized = username.toLowerCase();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: EMAIL_TAKEN }, values };
  }
  try {
    await auth.api.signUpEmail({
      body: { email, password, name: displayName || username, username, displayUsername: username },
      headers: await headers(),
    });
  } catch (e) {
    // The unique indexes on user.username and user.email are the source of truth. A lost race
    // between two simultaneous sign-ups surfaces as a failed insert, so re-check before choosing the message.
    if (await db.user.findUnique({ where: { username: normalized }, select: { id: true } })) {
      return { fieldErrors: { username: USERNAME_TAKEN }, values };
    }
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) return { fieldErrors: { email: EMAIL_TAKEN }, values };
    if (e instanceof APIError && e.body?.code === "USERNAME_IS_INVALID") {
      return { fieldErrors: { username: "Use letters, numbers, dots and underscores only." }, values };
    }
    console.error("sign-up failed", e instanceof Error ? e.message : e);
    return { error: "We couldn't create your account. Please try again.", values };
  }

  if (parsed.data.timezone && isValidTimeZone(parsed.data.timezone)) {
    const user = await db.user.findUnique({ where: { username: normalized }, select: { id: true } });
    if (user) {
      await db.userPreference.upsert({
        where: { userId: user.id },
        update: { timezone: parsed.data.timezone },
        create: { userId: user.id, timezone: parsed.data.timezone },
      });
    }
  }
  redirect("/today");
}

const requestSchema = z.object({ email: emailSchema });
const resetSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email.")),
  password: passwordSchema,
});

/**
 * Forgotten password, step 1: email a 6-digit code. The reply is the same whether or not an
 * account uses the address, so this page can't be used to find out who has an account.
 */
export async function requestReset(_: ResetState, form: FormData): Promise<ResetState> {
  const raw = String(form.get("email") ?? "");
  const parsed = requestSchema.safeParse({ email: raw });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email: raw } };
  const { email } = parsed.data;

  const okIp = await allow(`reset-mail:ip:${await clientIp()}`, 10, 60 * 60);
  const okEmail = await allow(`reset-mail:${email}`, 5, 60 * 60);
  if (!okIp || !okEmail) return { error: "Too many codes requested. Wait an hour and try again.", values: { email } };

  try {
    await auth.api.requestPasswordResetEmailOTP({ body: { email } });
  } catch (e) {
    console.error("reset email failed", e instanceof Error ? e.message : e);
    return { error: "We couldn't send the email just now. Please try again in a few minutes.", values: { email } };
  }
  return { step: "code", values: { email } };
}

/** Step 2: the code from the email plus a new password. Success signs the account out everywhere. */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const raw = { email: String(form.get("email") ?? ""), code: String(form.get("code") ?? ""), password: String(form.get("password") ?? "") };
  const values = { email: raw.email };
  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) return { step: "code", fieldErrors: fieldErrors(parsed.error), values };

  if (!(await allow(`reset:ip:${await clientIp()}`, 20, 60 * 60))) {
    return { step: "code", error: "Too many attempts. Wait an hour and try again.", values };
  }

  try {
    await auth.api.resetPasswordEmailOTP({ body: { email: parsed.data.email, otp: parsed.data.code, password: parsed.data.password } });
  } catch (e) {
    const code = e instanceof APIError ? e.body?.code : undefined;
    if (code === "OTP_EXPIRED") return { step: "code", error: "That code has expired. Ask for a new one below.", values };
    if (code === "TOO_MANY_ATTEMPTS") return { step: "code", error: "Too many wrong codes. Ask for a new one below.", values };
    if (code === "INVALID_OTP" || code === "USER_NOT_FOUND") return { step: "code", fieldErrors: { code: "That code isn't right. Check the email and try again." }, values };
    console.error("password reset failed", e instanceof Error ? e.message : e);
    return { step: "code", error: "We couldn't change your password. Please try again.", values };
  }
  return { step: "done", values };
}

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = { username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") };
  const values = { username: raw.username };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const name = parsed.data.username.toLowerCase();
  const okIp = await allow(`sign-in:ip:${await clientIp()}`, 30, 15 * 60);
  const okUser = await allow(`sign-in:user:${name}`, 10, 15 * 60);
  if (!okIp || !okUser) return { error: "Too many sign-in attempts. Wait 15 minutes and try again.", values };

  // Usernames can't contain "@", so anything with one is an email address.
  try {
    if (name.includes("@")) {
      await auth.api.signInEmail({ body: { email: name, password: parsed.data.password }, headers: await headers() });
    } else {
      await auth.api.signInUsername({ body: { username: parsed.data.username, password: parsed.data.password }, headers: await headers() });
    }
  } catch (e) {
    if (e instanceof APIError && e.statusCode === 401) {
      return { error: "That username or email and password don't match an account.", values };
    }
    console.error("sign-in failed", e instanceof Error ? e.message : e);
    return { error: "We couldn't sign you in. Please try again.", values };
  }
  redirect("/today");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
