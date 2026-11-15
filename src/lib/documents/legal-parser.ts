export type LegalUnit = {
  lawName?: string;
  sectionName?: string;
  chapterName?: string;
  articleNumber?: string;
  paragraphNumber?: string;
  sentenceNumber?: string;
  pageNumber?: number;
  content: string;
  start: number;
};

// Match headings at the beginning of a line. Keeping this line-oriented avoids
// mistaking references such as "gemäß § 3" inside a sentence for new provisions.
const headingPattern = /^[ \t]*(§[ \t]*\d+[a-z]?|Artikel[ \t]+\d+[a-z]?|Art\.[ \t]*\d+|Absatz[ \t]+\d+|Abs\.[ \t]*\d+|Kapitel[ \t]+.+|Abschnitt[ \t]+.+)(?:[ \t]+.*)?$/gim;

export function parseGermanLegalStructure(text: string): LegalUnit[] {
  // Some PDF extractors place the next provision on the same line as the end
  // of the previous sentence/page footer. Split only at sentence boundaries,
  // avoiding ordinary inline references such as "gemäß § 3 BGB".
  const normalizedText = text
    .replace(/([.!?])\s+(§{1,2}\s*\d+[a-z]?\s+(?!BGB\b|GewO\b|HGB\b|StGB\b|ZPO\b|StPO\b|GG\b|Abs\.?\b|Satz\b|Nr\.?\b)[A-ZÄÖÜ])/gu, "$1\n$2")
    .replace(/(-\s*Seite\s+\d+\s+von\s+\d+\s*-[^\n]*)\s+(§{1,2}\s*\d+[a-z]?\s+[A-ZÄÖÜ])/giu, "$1\n$2");
  const pageMarkers = [...normalizedText.matchAll(/\[\[PAGE:(\d+)\]\]/g)].map((match) => ({
    offset: match.index ?? 0, page: Number(match[1]),
  }));
  const pageAt = (offset: number) => pageMarkers.filter((marker) => marker.offset <= offset).slice(-1)[0]?.page;
  const matches = [...normalizedText.matchAll(headingPattern)];
  if (!matches.length) {
    const content = normalizedText.replace(/\[\[PAGE:\d+\]\]/g, "").trim();
    return content ? [{ content, start: 0, pageNumber: pageMarkers[0]?.page }] : [];
  }

  const units: LegalUnit[] = [];
  let currentArticleNumber: string | undefined;
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? normalizedText.length) : normalizedText.length;
    const heading = (matches[i][1] ?? matches[i][0]).trim();
    const content = normalizedText.slice(start, end).replace(/\[\[PAGE:\d+\]\]/g, "").trim();
    const paragraph = heading.match(/^§\s*(\d+[a-z]?)/i);
    const article = heading.match(/^(?:Artikel|Art\.)\s*(\d+[a-z]?)/i);
    const Absatz = heading.match(/^(?:Absatz|Abs\.)\s*(\d+)/i);
    if (paragraph?.[1] || article?.[1]) currentArticleNumber = paragraph?.[1] ?? article?.[1];
    const chapter = heading.match(/^Kapitel\s+(.+)/i);
    const section = heading.match(/^Abschnitt\s+(.+)/i);
    if (content) {
      units.push({
        articleNumber: paragraph?.[1] ?? article?.[1] ?? (Absatz ? currentArticleNumber : undefined),
        paragraphNumber: Absatz?.[1],
        pageNumber: pageAt(start),
        chapterName: chapter?.[1],
        sectionName: section?.[1],
        content,
        start,
      });
    }
  }
  return units;
}
