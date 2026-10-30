import type { Metadata } from "next";
import { LegalPage, Mail, TextLink, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Ascend, the free habit tracker: who can use it, what it costs, and what each side is responsible for.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    title: "The agreement",
    body: (
      <p>
        By creating an account or using Ascend, you agree to these terms and to the <TextLink href="/privacy">privacy page</TextLink>.
        Ascend is built and run by an independent developer based in the United Arab Emirates (&ldquo;we&rdquo;). Questions go to <Mail />.
      </p>
    ),
  },
  {
    title: "Who can use Ascend",
    body: (
      <p>
        You need to be at least 13 years old. If you are under the age at which your country lets you agree to terms like these on your
        own, a parent or guardian has to agree for you.
      </p>
    ),
  },
  {
    title: "Your account",
    body: (
      <p>
        Keep your password to yourself, and use an email address you can receive mail at, since it&apos;s the only way to reset a forgotten
        password. You are responsible for what happens in your account. Each account is for one person.
      </p>
    ),
  },
  {
    title: "Price",
    body: (
      <p>
        Ascend is free. There are no paid plans, no hidden fees and nothing to refund, because nothing is ever charged. If a paid option is
        ever added, it will be announced first, and you will never be charged without choosing it yourself.
      </p>
    ),
  },
  {
    title: "Your data stays yours",
    body: (
      <p>
        Your habits, entries and journal belong to you. We store them only to run Ascend for you, and you can download them or delete
        them at any time in Settings.
      </p>
    ),
  },
  {
    title: "Fair use",
    body: (
      <p>
        Don&apos;t try to break into other accounts or Ascend&apos;s systems, overload the service, create accounts automatically, or use
        Ascend for anything unlawful. Accounts that do may be suspended or removed.
      </p>
    ),
  },
  {
    title: "Reviews and insights aren't advice",
    body: (
      <p>
        Ascend&apos;s reviews and insights are calculated from the numbers you enter. They are not medical, health or professional advice.
        Talk to a qualified person about anything that affects your health.
      </p>
    ),
  },
  {
    title: "Availability",
    body: (
      <p>
        We work to keep Ascend running and your data safe, but it is provided as it is, without a guarantee that it will always be
        available or free of mistakes. Features may change. Downloading your data from Settings now and then is a good habit too.
      </p>
    ),
  },
  {
    title: "Responsibility",
    body: (
      <p>
        As far as the law allows, we aren&apos;t responsible for indirect losses from using Ascend or from it being unavailable. Nothing in
        these terms limits rights you have that the law says can&apos;t be limited.
      </p>
    ),
  },
  {
    title: "Ending",
    body: <p>You can delete your account at any time in Settings. If Ascend ever shuts down, you&apos;ll be told in advance by email so you can download your data first.</p>,
  },
  {
    title: "Law and changes",
    body: (
      <p>
        These terms are governed by the laws of the United Arab Emirates. If they change in an important way, we&apos;ll email you before
        the change applies. The date below always shows the latest version.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="The rules for using Ascend, in plain words. They're short because Ascend is free and keeps your data to itself."
      sections={SECTIONS}
    />
  );
}
