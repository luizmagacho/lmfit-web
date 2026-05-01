import { describe, expect, it } from "vitest";
import {
  parseImageGalleryJson,
  resolvePrimaryImageUrl,
  resolveProductImageUrls,
} from "./productImageUrl";

describe("resolveProductImageUrls", () => {
  it("usa array images", () => {
    expect(
      resolveProductImageUrls({
        images: ["https://a/x.jpg", "https://b/y.png"],
      }),
    ).toEqual(["https://a/x.jpg", "https://b/y.png"]);
  });

  it("aceita objetos { url }", () => {
    expect(resolveProductImageUrls({ images: [{ url: "https://z/1.jpg" }] })).toEqual(["https://z/1.jpg"]);
  });

  it("sem images usa primaryImageUrl", () => {
    expect(resolveProductImageUrls({ primaryImageUrl: "https://p/only.jpg" })).toEqual(["https://p/only.jpg"]);
  });

  it("deduplica", () => {
    expect(
      resolveProductImageUrls({
        images: ["https://a/same.jpg"],
        primaryImageUrl: "https://a/same.jpg",
      }),
    ).toEqual(["https://a/same.jpg"]);
  });
});

describe("resolvePrimaryImageUrl", () => {
  it("retorna primeira da galeria", () => {
    expect(resolvePrimaryImageUrl({ images: ["https://a/1.jpg", "https://b/2.jpg"] })).toBe("https://a/1.jpg");
  });
});

describe("parseImageGalleryJson", () => {
  it("parseia array JSON", () => {
    expect(parseImageGalleryJson('["a","b"]')).toEqual(["a", "b"]);
  });

  it("inválido retorna vazio", () => {
    expect(parseImageGalleryJson("not-json")).toEqual([]);
  });
});
