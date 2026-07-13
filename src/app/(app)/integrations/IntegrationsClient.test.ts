import { describe, expect, it } from "vitest";
import { buildConnectPayload, platformNeedsAppKeys, platformNeedsStoreId, type ConnectFormValues } from "./IntegrationsClient";

function values(overrides: Partial<ConnectFormValues> = {}): ConnectFormValues {
  return { apiToken: "", storeId: "", applicationKey: "", partnerKey: "", authCode: "", label: "", ...overrides };
}

describe("platformNeedsAppKeys", () => {
  it("is true for tiktok and shopee (OAuth app-key pair)", () => {
    expect(platformNeedsAppKeys("tiktok")).toBe(true);
    expect(platformNeedsAppKeys("shopee")).toBe(true);
  });

  it("is false for a single-token platform like bagy", () => {
    expect(platformNeedsAppKeys("bagy")).toBe(false);
  });
});

describe("platformNeedsStoreId", () => {
  it("is true for nuvemshop/mercadolivre/shopee", () => {
    expect(platformNeedsStoreId("nuvemshop")).toBe(true);
    expect(platformNeedsStoreId("mercadolivre")).toBe(true);
    expect(platformNeedsStoreId("shopee")).toBe(true);
  });

  it("is false for tiktok (uses shop_cipher from the OAuth exchange instead)", () => {
    expect(platformNeedsStoreId("tiktok")).toBe(false);
  });
});

describe("buildConnectPayload", () => {
  it("sends TikTok through its own OAuth-exchange endpoint with appKey/apiKey/authCode", () => {
    const { endpoint, body } = buildConnectPayload(
      "tiktok",
      values({ applicationKey: "app-1", partnerKey: "secret-1", authCode: "code-1", label: "Minha loja" }),
    );
    expect(endpoint).toBe("/integrations/tiktok/connect");
    expect(body).toEqual({ label: "Minha loja", applicationKey: "app-1", apiKey: "secret-1", authCode: "code-1" });
  });

  it("sends every other platform through the generic endpoint with a nested credentials object", () => {
    const { endpoint, body } = buildConnectPayload("nuvemshop", values({ apiToken: "tok-1", storeId: "123" }));
    expect(endpoint).toBe("/integrations");
    expect(body).toMatchObject({
      platform: "nuvemshop",
      credentials: { accessToken: "tok-1", storeId: "123" },
      syncStock: true,
    });
  });

  it("defaults the label to 'Loja <platform>' when none was typed", () => {
    const { body } = buildConnectPayload("bagy", values({ apiToken: "tok-1" }));
    expect(body.label).toBe("Loja bagy");
  });

  it("omits empty optional credential fields instead of sending empty strings", () => {
    const { body } = buildConnectPayload("bagy", values({ apiToken: "tok-1" }));
    const credentials = body.credentials as Record<string, unknown>;
    expect(credentials.storeId).toBeUndefined();
    expect(credentials.applicationKey).toBeUndefined();
  });
});
