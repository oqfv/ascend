"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteFood } from "@/app/(app)/nutrition/actions";

export function DeleteFoodButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${label}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteFood(id);
          if (!res.ok) toast.error(res.error);
        })
      }
    >
      <X />
    </Button>
  );
}
