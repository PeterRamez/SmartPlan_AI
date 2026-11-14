import { describe,it,expect } from "vitest";
import { parseGermanLegalStructure } from "../src/lib/documents/legal-parser";
import { chunkLegalText } from "../src/lib/documents/chunk";
describe("German legal structure parser",()=>{
 it("recognizes synthetic paragraph headings",()=>{
  const units=parseGermanLegalStructure("§ 1 Testgesetz\nAbsatz 1 Dies ist ein synthetischer Testtext.\n§ 2 Weitere Regel\nText.");
  expect(units.length).toBe(3);expect(units[0].articleNumber).toBe("1");expect(units[1].paragraphNumber).toBe("1");
 });
 it("keeps paragraph sub-units linked to their parent provision",()=>{
  const units=parseGermanLegalStructure("§ 437 Rechte des Käufers\nAbsatz 1 Der Käufer kann...");
  expect(units[1].articleNumber).toBe("437");
  expect(units[1].paragraphNumber).toBe("1");
 });
 it("detects a new provision after a sentence on the same extracted PDF line",()=>{
  const units=parseGermanLegalStructure("Vorheriger Gesetzestext endet hier. § 437 Rechte des Käufers\nDer Käufer kann...");
  expect(units.some(unit=>unit.articleNumber==="437")).toBe(true);
 });
 it("retains extracted PDF page markers on legal chunks",()=>{
  const chunks=chunkLegalText("[[PAGE:5]]\n§ 437 Rechte des Käufers\nDer Käufer kann...",2200,"BGB.pdf");
  expect(chunks[0].pageNumber).toBe(5);
 });
 it("preserves provision identifiers across chunks",()=>{
  const chunks=chunkLegalText("§ 7 Synthetischer Titel\n"+("Dies ist ein synthetischer Rechtstext. ".repeat(200)),300);
  expect(chunks.length).toBeGreaterThan(1);expect(chunks.every(c=>c.articleNumber==="7")).toBe(true);
 });
});
