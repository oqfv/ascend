import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { todayIn } from "./domain/dates";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in user with preferences, or a redirect to sign in. Every protected read starts here. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  const prefs =
    (await db.userPreference.findUnique({ where: { userId: session.user.id } })) ??
    (await db.userPreference.create({ data: { userId: session.user.id } }));
  return {
    id: session.user.id,
    username: session.user.username ?? "",
    displayName: session.user.name,
    email: session.user.email,
    prefs,
    today: todayIn(prefs.timezone),
  };
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
