import { parseGermanLegalStructure } from "./legal-parser";

export type LegalChunk = {
  content: string;
  chunkIndex: number;
  articleNumber?: string;
  paragraphNumber?: string;
  metadata: Record<string, unknown>;
};

export function chunkLegalText(text: string, maxChars = 2200): LegalChunk[] {
  if (!Number.isInteger(maxChars) || maxChars < 100) {
    throw new Error("maxChars must be an integer of at least 100");
  }
  const units = parseGermanLegalStructure(text);
  const chunks: LegalChunk[] = [];

  const add = (content: string, unit: (typeof units)[number], metadata: Record<string, unknown> = {}) => {
    if (!content.trim()) return;
    chunks.push({
      content: content.trim(),
      chunkIndex: chunks.length,
      articleNumber: unit.articleNumber,
      paragraphNumber: unit.paragraphNumber,
      metadata: { sectionName: unit.sectionName, chapterName: unit.chapterName, ...metadata },
    });
  };

  for (const unit of units) {
    if (unit.content.length <= maxChars) {
      add(unit.content, unit);
      continue;
    }

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
