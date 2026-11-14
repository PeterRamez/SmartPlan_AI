export type LegalUnit = {
  lawName?: string;
  sectionName?: string;
  chapterName?: string;
  articleNumber?: string;
  paragraphNumber?: string;
  sentenceNumber?: string;
  content: string;
  start: number;
};

// Match headings at the beginning of a line. Keeping this line-oriented avoids
// mistaking references such as "gemäß § 3" inside a sentence for new provisions.
const headingPattern = /^[ \t]*(§[ \t]*\d+[a-z]?|Artikel[ \t]+\d+[a-z]?|Art\.[ \t]*\d+|Absatz[ \t]+\d+|Abs\.[ \t]*\d+|Kapitel[ \t]+.+|Abschnitt[ \t]+.+)(?:[ \t]+.*)?$/gim;

export function parseGermanLegalStructure(text: string): LegalUnit[] {
  const matches = [...text.matchAll(headingPattern)];
  if (!matches.length) {
    const content = text.trim();
    return content ? [{ content, start: 0 }] : [];
  }

  const units: LegalUnit[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const heading = (matches[i][1] ?? matches[i][0]).trim();
    const content = text.slice(start, end).trim();
    const paragraph = heading.match(/^§\s*(\d+[a-z]?)/i);
    const article = heading.match(/^(?:Artikel|Art\.)\s*(\d+[a-z]?)/i);
    const Absatz = heading.match(/^(?:Absatz|Abs\.)\s*(\d+)/i);
    const chapter = heading.match(/^Kapitel\s+(.+)/i);
    const section = heading.match(/^Abschnitt\s+(.+)/i);
    if (content) {
      units.push({
        articleNumber: paragraph?.[1] ?? article?.[1],
        paragraphNumber: Absatz?.[1],
        chapterName: chapter?.[1],
        sectionName: section?.[1],
        content,
        start,
      });
    }
  }
  return units;
}
