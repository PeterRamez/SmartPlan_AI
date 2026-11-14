import { describe, expect, it } from "vitest";
import { validateCitationIds } from "../src/lib/rag/citation-validation";

describe("citation validation", () => {
  it("accepts valid source markers", () => {
    expect(validateCitationIds("The rule is described in [SOURCE 1] and [SOURCE 2].", ["a", "b"])).toBe(true);
  });

  it("rejects source markers outside the retrieved source list", () => {
    expect(validateCitationIds("See [SOURCE 3].", ["a", "b"])).toBe(false);
  });

  it("does not require a citation when the answer contains no source marker", () => {
    expect(validateCitationIds("Insufficient evidence.", ["a", "b"])).toBe(true);
  });
});
