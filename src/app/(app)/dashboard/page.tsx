import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function Dashboard() {
  const { supabase, profile, user } = await requireUser();

  if (profile.role === "client") {
    const { count } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-blue-700">ALEX · CLIENT AREA</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Welcome{profile.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-2 text-slate-600">
          Ask Alex your legal question and get a clear explanation grounded in the lawyer&apos;s legal knowledge base.
        </p>
        <section className="card mt-8 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-xl font-semibold text-white">A</div>
            <div>
              <h2 className="text-xl font-semibold">Talk to Alex</h2>
              <p className="text-sm text-slate-500">Your multilingual legal AI assistant</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
            Describe your situation in Arabic, German, English, or another supported language. Alex will help explain the relevant legal information and show the supporting references when available.
          </p>
          <Link href="/chat" className="btn btn-primary mt-6 inline-flex">Start a consultation</Link>
        </section>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm text-slate-500">Your consultations</p>
            <p className="mt-2 text-3xl font-semibold">{count ?? 0}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500">Account type</p>
            <p className="mt-2 text-lg font-semibold">Client</p>
            <p className="mt-1 text-xs text-slate-500">Your conversations are private to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  const [docs, processed, pending, failed, convs] = await Promise.all([
    supabase.from("legal_documents").select("id", { count: "exact", head: true }),
    supabase.from("legal_documents").select("id", { count: "exact", head: true }).eq("status", "processed"),
    supabase.from("legal_documents").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    supabase.from("legal_documents").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("conversations").select("id", { count: "exact", head: true })
  ]);
  const cards = [["Total documents", docs.count ?? 0], ["Processed", processed.count ?? 0], ["Pending", pending.count ?? 0], ["Failed", failed.count ?? 0], ["Conversations", convs.count ?? 0]];
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Workspace overview</p>
          <h1 className="mt-1 text-3xl font-semibold">Good to see you</h1>
          <p className="mt-2 text-sm text-slate-500">Role: {profile.role} · Tenant-scoped workspace</p>
        </div>
        <Link href="/chat" className="btn btn-primary">Start consultation</Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => <div className="card p-5" key={label}><div className="text-sm text-slate-500">{label}</div><div className="mt-3 text-3xl font-semibold">{value}</div></div>)}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="card p-6"><h2 className="font-semibold">Knowledge base</h2><p className="mt-2 text-sm leading-6 text-slate-500">Import legal materials, review extraction, and monitor ingestion progress.</p><Link href="/documents" className="mt-4 inline-block text-sm font-semibold text-blue-700">Manage documents →</Link></div>
        <div className="card p-6"><h2 className="font-semibold">Grounded legal chat</h2><p className="mt-2 text-sm leading-6 text-slate-500">Ask in Arabic, English, German, French, or Spanish and inspect the retrieved German source passages.</p><Link href="/chat" className="mt-4 inline-block text-sm font-semibold text-blue-700">Open chat →</Link></div>
      </div>
    </div>
  );
}
