import { describe, expect, it } from "vitest";
import { dueReminders, isAllowedPushEndpoint, reminderMessage, type ReminderItem } from "./reminders";

const item = (p: Partial<ReminderItem>): ReminderItem => ({ habitId: "h1", name: "Read", reminderTime: "08:00", complete: false, progress: 0, targetText: "20 pages", ...p });

describe("dueReminders", () => {
  it("sends from the reminder time until 30 minutes after", () => {
    expect(dueReminders([item({})], 7 * 60 + 59, new Set())).toHaveLength(0);
    expect(dueReminders([item({})], 8 * 60, new Set())).toHaveLength(1);
    expect(dueReminders([item({})], 8 * 60 + 30, new Set())).toHaveLength(1);
    expect(dueReminders([item({})], 8 * 60 + 31, new Set())).toHaveLength(0);
  });
  it("skips done habits, habits already reminded, and habits with no time", () => {
    expect(dueReminders([item({ complete: true })], 480, new Set())).toHaveLength(0);
    expect(dueReminders([item({})], 480, new Set(["h1"]))).toHaveLength(0);
    expect(dueReminders([item({ reminderTime: null })], 480, new Set())).toHaveLength(0);
  });
  it("reminds a habit due several times a day only once", () => {
    expect(dueReminders([item({}), item({})], 480, new Set())).toHaveLength(1);
  });
});

describe("reminderMessage", () => {
  it("names partial progress, the target, or just the habit", () => {
    expect(reminderMessage(item({ progress: 0.4 })).body).toBe("40% done so far. A little more still counts.");
    expect(reminderMessage(item({})).body).toBe("Today's target is 20 pages. Doing part of it still counts.");
    expect(reminderMessage(item({ targetText: null })).body).toBe("It's time. Tap to mark it done.");
  });
});

describe("isAllowedPushEndpoint", () => {
  it("accepts the browsers' push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
  });
  it("refuses anything else", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://localhost/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});
