import type { Metadata } from "next";
import { LegalPage, Mail, TextLink, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Ascend stores, where it lives, who can see it, and how to take it with you or delete it.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    title: "Who runs Ascend",
    body: (
      <p>
        Ascend is built and run by an independent developer based in the United Arab Emirates. For any question about your data, or a
        request to see, correct or delete it, email <Mail />.
      </p>
    ),
  },
  {
    title: "What Ascend stores",
    body: (
      <ul className="grid list-disc gap-2 pl-5">
        <li>Your username, email address, display name, timezone and settings, including whether you&apos;ve seen the welcome tour and want the monthly report.</li>
        <li>Your password, stored only as a scrambled hash. Nobody, including us, can read it.</li>
        <li>A password reset code, only while one is waiting to be used, also stored as a hash. It stops working after 10 minutes.</li>
        <li>Your habits, the progress you record, and your optional journal: mood, energy, sleep and notes.</li>
        <li>
          Counters that slow down repeated sign-in and reset attempts. They are tied to a scrambled form of your IP address or email,
          never the address itself, and are deleted after a day.
        </li>
      </ul>
    ),
  },
  {
    title: "What it doesn't collect",
    body: <p>No phone number, no location, no contacts. There are no ads, no analytics or tracking scripts, and nothing is sold or shared with anyone for marketing.</p>,
  },
  {
    title: "What your email is for",
    body: (
      <>
        <p>
          When you ask to reset your password, Ascend emails you a code. If you turn on the monthly report in Settings or the welcome
          tour, Ascend also emails you a summary of your month on the 1st. It is off unless you switch it on, and every report has a
          one-click unsubscribe link.
        </p>
        <p>There are no newsletters or marketing emails, and your address is never shared or sold.</p>
      </>
    ),
  },
  {
    title: "Who can see your habits",
    body: (
      <p>
        Only you. Every request checks that the data belongs to the signed-in account before it is read or changed, and the database
        refuses access from anywhere except Ascend&apos;s own server.
      </p>
    ),
  },
  {
    title: "Services Ascend uses",
    body: (
      <>
        <p>Three companies process data so Ascend can run. None of them may use it for their own purposes.</p>
        <ul className="grid list-disc gap-2 pl-5">
          <li>Supabase stores the database, on servers in Mumbai, India.</li>
          <li>Vercel runs the website. Like any web host, it keeps short-lived request logs, which include IP addresses.</li>
          <li>
            Brevo delivers Ascend&apos;s emails. It receives your email address and the email&apos;s text: a reset code, or, if you turned
            on the monthly report, your habit names and that month&apos;s numbers.
          </li>
        </ul>
        <p>All connections are encrypted. Fonts are served from Ascend itself, so loading a page doesn&apos;t contact any other company.</p>
      </>
    ),
  },
  {
    title: "Cookies",
    body: (
      <p>
        One cookie keeps you signed in. It holds a random session token, not your data, and it isn&apos;t used for tracking. Your light or
        dark theme choice is remembered in your browser. Both are needed for the site to work, and nothing tracks you, so there is no
        cookie banner to click through.
      </p>
    ),
  },
  {
    title: "Take it with you, or delete it",
    body: (
      <p>
        In <TextLink href="/settings">Settings</TextLink>, you can download your habits and every entry as spreadsheet files at any
        time, and change your email. You can also delete your account there: it removes your account, habits, entries and journal for
        good, immediately. If you can&apos;t sign in, email <Mail /> from the address on your account and we&apos;ll delete it for you.
      </p>
    ),
  },
  {
    title: "Children",
    body: (
      <p>
        Ascend isn&apos;t meant for children under 13, and we don&apos;t knowingly keep their data. If you believe a child under 13 has an
        account, email us and it will be deleted.
      </p>
    ),
  },
  {
    title: "Changes",
    body: (
      <p>
        If this page changes, the date below changes with it. The <TextLink href="/terms">terms of use</TextLink> cover everything else
        about using Ascend.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="Ascend is a habit tracker, and your habits are personal. This page explains plainly what is kept, who can see it, and how to remove it."
      sections={SECTIONS}
    />
  );
}
