import { describe, expect, it } from "vitest";
import { inferLawCode, parseLegalQuery } from "../src/lib/rag/legal-query";
import { chunkLegalText } from "../src/lib/documents/chunk";

describe("legal query parsing and statute metadata", () => {
  it("extracts the requested German statute and multiple provisions", () => {
    expect(parseLegalQuery("Was regeln §§ 434, 437 und 439 BGB?" )).toMatchObject({
      lawCode: "BGB", provisionNumbers: ["434", "437", "439"], hasExplicitProvision: true,
    });
  });
  it("recognizes Arabic statute references when the code is explicit", () => {
    expect(parseLegalQuery("اشرح § 437 BGB باللغة العربية")).toMatchObject({ lawCode: "BGB", provisionNumbers: ["437"] });
  });
  it("prefers the source filename over incidental citations in the body", () => {
    expect(inferLawCode("GewO.pdf", "Dieser Text verweist auf das BGB." )).toBe("GewO");
  });
  it("stores law code in every chunk's metadata", () => {
    const chunks = chunkLegalText("§ 437 Rechte des Käufers\nDer Käufer kann...", 2200, "BGB.pdf") .map((c) => c.lawCode);
    expect(chunks).toEqual(["BGB"]);
  });
});
