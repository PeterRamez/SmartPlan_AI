import Link from "next/link";
import {
  Scale, LayoutDashboard, MessageSquare, Files, BookOpen, Settings,
  LogOut, Activity
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const staffNav = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Legal chat", "/chat", MessageSquare],
  ["Documents", "/documents", Files],
  ["Knowledge base", "/knowledge", BookOpen],
  ["RAG evaluation", "/rag-evaluation", Activity],
  ["Settings", "/settings", Settings]
] as const;

const clientNav = [
  ["Home", "/dashboard", LayoutDashboard],
  ["Ask Alex", "/chat", MessageSquare],
  ["Settings", "/settings", Settings]
] as const;

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }] = await Promise.all([supabase.auth.getUser()]);
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isStaff = profile?.role === "admin" || profile?.role === "lawyer";
  const nav = isStaff ? staffNav : clientNav;

  return (
    <div className="min-h-screen md:flex">
      <aside className="w-full border-b border-slate-200 bg-white p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="rounded-lg bg-blue-900 p-2 text-white"><Scale size={17} /></span>
          LegalMind AI
        </Link>
        <div className="mt-6 rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {isStaff ? "Lawyer workspace" : "Client workspace"}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {isStaff ? "Administration" : "Alex · Legal assistant"}
          </p>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto md:flex-col">
          {nav.map(([label, href, Icon]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-900">
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 hidden border-t pt-5 text-xs text-slate-400 md:block">{user?.email}</div>
        <form action="/api/auth/signout" method="post" className="mt-4 hidden md:block">
          <button className="flex items-center gap-2 text-sm text-slate-500"><LogOut size={16} /> Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-9">{children}</main>
    </div>
  );
}
