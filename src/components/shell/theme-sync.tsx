"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

/** Applies the theme saved on the account once per load, so it follows the user across devices. */
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    setTheme(theme);
  }, [theme, setTheme]);
  return null;
}
