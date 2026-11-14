export type LegalQuery = {
  normalizedQuery: string;
  lawCode: string | null;
  provisionNumbers: string[];
  hasExplicitProvision: boolean;
};

const LAW_ALIASES: Array<[RegExp, string]> = [
  [/\bBGB\b|bürgerliches gesetzbuch|القانون المدني الألماني/iu, "BGB"],
  [/\bGewO\b|gewerbeordnung/iu, "GewO"],
  [/\bHGB\b|handelsgesetzbuch/iu, "HGB"],
  [/\bStGB\b|strafgesetzbuch/iu, "StGB"],
  [/\bZPO\b|zivilprozessordnung/iu, "ZPO"],
  [/\bStPO\b|strafprozessordnung/iu, "StPO"],
  [/\bGG\b|grundgesetz/iu, "GG"],
  [/\bVwGO\b|verwaltungsgerichtsordnung/iu, "VwGO"],
  [/\bSGB\s*([IVX]+)?\b/iu, "SGB"],
  [/\bAO\b|abgabenordnung/iu, "AO"],
  [/\bUStG\b|umsatzsteuergesetz/iu, "UStG"],
];

export function normalizeProvisionNumber(value: string): string {
  return value.trim().replace(/^§+\s*/, "").replace(/\s+/g, "").toLowerCase();
}

export function parseLegalQuery(query: string): LegalQuery {
  const lawCode = LAW_ALIASES.find(([pattern]) => pattern.test(query))?.[1] ?? null;
  const provisionNumbers = new Set<string>();
  const pluralPattern = /§{1,2}\s*((?:\d+[a-z]?)(?:\s*(?:,|und|and|sowie)\s*\d+[a-z]?)*)/giu;
  for (const match of query.matchAll(pluralPattern)) {
    for (const number of match[1]?.match(/\d+[a-z]?/giu) ?? []) provisionNumbers.add(normalizeProvisionNumber(number));
  }
  return {
    normalizedQuery: query.normalize("NFKC").replace(/\s+/g, " ").trim(),
    lawCode,
    provisionNumbers: [...provisionNumbers],
    hasExplicitProvision: provisionNumbers.size > 0,
  };
}

export function inferLawCode(filename: string, text = ""): string | null {
  // A clear source filename is more authoritative than incidental citations
  // inside the document body (e.g. GewO text referring to the BGB).
  for (const [pattern, code] of LAW_ALIASES) if (pattern.test(filename)) return code;
  for (const [pattern, code] of LAW_ALIASES) if (pattern.test(text.slice(0, 6000))) return code;
  return null;
}
