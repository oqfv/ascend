"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand";
import { NavList } from "./nav";
import { UserMenu } from "./user-menu";

export function MobileNav({ displayName, username }: { displayName: string; username: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 bg-chrome px-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] gap-0 bg-chrome p-3">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-10 items-center px-2.5">
            <Wordmark />
          </div>
          <div className="mt-4 flex flex-1 flex-col">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-3">
            <UserMenu displayName={displayName} username={username} />
          </div>
        </SheetContent>
      </Sheet>
      <Wordmark animated />
    </header>
  );
}
