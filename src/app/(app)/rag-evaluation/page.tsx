import { requireStaff } from "@/lib/auth";
import { RAGEvaluationPanel } from "@/components/rag-evaluation-panel";

export default async function RAGEvaluationPage() {
  const { supabase, profile } = await requireStaff();
  const [documents, chunks, laws, runs] = await Promise.all([
    supabase.from("legal_documents").select("id", { count: "exact", head: true }).eq("status", "processed"),
    supabase.from("document_chunks").select("id", { count: "exact", head: true }),
    supabase.from("document_chunks").select("law_code").eq("lawyer_id", profile.lawyer_id).not("law_code", "is", null),
    supabase.from("rag_evaluation_runs").select("id,query,expected_law_code,expected_article_number,exact_match,retrieved,created_at").eq("lawyer_id", profile.lawyer_id).order("created_at", { ascending: false }).limit(20),
  ]);
  const lawRows = (laws.data ?? []) as Array<{ law_code: string | null }>;
  const lawCodes: string[] = [...new Set(lawRows.map((row) => row.law_code).filter((value): value is string => Boolean(value)))];
  return <div className="mx-auto max-w-6xl"><div className="mb-7"><p className="text-sm text-slate-500">Retrieval quality and regression checks</p><h1 className="mt-1 text-3xl font-semibold">RAG Evaluation</h1><p className="mt-2 text-sm text-slate-500">Run statute-specific tests and inspect the exact source metadata returned by retrieval.</p></div><RAGEvaluationPanel initial={{processedDocuments:documents.count??0,indexedChunks:chunks.count??0,lawCodes,runs:runs.data??[]}} /></div>;
}
