import { embedText } from "@/lib/ai/embeddings";
export type RetrievedSource = { id: string; document_id: string; content: string; law_name: string|null; article_number: string|null; paragraph_number: string|null; page_number: number|null; similarity: number; title?: string };
export async function retrieveLegalContext(supabase: any, lawyerId: string, query: string, topK = 8): Promise<RetrievedSource[]> {
  const vector = await embedText(query);
  const { data: semantic, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: `[${vector.join(",")}]`, match_count: topK * 2, filter_lawyer_id: lawyerId
  });
  if (error) throw new Error(`Vector retrieval failed: ${error.message}`);
  const { data: keyword, error: keywordError } = await supabase.from("document_chunks")
    .select("id,document_id,content,law_name,article_number,paragraph_number,page_number")
    .eq("lawyer_id", lawyerId).textSearch("search_vector", query, { type: "plain" }).limit(topK * 2);
  if (keywordError) throw new Error(`Keyword retrieval failed: ${keywordError.message}`);
  const map = new Map<string, any>();
  for (const row of [...(semantic ?? []), ...(keyword ?? [])]) {
    const prior = map.get(row.id);
    const score = Number(row.similarity ?? 0.35);
    if (!prior || score > prior.similarity) map.set(row.id, { ...row, similarity: score });
  }
  const ranked = [...map.values()].sort((a,b) => b.similarity-a.similarity).slice(0,topK);
  if (!ranked.length) return [];
  const docIds = [...new Set(ranked.map(r => r.document_id))];
  const { data: docs } = await supabase.from("legal_documents").select("id,title,filename").in("id",docIds);
  const titles = new Map((docs ?? []).map((d: any) => [d.id,d.title || d.filename]));
  return ranked.map(r => ({ ...r, title: titles.get(r.document_id) }));
}
