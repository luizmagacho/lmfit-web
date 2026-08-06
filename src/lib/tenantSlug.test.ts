import { describe, expect, it } from "vitest";
import { buildStorefrontUrl } from "./tenantSlug";

describe("buildStorefrontUrl (Loop 4c)", () => {
  it("builds a dev subdomain URL (with port) when hostname is *.localhost", () => {
    expect(buildStorefrontUrl("kivoni", "app.localhost", "3000")).toBe("http://kivoni.localhost:3000/loja");
  });

  it("builds a plain localhost URL without a port suffix when no port is given", () => {
    expect(buildStorefrontUrl("kivoni", "localhost", "")).toBe("http://kivoni.localhost/loja");
  });

  it("builds a production kivoni.com.br URL for any other hostname", () => {
    expect(buildStorefrontUrl("kivoni", "app.kivoni.com.br", "")).toBe("https://kivoni.kivoni.com.br/loja");
    expect(buildStorefrontUrl("kivoni", "kivoni.com.br", "")).toBe("https://kivoni.kivoni.com.br/loja");
  });

  it("uses the given slug, not a hardcoded tenant", () => {
    expect(buildStorefrontUrl("lmfit", "app.kivoni.com.br", "")).toBe("https://lmfit.kivoni.com.br/loja");
  });
});
