import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { auth } from "./auth";
import { db } from "./db";
import { loadHabit, loadHabits, loadLogs } from "./data/habits";
import { toDbDate } from "./domain/dates";

const tag = `itest_${randomBytes(3).toString("hex")}`;
const PASSWORD = "integration-pass-123";

async function signUp(username: string) {
  return auth.api.signUpEmail({
    body: { email: `${username.toLowerCase()}@example.com`, password: PASSWORD, name: username, username },
  });
}

async function userId(username: string) {
  return (await db.user.findUniqueOrThrow({ where: { username: username.toLowerCase() }, select: { id: true } })).id;
}

afterAll(async () => {
  await db.user.deleteMany({ where: { username: { startsWith: tag } } });
  await db.$disconnect();
});

describe("accounts", () => {
  it("enforces unique usernames, ignoring case", async () => {
    await signUp(`${tag}_amy`);
    await expect(signUp(`${tag}_AMY`)).rejects.toThrow();
    expect(await db.user.count({ where: { username: `${tag}_amy` } })).toBe(1);
  });

  it("lets exactly one of several simultaneous sign-ups claim a username", async () => {
    const name = `${tag}_race`;
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => signUp(name)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.user.count({ where: { username: name } })).toBe(1);
  });

  it("never stores the password itself", async () => {
    const id = await userId(`${tag}_amy`);
    const account = await db.account.findFirstOrThrow({ where: { userId: id, providerId: "credential" } });
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain(PASSWORD);
  });

  it("signs in with the right password only", async () => {
    await expect(auth.api.signInUsername({ body: { username: `${tag}_amy`, password: PASSWORD } })).resolves.toBeTruthy();
    await expect(auth.api.signInUsername({ body: { username: `${tag}_amy`, password: "wrong-password" } })).rejects.toThrow();
  });
});

describe("data isolation", () => {
  let a: string;
  let b: string;
  let habitA: string;

  beforeAll(async () => {
    await signUp(`${tag}_bob`);
    a = await userId(`${tag}_amy`);
    b = await userId(`${tag}_bob`);
    const h = await db.habit.create({
      data: {
        userId: a,
        name: "Private habit",
        startDate: toDbDate("2026-01-01"),
        schedules: { create: { effectiveFrom: toDbDate("2026-01-01"), frequency: "DAILY", targetType: "CHECKBOX", targetValue: 1 } },
      },
    });
    habitA = h.id;
    await db.habitLog.create({ data: { userId: a, habitId: habitA, date: toDbDate("2026-01-02"), value: 1 } });
  });

  it("does not return another user's habit by id", async () => {
    expect(await loadHabit(b, habitA)).toBeNull();
    expect(await loadHabit(a, habitA)).not.toBeNull();
  });

  it("does not list or count another user's habits or entries", async () => {
    expect(await loadHabits(b)).toHaveLength(0);
    const { logRows } = await loadLogs(b, "2026-01-01", "2026-12-31");
    expect(logRows).toHaveLength(0);
  });

  it("keeps a single entry when the same entry is submitted twice at once", async () => {
    const key = { habitId_date_occurrence: { habitId: habitA, date: toDbDate("2026-01-03"), occurrence: 0 } };
    const write = () =>
      db.habitLog.upsert({
        where: key,
        update: { value: 1 },
        create: { userId: a, habitId: habitA, date: toDbDate("2026-01-03"), occurrence: 0, value: 1 },
      });
    await Promise.allSettled([write(), write()]);
    expect(await db.habitLog.count({ where: { habitId: habitA, date: toDbDate("2026-01-03") } })).toBe(1);
  });

  it("rejects values the database must never hold", async () => {
    await expect(
      db.habitLog.create({ data: { userId: a, habitId: habitA, date: toDbDate("2026-01-04"), value: -5 } }),
    ).rejects.toThrow();
  });
});
