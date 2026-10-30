import "server-only";
import { auth } from "./auth";
import { db } from "./db";

/** Checks a user's current password against their credential account. */
export async function checkPassword(userId: string, plain: string): Promise<boolean> {
  const account = await db.account.findFirst({ where: { userId, providerId: "credential" }, select: { password: true } });
  if (!account?.password) return false;
  const { password } = await auth.$context;
  return password.verify({ hash: account.password, password: plain });
}
