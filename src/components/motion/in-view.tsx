"use client";

import { useLayoutEffect, useRef, useState } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays the .iv-* animations inside it (globals.css) when it scrolls into view, once. Blocks that are
 * already on screen when the page loads are left alone, so nothing visible ever blinks out.
 */
export function InView({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced() || el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset.inview = "waiting";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.inview = "shown";
        io.disconnect();
      },
      // A fifth in view: late enough to be seen, early enough for blocks at the very bottom of the page.
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** A number that counts up from zero when it scrolls into view. Shows the real value without JavaScript. */
export function CountUp({ value, suffix = "", duration = 1100 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduced() || el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setShown(0);
    let frame = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      // A fifth in view: late enough to be seen, early enough for blocks at the very bottom of the page.
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);
  return (
    <span ref={ref}>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
    </span>
  );
}
