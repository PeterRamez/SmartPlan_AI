export type LegalQuery = {
  normalizedQuery: string;
  lawCode: string | null;
  provisionNumbers: string[];
  hasExplicitProvision: boolean;
  /** Inferred only from a high-confidence legal topic; never presented as user input. */
  topicLawCode: string | null;
  /** Candidate provisions to retrieve for the detected topic, not legal conclusions. */
  relatedProvisionNumbers: string[];
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
  [/\bKSchG\b|kündigungsschutzgesetz/iu, "KSchG"],
  [/\bTzBfG\b|teilzeit- und befristungsgesetz/iu, "TzBfG"],
  [/\bArbZG\b|arbeitszeitgesetz/iu, "ArbZG"],
  [/\bArbGG\b|arbeitsgerichtsgesetz/iu, "ArbGG"],
  [/\bBetrVG\b|betriebsverfassungsgesetz/iu, "BetrVG"],
  [/\bAGG\b|allgemeines gleichbehandlungsgesetz/iu, "AGG"],
  [/\bBUrlG\b|bundesurlaubsgesetz/iu, "BUrlG"],
  [/\bEFZG\b|entgeltfortzahlungsgesetz/iu, "EFZG"],
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
  const normalizedQuery = query.normalize("NFKC").replace(/\s+/g, " ").trim();
  const saleDefect = /defect|faulty|purchase|buyer|seller|sale contract|mangel|käufer|verkäufer|rücktritt|sachmangel|kaufvertrag|عيب|معيب|مشتري|بائع|فسخ|عقد بيع|سيارة/iu.test(normalizedQuery);
  const employmentDismissal = /kündigung|dismiss|termination|employee|employer|employment|arbeitsrecht|arbeitnehmer|arbeitgeber|فصل|موظف|الموظف|العمل|إنهاء الخدمة|إنهاء عقد العمل/iu.test(normalizedQuery);
  const topicLawCode = lawCode ? null : saleDefect ? "BGB" : employmentDismissal ? "KSchG" : null;
  const relatedProvisionNumbers = saleDefect
    ? ["437", "434", "439", "440", "323", "441", "346", "349", "442", "444"]
    : employmentDismissal ? ["1", "4", "7", "23"] : [];
  return {
    normalizedQuery,
    lawCode,
    provisionNumbers: [...provisionNumbers],
    hasExplicitProvision: provisionNumbers.size > 0,
    topicLawCode,
    relatedProvisionNumbers,
  };
}

export function inferLawCode(filename: string, text = ""): string | null {
  // A clear source filename is more authoritative than incidental citations
  // inside the document body (e.g. GewO text referring to the BGB).
  for (const [pattern, code] of LAW_ALIASES) if (pattern.test(filename)) return code;
  for (const [pattern, code] of LAW_ALIASES) if (pattern.test(text.slice(0, 6000))) return code;
  return null;
}


/** German statutory vocabulary supplements multilingual embeddings when users ask
 * in Arabic/English/French/Spanish but the indexed legislation is German. */
const GERMAN_LEGAL_TERMS: Record<string, string[]> = {
  KSchG: ["Kündigungsschutz", "Arbeitsverhältnis", "Arbeitnehmer", "Arbeitgeber", "sozial ungerechtfertigt", "personenbedingt", "verhaltensbedingt", "betriebsbedingt", "Wartezeit", "Betriebsgröße"],
  TzBfG: ["Teilzeit", "Befristung", "Arbeitsvertrag", "Arbeitsverhältnis", "sachlicher Grund", "Entfristung"],
  ArbZG: ["Arbeitszeit", "Ruhezeit", "Überstunden", "Arbeitnehmer", "Höchstarbeitszeit", "Pausen"],
  BGB: ["Bürgerliches Gesetzbuch", "Anspruch", "Vertrag", "Pflichtverletzung", "Schadensersatz", "Rücktritt", "Kaufvertrag", "Sachmangel"],
  HGB: ["Handelsgeschäft", "Kaufmann", "Handelsvertreter", "Handelsgesellschaft"],
  StGB: ["Straftat", "Vorsatz", "Tatbestand", "Rechtswidrigkeit", "Schuld", "Strafbarkeit"],
  GewO: ["Gewerbe", "Gewerbetreibender", "Erlaubnis", "Gewerbeordnung"],
  ZPO: ["Zivilprozess", "Klage", "Beweislast", "Urteil", "Zuständigkeit"],
  StPO: ["Strafverfahren", "Ermittlungsverfahren", "Beschuldigter", "Beweis", "Durchsuchung"],
  GG: ["Grundrecht", "Menschenwürde", "Gleichheit", "Verhältnismäßigkeit", "Grundgesetz"],
  AGG: ["Benachteiligung", "Diskriminierung", "Belästigung", "Entschädigung", "Gleichbehandlung"],
  BetrVG: ["Betriebsrat", "Mitbestimmung", "Anhörung", "Betriebsvereinbarung"],
  BUrlG: ["Urlaub", "Urlaubsanspruch", "Erholungsurlaub", "Urlaubsabgeltung"],
  EFZG: ["Entgeltfortzahlung", "Arbeitsunfähigkeit", "Krankheit", "Lohnfortzahlung"],
};

