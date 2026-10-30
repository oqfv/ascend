"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArrowDown, ArrowUp, MoreHorizontal, Pause, Pencil, Play, RotateCcw, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  archiveHabit,
  countEntries,
  deleteHabit,
  moveHabit,
  pauseHabit,
  restoreHabit,
  resumeHabit,
  type ActionResult,
} from "@/app/(app)/habits/actions";

export function HabitActions({
  id,
  name,
  state,
  first,
  last,
}: {
  id: string;
  name: string;
  state: "active" | "paused" | "archived";
  first: boolean;
  last: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<null | number>(null);

  function run(action: () => Promise<ActionResult>, done: string) {
    start(async () => {
      const res = await action();
      if (res.ok) toast.success(done);
      else toast.error(res.error ?? "That didn't work. Try again.");
    });
  }

  function askDelete() {
    start(async () => setConfirm(await countEntries(id)));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          aria-label={`Actions for ${name}`}
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem render={<Link href={`/habits/${id}/edit`} />}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {state !== "archived" && (
            <>
              <DropdownMenuItem disabled={first} onClick={() => run(() => moveHabit(id, "up"), `${name} moved up`)}>
                <ArrowUp /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={last} onClick={() => run(() => moveHabit(id, "down"), `${name} moved down`)}>
                <ArrowDown /> Move down
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          {state === "active" && (
            <DropdownMenuItem onClick={() => run(() => pauseHabit(id), `${name} paused from today`)}>
              <Pause /> Pause
            </DropdownMenuItem>
          )}
          {state === "paused" && (
            <DropdownMenuItem onClick={() => run(() => resumeHabit(id), `${name} resumed from today`)}>
              <Play /> Resume
            </DropdownMenuItem>
          )}
          {state === "archived" ? (
            <DropdownMenuItem onClick={() => run(() => restoreHabit(id), `${name} restored`)}>
              <RotateCcw /> Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => run(() => archiveHabit(id), `${name} archived. Its history is kept.`)}>
              <Archive /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={askDelete}>
            <Trash2 /> Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? `This removes the habit and its ${confirm} recorded ${confirm === 1 ? "entry" : "entries"} for good, and changes your past analytics. Archive it instead to keep its history.`
                : "This removes the habit for good. It has no recorded entries."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-negative text-white hover:bg-negative/90"
              onClick={() => {
                setConfirm(null);
                run(() => deleteHabit(id), `${name} deleted`);
              }}
            >
              Delete {name}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
