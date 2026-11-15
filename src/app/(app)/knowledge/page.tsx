import { requireStaff } from "@/lib/auth";
import BulkUpload from "@/components/bulk-upload";
import { ReindexDocuments } from "@/components/reindex-documents";
import { DocumentDeleteButton } from "@/components/document-actions";

export default async function Knowledge() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("document_chunks").select("id,content,law_name,article_number,paragraph_number,document_id,created_at,law_code").order("created_at", { ascending: false }).limit(50);
  const { data: documents } = await supabase.from("legal_documents").select("id,title,filename,status").order("created_at", { ascending: false }).limit(100);
  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-semibold">Knowledge base</h1>
    <p className="mt-2 text-sm text-slate-500">Upload your legal files in one go. Alex will index them for grounded answers.</p>
    <BulkUpload />
    <div className="mb-5"><ReindexDocuments documents={(documents ?? []).filter((doc) => doc.status === "processed").map((doc) => ({ id: doc.id, title: doc.title }))} /></div>
    <section className="card mb-7 overflow-hidden"><div className="border-b p-4 font-semibold">Knowledge documents</div>{documents?.length ? <div className="divide-y">{documents.map((doc) => <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="break-words text-sm font-medium">{doc.title}</div><div className="mt-1 text-xs text-slate-500">{doc.filename} · {doc.status}</div></div><DocumentDeleteButton documentId={doc.id} title={doc.title} /></div>)}</div> : <p className="p-6 text-sm text-slate-500">No documents uploaded yet.</p>}</section>
    <h2 className="mb-3 text-lg font-semibold">Indexed legal passages</h2>
    <div className="space-y-3">{data?.map((c) => <div key={c.id} className="card p-5"><div className="text-sm font-semibold">{c.law_code ?? c.law_name ?? "Legal provision"} · §{c.article_number ?? "—"} {c.paragraph_number ? `· Absatz ${c.paragraph_number}` : ""}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{c.content}</p><div className="mt-3 text-xs text-slate-400">Chunk {c.id} · Document {c.document_id}</div></div>)}</div>
    {!data?.length && <div className="card p-8 text-center text-sm text-slate-500">No indexed chunks available yet. Upload your legal documents above.</div>}
  </div>;
}