const LEGAL_TOPIC_TERMS: Array<{ pattern: RegExp; terms: string[] }> = [
  { pattern: /kündigung|dismiss|termination|employee|employer|employment|arbeitsrecht|arbeitnehmer|arbeitgeber|فصل|موظف|الموظف|العمل|إنهاء الخدمة|إنهاء عقد العمل/iu,
    terms: ["Kündigung", "Kündigungsschutz", "Kündigungsfrist", "ordentliche Kündigung", "außerordentliche Kündigung", "Arbeitsverhältnis", "Arbeitnehmer", "Arbeitgeber", "sozial ungerechtfertigt", "Schriftform", "Anhörung Betriebsrat"] },
  { pattern: /defect|faulty|purchase|buyer|seller|sale contract|mangel|käufer|verkäufer|rücktritt|عيب|معيب|مشتري|بائع|فسخ|عقد بيع/iu,
    terms: ["Sachmangel", "Kaufvertrag", "Käufer", "Verkäufer", "Nacherfüllung", "Rücktritt", "Minderung", "Gefahrübergang", "Fristsetzung"] },
  { pattern: /theft|steal|larceny|diebstahl|unterschlagung|سرقة|اختلاس/iu,
    terms: ["Diebstahl", "Wegnahme", "fremde bewegliche Sache", "Zueignungsabsicht", "Unterschlagung"] },
  { pattern: /fraud|betrug|احتيال|نصب/iu,
    terms: ["Betrug", "Täuschung", "Irrtum", "Vermögensverfügung", "Vermögensschaden", "Bereicherungsabsicht"] },
  { pattern: /rent|lease|miete|mietvertrag|إيجار|مؤجر|مستأجر/iu,
    terms: ["Mietvertrag", "Mietsache", "Mietmangel", "Mietminderung", "Kündigung Mietverhältnis", "Kaution"] },
  { pattern: /divorce|marriage|scheidung|ehe|طلاق|زواج/iu,
    terms: ["Scheidung", "Ehe", "Ehegatten", "Versorgungsausgleich", "Zugewinnausgleich", "Unterhalt"] },
  { pattern: /inherit|erbe|erbschaft|وصية|ميراث|تركة/iu,
    terms: ["Erbrecht", "Erbschaft", "Testament", "Erbe", "Pflichtteil", "Nachlass"] },
];

export function buildLegalSearchQueries(query: string, lawCode: string | null): string[] {
  const normalized = query.normalize("NFKC").replace(/\s+/g, " ").trim();
  const statuteTerms = lawCode ? GERMAN_LEGAL_TERMS[lawCode] ?? [] : [];
  const topicTerms = LEGAL_TOPIC_TERMS.find(({ pattern }) => pattern.test(normalized))?.terms ?? [];
  const germanTerms = [...new Set([...statuteTerms, ...topicTerms])];
  // Preserve the user's wording as the primary query; the second query is a
  // compact German legal expansion for cross-language and colloquial questions.
  return [...new Set([normalized, ...(germanTerms.length ? [germanTerms.join(" OR ")] : [])])];
}
