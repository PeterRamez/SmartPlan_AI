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

export async function retrieveLegalContext(
  supabase: SupabaseClient,
  lawyerId: string,
  query: string,
  topK = 8
): Promise<RetrievedSource[]> {
  const vector = await embedText(query);

  const { data: semantic, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: `[${vector.join(",")}]`,
    match_count: topK * 2,
    filter_lawyer_id: lawyerId
  });

  if (error) {
    throw new Error(`Vector retrieval failed: ${error.message}`);
  }

  const { data: keyword, error: keywordError } = await supabase
    .from("document_chunks")
    .select("id,document_id,content,law_name,article_number,paragraph_number,page_number")
    .eq("lawyer_id", lawyerId)
    .textSearch("search_vector", query, { type: "plain" })
    .limit(topK * 2);

  if (keywordError) {
    throw new Error(`Keyword retrieval failed: ${keywordError.message}`);
  }

  // Supabase's ungenerated RPC/table types are narrowed here to the columns
  // selected above and the return shape declared by match_document_chunks.
  const semanticRows = (semantic ?? []) as ChunkRow[];
  const keywordRows = (keyword ?? []) as ChunkRow[];
  const mergedRows: ChunkRow[] = [...semanticRows, ...keywordRows];

  const bestById = new Map<string, RetrievedSource>();

  for (const row of mergedRows) {
    const candidate: RetrievedSource = {
      id: row.id,
      document_id: row.document_id,
      content: row.content,
      law_name: row.law_name,
      article_number: row.article_number,
      paragraph_number: row.paragraph_number,
      page_number: row.page_number,
      similarity: Number(row.similarity ?? 0.35)
    };

    const previous = bestById.get(candidate.id);
    if (!previous || candidate.similarity > previous.similarity) {
      bestById.set(candidate.id, candidate);
    }
  }

  const ranked = [...bestById.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  if (ranked.length === 0) {
    return [];
  }

  const documentIds = [...new Set(ranked.map((row) => row.document_id))];
  const { data: docs, error: documentsError } = await supabase
    .from("legal_documents")
    .select("id,title,filename")
    .in("id", documentIds);

  if (documentsError) {
    throw new Error(`Document title lookup failed: ${documentsError.message}`);
  }

  const documentRows = (docs ?? []) as DocumentTitleRow[];
  const titles = new Map<string, string>();

  for (const document of documentRows) {
    titles.set(document.id, document.title || document.filename);
  }

  return ranked.map((row) => ({
    ...row,
    title: titles.get(row.document_id)
  }));
}
