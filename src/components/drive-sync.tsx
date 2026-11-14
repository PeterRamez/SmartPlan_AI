"use client";
import { useEffect, useState } from "react";
export default function DriveSync() {
  const [folder, setFolder] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  async function checkConnection() {
    try {
      const r = await fetch("/api/drive/connect", { cache: "no-store" });
      const d = await r.json();
      setConnected(Boolean(r.ok && d.connected));
    } catch { setConnected(false); }
    finally { setChecking(false); }
  }
  useEffect(() => { checkConnection(); }, []);
  async function sync() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/drive/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderId: folder || undefined }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(`Sync job created. Discovered ${d.discovered} files. Run batch processing to continue.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Sync failed"); }
    finally { setBusy(false); }
  }
  async function process() {
    setBusy(true);
    try {
      const r = await fetch("/api/ingestion/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ batchSize: 3 }) });
      const d = await r.json();
      setMessage(r.ok ? `Batch finished. Processed ${d.processed}, failed ${d.failed}, remaining ${d.remaining}. Run again to resume.` : d.error);
    } catch (e) { setMessage(String(e)); }
    finally { setBusy(false); }
  }
  return <div className="card p-5">
    <h2 className="font-semibold">Google Drive ingestion</h2>
    <p className="mt-1 text-sm text-slate-500">Connect your personal Google account securely, then choose the folder containing your legal documents.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {checking ? "Checking connection…" : connected ? "Google Drive connected" : "Not connected"}
      </span>
      {!connected && <a href="/api/drive/oauth/start" className="btn btn-primary">Connect Google Drive</a>}
      {connected && <button type="button" onClick={() => { window.location.href = "/api/drive/oauth/start"; }} className="btn btn-secondary">Reconnect Google</button>}
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <input className="field min-w-0 flex-1" placeholder="Google Drive folder ID" value={folder} onChange={e => setFolder(e.target.value)} />
      <button disabled={busy || !connected} onClick={sync} className="btn btn-primary">Start sync</button>
      <button disabled={busy} onClick={process} className="btn btn-secondary">Process next batch</button>
    </div>
    {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
  </div>;
}
