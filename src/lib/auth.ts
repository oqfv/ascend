import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, username } from "better-auth/plugins";
import { db } from "./db";
import { DEFAULT_CATEGORIES } from "./constants";
import { resetCodeEmail, sendEmail } from "./email";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const RESET_CODE_MINUTES = 10;

/** Accounts made before emails were collected hold a reserved address that can't receive mail. */
export const hasRealEmail = (email: string) => !email.endsWith("@users.ascend.invalid");

// On Vercel the production address is provided by the platform; BETTER_AUTH_URL overrides it.
const https = (host?: string) => (host ? `https://${host}` : undefined);
const baseURL = process.env.BETTER_AUTH_URL || https(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const trustedOrigins = [https(process.env.VERCEL_URL), https(process.env.VERCEL_BRANCH_URL)].filter((o): o is string => Boolean(o));

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most daily
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  // The email-code plugin brings sign-in, verification and email-change routes Ascend doesn't use.
  // Only the password-reset pair stays reachable.
  disabledPaths: [
    "/sign-in/email-otp",
    "/email-otp/send-verification-otp",
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    "/forget-password/email-otp",
  ],
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.$transaction([
            db.userPreference.create({ data: { userId: user.id, reviewReminderTime: "21:00" } }),
            db.category.createMany({
              data: DEFAULT_CATEGORIES.map((name) => ({ userId: user.id, name })),
              skipDuplicates: true,
            }),
          ]);
        },
      },
    },
  },
  plugins: [
    username({ minUsernameLength: USERNAME_MIN, maxUsernameLength: USERNAME_MAX }),
    emailOTP({
      otpLength: 6,
      expiresIn: RESET_CODE_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "forget-password") return;
        const user = await db.user.findUnique({ where: { email }, select: { displayUsername: true, username: true } });
        await sendEmail({ to: email, ...resetCodeEmail({ code: otp, username: user?.displayUsername ?? user?.username, minutes: RESET_CODE_MINUTES }) });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
