import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenantSlug", () => ({
  getTenantSlug: () => "kivoni",
}));

import {
  clearCustomerTokens,
  getCustomerAccessToken,
  getCustomerRefreshToken,
  setCustomerTokens,
} from "./customerTokenStorage";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStorage";

describe("customerTokenStorage — namespace isolation from staff tokenStorage (Loop 7)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips access/refresh tokens", () => {
    setCustomerTokens("cust-access", "cust-refresh");
    expect(getCustomerAccessToken()).toBe("cust-access");
    expect(getCustomerRefreshToken()).toBe("cust-refresh");
  });

  it("clearCustomerTokens removes only the customer keys", () => {
    setCustomerTokens("cust-access", "cust-refresh");
    clearCustomerTokens();
    expect(getCustomerAccessToken()).toBeNull();
    expect(getCustomerRefreshToken()).toBeNull();
  });

  it("never uses the same localStorage keys as staff tokenStorage.ts — a customer session cannot leak into a staff session or vice versa", () => {
    setCustomerTokens("cust-access", "cust-refresh");
    setTokens("staff-access", "staff-refresh");

    expect(getCustomerAccessToken()).toBe("cust-access");
    expect(getAccessToken()).toBe("staff-access");

    clearTokens();
    // Clearing the STAFF tokens must not touch the customer session.
    expect(getCustomerAccessToken()).toBe("cust-access");

    clearCustomerTokens();
    // And clearing the CUSTOMER tokens must not touch a still-valid staff session.
    setTokens("staff-access-2", "staff-refresh-2");
    expect(getAccessToken()).toBe("staff-access-2");
  });
});
