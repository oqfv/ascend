import { describe, expect, it } from "vitest";
import { estimatedOneRepMax, isPersonalBest, personalBests, sessionsOf, type SetRow } from "./workouts";

const set = (date: string, weightKg: number, reps: number, exercise = "bench-press"): SetRow => ({ date, exercise, weightKg, reps });

describe("estimatedOneRepMax", () => {
  it("uses Epley and treats a single rep as its own max", () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
    expect(estimatedOneRepMax(60, 10)).toBe(80);
  });
  it("gives no estimate for bodyweight sets", () => {
    expect(estimatedOneRepMax(0, 15)).toBe(0);
  });
});

describe("sessionsOf", () => {
  it("summarises each day and sorts oldest first", () => {
    const s = sessionsOf([set("2026-11-03", 22.5, 8), set("2026-11-01", 20, 10), set("2026-11-01", 20, 8)]);
    expect(s.map((x) => x.date)).toEqual(["2026-11-01", "2026-11-03"]);
    expect(s[0]).toMatchObject({ sets: 2, topWeightKg: 20, topReps: 10, volumeKg: 360 });
  });
});

describe("personalBests", () => {
  it("finds the heaviest weight, its first date and the session count", () => {
    const pb = personalBests([set("2026-11-01", 20, 10), set("2026-11-03", 25, 5), set("2026-11-04", 25, 6)]);
    expect(pb).toMatchObject({ heaviestKg: 25, heaviestOn: "2026-11-03", mostReps: 10, sessions: 3 });
  });
  it("is empty with no sets", () => {
    expect(personalBests([])).toMatchObject({ heaviestKg: 0, heaviestOn: null, sessions: 0 });
  });
});

describe("isPersonalBest", () => {
  const history = [set("2026-11-01", 20, 10), set("2026-11-02", 22.5, 8)];
  it("is a record only when it beats earlier days", () => {
    expect(isPersonalBest(set("2026-11-04", 25, 5), history)).toBe(true);
    expect(isPersonalBest(set("2026-11-04", 22.5, 10), history)).toBe(false);
  });
  it("does not count the very first set", () => {
    expect(isPersonalBest(set("2026-11-01", 20, 10), [])).toBe(false);
  });
  it("compares reps for bodyweight exercises", () => {
    const pushups = [set("2026-11-01", 0, 15, "push-up")];
    expect(isPersonalBest(set("2026-11-02", 0, 18, "push-up"), pushups)).toBe(true);
  });
});
