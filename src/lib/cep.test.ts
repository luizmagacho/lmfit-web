import { describe, expect, it } from "vitest";
import { isValidCep, maskCep, onlyCepDigits } from "./cep";

describe("cep helpers", () => {
  it("onlyCepDigits strips non-digits and caps 8", () => {
    expect(onlyCepDigits("01.234-567abc99")).toBe("01234567");
  });

  it("maskCep adds hyphen after 5 digits", () => {
    expect(maskCep("01234567")).toBe("01234-567");
    expect(maskCep("0123")).toBe("0123");
  });

  it("isValidCep requires 8 digits", () => {
    expect(isValidCep("01234-567")).toBe(true);
    expect(isValidCep("01234")).toBe(false);
  });
});
