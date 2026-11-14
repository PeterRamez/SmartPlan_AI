import Link from "next/link";
import { requireUser } from "@/lib/auth";
export default async function Dashboard(){
 const {supabase,profile}=await requireUser();
 const [docs,processed,pending,failed,convs]=await Promise.all([
  supabase.from("legal_documents").select("id",{count:"exact",head:true}),
  supabase.from("legal_documents").select("id",{count:"exact",head:true}).eq("status","processed"),
  supabase.from("legal_documents").select("id",{count:"exact",head:true}).in("status",["pending","processing"]),
  supabase.from("legal_documents").select("id",{count:"exact",head:true}).eq("status","failed"),
  supabase.from("conversations").select("id",{count:"exact",head:true})
 ]);
 const cards=[["Total documents",docs.count??0],["Processed",processed.count??0],["Pending",pending.count??0],["Failed",failed.count??0],["Conversations",convs.count??0]];
 return <div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">Workspace overview</p><h1 className="mt-1 text-3xl font-semibold">Good to see you</h1><p className="mt-2 text-sm text-slate-500">Role: {profile.role} · Tenant-scoped workspace</p></div><Link href="/chat" className="btn btn-primary">Start consultation</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label,value])=><div className="card p-5" key={label}><div className="text-sm text-slate-500">{label}</div><div className="mt-3 text-3xl font-semibold">{value}</div></div>)}</div><div className="mt-8 grid gap-5 md:grid-cols-2"><div className="card p-6"><h2 className="font-semibold">Knowledge base</h2><p className="mt-2 text-sm leading-6 text-slate-500">Import legal materials, review extraction, and monitor ingestion progress.</p><Link href="/documents" className="mt-4 inline-block text-sm font-semibold text-blue-700">Manage documents →</Link></div><div className="card p-6"><h2 className="font-semibold">Grounded legal chat</h2><p className="mt-2 text-sm leading-6 text-slate-500">Ask in Arabic, English, German, French, or Spanish and inspect the retrieved German source passages.</p><Link href="/chat" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open chat →</Link></div></div></div>;
}
