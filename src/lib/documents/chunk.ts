import { parseGermanLegalStructure } from "./legal-parser";
import { inferLawCode } from "../rag/legal-query";

export type LegalChunk = {
  content: string;
  chunkIndex: number;
  articleNumber?: string;
  paragraphNumber?: string;
  lawCode?: string;
  pageNumber?: number;
  metadata: Record<string, unknown>;
};

export function chunkLegalText(text: string, maxChars = 2200, filename = ""): LegalChunk[] {
  if (!Number.isInteger(maxChars) || maxChars < 100) {
    throw new Error("maxChars must be an integer of at least 100");
  }
  const units = parseGermanLegalStructure(text);
  const lawCode = inferLawCode(filename, text);
  const chunks: LegalChunk[] = [];

  const add = (content: string, unit: (typeof units)[number], metadata: Record<string, unknown> = {}) => {
    if (!content.trim()) return;
    chunks.push({
      content: content.trim(),
      chunkIndex: chunks.length,
      articleNumber: unit.articleNumber,
      paragraphNumber: unit.paragraphNumber,
      lawCode: lawCode ?? undefined,
      pageNumber: unit.pageNumber,
      metadata: {
        lawCode,
        pageNumber: unit.pageNumber ?? null,
        lawName: lawCode,
        sectionName: unit.sectionName,
        chapterName: unit.chapterName,
        provisionKind: unit.articleNumber ? "statutory_provision" : "document_text",
        ...metadata,
      },
    });
  };

  for (const unit of units) {
    if (unit.content.length <= maxChars) {
      add(unit.content, unit);
      continue;
    }

    // Keep paragraph boundaries whenever possible. Long individual paragraphs
    // are split into linked parts while retaining the same provision metadata.
    const paragraphs = unit.content.split(/\n\s*\n/);
    let current = "";
    const flush = () => {
      if (current) add(current, unit, { linkedLongProvision: true });
      current = "";
    };

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxChars) {
        flush();
        for (let offset = 0; offset < paragraph.length; offset += maxChars) {
          add(paragraph.slice(offset, offset + maxChars), unit, {
            linkedLongProvision: true,
            part: Math.floor(offset / maxChars) + 1,
            totalParts: Math.ceil(paragraph.length / maxChars),
          });
        }
        continue;
      }
      if (current && current.length + paragraph.length + 2 > maxChars) flush();
      current += (current ? "\n\n" : "") + paragraph;
    }
    flush();
  }
  return chunks;
}
