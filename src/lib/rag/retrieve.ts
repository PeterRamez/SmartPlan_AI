import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/ai/embeddings";

export type RetrievedSource = {
  id: string;
  document_id: string;
  content: string;
  law_name: string | null;
  article_number: string | null;
  paragraph_number: string | null;
  page_number: number | null;
  similarity: number;
  title?: string;
};

type ChunkRow = Omit<RetrievedSource, "similarity" | "title"> & {
  similarity?: number | null;
};

type DocumentTitleRow = {
  id: string;
  title: string | null;
  filename: string;
};

const MAX_PROVISION_EXPANSION = 12;

/**
 * Extract German statutory provision numbers from citations such as:
 * § 444, §§ 434, 437 and § 123 Abs. 1.
 * It intentionally does not expand numeric ranges because range semantics
 * vary across legal citation styles.
 */
export function extractProvisionReferences(text: string): string[] {
  const refs = new Set<string>();
  const pattern = /§{1,2}\s*((?:\d+[a-z]?)(?:\s*(?:,|und|and|sowie)\s*\d+[a-z]?)*)/gi;
  for (const match of text.matchAll(pattern)) {
    const numbers = match[1]?.match(/\d+[a-z]?/gi) ?? [];
    for (const number of numbers) refs.add(number.toLowerCase());
  }
  return [...refs];
}

function reciprocalRankFusion(
  semanticRows: ChunkRow[],
  keywordRows: ChunkRow[],
  exactRows: ChunkRow[],
  topK: number
): RetrievedSource[] {
  const scores = new Map<string, { row: ChunkRow; score: number }>();
  const addRanked = (rows: ChunkRow[], weight: number) => {
    rows.forEach((row, index) => {
      const score = weight / (60 + index + 1);
      const existing = scores.get(row.id);
      if (existing) existing.score += score;
      else scores.set(row.id, { row, score });
    });
  };

  // Reciprocal-rank fusion prevents incomparable semantic similarity and
  // full-text rank values from being treated as if they shared one scale.
  addRanked(semanticRows, 1);
  addRanked(keywordRows, 1);
  // Exact statutory provision matches are a strong signal, but not a claim
  // that the provision is legally applicable to the facts.
  addRanked(exactRows, 2);

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ row, score }) => ({
      id: row.id,
      document_id: row.document_id,
      content: row.content,
      law_name: row.law_name,
      article_number: row.article_number,
      paragraph_number: row.paragraph_number,
      page_number: row.page_number,
      similarity: score
    }));
}

export async function retrieveLegalContext(
  supabase: SupabaseClient,
  lawyerId: string,
  query: string,
  topK = 8
): Promise<RetrievedSource[]> {
  const safeTopK = Math.max(1, Math.min(Math.floor(topK) || 8, 20));
  const vector = await embedText(query);

  const { data: semantic, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: `[${vector.join(",")}]`,
    match_count: safeTopK * 3,
    filter_lawyer_id: lawyerId
  });

  if (error) throw new Error(`Vector retrieval failed: ${error.message}`);

  const { data: keyword, error: keywordError } = await supabase
    .from("document_chunks")
    .select("id,document_id,content,law_name,article_number,paragraph_number,page_number")
    .eq("lawyer_id", lawyerId)
    .textSearch("search_vector", query, { type: "plain" })
    .limit(safeTopK * 3);

  if (keywordError) throw new Error(`Keyword retrieval failed: ${keywordError.message}`);

  const semanticRows = (semantic ?? []) as ChunkRow[];
  const keywordRows = (keyword ?? []) as ChunkRow[];

  // Retrieve exact statutory provisions explicitly named by the user.
  const questionRefs = extractProvisionReferences(query);
  let explicitRows: ChunkRow[] = [];
  if (questionRefs.length) {
    const { data, error: exactError } = await supabase
      .from("document_chunks")
      .select("id,document_id,content,law_name,article_number,paragraph_number,page_number")
      .eq("lawyer_id", lawyerId)
      .in("article_number", questionRefs.slice(0, MAX_PROVISION_EXPANSION))
      .limit(safeTopK * 3);
    if (exactError) throw new Error(`Exact provision retrieval failed: ${exactError.message}`);
    explicitRows = (data ?? []) as ChunkRow[];
  }

  // Expand one hop of statutory cross-references from the best initial hits.
  // This helps retrieve provisions such as §§ 439, 440 and 441 referenced by § 437.
  const seedRows = [...semanticRows, ...keywordRows].slice(0, safeTopK * 2);
  const referenced = new Set<string>();
  for (const row of seedRows) {
    for (const ref of extractProvisionReferences(row.content)) referenced.add(ref);
  }
  for (const ref of questionRefs) referenced.delete(ref);
  const expansionRefs = [...referenced].slice(0, MAX_PROVISION_EXPANSION);

  let expandedRows: ChunkRow[] = [];
  if (expansionRefs.length) {
    const { data, error: expansionError } = await supabase
      .from("document_chunks")
      .select("id,document_id,content,law_name,article_number,paragraph_number,page_number")
      .eq("lawyer_id", lawyerId)
      .in("article_number", expansionRefs)
      .limit(safeTopK * 3);
    if (expansionError) throw new Error(`Cross-reference retrieval failed: ${expansionError.message}`);
    expandedRows = (data ?? []) as ChunkRow[];
  }

  const ranked = reciprocalRankFusion(
    semanticRows,
    keywordRows,
    [...explicitRows, ...expandedRows],
    safeTopK
  );
  if (!ranked.length) return [];

  const documentIds = [...new Set(ranked.map((row) => row.document_id))];
  const { data: docs, error: documentsError } = await supabase
    .from("legal_documents")
    .select("id,title,filename")
    .in("id", documentIds);

  if (documentsError) throw new Error(`Document title lookup failed: ${documentsError.message}`);

  const titles = new Map<string, string>();
  for (const document of (docs ?? []) as DocumentTitleRow[]) {
    titles.set(document.id, document.title || document.filename);
  }

  return ranked.map((row) => ({ ...row, title: titles.get(row.document_id) }));
}
