import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/ai/embeddings";
import { buildLegalSearchQueries, parseLegalQuery } from "./legal-query";

export type RetrievedSource = {
  id: string;
  document_id: string;
  content: string;
  law_name: string | null;
  law_code?: string | null;
  article_number: string | null;
  paragraph_number: string | null;
  page_number: number | null;
  similarity: number;
  title?: string;
  filename?: string;
  metadata?: Record<string, unknown>;
};

type ChunkRow = Omit<RetrievedSource, "similarity" | "title" | "filename"> & {
  similarity?: number | null;
  metadata?: Record<string, unknown> | null;
};
type DocumentTitleRow = { id: string; title: string | null; filename: string; law_code?: string | null };
const MAX_PROVISION_EXPANSION = 12;

export function extractProvisionReferences(text: string): string[] {
  const refs = new Set<string>();
  const pattern = /§{1,2}\s*((?:\d+[a-z]?)(?:\s*(?:,|und|and|sowie|or)\s*\d+[a-z]?)*)/gi;
  for (const match of text.matchAll(pattern)) {
    for (const number of match[1]?.match(/\d+[a-z]?/gi) ?? []) refs.add(number.toLowerCase());
  }
  return [...refs];
}

function reciprocalRankFusion(
  semanticRows: ChunkRow[], keywordRows: ChunkRow[], exactRows: ChunkRow[], expandedRows: ChunkRow[], topK: number,
  lawCode: string | null, query: string
): RetrievedSource[] {
  const scores = new Map<string, { row: ChunkRow; score: number }>();
  const addRanked = (rows: ChunkRow[], weight: number) => rows.forEach((row, index) => {
    // A strict law-code match is preferred when the question names a statute.
    if (lawCode && row.law_code !== lawCode) return;
    const score = weight / (60 + index + 1);
    const existing = scores.get(row.id);
    if (existing) existing.score += score;
    else scores.set(row.id, { row, score });
  });
  addRanked(semanticRows, 1);
  addRanked(keywordRows, 1.15);
  addRanked(exactRows, 3);
  addRanked(expandedRows, 1.35);
  // Deterministic second-stage reranking rewards legal metadata matches and
  // query-term overlap without adding a second model call or provider cost.
  const stopWords = new Set(["the", "and", "for", "with", "from", "that", "this", "was", "were", "what", "when", "where", "which", "هل", "من", "في", "على", "ما", "هو", "هي", "عن", "الى", "إلى", "ذلك", "هذا", "هذه"]);
  const queryTokens = new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((token) => !stopWords.has(token)));
  const candidates = [...scores.values()].map(({ row, score }) => {
    const provisionMatch = row.article_number && exactRows.some((exact) => exact.id === row.id) ? 1 : 0;
    const lawMatch = lawCode && row.law_code === lawCode ? 1 : 0;
    const lexical = queryTokens.size ? [...queryTokens].filter((token) => row.content.toLowerCase().includes(token)).length / queryTokens.size : 0;
    return { row, score: score + provisionMatch * 0.02 + lawMatch * 0.01 + lexical * 0.005 };
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, topK).map(({ row, score }) => ({
    id: row.id, document_id: row.document_id, content: row.content,
    law_name: row.law_name, law_code: row.law_code ?? null,
    article_number: row.article_number, paragraph_number: row.paragraph_number,
    page_number: row.page_number, metadata: row.metadata ?? {}, similarity: score,
  }));
}

