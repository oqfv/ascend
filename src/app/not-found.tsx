import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="max-w-[440px]">
        <Wordmark />
        <h1 className="mt-10 text-4xl font-semibold tracking-[-0.03em]">This page doesn&apos;t exist.</h1>
        <p className="mt-3 text-[17px] leading-7 text-muted-foreground">The link may be old or mistyped. Your habits are safe; nothing was lost.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/" size="lg">
            Go to the front page
          </LinkButton>
          <LinkButton href="/today" size="lg" variant="outline">
            Open Today
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
