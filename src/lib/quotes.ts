// Short quotes on habit, each checked against a source. Durant's line is his own summary of Aristotle,
// so it is credited to Durant, not to Aristotle as it often is online.

export type BookQuote = { text: string; author: string; book: string };

export const QUOTES: BookQuote[] = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", book: "The Story of Philosophy" },
  { text: "Habit is habit, and not to be flung out of the window by any man, but coaxed down-stairs a step at a time.", author: "Mark Twain", book: "Pudd'nhead Wilson" },
  { text: "We are spinning our own fates, good or evil, and never to be undone.", author: "William James", book: "The Principles of Psychology" },
  { text: "Such as are thy habitual thoughts, such also will be the character of thy mind; for the soul is dyed by the thoughts.", author: "Marcus Aurelius", book: "Meditations" },
  { text: "Moral virtue comes about as a result of habit.", author: "Aristotle", book: "Nicomachean Ethics" },
  { text: "Every habit and faculty is preserved and increased by correspondent actions, as the habit of walking, by walking; of running, by running.", author: "Epictetus", book: "Discourses" },
  { text: "Habits are the compound interest of self-improvement.", author: "James Clear", book: "Atomic Habits" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear", book: "Atomic Habits" },
  { text: "All big things come from small beginnings. The seed of every habit is a single, tiny decision.", author: "James Clear", book: "Atomic Habits" },
];

/** One quote per calendar day. `offset` lets each page show a different one on the same day. */
export function quoteFor(isoDate: string, offset = 0): BookQuote {
  const day = Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
  return QUOTES[(day + offset) % QUOTES.length];
}

/** Today's date in UTC, for pages shown before anyone has signed in. */
export const utcToday = () => new Date().toISOString().slice(0, 10);
