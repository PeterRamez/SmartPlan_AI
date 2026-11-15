"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ReindexDocuments({ documents }: { documents: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  async function run() {
    if (busy || !documents.length) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= documents.length) return;
        const document = documents[index];
        setProgress(`Re-indexing ${index + 1}/${documents.length}: ${document.title}`);
        try {
          const response = await fetch("/api/documents/reindex", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ documentId: document.id }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error ?? "Re-index failed");
          done++;
        } catch {
          failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, documents.length) }, worker));
    setProgress(`Finished: ${done} re-indexed, ${failed} failed.`);
    setBusy(false);
    router.refresh();
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-secondary" disabled={busy || !documents.length} onClick={run}>{busy ? <><Loader2 size={15} className="animate-spin" /> Re-indexing…</> : "Re-index knowledge base"}</button>{progress && <span aria-live="polite" className="text-xs text-slate-500">{progress}</span>}</div>;
}
