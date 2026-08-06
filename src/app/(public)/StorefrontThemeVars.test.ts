import { describe, expect, it } from "vitest";
import { tickerDurationSeconds } from "./StorefrontThemeVars";

describe("tickerDurationSeconds (Loop 4f)", () => {
  it("returns the fastest speed for the lowest motionDurationMs (Monocromo, 80ms)", () => {
    expect(tickerDurationSeconds(80)).toBeLessThan(tickerDurationSeconds(500));
  });

  it("returns the slowest speed for the highest motionDurationMs (Editorial, 600ms)", () => {
    expect(tickerDurationSeconds(600)).toBe(32);
  });

  it("stays within a reasonable 14-32s range across the schema's 80-600ms bounds", () => {
    for (const ms of [80, 120, 150, 180, 250, 450, 500, 600]) {
      const sec = tickerDurationSeconds(ms);
      expect(sec).toBeGreaterThanOrEqual(14);
      expect(sec).toBeLessThanOrEqual(32);
    }
  });

  it("is monotonically increasing with motionDurationMs", () => {
    expect(tickerDurationSeconds(80)).toBeLessThan(tickerDurationSeconds(180));
    expect(tickerDurationSeconds(180)).toBeLessThan(tickerDurationSeconds(450));
  });
});
