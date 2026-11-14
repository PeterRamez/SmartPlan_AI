import { requireStaff } from "@/lib/auth";
import BulkUpload from "@/components/bulk-upload";

export default async function Documents() {
  const { supabase } = await requireStaff();
  const { data: docs } = await supabase
    .from("legal_documents")
    .select("id,title,filename,status,source_type,updated_at,error_message")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-semibold">Documents</h1>
      <p className="mt-2 text-sm text-slate-500">Upload legal documents and manage your local files.</p>
      <div className="mt-6">
        <BulkUpload />
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="border-b p-5 font-semibold">Knowledge documents</div>
        {!docs?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">No documents uploaded yet. Choose a folder above to get started.</div>
        ) : (
          <div className="divide-y">
            {docs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{d.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{d.filename} · {d.source_type}</div>
                  {d.error_message && <div className="mt-1 text-xs text-red-600">{d.error_message}</div>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${d.status === "processed" ? "bg-green-50 text-green-700" : d.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
