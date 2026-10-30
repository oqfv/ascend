import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ username?: string }> }) {
  const { username } = await searchParams;
  // Carried over from the front page's "Pick a username" field.
  const initialUsername = username && /^[A-Za-z0-9_.]{1,30}$/.test(username) ? username : undefined;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">Create your account</h1>
      <p className="mt-1 text-muted-foreground">A username, your email and a password. Free, and it takes a minute.</p>
      <RegisterForm initialUsername={initialUsername} />
      <p className="mt-6 text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
