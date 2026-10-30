import Link from "next/link";
import { Wordmark } from "@/components/brand";

export const CONTACT_EMAIL = "ascend.habittracker@gmail.com";
export const LEGAL_UPDATED = "29 October 2026";

export type LegalSection = { title: string; body: React.ReactNode };

/** Plain reading layout shared by the privacy and terms pages. */
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="Ascend home">
          <Wordmark />
        </Link>
        <nav aria-label="Legal" className="flex gap-1 text-[15px]">
          <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-full px-3 text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center rounded-full px-3 text-muted-foreground hover:text-foreground">
            Terms
          </Link>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-[760px] px-4 pt-10 pb-24 sm:px-8">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
        <p className="mt-4 text-[17px] leading-7 text-foreground/80">{intro}</p>
        <div className="mt-12 grid gap-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold tracking-[-0.01em]">{s.title}</h2>
              <div className="mt-3 grid gap-3 text-[17px] leading-7 text-foreground/80">{s.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-14 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}.</p>
      </main>
    </div>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4 break-all">
      {CONTACT_EMAIL}
    </a>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline underline-offset-4">
      {children}
    </Link>
  );
}
