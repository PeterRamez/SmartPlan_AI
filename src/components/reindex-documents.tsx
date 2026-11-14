"use client";
import { useState } from "react";
export function ReindexDocuments({documents}:{documents:Array<{id:string;title:string}>}) {
  const [busy,setBusy]=useState(false); const [progress,setProgress]=useState("");
  async function run(){if(busy||!documents.length)return;setBusy(true);let done=0;let failed=0;
    for(const document of documents){setProgress(`Re-indexing ${done+failed+1}/${documents.length}: ${document.title}`);
      try{const response=await fetch("/api/documents/reindex",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({documentId:document.id})});const result=await response.json();if(!response.ok)throw new Error(result.error??"Re-index failed");done++;}
      catch{failed++;}
    }
    setProgress(`Finished: ${done} re-indexed, ${failed} failed. Refresh the page to see updated metadata.`);setBusy(false);
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn btn-secondary" disabled={busy||!documents.length} onClick={run}>{busy?"Re-indexing…":"Re-index knowledge base"}</button>{progress&&<span className="text-xs text-slate-500">{progress}</span>}</div>;
}
