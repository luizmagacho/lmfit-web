import { beforeEach, describe, expect, it } from "vitest";
import { useCheckoutStore } from "./useCheckoutStore";

describe("useCheckoutStore — draft/coupon continuity (Loop 6)", () => {
  beforeEach(() => {
    useCheckoutStore.getState().reset();
  });

  it("starts with no draft token and no coupon", () => {
    const s = useCheckoutStore.getState();
    expect(s.draftToken).toBeNull();
    expect(s.couponCode).toBe("");
    expect(s.discountTotal).toBe(0);
  });

  it("setDraftToken persists the same token for reuse by both the drawer and checkout", () => {
    useCheckoutStore.getState().setDraftToken("tok-123");
    expect(useCheckoutStore.getState().draftToken).toBe("tok-123");
  });

  it("setCoupon stores the code and server-computed discount together", () => {
    useCheckoutStore.getState().setCoupon("BEMVINDO10", 29.9);
    const s = useCheckoutStore.getState();
    expect(s.couponCode).toBe("BEMVINDO10");
    expect(s.discountTotal).toBe(29.9);
  });

  it("clearCoupon resets the code/discount but keeps the draft token", () => {
    useCheckoutStore.getState().setDraftToken("tok-123");
    useCheckoutStore.getState().setCoupon("BEMVINDO10", 29.9);
    useCheckoutStore.getState().clearCoupon();
    const s = useCheckoutStore.getState();
    expect(s.couponCode).toBe("");
    expect(s.discountTotal).toBe(0);
    expect(s.draftToken).toBe("tok-123");
  });

  it("reset() clears the draft token and coupon along with everything else", () => {
    useCheckoutStore.getState().setDraftToken("tok-123");
    useCheckoutStore.getState().setCoupon("BEMVINDO10", 29.9);
    useCheckoutStore.getState().setCustomer({ customerName: "Ana" });
    useCheckoutStore.getState().reset();
    const s = useCheckoutStore.getState();
    expect(s.draftToken).toBeNull();
    expect(s.couponCode).toBe("");
    expect(s.discountTotal).toBe(0);
    expect(s.customerName).toBe("");
  });

  it("updatePixStatus only updates status, leaving other pix fields intact", () => {
    useCheckoutStore.getState().setPix({
      paymentId: "p1",
      qrCode: "000",
      expiresAt: 123,
      status: "pending",
    });
    useCheckoutStore.getState().updatePixStatus("paid");
    expect(useCheckoutStore.getState().pix).toEqual({
      paymentId: "p1",
      qrCode: "000",
      expiresAt: 123,
      status: "paid",
    });
  });
});
