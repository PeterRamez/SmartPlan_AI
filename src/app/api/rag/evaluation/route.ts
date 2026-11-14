import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { retrieveLegalContext } from "@/lib/rag/retrieve";

const regressionCases = [
  { query: "Was regelt § 437 BGB?", law: "BGB", article: "437" },
  { query: "Was regelt § 439 BGB zur Nacherfüllung?", law: "BGB", article: "439" },
  { query: "Was regelt § 34 GewO?", law: "GewO", article: "34" },
  { query: "Welche Rechte nennt § 442 BGB?", law: "BGB", article: "442" },
];

export async function GET() {
  try {
    const { supabase, profile } = await requireStaff();
    const [documents, chunks, lawCodes, runs] = await Promise.all([
      supabase.from("legal_documents").select("id", { count: "exact", head: true }).eq("status", "processed"),
      supabase.from("document_chunks").select("id", { count: "exact", head: true }),
      supabase.from("document_chunks").select("law_code").not("law_code", "is", null),
      supabase.from("rag_evaluation_runs").select("id,query,expected_law_code,expected_article_number,exact_match,retrieved,created_at").eq("lawyer_id", profile.lawyer_id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (documents.error) throw documents.error;
    if (chunks.error) throw chunks.error;
    if (lawCodes.error) throw lawCodes.error;
    if (runs.error) throw runs.error;
    const lawRows = (lawCodes.data ?? []) as Array<{ law_code: string | null }>;
    const uniqueLaws = [...new Set(lawRows.map((row) => row.law_code).filter((value): value is string => Boolean(value)))];
    return NextResponse.json({
      processedDocuments: documents.count ?? 0,
      indexedChunks: chunks.count ?? 0,
      lawCodes: uniqueLaws,
      runs: runs.data ?? [],
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST() {
  try {
    const { supabase, profile } = await requireStaff();
    const results = [];
    for (const testCase of regressionCases) {
      const sources = await retrieveLegalContext(supabase, profile.lawyer_id, testCase.query, 8);
      const exactMatch = sources.some((source) =>
        source.law_code === testCase.law && source.article_number === testCase.article
      );
      const retrieved = sources.map((source) => ({
        documentId: source.document_id, filename: source.filename ?? source.title ?? null,
        lawCode: source.law_code ?? null, articleNumber: source.article_number,
        pageNumber: source.page_number, chunkId: source.id,
      }));
      const { error } = await supabase.from("rag_evaluation_runs").insert({
        lawyer_id: profile.lawyer_id, query: testCase.query,
        expected_law_code: testCase.law, expected_article_number: testCase.article,
        retrieved, exact_match: exactMatch,
      });
      if (error) throw error;
      results.push({ query: testCase.query, expected: `${testCase.law} § ${testCase.article}`, exactMatch, retrieved });
    }
    return NextResponse.json({ results, passed: results.filter((item) => item.exactMatch).length, total: results.length });
  } catch (error) { return errorResponse(error); }
}
