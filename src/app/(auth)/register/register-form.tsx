"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import Link from "next/link";
import { Field } from "@/components/field";
import { register, type AuthState } from "../actions";

export function RegisterForm({ initialUsername }: { initialUsername?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  const [timezone, setTimezone] = useState("");
  useEffect(() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  return (
    <form action={action} className="mt-6 grid gap-4" noValidate>
      <Field label="Username" hint="3–30 letters, numbers, dots or underscores." error={state.fieldErrors?.username}>
        {(p) => (
          <Input
            {...p}
            // Re-mount on a server reply so the corrected value and focus reset cleanly.
            key={state.fieldErrors?.username ?? "u"}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.username ?? initialUsername}
            autoFocus={Boolean(state.fieldErrors?.username)}
            required
          />
        )}
      </Field>
      <Field label="Email" hint="For password reset codes, and a monthly report only if you turn it on." error={state.fieldErrors?.email}>
        {(p) => (
          <Input
            {...p}
            key={state.fieldErrors?.email ?? "e"}
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.email}
            autoFocus={Boolean(state.fieldErrors?.email) && !state.fieldErrors?.username}
            required
          />
        )}
      </Field>
      <Field label="Display name (optional)" error={state.fieldErrors?.displayName}>
        {(p) => <Input {...p} name="displayName" autoComplete="nickname" defaultValue={state.values?.displayName} />}
      </Field>
      <Field label="Password" hint="At least 8 characters." error={state.fieldErrors?.password}>
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" required />}
      </Field>
      <input type="hidden" name="timezone" value={timezone} />
      {state.error && (
        <p role="alert" className="rounded-[10px] bg-pill-negative px-3 py-2 text-pill-negative-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        By creating an account, you confirm you&apos;re at least 13 and agree to the{" "}
        <Link href="/terms" className="text-foreground underline underline-offset-4">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          privacy page
        </Link>
        .
      </p>
    </form>
  );
}
