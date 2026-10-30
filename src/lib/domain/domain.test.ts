import { describe, expect, it } from "vitest";
import { addDays, endOfMonth, startOfWeek, todayIn, weekday } from "./dates";
import { habit, sub, version } from "./fixtures";
import { evaluateOccurrence, evaluatePeriod, makeLogStore, type LogRow, type SubLogRow } from "./progress";
import { isActiveOn, occurrencesOn, periodContaining, versionOn } from "./schedule";
import { dailySeries, durationStats, habitStats, pointChange, streakOf, summarizeDay, totalsOf } from "./analytics";

const ctx = (logs: LogRow[] = [], subLogs: SubLogRow[] = [], today = "2026-03-15") => ({
  logs: makeLogStore(logs, subLogs),
  today,
  weekStartsOn: 1,
});
const log = (date: string, value = 1, habitId = "h1", occurrence = 0): LogRow => ({ habitId, date, occurrence, value });

describe("dates", () => {
  it("handles month ends and leap years", () => {
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("starts weeks on the chosen day", () => {
    expect(weekday("2026-03-15")).toBe(0); // a Sunday
    expect(startOfWeek("2026-03-15", 1)).toBe("2026-03-09");
    expect(startOfWeek("2026-03-15", 0)).toBe("2026-03-15");
  });
  it("resolves today in the user's timezone, not the server's", () => {
    const instant = new Date("2026-03-15T23:30:00Z");
    expect(todayIn("UTC", instant)).toBe("2026-03-15");
    expect(todayIn("Asia/Dubai", instant)).toBe("2026-03-16");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-03-15");
  });
});

describe("schedules", () => {
  it("schedules selected weekdays only", () => {
    const h = habit({ schedules: [version({ frequency: "WEEKDAYS", weekdays: [1, 3, 5] })] });
    expect(occurrencesOn(h, "2026-03-16")).toBe(1); // Monday
    expect(occurrencesOn(h, "2026-03-17")).toBe(0); // Tuesday
  });
  it("schedules every N days from the version start", () => {
    const h = habit({ schedules: [version({ frequency: "INTERVAL", intervalDays: 3 })] });
    expect(occurrencesOn(h, "2026-01-01")).toBe(1);
    expect(occurrencesOn(h, "2026-01-02")).toBe(0);
    expect(occurrencesOn(h, "2026-01-04")).toBe(1);
  });
  it("supports several occurrences a day", () => {
    const h = habit({ schedules: [version({ timesPerDay: 3 })] });
    expect(occurrencesOn(h, "2026-02-01")).toBe(3);
  });
  it("respects start, end, pause and archive", () => {
    const h = habit({
      startDate: "2026-01-10",
      endDate: "2026-02-28",
      schedules: [version({ effectiveFrom: "2026-01-10" }), version({ effectiveFrom: "2026-02-01", paused: true })],
    });
    expect(isActiveOn(h, "2026-01-09")).toBe(false);
    expect(isActiveOn(h, "2026-01-20")).toBe(true);
    expect(isActiveOn(h, "2026-02-05")).toBe(false);
    expect(isActiveOn(habit({ archivedOn: "2026-03-01" }), "2026-03-01")).toBe(false);
  });
  it("keeps the old schedule for days before an edit", () => {
    const h = habit({
      schedules: [
        version({ frequency: "DAILY" }),
        version({ effectiveFrom: "2026-03-01", frequency: "WEEKDAYS", weekdays: [1] }),
      ],
    });
    expect(versionOn(h, "2026-02-28")!.frequency).toBe("DAILY");
    expect(occurrencesOn(h, "2026-02-24")).toBe(1); // a Tuesday, still daily then
    expect(occurrencesOn(h, "2026-03-03")).toBe(0); // a Tuesday after the edit
  });
});

describe("occurrence progress", () => {
  it("gives partial credit: 35 of 60 minutes is 58.3%", () => {
    const h = habit({ schedules: [version({ targetType: "DURATION", targetValue: 60, targetUnit: "min" })] });
    const r = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([log("2026-03-10", 35)]).logs, "2026-03-15");
    expect(r.progress * 100).toBeCloseTo(58.33, 2);
    expect(r.complete).toBe(false);
    expect(r.status).toBe("partial");
    expect(r.actual).toBe(35);
  });
  it("caps progress at 100% but keeps the recorded value", () => {
    const h = habit({ schedules: [version({ targetType: "QUANTITY", targetValue: 2, targetUnit: "L" })] });
    const r = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([log("2026-03-10", 2.6)]).logs, "2026-03-15");
    expect(r.progress).toBe(1);
    expect(r.actual).toBe(2.6);
    expect(r.complete).toBe(true);
  });
  it("tells missed, pending and future apart", () => {
    const h = habit();
    const logs = ctx().logs;
    expect(evaluateOccurrence(h, h.schedules[0], "2026-03-14", 0, logs, "2026-03-15").status).toBe("missed");
    expect(evaluateOccurrence(h, h.schedules[0], "2026-03-15", 0, logs, "2026-03-15").status).toBe("pending");
    expect(evaluateOccurrence(h, h.schedules[0], "2026-03-16", 0, logs, "2026-03-15").status).toBe("future");
  });
  it("completes a parent only when every required sub-habit is done", () => {
    const h = habit({
      subHabits: [
        sub({ id: "cardio", targetType: "DURATION", targetValue: 30 }),
        sub({ id: "weights", targetType: "DURATION", targetValue: 45, sortOrder: 1 }),
        sub({ id: "stretch", required: false, sortOrder: 2 }),
      ],
    });
    const subLog = (subHabitId: string, value: number): SubLogRow => ({ subHabitId, habitId: "h1", date: "2026-03-10", occurrence: 0, value });
    const partial = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([], [subLog("cardio", 30), subLog("stretch", 1)]).logs, "2026-03-15");
    expect(partial.rule).toBe("subhabits");
    expect(partial.complete).toBe(false);
    expect(partial.progress).toBeCloseTo(0.5); // cardio 100%, weights 0%; stretch is optional
    const done = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([], [subLog("cardio", 30), subLog("weights", 50)]).logs, "2026-03-15");
    expect(done.complete).toBe(true);
  });
  it("uses the parent's own value when sub-habits are a checklist", () => {
    const h = habit({ schedules: [version({ requireSubHabits: false })], subHabits: [sub({ id: "a" })] });
    const r = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([log("2026-03-10", 1)]).logs, "2026-03-15");
    expect(r.rule).toBe("self");
    expect(r.complete).toBe(true);
  });
  it("does not apply a sub-habit to days before it existed", () => {
    const h = habit({ subHabits: [sub({ id: "a", activeFrom: "2026-03-12" })] });
    const before = evaluateOccurrence(h, h.schedules[0], "2026-03-10", 0, ctx([log("2026-03-10")]).logs, "2026-03-15");
    expect(before.rule).toBe("self");
    expect(before.complete).toBe(true);
  });
});

