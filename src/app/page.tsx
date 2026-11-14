import Link from "next/link";
import { Scale, ShieldCheck, Languages, BookOpen, ArrowRight } from "lucide-react";
export default function Home() {
 return <main className="min-h-screen">
  <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
   <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight"><span className="rounded-lg bg-blue-900 p-2 text-white"><Scale size={20}/></span>LegalMind <span className="text-blue-700">AI</span></Link>
   <div className="flex gap-3"><Link className="btn btn-secondary" href="/login">Sign in</Link><Link className="btn btn-primary" href="/register">Start consultation <ArrowRight size={16}/></Link></div>
  </nav>
  <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-2">
   <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm text-blue-800"><ShieldCheck size={15}/> Source-grounded legal research</div>
    <h1 className="text-5xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">Legal Intelligence.<br/><span className="text-blue-800">Powered by Your Knowledge.</span></h1>
    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Access legal information through multilingual AI consultations grounded in verified documents and original legal sources.</p>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn btn-primary">Start Consultation <ArrowRight size={17}/></Link><a href="#how" className="btn btn-secondary">Explore platform</a></div>
    <p className="mt-5 text-xs text-slate-500">Informational support only. AI output does not replace advice from a qualified lawyer.</p>
   </div>
   <div className="card p-6 md:p-8"><div className="mb-6 flex items-center justify-between"><div><div className="text-sm font-semibold">Legal research workspace</div><div className="text-xs text-slate-500">Multilingual · Evidence-led</div></div><span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">Knowledge connected</span></div>
    <div className="rounded-xl bg-slate-50 p-5"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example question</div><p className="mt-2 text-lg" dir="rtl">هل يحق للشركة فصلي من العمل بدون إنذار في ألمانيا؟</p></div>
    <div className="my-4 flex justify-center text-slate-300">↓</div>
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-blue-900"><BookOpen size={16}/> Retrieval from German legal sources</div><p className="mt-2 text-sm leading-6 text-slate-600">Finds relevant stored provisions, preserves the original German wording, and links the answer to source documents.</p></div>
    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Languages size={17}/> Arabic · English · German · French · Spanish</div>
   </div>
  </section>
  <section id="how" className="border-y border-slate-200 bg-white py-20"><div className="mx-auto max-w-7xl px-6"><h2 className="text-3xl font-semibold">A clear path from question to source</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[["Ask naturally","Users can ask in their preferred language."],["Retrieve evidence","Hybrid search finds relevant passages in the lawyer's knowledge base."],["Review citations","Responses show original excerpts and clearly state limitations."]].map(([a,b],i)=><div className="card p-6" key={a}><div className="text-sm font-bold text-blue-700">0{i+1}</div><h3 className="mt-3 text-lg font-semibold">{a}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{b}</p></div>)}</div></div></section>
  <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-8 text-sm text-slate-500 md:flex-row"><span>© {new Date().getFullYear()} LegalMind AI</span><span>Built for responsible, source-grounded legal research.</span></footer>
 </main>;
}
