"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSet } from "@/app/(app)/workouts/actions";

export function DeleteSetButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${label}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteSet(id);
          if (!res.ok) toast.error(res.error);
        })
      }
    >
      <X />
    </Button>
  );
}
