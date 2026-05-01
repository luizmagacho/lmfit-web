import { describe, expect, it } from "vitest";
import { validateProductImageFile } from "./imageUpload";

describe("validateProductImageFile", () => {
  it("rejects wrong mime", () => {
    const f = new File([""], "x.gif", { type: "image/gif" });
    expect(validateProductImageFile(f)).toBe("Use apenas JPEG ou PNG.");
  });

  it("accepts jpeg", () => {
    const f = new File([new Uint8Array([1, 2])], "x.jpg", { type: "image/jpeg" });
    expect(validateProductImageFile(f, 1000)).toBeNull();
  });
});
