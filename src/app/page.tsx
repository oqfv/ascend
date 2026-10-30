import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark, WordmarkText } from "@/components/brand";
import { WORDMARK } from "@/components/brand-wordmark";
import { LinkButton } from "@/components/link-button";
import { InView } from "@/components/motion/in-view";
import { Quote } from "@/components/quote";
import { ProgressDemo } from "@/components/landing/progress-demo";
import { ReviewFragment, StepsFragment, StreakFragment, TargetFragment } from "@/components/landing/fragments";
import { quoteFor, utcToday } from "@/lib/quotes";
import { getSession } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Ascend · Track your habits and see your real progress" },
  description:
    "A free habit tracker that counts partial progress, breaks habits into steps, tracks weekly and monthly targets, and reviews your week in plain words.",
  alternates: { canonical: "/" },
};

// Direction: "the sentence is the layout". The hero sentence is split around a live habit row,
// because the one idea only Ascend has is that partial effort counts. Everything below repeats
// the grammar at smaller scale: a short statement with its proof beside it.

const DISPLAY = "font-semibold tracking-[-0.04em] leading-[0.95]";
const BODY = "text-[17px] leading-7 text-foreground/75";

// Staggers an animation (globals.css reads --d as its delay).
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
const from = (x: string, ms = 0) => ({ "--x": x, "--d": `${ms}ms` }) as React.CSSProperties;

const STEPS = [
  { title: "Add a habit", time: "About a minute, once", tone: "bg-surface-strong text-foreground", sub: "text-muted-foreground", text: "A name is enough to start. Targets, days and steps are there when you want them." },
  { title: "Record what you did", time: "A few seconds a day", tone: "bg-data-soft text-foreground", sub: "text-muted-foreground", text: "Tick it off, or type how much you did. Half a workout still counts toward your progress." },
  { title: "Read your review", time: "Once a week", tone: "bg-data text-primary-foreground", sub: "text-primary-foreground/75", text: "See what went up, what slipped, and which habit needs you next, in plain words." },
];

const FEATURES = [
  {
    title: "Habits have steps",
    text: "Break Gym into cardio, weights and stretching. Each step keeps its own progress, and Gym counts as done when the steps you need are done.",
    proof: <StepsFragment />,
  },
  {
    title: "Targets for the week",
    text: "Not everything is daily. Aim to run three times a week or study ten hours, and Ascend counts toward the week instead of failing you each day.",
    proof: <TargetFragment />,
  },
  {
    title: "Rest days are safe",
    text: "A day you didn't plan a habit never breaks its streak. Only the days you meant to do it count.",
    proof: <StreakFragment />,
  },
  {
    title: "Reviews in plain words",
    text: "Each week and month you get a short read of what changed, built only from your own numbers. No guessing, no made-up advice.",
    proof: <ReviewFragment />,
  },
];

const FAQ = [
  { q: "Is it free?", a: "Yes. Create an account and use everything. There's nothing to pay for." },
  { q: "Why do you ask for my email?", a: "So you can reset your password if you forget it. You can also choose to get a short monthly report of your progress. That's all: no newsletters, no marketing." },
  { q: "Who can see my habits?", a: "Only you. Your habits, entries and journal are private to your account, and you can download all of it as a spreadsheet at any time." },
  { q: "Does it work on my phone?", a: "Yes. Open the link in your phone's browser and sign in. Every screen is laid out for small screens too." },
  { q: "What if I forget my password?", a: "Choose “Forgot your password?” on the sign-in page and enter your email. Ascend sends you a 6-digit code to set a new password, and the email reminds you of your username too." },
  { q: "What if I change a habit later?", a: "Your past days keep the rules they were tracked under. Changing a target or a schedule never rewrites your old results." },
];

