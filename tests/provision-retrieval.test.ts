import { describe, expect, it } from "vitest";
import { extractProvisionReferences } from "../src/lib/rag/retrieve";

describe("statutory cross-reference extraction", () => {
  it("extracts single and plural German section references", () => {
    expect(extractProvisionReferences("Prüfe §§ 434, 437 und § 444 Abs. 1 BGB."))
      .toEqual(["434", "437", "444"]);
  });

  it("deduplicates references and preserves letter suffixes", () => {
    expect(extractProvisionReferences("§ 123, § 123 und § 123a BGB"))
      .toEqual(["123", "123a"]);
  });

  it("does not treat an Absatz number as a separate section", () => {
    expect(extractProvisionReferences("§ 123 Abs. 2 BGB")).toEqual(["123"]);
  });
});
