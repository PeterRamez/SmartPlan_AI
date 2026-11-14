import { describe, expect, it } from "vitest";
import { buildLegalSystemPrompt } from "../src/lib/rag/answer";

describe("legal reasoning prompt", () => {
  it("requires fact separation and prohibits inferring fraudulent intent from a defect alone", () => {
    const prompt = buildLegalSystemPrompt("ar");
    expect(prompt).toContain("ESTABLISHED FACTS");
    expect(prompt).toContain("MISSING FACTS");
    expect(prompt).toContain("does NOT by itself prove");
    expect(prompt).toContain("§ 444 BGB");
  });

  it("requires disclosure when referenced legal provisions are missing", () => {
    const prompt = buildLegalSystemPrompt("de");
    expect(prompt).toContain("If a required provision is absent");
    expect(prompt).toContain("Missing Facts and Missing Sources");
  });
});
