import type { Metadata } from "next";
import Link from "next/link";
import { Quote } from "@/components/quote";
import { quoteFor, utcToday } from "@/lib/quotes";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

// Rebuilt hourly, so the day's quote changes without a deploy.
export const revalidate = 3600;

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">Sign in</h1>
      <p className="mt-1 text-muted-foreground">Pick up today&apos;s habits where you left them.</p>
      <LoginForm />
      <p className="mt-6 text-muted-foreground">
        New to Ascend?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <Quote quote={quoteFor(utcToday(), 6)} className="mt-6 border-t pt-6" />
    </>
  );
}
