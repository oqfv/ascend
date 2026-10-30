"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Field } from "@/components/field";
import { login, type AuthState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="mt-6 grid gap-4" noValidate>
      <Field label="Username or email" error={state.fieldErrors?.username}>
        {(p) => (
          <Input {...p} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={state.values?.username} required />
        )}
      </Field>
      <Field label="Password" error={state.fieldErrors?.password}>
        {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" required />}
      </Field>
      <Link href="/reset" className="-mt-1 justify-self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Forgot your password?
      </Link>
      {state.error && (
        <p role="alert" className="rounded-[10px] bg-pill-negative px-3 py-2 text-pill-negative-ink">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
