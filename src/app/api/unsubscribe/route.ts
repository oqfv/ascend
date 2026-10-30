import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubscribe } from "@/lib/monthly-report";

/** One-click unsubscribe from the mail app's own button (RFC 8058). The link in the email opens /unsubscribe instead. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!userId || !verifyUnsubscribe(userId, token)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await db.userPreference.updateMany({ where: { userId }, data: { monthlyReport: false } });
  return NextResponse.json({ ok: true });
}
