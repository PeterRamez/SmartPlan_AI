import { describe, expect, it } from "vitest";
import { buildLegalSearchQueries, inferLawCode, parseLegalQuery } from "../src/lib/rag/legal-query";
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
  it("recognizes KSchG in multilingual employment questions", () => {
    expect(parseLegalQuery("هل فصل الموظف قانوني وفقاً لـ KSchG؟")).toMatchObject({ lawCode: "KSchG" });
  });
  it("adds German legal vocabulary for cross-language keyword retrieval", () => {
    const queries = buildLegalSearchQueries("هل فصل الموظف قانوني؟ KSchG", "KSchG");
    expect(queries).toHaveLength(2);
    expect(queries[1]).toContain("Kündigungsschutz");
    expect(queries[1]).toContain("Arbeitsverhältnis");
  });
  it("maps Arabic employment questions to German legal search terms", () => {
    const queries = buildLegalSearchQueries("هل فصل الموظف بعد خمس سنوات قانوني؟", null);
    expect(queries[1]).toContain("Kündigungsschutz");
    expect(queries[1]).toContain("Arbeitnehmer");
  });
  it("expands Arabic employment termination questions with core German legal terms", () => {
    const expanded = buildLegalSearchQueries("هل يجوز لصاحب العمل فصل الموظف؟", null)[1];
    expect(expanded).toContain("Kündigung");
    expect(expanded).toContain("Kündigungsfrist");
    expect(expanded).toContain("Schriftform");
  });
  it("adds German terms for fraud and rental disputes", () => {
    expect(buildLegalSearchQueries("هل ارتكب الطرف نصباً؟", null)[1]).toContain("Täuschung");
    expect(buildLegalSearchQueries("Mietminderung wegen Schimmel", null)[1]).toContain("Mietvertrag");
  });
  it("prefers the source filename over incidental citations in the body", () => {
    expect(inferLawCode("GewO.pdf", "Dieser Text verweist auf das BGB." )).toBe("GewO");
  });
  it("stores law code in every chunk's metadata", () => {
    const chunks = chunkLegalText("§ 437 Rechte des Käufers\nDer Käufer kann...", 2200, "BGB.pdf") .map((c) => c.lawCode);
    expect(chunks).toEqual(["BGB"]);
  });
});

describe("topic-aware statutory retrieval targets", () => {
  it("routes an Arabic vehicle-defect question to BGB sale and rescission provisions", () => {
    expect(parseLegalQuery("اشتريت سيارة وظهر بها عيب بعد التسليم، هل أستطيع فسخ العقد؟")).toMatchObject({
      topicLawCode: "BGB",
      relatedProvisionNumbers: ["437", "434", "439", "440", "323", "441", "346", "349", "442", "444"],
      lawCode: null,
      hasExplicitProvision: false,
    });
  });

  it("maps a German buyer rescission question to BGB even without an explicit statute code", () => {
    expect(parseLegalQuery("Ein Käufer hat bei einem Sachmangel Rechte und möchte vom Kaufvertrag zurücktreten.")).toMatchObject({
      topicLawCode: "BGB",
      relatedProvisionNumbers: expect.arrayContaining(["437", "323", "440"]),
    });
  });

  it("does not override an explicitly named statute with topic inference", () => {
    expect(parseLegalQuery("Sachmangel nach BGB: Rücktritt?")).toMatchObject({
      lawCode: "BGB",
      topicLawCode: null,
    });
  });
});
