"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";

type UploadItem = { name: string; status: "queued" | "uploading" | "processed" | "needs_ocr" | "failed"; message?: string };

export default function BulkUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);

  function openPicker(folder = false) {
    if (!inputRef.current || busy) return;
    if (folder) inputRef.current.setAttribute("webkitdirectory", "");
    else inputRef.current.removeAttribute("webkitdirectory");
    inputRef.current.click();
  }

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    const selected = Array.from(files);
    setItems(selected.map((file) => ({ name: file.name, status: "queued" })));
    setBusy(true);

    for (const [index, file] of selected.entries()) {
      setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: "uploading", message: "Uploading and indexing…" } : item));
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/documents/upload", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Upload failed");
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? {
          ...item,
          status: result.status === "needs_ocr" ? "needs_ocr" : "processed",
          message: result.status === "needs_ocr" ? "Uploaded; this file needs OCR before it can be searched." : `Indexed ${result.chunks ?? 0} searchable sections.`
        } : item));
      } catch (error) {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: "failed", message: error instanceof Error ? error.message : "Upload failed" } : item));
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const completed = items.filter((item) => item.status === "processed").length;
  return (
    <section className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Add legal documents</h2>
          <p className="mt-1 text-sm text-slate-500">Choose an entire folder or select multiple PDF, DOCX, or TXT files. They will be uploaded and indexed one by one.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openPicker(true)}>Choose entire folder</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => openPicker(false)}>{busy ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}{busy ? "Processing files…" : "Choose files"}</button></div>
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(event) => void upload(event.target.files)} />
      </div>
      {items.length > 0 && <div className="mt-5 space-y-2">
        <div className="mb-3 flex justify-between text-xs text-slate-500"><span>{completed} of {items.length} indexed</span><span>{busy ? "Please keep this page open" : "Finished"}</span></div>
        {items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <div className="mt-0.5">{item.status === "processed" ? <CheckCircle2 className="text-green-600" size={17} /> : item.status === "failed" ? <XCircle className="text-red-600" size={17} /> : item.status === "uploading" ? <Loader2 className="animate-spin text-blue-600" size={17} /> : <FileUp className="text-slate-400" size={17} />}</div>
          <div className="min-w-0 flex-1"><div className="break-all font-medium">{item.name}</div>{item.message && <div className="mt-1 text-xs text-slate-500">{item.message}</div>}</div>
          <span className="shrink-0 text-xs capitalize text-slate-500">{item.status.replace("_", " ")}</span>
        </div>)}
      </div>}
      <p className="mt-4 text-xs text-slate-400">Current limit: 20 MB per file. Supported formats: PDF, DOCX, TXT. Keep this page open until processing finishes.</p>
    </section>
  );
}
