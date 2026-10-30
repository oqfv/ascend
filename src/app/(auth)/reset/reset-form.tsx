"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Field } from "@/components/field";
import { LinkButton } from "@/components/link-button";
import { requestReset, resetPassword, type ResetState } from "../actions";

/** Two steps on one page: ask for a code by email, then enter it with a new password. */
export function ResetForm() {
  const [sent, sendAction, sending] = useActionState<ResetState, FormData>(requestReset, {});
  const [reset, resetAction, resetting] = useActionState<ResetState, FormData>(resetPassword, {});
  // "Use a different email" goes back to step 1 without losing what was typed.
  const [editing, setEditing] = useState(false);

  if (reset.step === "done") {
    return (
      <div className="mt-6 grid gap-4" role="status">
        <h2 className="text-lg font-semibold">Password changed.</h2>
        <p className="text-muted-foreground">Other devices were signed out. Sign in with your new password.</p>
        <LinkButton href="/login" size="lg" className="mt-2">
          Sign in
        </LinkButton>
      </div>
    );
  }

  const email = sent.values?.email ?? "";
  if (sent.step === "code" && !editing) {
    return (
      <div className="mt-6 grid gap-4">
        <p role="status" className="rounded-[10px] bg-surface px-3 py-2.5">
          If an account uses <span className="font-medium break-all">{email}</span>, we&apos;ve sent it a 6-digit code. It works for 10
          minutes. Check your spam folder if it doesn&apos;t arrive.
        </p>
        <form action={resetAction} className="grid gap-4" noValidate>
          <input type="hidden" name="email" value={email} />
          <Field label="Code from the email" error={reset.fieldErrors?.code}>
            {(p) => (
              <Input
                {...p}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                className="num w-40 text-lg tracking-[0.3em]"
                autoFocus
              />
            )}
          </Field>
          <Field label="New password" hint="At least 8 characters." error={reset.fieldErrors?.password}>
            {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" />}
          </Field>
          {reset.error && (
            <p role="alert" className="rounded-[10px] bg-pill-negative px-3 py-2 text-pill-negative-ink">
              {reset.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={resetting} className="mt-2">
            {resetting ? "Changing…" : "Set new password"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <form action={sendAction}>
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={sending} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {sending ? "Sending…" : "Send a new code"}
            </button>
          </form>
          <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={(f) => (setEditing(false), sendAction(f))} className="mt-6 grid gap-4" noValidate>
      <Field label="Email" hint="The one you used when you created your account." error={sent.fieldErrors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} defaultValue={email} autoFocus />}
      </Field>
      {sent.error && (
        <p role="alert" className="rounded-[10px] bg-pill-negative px-3 py-2 text-pill-negative-ink">
          {sent.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={sending} className="mt-2">
        {sending ? "Sending…" : "Email me a code"}
      </Button>
    </form>
  );
}
