import { describe, expect, it } from "vitest";
import { formatSecondsAsMMSS } from "./pix";

describe("formatSecondsAsMMSS", () => {
  it("formats zero", () => {
    expect(formatSecondsAsMMSS(0)).toBe("00:00");
  });
  it("formats less than minute", () => {
    expect(formatSecondsAsMMSS(45)).toBe("00:45");
  });
  it("formats minutes and seconds", () => {
    expect(formatSecondsAsMMSS(125)).toBe("02:05");
  });
  it("clamps negatives", () => {
    expect(formatSecondsAsMMSS(-10)).toBe("00:00");
  });
});
