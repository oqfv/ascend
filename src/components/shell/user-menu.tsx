"use client";

import { useTheme } from "next-themes";
import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";
import { saveTheme } from "@/app/(app)/settings/actions";

export function UserMenu({ displayName, username }: { displayName: string; username: string }) {
  const { theme, setTheme } = useTheme();
  const initial = (displayName || username).slice(0, 1).toUpperCase();

  function chooseTheme(value: string) {
    setTheme(value);
    void saveTheme(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/70 focus-visible:bg-sidebar-accent">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-data-soft text-[13px] font-medium text-foreground">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">@{username}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={chooseTheme}>
            <DropdownMenuRadioItem value="light">
              <Sun /> Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon /> Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor /> Match device
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
