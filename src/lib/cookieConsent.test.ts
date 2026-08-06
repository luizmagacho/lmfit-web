import { describe, expect, it, vi } from "vitest";
import { getConsentStatus, setConsentStatus } from "./cookieConsent";

describe("getConsentStatus (Loop 10, LGPD)", () => {
  it("returns null when no consent cookie is present", () => {
    expect(getConsentStatus("")).toBeNull();
  });

  it("returns 'accepted' when the cookie says so", () => {
    expect(getConsentStatus("kivoni-consent=accepted")).toBe("accepted");
  });

  it("returns 'declined' when the cookie says so", () => {
    expect(getConsentStatus("kivoni-consent=declined")).toBe("declined");
  });

  it("finds the cookie among other unrelated cookies", () => {
    expect(getConsentStatus("tenant-slug=kivoni; kivoni-consent=accepted; other=1")).toBe("accepted");
  });

  it("ignores an unrecognized value", () => {
    expect(getConsentStatus("kivoni-consent=maybe")).toBeNull();
  });
});

describe("setConsentStatus (Loop 10, LGPD)", () => {
  it("writes a cookie with a 1-year max-age", () => {
    let written = "";
    Object.defineProperty(document, "cookie", {
      set: (v: string) => {
        written = v;
      },
      get: () => written,
      configurable: true,
    });

    setConsentStatus("accepted");

    expect(written).toContain("kivoni-consent=accepted");
    expect(written).toContain("max-age=31536000");
    expect(written).toContain("path=/");
  });
});

describe("getConsentStatus + setConsentStatus round-trip", () => {
  it("reads back what was just written", () => {
    let written = "";
    Object.defineProperty(document, "cookie", {
      set: (v: string) => {
        written = v.split(";")[0];
      },
      get: () => written,
      configurable: true,
    });

    setConsentStatus("declined");
    expect(getConsentStatus(document.cookie)).toBe("declined");
  });
});
