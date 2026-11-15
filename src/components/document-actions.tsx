"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DocumentDeleteButton({ documentId, title }: { documentId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (busy || !window.confirm(`Delete “${title}” and remove all its indexed passages from the knowledge base? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Delete failed (${response.status})`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete document");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-col items-end gap-1">
    <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      {busy ? "Deleting…" : "Delete"}
    </button>
    {error && <span role="alert" className="max-w-xs text-right text-xs text-red-600">{error}</span>}
  </div>;
}