export async function retrieveLegalContext(
  supabase: SupabaseClient, lawyerId: string, query: string, topK = 8
): Promise<RetrievedSource[]> {
  const safeTopK = Math.max(1, Math.min(Math.floor(topK) || 8, 20));
  const parsed = parseLegalQuery(query);
  const selectFields = "id,document_id,content,law_name,law_code,article_number,paragraph_number,page_number,metadata";
  let semanticRows: ChunkRow[] = [];
  let semanticFailure: string | null = null;

  // Exact and keyword retrieval remain usable even if the embedding provider is
  // temporarily unavailable. This is especially important for explicit § lookups.
  try {
    const vector = await embedText(query);
    const semanticCall = parsed.lawCode
      ? supabase.rpc("match_document_chunks_by_law", {
          query_embedding: `[${vector.join(",")}]`, match_count: safeTopK * 4,
          filter_lawyer_id: lawyerId, filter_law_code: parsed.lawCode,
        })
      : supabase.rpc("match_document_chunks", {
          query_embedding: `[${vector.join(",")}]`, match_count: safeTopK * 4,
          filter_lawyer_id: lawyerId,
        });
    const { data, error } = await semanticCall;
    if (error) throw new Error(error.message);
    semanticRows = (data ?? []) as ChunkRow[];
  } catch (error) {
    semanticFailure = error instanceof Error ? error.message : "Unknown vector retrieval error";
  }

  const keywordRowsCollected: ChunkRow[] = [];
  // Run both the user's original query and a German legal-vocabulary query.
  // This is essential for Arabic/English questions against German statute files.
  for (const searchText of buildLegalSearchQueries(parsed.normalizedQuery, parsed.lawCode)) {
    let keywordQuery = supabase.from("document_chunks").select(selectFields).eq("lawyer_id", lawyerId);
    if (parsed.lawCode) keywordQuery = keywordQuery.eq("law_code", parsed.lawCode);
    const { data, error: keywordError } = await keywordQuery
      .textSearch("search_vector", searchText, { type: searchText === parsed.normalizedQuery ? "plain" : "websearch", config: "simple" })
      .limit(safeTopK * 4);
    if (keywordError) throw new Error(`Keyword retrieval failed: ${keywordError.message}`);
    keywordRowsCollected.push(...((data ?? []) as ChunkRow[]));
  }
  const keywordRows = [...new Map(keywordRowsCollected.map((row) => [row.id, row])).values()];

  let exactRows: ChunkRow[] = [];
  let expandedRows: ChunkRow[] = [];
  if (parsed.provisionNumbers.length) {
    let exactQuery = supabase.from("document_chunks").select(selectFields)
      .eq("lawyer_id", lawyerId).in("article_number", parsed.provisionNumbers.slice(0, MAX_PROVISION_EXPANSION));
    if (parsed.lawCode) exactQuery = exactQuery.eq("law_code", parsed.lawCode);
    const { data, error: exactError } = await exactQuery.limit(safeTopK * 5);
    if (exactError) throw new Error(`Exact provision retrieval failed: ${exactError.message}`);
    exactRows = (data ?? []) as ChunkRow[];
  }

  // Expand cross-references only inside the requested law. This prevents
  // unrelated GewO provisions from contaminating a BGB query.
  const seedRows = [...semanticRows, ...keywordRows, ...exactRows].slice(0, safeTopK * 3);
  // Expand statutory references only within the same statute as their source
  // chunk. This avoids pulling § numbers from unrelated Acts into the answer.
  const expansionPairs = new Map<string, Set<string>>();
  for (const row of seedRows) {
    if (!row.law_code) continue;
    const refs = extractProvisionReferences(row.content).filter((ref) => !parsed.provisionNumbers.includes(ref));
    if (!refs.length) continue;
    if (parsed.lawCode && row.law_code !== parsed.lawCode) continue;
    const bucket = expansionPairs.get(row.law_code) ?? new Set<string>();
    refs.forEach((ref) => bucket.add(ref));
    expansionPairs.set(row.law_code, bucket);
  }
  for (const [lawCode, refs] of expansionPairs) {
    const expansionRefs = [...refs].slice(0, MAX_PROVISION_EXPANSION);
    if (!expansionRefs.length) continue;
    const { data, error: expansionError } = await supabase.from("document_chunks").select(selectFields)
      .eq("lawyer_id", lawyerId).eq("law_code", lawCode).in("article_number", expansionRefs)
      .limit(safeTopK * 2);
    if (expansionError) throw new Error(`Cross-reference retrieval failed: ${expansionError.message}`);
    expandedRows.push(...((data ?? []) as ChunkRow[]));
  }
  expandedRows = [...new Map(expandedRows.map((row) => [row.id, row])).values()]
    .filter((row) => !exactRows.some((exact) => exact.id === row.id));

  const ranked = reciprocalRankFusion(
    semanticRows, keywordRows, exactRows, expandedRows, safeTopK, parsed.lawCode,
    [parsed.normalizedQuery, ...buildLegalSearchQueries(parsed.normalizedQuery, parsed.lawCode).slice(1)].join(" ")
  );
  if (!ranked.length) {
    if (semanticFailure) throw new Error(`Vector retrieval unavailable and no keyword/exact matches were found: ${semanticFailure}`);
    return [];
  }

  const documentIds = [...new Set(ranked.map((row) => row.document_id))];
  const { data: docs, error: documentsError } = await supabase.from("legal_documents")
    .select("id,title,filename,law_code").in("id", documentIds);
  if (documentsError) throw new Error(`Document title lookup failed: ${documentsError.message}`);
  const titles = new Map<string, DocumentTitleRow>();
  for (const document of (docs ?? []) as DocumentTitleRow[]) titles.set(document.id, document);
  return ranked.map((row) => {
    const doc = titles.get(row.document_id);
    return { ...row, title: doc?.title || doc?.filename || "Untitled", filename: doc?.filename,
      law_code: row.law_code ?? doc?.law_code ?? null };
  });
}
