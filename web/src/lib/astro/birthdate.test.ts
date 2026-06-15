import { describe, it, expect } from "vitest";
import { validDateParts, validTimeParts, validBirthDateTime } from "./birthdate";

const NOW = Date.UTC(2026, 5, 15); // fixed "today" = 2026-06-15

describe("validDateParts", () => {
  it("accepts a real past date", () => {
    expect(validDateParts(1998, 6, 13, NOW)).toBe(true);
    expect(validDateParts(1900, 1, 1, NOW)).toBe(true);
  });
  it("rejects pre-1900 (L1)", () => {
    expect(validDateParts(1899, 12, 31, NOW)).toBe(false);
    expect(validDateParts(1, 1, 1, NOW)).toBe(false);
  });
  it("rejects future dates (M6) incl later-this-year and far future", () => {
    expect(validDateParts(2026, 6, 16, NOW)).toBe(false); // tomorrow
    expect(validDateParts(2099, 1, 1, NOW)).toBe(false);
    expect(validDateParts(9999, 1, 1, NOW)).toBe(false);
  });
  it("rejects out-of-range / non-existent month·day (N2)", () => {
    expect(validDateParts(1998, 99, 1, NOW)).toBe(false);
    expect(validDateParts(1998, 0, 1, NOW)).toBe(false);
    expect(validDateParts(1998, 2, 30, NOW)).toBe(false); // no Feb 30
    expect(validDateParts(1998, 13, 1, NOW)).toBe(false);
    expect(validDateParts(2000, 2, 29, NOW)).toBe(true); // leap day OK
    expect(validDateParts(1999, 2, 29, NOW)).toBe(false); // not a leap year
  });
});

describe("validTimeParts", () => {
  it("range-checks hour/minute (N2)", () => {
    expect(validTimeParts(8, 40)).toBe(true);
    expect(validTimeParts(0, 0)).toBe(true);
    expect(validTimeParts(23, 59)).toBe(true);
    expect(validTimeParts(99, 99)).toBe(false);
    expect(validTimeParts(24, 0)).toBe(false);
    expect(validTimeParts(-1, 0)).toBe(false);
  });
});

describe("validBirthDateTime", () => {
  it("time optional (noon default)", () => {
    expect(validBirthDateTime("1998-06-13", undefined, NOW)).toBe(true);
    expect(validBirthDateTime("1998-06-13", "", NOW)).toBe(true);
  });
  it("rejects bad date or bad time", () => {
    expect(validBirthDateTime("2099-01-01", "08:40", NOW)).toBe(false);
    expect(validBirthDateTime("1998-99-99", "08:40", NOW)).toBe(false);
    expect(validBirthDateTime("1998-06-13", "99:99", NOW)).toBe(false);
    expect(validBirthDateTime("", "08:40", NOW)).toBe(false);
  });
});
