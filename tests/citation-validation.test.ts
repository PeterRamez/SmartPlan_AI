import { describe, expect, it } from "vitest";
import { extractCitationNumbers, getInvalidCitationNumbers, validateCitationIds } from "../src/lib/rag/citation-validation";

describe("citation validation", () => {
  it("accepts valid source markers", () => {
    const answer = "The rule is described in [SOURCE 1] and [SOURCE 2].";
    expect(validateCitationIds(answer, ["a", "b"])).toBe(true);
    expect(extractCitationNumbers(answer)).toEqual([1, 2]);
  });

  it("rejects source markers outside the retrieved source list", () => {
    expect(validateCitationIds("See [SOURCE 3].", ["a", "b"])).toBe(false);
    expect(getInvalidCitationNumbers("See [SOURCE 3] and [SOURCE 0].", ["a", "b"])).toEqual([3, 0]);
  });

  it("allows an answer with no source marker at the parsing layer", () => {
    expect(validateCitationIds("Insufficient evidence.", ["a", "b"])).toBe(true);
  });
});
