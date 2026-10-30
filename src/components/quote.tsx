import type { BookQuote } from "@/lib/quotes";
import { cn } from "@/lib/utils";

/** A quote with its author and book. `large` is for the front page; the default sits quietly inside a page. */
export function Quote({ quote, large, className }: { quote: BookQuote; large?: boolean; className?: string }) {
  return (
    <figure className={className}>
      <blockquote
        className={cn(
          "font-display font-semibold tracking-[-0.02em]",
          large ? "text-[clamp(28px,3.6vw,52px)] leading-[1.12] tracking-[-0.03em]" : "text-base leading-6",
        )}
      >
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <figcaption className={cn("text-muted-foreground", large ? "mt-5 text-base sm:text-lg" : "mt-1.5 text-sm")}>
        {quote.author}, <cite className="not-italic">{quote.book}</cite>
      </figcaption>
    </figure>
  );
}