// Structured data for search engines: what the app is, that it is free, and the questions above.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Ascend",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: metadata.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default async function Home() {
  if (await getSession()) redirect("/today");

  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="Ascend home">
          <Wordmark animated />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 text-[15px] sm:gap-1">
          <a href="#how" className="rounded-full px-3 py-2 text-muted-foreground hover:text-foreground max-md:hidden">
            How it works
          </a>
          <a href="#questions" className="rounded-full px-3 py-2 text-muted-foreground hover:text-foreground max-md:hidden">
            Questions
          </a>
          <Link href="/login" className="rounded-full px-3 py-2 text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <LinkButton href="/register" className="ml-1 max-sm:px-3">
            Create account
          </LinkButton>
        </nav>
      </header>

      <main id="main">
        {/* The sentence, split by a live habit row. */}
        <section className="mx-auto max-w-[1280px] px-4 pt-10 pb-6 sm:px-8 lg:pt-16">
          {/* The h1's halves are grid items (display: contents), so the live row sits between them visually
              while the heading itself stays one real sentence. */}
          <div className="grid items-center lg:grid-cols-12 lg:gap-x-6 lg:gap-y-5">
            <h1 className="contents">
              <span style={delay(100)} className={`anim-rise ${DISPLAY} order-1 block text-[13vw] lg:order-1 lg:col-span-4 lg:text-[clamp(44px,4.6vw,72px)] lg:whitespace-nowrap`}>Every minute</span>{" "}
              <span style={delay(420)} className={`anim-rise ${DISPLAY} order-2 block text-[13vw] lg:order-3 lg:col-span-3 lg:text-[clamp(44px,4.6vw,72px)]`}>counts.</span>
            </h1>
            <div style={delay(250)} className="anim-rise order-3 mt-7 rounded-[20px] bg-surface p-2.5 lg:order-2 lg:col-span-5 lg:mt-0">
              <ProgressDemo />
            </div>
          </div>
          <div style={delay(550)} className="anim-rise mt-8 max-w-[560px] lg:mt-10">
            <p className="text-lg leading-8 text-foreground/75 sm:text-xl">
              <span className="font-medium text-foreground">Ascend is a free habit tracker that counts partial progress.</span>{" "}
              Study 35 of your 60 minutes and it shows 58% done, not a fail.
            </p>
            <div className="mt-6 flex flex-wrap items-start gap-3">
              <LinkButton href="/register" size="lg" className="h-12 px-6 text-base">
                Create your account
              </LinkButton>
              <LinkButton href="/login" size="lg" variant="outline" className="h-12 px-6 text-base">
                Sign in
              </LinkButton>
            </div>
          </div>
        </section>

        {/* How it works: Ascend's own progress bar, enlarged into the diagram. */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-[1280px] scroll-mt-8 px-4 pt-16 sm:px-8 lg:pt-20">
          <h2 id="how-title" className={`${DISPLAY} text-[13vw] sm:text-[clamp(48px,6.4vw,104px)]`}>
            How it works
          </h2>
          {/* The three steps fill in left to right, like the progress bar they are drawn as. */}
          <InView>
            <ol data-ui className="mt-8 grid gap-1.5 lg:mt-12 lg:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid content-start gap-5">
                  <div style={delay(i * 220)} className={`iv-wipe flex min-h-[124px] flex-col justify-between gap-6 rounded-[14px] p-5 sm:p-6 lg:min-h-[168px] ${s.tone}`}>
                    <h3 className="text-[clamp(24px,2.4vw,36px)] leading-[1.05] font-semibold tracking-[-0.03em]">{s.title}</h3>
                    <span className={`text-base ${s.sub}`}>{s.time}</span>
                  </div>
                  <p style={delay(i * 220 + 250)} className={`iv-rise max-w-[30ch] pb-6 lg:pb-0 ${BODY}`}>{s.text}</p>
                </li>
              ))}
            </ol>
          </InView>
        </section>

        {/* The real Today screen, from the sample account, matching the visitor's theme. */}
        <section aria-labelledby="today-title" className="mx-auto max-w-[1280px] px-4 pt-16 sm:px-8 lg:pt-28">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-end lg:gap-x-6">
            <h2 id="today-title" className="text-[clamp(30px,3.2vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em] lg:col-span-6">
              This is the screen you&apos;ll use every day
            </h2>
            <p className={`max-w-[44ch] lg:col-span-5 lg:col-start-8 ${BODY}`}>
              Today lists what&apos;s planned, takes a tick or an amount, and gives partial days their credit.
            </p>
          </div>
          <InView>
            <figure className="iv-zoom mt-8 lg:mt-10">
              <div className="overflow-hidden rounded-[20px] bg-surface p-2.5">
                <Image
                  src="/screens/today-light.webp"
                  alt="Ascend's Today screen: Read done, Study 58% done, Drink water 75% done, Meditate and Run still to do, and 58% of the day done with partial credit."
                  width={1265}
                  height={800}
                  sizes="(min-width: 1280px) 1232px, 100vw"
                  className="block h-auto w-full rounded-[14px] dark:hidden"
                />
                <Image
                  src="/screens/today-dark.webp"
                  alt=""
                  width={1265}
                  height={800}
                  sizes="(min-width: 1280px) 1232px, 100vw"
                  className="hidden h-auto w-full rounded-[14px] dark:block"
                />
              </div>
              <figcaption className="mt-3 text-sm text-muted-foreground">A sample account with example habits. Nothing here is a real person&apos;s data.</figcaption>
            </figure>
          </InView>
        </section>

        {/* What's different: each statement beside the piece of the app that proves it. */}
        <section aria-labelledby="different-title" className="mx-auto max-w-[1280px] px-4 pt-16 sm:px-8 lg:pt-28">
          <h2 id="different-title" className={`${DISPLAY} max-w-[14ch] text-[13vw] sm:text-[clamp(48px,6.4vw,104px)]`}>
            Built for real routines
          </h2>
          <div className="mt-10 grid gap-14 lg:mt-14 lg:gap-20">
            {FEATURES.map((f, i) => (
              <InView key={f.title} className="grid items-center gap-6 lg:grid-cols-12 lg:gap-x-6">
                {/* Alternate sides, so the eye zigzags instead of reading one long column. Each slides in from its own side. */}
                <div style={from(i % 2 ? "40px" : "-40px")} className={`iv-rise ${i % 2 ? "lg:col-span-5 lg:col-start-8" : "lg:col-span-5"}`}>
                  <h3 className="text-[clamp(30px,3.2vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em]">{f.title}</h3>
                  <p className={`mt-4 max-w-[40ch] ${BODY}`}>{f.text}</p>
                </div>
                <div
                  style={delay(150)}
                  className={`iv-rise rounded-[20px] bg-surface p-2.5 lg:col-span-6 ${i % 2 ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-7"}`}
                >
                  {f.proof}
                </div>
              </InView>
            ))}
          </div>
        </section>

        {/* A line from the books on habit; a different one each day. */}
        <section aria-label="A quote about habits" className="mx-auto max-w-[1280px] px-4 pt-16 sm:px-8 lg:pt-28">
          <InView>
            <div className="iv-rise max-w-[1040px]">
              <Quote quote={quoteFor(utcToday(), 3)} large />
            </div>
          </InView>
        </section>

        {/* Questions: each answer directly under its question, all open, two to a row on wide screens. */}
        <section id="questions" aria-labelledby="questions-title" className="mx-auto max-w-[1280px] scroll-mt-8 px-4 pt-16 pb-16 sm:px-8 lg:pt-28 lg:pb-28">
          <h2 id="questions-title" className={`${DISPLAY} text-[13vw] sm:text-[clamp(48px,6.4vw,104px)]`}>
            Questions
          </h2>
          <InView>
            <dl className="mt-10 grid gap-x-6 gap-y-10 lg:mt-14 lg:grid-cols-2 lg:gap-y-14">
              {FAQ.map((f, i) => (
                <div key={f.q} style={delay(i * 90)} className="iv-rise max-w-[52ch]">
                  <dt className="text-[clamp(22px,2vw,28px)] leading-[1.2] font-semibold tracking-[-0.02em]">{f.q}</dt>
                  <dd className={`mt-3 ${BODY}`}>{f.a}</dd>
                </div>
              ))}
            </dl>
          </InView>
        </section>
      </main>

      {/* Close and footer: the sentence with a blank, over the name cut by the edge. */}
      <footer className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[1280px] px-4 pt-16 sm:px-8 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-6">
            <form action="/register" method="get" className="lg:col-span-9">
              <h2 className={`${DISPLAY} text-[10vw] lg:text-[clamp(44px,5vw,80px)]`}>
                <label htmlFor="claim">Pick a username</label>{" "}
                <input
                  id="claim"
                  name="username"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_.]+"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="yourname"
                  className="my-1 inline-block h-[1.1em] w-[6.5em] max-w-full rounded-[14px] bg-white/12 px-[0.25em] align-[-0.12em] font-semibold tracking-[-0.04em] text-primary-foreground outline-none placeholder:text-primary-foreground/45 focus-visible:ring-4 focus-visible:ring-data dark:bg-black/10 max-lg:block"
                />{" "}
                and{" "}
                <button
                  type="submit"
                  aria-label="Start: create your account"
                  className="inline-block h-[1.1em] rounded-[14px] bg-data px-[0.3em] align-[-0.12em] font-semibold tracking-[-0.04em] text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:text-[#0b1a18]"
                >
                  start
                </button>
              </h2>
              <p className="mt-6 text-base text-primary-foreground/70">
                Free. You&apos;ll add your email and a password next.{" "}
                <Link href="/login" className="font-medium text-primary-foreground underline underline-offset-4">
                  Already have an account? Sign in
                </Link>
              </p>
            </form>
            {/* Each link is a 44px-tall target, so they are easy to tap. */}
            <ul className="grid content-start text-base lg:col-span-3 lg:justify-items-end">
              {[
                { href: "#how", label: "How it works" },
                { href: "#questions", label: "Questions" },
                { href: "/login", label: "Sign in" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center text-primary-foreground/75 hover:text-primary-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-16 flex flex-wrap justify-between gap-2 text-sm text-primary-foreground/65 lg:mt-20">
            <span>© 2026 Ascend</span>
            <span>Your habits are private to your account.</span>
          </div>
        </div>
        {/* The traced wordmark, its lower part cut off by the page edge: a window 55% of its height. */}
        <div aria-hidden="true" className="pointer-events-none mx-auto mt-10 max-w-[1280px] px-4 select-none sm:px-8 lg:mt-14">
          <InView className="overflow-hidden">
            <div style={{ aspectRatio: `${WORDMARK.width} / ${(WORDMARK.capHeight + 3) * 0.55}` }}>
              <div className="iv-rise" style={{ "--y": "60%" } as React.CSSProperties}>
                <WordmarkText className="block h-auto w-full" />
              </div>
            </div>
          </InView>
        </div>
      </footer>
    </div>
  );
}
