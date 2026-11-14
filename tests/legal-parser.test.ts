import { describe,it,expect } from "vitest";
import { parseGermanLegalStructure } from "../src/lib/documents/legal-parser";
import { chunkLegalText } from "../src/lib/documents/chunk";
describe("German legal structure parser",()=>{
 it("recognizes synthetic paragraph headings",()=>{
  const units=parseGermanLegalStructure("§ 1 Testgesetz\nAbsatz 1 Dies ist ein synthetischer Testtext.\n§ 2 Weitere Regel\nText.");
  expect(units.length).toBe(3);expect(units[0].articleNumber).toBe("1");expect(units[1].paragraphNumber).toBe("1");
 });
 it("preserves provision identifiers across chunks",()=>{
  const chunks=chunkLegalText("§ 7 Synthetischer Titel\n"+("Dies ist ein synthetischer Rechtstext. ".repeat(200)),300);
  expect(chunks.length).toBeGreaterThan(1);expect(chunks.every(c=>c.articleNumber==="7")).toBe(true);
 });
});
