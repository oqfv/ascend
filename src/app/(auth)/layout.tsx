import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/brand";

// Sign-in and sign-up pages stay out of search results.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        {/* The way back to the front page: the logo, and a labelled link for anyone who doesn't think to click it. */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Ascend home">
            <Wordmark />
          </Link>
          <Link
            href="/"
            className="-mr-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
        <div className="rounded-2xl border bg-background p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
