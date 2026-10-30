import "server-only";

// Transactional email through Brevo's HTTP API. Ascend sends two kinds of email: a password-reset
// code the user asked for, and the monthly report for those who turned it on. No marketing, no tracking.

export type Message = { to: string; subject: string; text: string; html: string; headers?: Record<string, string> };

export async function sendEmail(message: Message): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Without a key, development prints the email to the server console instead of sending it.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email to ${message.to}] ${message.subject}\n${message.text}`);
      return;
    }
    throw new Error("Email is not configured: set BREVO_API_KEY and EMAIL_FROM.");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: "Ascend" },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html,
      // No open or click tracking: links and codes go out exactly as written.
      headers: { ...message.headers, "X-Mailin-Track": "0" },
    }),
  });
  if (!res.ok) throw new Error(`Brevo returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function resetCodeEmail({ code, username, minutes }: { code: string; username?: string | null; minutes: number }): Omit<Message, "to"> {
  const userLine = username ? `Your username is ${username}.` : "";
  const text = [
    `Your Ascend password reset code is ${code}.`,
    "",
    `Enter it on the reset page within ${minutes} minutes. ${userLine}`.trim(),
    "",
    "If you didn't ask to reset your password, you can ignore this email. Your password stays the same.",
  ].join("\n");
  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f7f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f201d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:18px;font-weight:600">Ascend</p>
<p style="margin:0 0 12px;font-size:16px;line-height:24px">Your password reset code is</p>
<p style="margin:0 0 24px;font-size:32px;line-height:40px;font-weight:600;letter-spacing:6px;color:#46683f">${escapeHtml(code)}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:24px">Enter it on the reset page within ${minutes} minutes.${username ? ` Your username is <strong>${escapeHtml(username)}</strong>.` : ""}</p>
<p style="margin:24px 0 0;font-size:14px;line-height:20px;color:#5e5f5b">If you didn't ask to reset your password, you can ignore this email. Your password stays the same.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: `${code} is your Ascend reset code`, text, html };
}
