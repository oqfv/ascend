"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, type ISODate } from "@/lib/domain/dates";
import { formatDay } from "@/lib/format";

// The picker works in local Date objects; the app works in ISO calendar days.
const toLocal = (d: ISODate) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const fromLocal = (d: Date): ISODate =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function DateNav({ date, today, basePath }: { date: ISODate; today: ISODate; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const href = (d: ISODate) => (d === today ? basePath : `${basePath}?date=${d}`);

  return (
    <div className="flex items-center gap-1">
      <LinkButton variant="ghost" size="icon" aria-label="Previous day" href={href(addDays(date, -1))}>
        <ChevronLeft />
      </LinkButton>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" className="num min-w-[150px]" />}>
          <CalendarDays className="text-muted-foreground" />
          {date === today ? "Today" : formatDay(date)}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <Calendar
            mode="single"
            selected={toLocal(date)}
            defaultMonth={toLocal(date)}
            onSelect={(d) => {
              if (!d) return;
              setOpen(false);
              router.push(href(fromLocal(d)));
            }}
          />
        </PopoverContent>
      </Popover>
      <LinkButton variant="ghost" size="icon" aria-label="Next day" href={href(addDays(date, 1))}>
        <ChevronRight />
      </LinkButton>
      {date !== today && (
        <LinkButton variant="ghost" href={basePath}>
          Back to today
        </LinkButton>
      )}
    </div>
  );
}
