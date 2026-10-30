import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { NavList } from "@/components/shell/nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { ThemeSync } from "@/components/shell/theme-sync";
import { requireUser } from "@/lib/session";

// Private pages: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Tinted L-frame with a white sheet: the sidebar sits on the chrome tint; the page lives on a
// sheet inset 8px from the window's right and bottom edges (radius 16, 1px edge, no shadow).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <ThemeSync theme={user.prefs.theme} />
      <aside className="sticky top-0 hidden h-dvh flex-col p-3 lg:flex">
        <div className="flex h-10 items-center px-2.5">
          <Wordmark animated />
        </div>
        <div className="mt-5 flex flex-1 flex-col">
          <NavList />
        </div>
        <div className="mt-3">
          <UserMenu displayName={user.displayName} username={user.username} />
        </div>
      </aside>
      <MobileNav displayName={user.displayName} username={user.username} />
      <main
        id="main"
        tabIndex={-1}
        className="min-h-[calc(100dvh-3rem)] bg-background outline-none lg:my-2 lg:mr-2 lg:min-h-[calc(100dvh-1rem)] lg:rounded-2xl lg:border"
      >
        {children}
      </main>
    </div>
  );
}
