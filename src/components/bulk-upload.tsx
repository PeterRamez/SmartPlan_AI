"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, CheckCircle2, XCircle, FileWarning } from "lucide-react";

type UploadStatus = "queued" | "uploading" | "processed" | "needs_ocr" | "failed" | "skipped";
type UploadItem = { name: string; status: UploadStatus; message?: string };

const supportedExtensions = new Set(["pdf", "docx", "txt"]);
function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    const preview = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    throw new Error(
      `السيرفر رجّع رد غير صالح بدل JSON (HTTP ${response.status}). ${preview || "قد تكون هناك مشكلة في النشر أو إعدادات السيرفر."}`
    );
  }
  if (typeof payload !== "object" || payload === null) {
    throw new Error(`رد السيرفر غير متوقع (HTTP ${response.status}).`);
  }
  return payload as Record<string, unknown>;
}

export default function BulkUpload() {
  const router = useRouter();
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
    const supported = selected
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => supportedExtensions.has(extensionOf(file.name)));

    setItems(selected.map((file) => {
      const ext = extensionOf(file.name);
      return supportedExtensions.has(ext)
        ? { name: file.name, status: "queued" as const }
        : { name: file.name, status: "skipped" as const, message: `تم تخطي الملف .${ext || "unknown"}؛ الصيغ المدعومة PDF وDOCX وTXT فقط.` };
    }));

    if (supported.length === 0) {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const next = cursor++;
        if (next >= supported.length) return;
        const { file, index } = supported[next];
        setItems((current) => current.map((item, itemIndex) => itemIndex === index
          ? { ...item, status: "uploading", message: "Uploading and indexing…" }
          : item));
        try {
          const body = new FormData();
          body.append("file", file);
          const response = await fetch("/api/documents/upload", { method: "POST", body });
          const result = await readApiResponse(response);
          if (!response.ok) {
            throw new Error(typeof result.error === "string" ? result.error : `Upload failed (HTTP ${response.status})`);
          }
          const needsOcr = result.status === "needs_ocr";
          setItems((current) => current.map((item, itemIndex) => itemIndex === index ? {
            ...item,
            status: needsOcr ? "needs_ocr" : "processed",
            message: needsOcr
              ? "Uploaded; this file needs OCR before it can be searched."
              : `Indexed ${typeof result.chunks === "number" ? result.chunks : 0} searchable sections.`,
          } : item));
        } catch (error) {
          setItems((current) => current.map((item, itemIndex) => itemIndex === index
            ? { ...item, status: "failed", message: error instanceof Error ? error.message : "Upload failed" }
            : item));
        }
      }
    };
    // A few files are uploaded simultaneously; the server also embeds chunks concurrently.
    await Promise.all(Array.from({ length: Math.min(3, supported.length) }, worker));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const completed = items.filter((item) => item.status === "processed").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const skipped = items.filter((item) => item.status === "skipped").length;

  return (
    <section className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Add legal documents</h2>
          <p className="mt-1 text-sm text-slate-500">Choose an entire folder or select multiple PDF, DOCX, or TXT files. Supported files are uploaded in parallel batches and indexed as they arrive; other file types are skipped.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openPicker(true)}>Choose entire folder</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => openPicker(false)}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
            {busy ? "Processing files…" : "Choose files"}
          </button>
        </div>
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(event) => void upload(event.target.files)} />
      </div>
      {items.length > 0 && <div className="mt-5 space-y-2">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>{completed} indexed · {failed} failed · {skipped} skipped · {items.length} total</span>
          <span>{busy ? "Please keep this page open" : "Finished"}</span>
        </div>
        {items.map((item, index) => <div key={`${item.name}-${index}`} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <div className="mt-0.5">
            {item.status === "processed" ? <CheckCircle2 className="text-green-600" size={17} />
              : item.status === "failed" ? <XCircle className="text-red-600" size={17} />
              : item.status === "skipped" ? <FileWarning className="text-amber-600" size={17} />
              : item.status === "uploading" ? <Loader2 className="animate-spin text-blue-600" size={17} />
              : <FileUp className="text-slate-400" size={17} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="break-all font-medium">{item.name}</div>
            {item.message && <div className="mt-1 break-words text-xs text-slate-500">{item.message}</div>}
          </div>
          <span className="shrink-0 text-xs capitalize text-slate-500">{item.status.replace("_", " ")}</span>
        </div>)}
      </div>}
      <p className="mt-4 text-xs text-slate-400">Current limit: 20 MB per file. Supported formats: PDF, DOCX, TXT. Up to 3 files are uploaded at once; each file generates embeddings in parallel batches. Keep this page open until processing finishes.</p>
    </section>
  );
}
