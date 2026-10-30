import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">Forgot your password?</h1>
      <p className="mt-1 text-muted-foreground">We&apos;ll email you a code to set a new one. The email also reminds you of your username.</p>
      <ResetForm />
      <p className="mt-6 text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
