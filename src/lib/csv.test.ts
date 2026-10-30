import { describe, expect, it } from "vitest";
import { parseImportRow, toCsv } from "./csv";

const today = "2026-03-15";

describe("CSV import rows", () => {
  it("accepts the template's kinds of rows", () => {
    const r = parseImportRow(
      { name: "Practice questions", frequency: "weekdays", weekdays: "mon, wed,fri", target_type: "count", target_value: "10", target_unit: "questions" },
      2,
      today,
    );
    expect(r.errors).toEqual([]);
    expect(r.input?.weekdays).toEqual([1, 3, 5]);
    expect(r.input?.startDate).toBe(today);
  });
  it("defaults to a daily checkbox and fixes the checkbox target to 1", () => {
    const r = parseImportRow({ name: "Read", target_value: "7" }, 2, today);
    expect(r.input?.frequency).toBe("DAILY");
    expect(r.input?.targetValue).toBe(1);
  });
  it("explains each problem in plain words", () => {
    const r = parseImportRow({ name: "", frequency: "sometimes", target_type: "vibes", start_date: "15/03/2026" }, 4, today);
    expect(r.input).toBeNull();
    expect(r.errors.join(" ")).toMatch(/Frequency "sometimes"/);
    expect(r.errors.join(" ")).toMatch(/Target type "vibes"/);
    expect(r.errors.join(" ")).toMatch(/2026-01-31/);
  });
  it("requires a unit for counts and a weekday list for weekday habits", () => {
    expect(parseImportRow({ name: "Pages", target_type: "count", target_value: "20" }, 2, today).input).toBeNull();
    expect(parseImportRow({ name: "Run", frequency: "weekdays" }, 2, today).input).toBeNull();
    expect(parseImportRow({ name: "Rest", frequency: "weekends" }, 2, today).input?.weekdays).toEqual([0, 6]);
  });
  it("rejects end dates before the start", () => {
    const r = parseImportRow({ name: "Run", start_date: "2026-03-10", end_date: "2026-03-01" }, 2, today);
    expect(r.input).toBeNull();
  });
});

describe("CSV writing", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv(["a"], [['say "hi", ok']])).toBe('a\r\n"say ""hi"", ok"\r\n');
  });
  it("neutralises cells a spreadsheet would run as formulas", () => {
    expect(toCsv(["a"], [["=SUM(A1)"]])).toBe("a\r\n'=SUM(A1)\r\n");
  });
});