describe("period targets", () => {
  const weekly = habit({
    schedules: [version({ frequency: "WEEKLY", targetType: "DURATION", targetValue: 600, targetUnit: "min" })],
  });
  it("sums a weekly target over the week, not per day", () => {
    const week = periodContaining("WEEKLY", "2026-03-09", 1);
    const r = evaluatePeriod(weekly, week, ctx([log("2026-03-09", 120), log("2026-03-11", 90)]).logs, "2026-03-11")!;
    expect(r.actual).toBe(210);
    expect(r.remaining).toBe(390);
    expect(r.status).toBe("in-progress"); // never "missed" before the week ends
  });
  it("marks a period missed only after it ends", () => {
    const week = periodContaining("WEEKLY", "2026-03-02", 1);
    const r = evaluatePeriod(weekly, week, ctx([log("2026-03-02", 100)]).logs, "2026-03-15")!;
    expect(r.status).toBe("missed");
  });
  it("counts monthly sessions and prorates a partial first month", () => {
    const gym = habit({
      startDate: "2026-03-16",
      schedules: [version({ effectiveFrom: "2026-03-16", frequency: "MONTHLY", targetValue: 20 })],
    });
    const month = periodContaining("MONTHLY", "2026-03-20", 1);
    const r = evaluatePeriod(gym, month, ctx([log("2026-03-16"), log("2026-03-17")]).logs, "2026-03-20")!;
    expect(r.activeDays).toBe(16);
    expect(r.target).toBe(Math.ceil((20 * 16) / 31));
    expect(r.actual).toBe(2);
  });
});

