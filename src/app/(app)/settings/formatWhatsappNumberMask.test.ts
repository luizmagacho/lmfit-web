import { describe, expect, it } from "vitest";
import { formatWhatsappNumberMask } from "./SettingsClient";

// Regression: a number already saved on the server (raw digits, e.g. "41992688390") rendered
// unmasked in the Settings field until the merchant typed something into it — the mask was only
// wired to the input's onChange, never applied to the hydrated value.
describe("formatWhatsappNumberMask", () => {
  it("formats a full 11-digit mobile number (DDD + 9-digit number)", () => {
    expect(formatWhatsappNumberMask("41992688390")).toBe("(41) 99268-8390");
  });

  it("formats an 8-digit legacy landline number", () => {
    expect(formatWhatsappNumberMask("1199999999")).toBe("(11) 9999-9999");
  });

  it("formats a value that already has punctuation the same as raw digits (idempotent)", () => {
    expect(formatWhatsappNumberMask("(41) 99268-8390")).toBe("(41) 99268-8390");
  });

  it("progressively formats partial input as the user types", () => {
    expect(formatWhatsappNumberMask("4")).toBe("(4");
    expect(formatWhatsappNumberMask("41")).toBe("(41");
    expect(formatWhatsappNumberMask("419")).toBe("(41) 9");
  });

  it("truncates input beyond 11 digits instead of overflowing the mask", () => {
    expect(formatWhatsappNumberMask("419926883901234")).toBe("(41) 99268-8390");
  });

  it("returns an empty string for empty input", () => {
    expect(formatWhatsappNumberMask("")).toBe("");
  });
});
