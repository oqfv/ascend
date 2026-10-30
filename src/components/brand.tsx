import { useId } from "react";
import { cn } from "@/lib/utils";
import { WORDMARK } from "./brand-wordmark";

// Ascend's mark: three stones balanced in a cairn, leaning gently, the top one ("today's stone")
// partly filled. Same geometry as scripts/brand-assets.mjs. Small sizes use the solid version,
// because the partial fill would blur below about 40 px. Colour comes from --logo.

// With `animated`, the stones are set down one at a time, bottom first (.mark-stone in globals.css).
const STONES = (
  <>
    <g className="mark-stone">
      <rect x="10" y="44" width="42" height="16" rx="14" ry="8" transform="rotate(-4 31 52)" />
    </g>
    <g className="mark-stone">
      <rect x="19.5" y="27.5" width="31" height="14" rx="11" ry="7" transform="rotate(6 35 34.5)" />
    </g>
  </>
);

export function AscendMark({ className, partial = false, animated = false }: { className?: string; partial?: boolean; animated?: boolean }) {
  const clip = useId();
  return (
    <svg viewBox="4 4 56 56" aria-hidden="true" data-animated={animated || undefined} className={cn("size-5", className)} style={{ color: "var(--logo)" }}>
      {partial && (
        <defs>
          <clipPath id={clip}>
            <rect x="0" y="21" width="64" height="20" />
          </clipPath>
        </defs>
      )}
      <g fill="currentColor" transform="translate(1 -3)">
        {STONES}
        <g className="mark-stone">
          {partial ? (
            <g transform="translate(0 -4) rotate(-8 28.5 22)">
              <rect x="18.2" y="16.7" width="20.6" height="10.6" rx="7.3" ry="5.3" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <rect x="17" y="15.5" width="23" height="13" rx="8.5" ry="6.5" clipPath={`url(#${clip})`} />
            </g>
          ) : (
            <rect x="17" y="15.5" width="23" height="13" rx="8.5" ry="6.5" transform="translate(0 -4) rotate(-8 28.5 22)" />
          )}
        </g>
      </g>
    </svg>
  );
}

/** The name, traced from Manrope Bold, in currentColor. Height follows the font size (cap = 0.72em). */
export function WordmarkText({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 -1 ${WORDMARK.width} ${WORDMARK.capHeight + 3}`}
      role="img"
      aria-label="Ascend"
      className={cn("h-[0.72em] w-auto overflow-visible", className)}
      fill="currentColor"
    >
      <path d={WORDMARK.d} />
    </svg>
  );
}

export function Wordmark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.4em] text-[19px] text-foreground", className)}>
      <AscendMark className="size-[1.3em]" animated={animated} />
      <WordmarkText />
    </span>
  );
}