describe("analytics", () => {
  it("returns no rate rather than 0% when nothing was scheduled", () => {
    const day = summarizeDay([habit({ startDate: "2026-04-01", schedules: [version({ effectiveFrom: "2026-04-01" })] })], "2026-03-10", ctx());
    expect(day.scheduled).toBe(0);
    expect(day.rate).toBeNull();
    expect(totalsOf([]).rate).toBeNull();
  });
  it("excludes future days from eligible and missed counts", () => {
    const t = totalsOf(dailySeries([habit()], "2026-03-14", "2026-03-17", ctx([log("2026-03-14")])));
    expect(t.scheduled).toBe(4);
    expect(t.eligible).toBe(2); // 14th and 15th (today)
    expect(t.completed).toBe(1);
    expect(t.missed).toBe(0); // today is pending, not missed
    expect(t.rate).toBe(50);
  });
  it("counts a fully completed day only when every eligible occurrence is done", () => {
    const a = habit({ id: "a" });
    const b = habit({ id: "b" });
    const t = totalsOf(
      dailySeries([a, b], "2026-03-10", "2026-03-11", ctx([log("2026-03-10", 1, "a"), log("2026-03-10", 1, "b"), log("2026-03-11", 1, "a")])),
    );
    expect(t.fullDays).toBe(1);
    expect(t.activeDays).toBe(2);
  });
  it("reports change in points only when both periods have data", () => {
    expect(pointChange(80, 65)).toBe(15);
    expect(pointChange(80, null)).toBeNull();
  });
  it("counts per-habit stats across a schedule edit without rewriting history", () => {
    const h = habit({
      schedules: [version(), version({ effectiveFrom: "2026-03-09", frequency: "WEEKDAYS", weekdays: [1] })],
    });
    const s = habitStats(h, "2026-03-02", "2026-03-15", ctx([log("2026-03-02"), log("2026-03-09")]));
    expect(s.eligible).toBe(8); // 7 daily days, then one Monday
    expect(s.completed).toBe(2);
  });
});

describe("streaks", () => {
  it("skips unscheduled days instead of breaking the streak", () => {
    const h = habit({ schedules: [version({ frequency: "WEEKDAYS", weekdays: [1, 3, 5] })] });
    const s = streakOf(h, ctx([log("2026-03-09"), log("2026-03-11"), log("2026-03-13")], [], "2026-03-15"));
    expect(s.current).toBe(3);
    expect(s.unit).toBe("day");
  });
  it("does not break the streak for today until today ends", () => {
    const s = streakOf(habit(), ctx([log("2026-03-13"), log("2026-03-14")], [], "2026-03-15"));
    expect(s.current).toBe(2);
  });
  it("breaks on a missed scheduled day and keeps the longest run", () => {
    const logs = [log("2026-03-01"), log("2026-03-02"), log("2026-03-03"), log("2026-03-05")];
    const s = streakOf(habit({ startDate: "2026-03-01" }), ctx(logs, [], "2026-03-06"));
    expect(s.longest).toBe(3);
    expect(s.current).toBe(1);
  });
  it("counts weeks for weekly targets", () => {
    const h = habit({ startDate: "2026-03-02", schedules: [version({ effectiveFrom: "2026-03-02", frequency: "WEEKLY", targetValue: 2 })] });
    const logs = [log("2026-03-02"), log("2026-03-04"), log("2026-03-10"), log("2026-03-12")];
    const s = streakOf(h, ctx(logs, [], "2026-03-18"));
    expect(s.unit).toBe("week");
    expect(s.current).toBe(2);
  });
});

describe("time spent", () => {
  it("adds only recorded durations, never checkboxes", () => {
    const study = habit({ id: "s", schedules: [version({ targetType: "DURATION", targetValue: 60 })] });
    const read = habit({ id: "r" });
    const d = durationStats([study, read], "2026-03-10", "2026-03-12", ctx([log("2026-03-10", 35, "s"), log("2026-03-11", 60, "s"), log("2026-03-10", 1, "r")]));
    expect(d.totalMinutes).toBe(95);
    expect(d.sessions).toBe(2);
    expect(d.averageMinutes).toBe(47.5);
  });
});
