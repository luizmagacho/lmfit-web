import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/customerHttp", () => ({
  customerHttp: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { useCustomerAuthStore } from "./useCustomerAuthStore";
import { getCustomerAccessToken, clearCustomerTokens } from "@/lib/customerTokenStorage";

describe("useCustomerAuthStore (Loop 7)", () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset();
    postMock.mockReset();
    useCustomerAuthStore.setState({
      user: null,
      loading: true,
      initialized: false,
      initializedForSlug: null,
    });
  });

  it("init() with no stored access token leaves the user logged out without calling the API", async () => {
    await useCustomerAuthStore.getState().init();
    expect(useCustomerAuthStore.getState().user).toBeNull();
    expect(useCustomerAuthStore.getState().loading).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("init() only runs once per tenant slug (mirrors useAuthStore's guard)", async () => {
    await useCustomerAuthStore.getState().init();
    await useCustomerAuthStore.getState().init();
    // No access token stored, so /me/profile is never hit — but the guard itself
    // (initialized/initializedForSlug) must still prevent duplicate work.
    expect(useCustomerAuthStore.getState().initialized).toBe(true);
  });

  it("verify() stores the session tokens and loads the full profile", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        accessToken: "acc-1",
        refreshToken: "ref-1",
        customer: { id: "c1", name: "Ana", email: "ana@x.com" },
      },
    });
    getMock.mockResolvedValueOnce({
      data: {
        id: "c1",
        name: "Ana",
        email: "ana@x.com",
        phone: null,
        loyaltyPoints: 40,
        storeCreditBalance: 12.5,
        redeemValuePerPoint: 0.01,
      },
    });

    await useCustomerAuthStore.getState().verify("raw-token");

    expect(postMock).toHaveBeenCalledWith("/public/customer-auth/verify", { token: "raw-token" });
    expect(getCustomerAccessToken()).toBe("acc-1");
    expect(useCustomerAuthStore.getState().user).toEqual({
      id: "c1",
      name: "Ana",
      email: "ana@x.com",
      phone: null,
      loyaltyPoints: 40,
      storeCreditBalance: 12.5,
      redeemValuePerPoint: 0.01,
    });
  });

  it("verify() flips loading to false even when the token is rejected (expired/invalid link)", async () => {
    postMock.mockRejectedValueOnce(new Error("401"));

    await expect(useCustomerAuthStore.getState().verify("bad-token")).rejects.toThrow();

    expect(useCustomerAuthStore.getState().user).toBeNull();
    expect(useCustomerAuthStore.getState().loading).toBe(false);
  });

  it("redeemPoints (Loop 9) posts the point count and refreshes the profile from the server", async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    getMock.mockResolvedValueOnce({
      data: {
        id: "c1",
        name: "Ana",
        email: "ana@x.com",
        phone: null,
        loyaltyPoints: 10,
        storeCreditBalance: 30.5,
        redeemValuePerPoint: 0.01,
      },
    });

    await useCustomerAuthStore.getState().redeemPoints(30);

    expect(postMock).toHaveBeenCalledWith("/me/loyalty/redeem", { points: 30 });
    expect(getMock).toHaveBeenCalledWith("/me/profile");
    expect(useCustomerAuthStore.getState().user).toEqual(
      expect.objectContaining({ loyaltyPoints: 10, storeCreditBalance: 30.5 }),
    );
  });

  it("logout() clears tokens and resets the store even if the API call fails", async () => {
    postMock.mockRejectedValueOnce(new Error("network"));
    useCustomerAuthStore.setState({
      user: { id: "c1", name: "Ana", email: null, phone: null, loyaltyPoints: 0, storeCreditBalance: 0, redeemValuePerPoint: 0.01 },
    });

    await useCustomerAuthStore.getState().logout();

    expect(useCustomerAuthStore.getState().user).toBeNull();
    expect(getCustomerAccessToken()).toBeNull();
  });

  it("requestMagicLink sends the current page origin as redirectBase", async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    await useCustomerAuthStore.getState().requestMagicLink("ana@x.com");
    expect(postMock).toHaveBeenCalledWith("/public/customer-auth/request-link", {
      email: "ana@x.com",
      redirectBase: window.location.origin,
    });
  });

  it("requestEmailChange (Loop 18) posts the new email + current page origin as redirectBase", async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    await useCustomerAuthStore.getState().requestEmailChange("novo@x.com");
    expect(postMock).toHaveBeenCalledWith("/me/email-change/request", {
      newEmail: "novo@x.com",
      redirectBase: window.location.origin,
    });
  });

  afterAll(() => {
    clearCustomerTokens();
  });
});
