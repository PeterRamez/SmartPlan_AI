import Link from "next/link";
import { ShieldCheck, Languages, BookOpen, ArrowRight, Clock3, Database, MessageCircle } from "lucide-react";
import BrandMark from "@/components/brand-mark";
export default function Home() {
 return <main className="min-h-screen bg-[#f7f9fc]">
  <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><Link href="/"><BrandMark /></Link><div className="flex gap-3"><Link className="btn btn-secondary" href="/login">Sign in</Link><Link className="btn btn-primary" href="/register">Talk to Alex <ArrowRight size={16}/></Link></div></nav>
  <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
   <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm text-cyan-900"><ShieldCheck size={15}/> Private · Multilingual · Source-grounded</div>
    <h1 className="text-5xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">Legal clarity,<br/><span className="text-blue-800">with Alex.</span></h1>
    <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Get clear, multilingual explanations of legal questions, supported by the documents and legal sources available in your workspace.</p>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn btn-primary">Start with Alex <ArrowRight size={17}/></Link><a href="#how" className="btn btn-secondary">How it works</a></div>
    <p className="mt-5 text-xs text-slate-500">AI information is for guidance and does not replace advice from a qualified lawyer.</p>
   </div>
   <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8"><div className="mb-7 flex items-center gap-3"><BrandMark compact/><div><div className="font-semibold text-slate-900">Your consultation space</div><div className="text-xs text-slate-500">A clear answer, with references</div></div><span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span></div>
    <div className="rounded-2xl bg-slate-50 p-5"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example question</div><p className="mt-2 text-lg leading-8" dir="rtl">هل يحق للشركة فصلي من العمل بدون إنذار في ألمانيا؟</p></div><div className="my-4 flex justify-center text-slate-300">↓</div>
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-blue-950"><BookOpen size={16}/> Relevant legal references</div><p className="mt-2 text-sm leading-6 text-slate-600">Alex searches the available legal knowledge base and shows the supporting references separately from the answer.</p></div>
    <div className="mt-5 grid grid-cols-3 gap-2 text-center">{[[Languages,"5 languages"],[Database,"Legal sources"],[MessageCircle,"Direct answers"]].map(([Icon,label])=>{const I=Icon as typeof Languages; return <div key={String(label)} className="rounded-xl bg-slate-50 px-2 py-3"><I className="mx-auto text-blue-700" size={17}/><p className="mt-2 text-[11px] font-medium text-slate-600">{String(label)}</p></div>})}</div>
   </div>
  </section>
  <section id="how" className="border-y border-slate-200 bg-white py-16"><div className="mx-auto max-w-7xl px-6"><h2 className="text-3xl font-semibold text-slate-950">Your question. A clearer next step.</h2><div className="mt-9 grid gap-5 md:grid-cols-3">{[["Ask naturally","Write in Arabic, English, German, French, or Spanish."],["Get a grounded answer","Alex uses the legal documents available in the workspace."],["Check the references","Open the supporting source details whenever you need them."]].map(([a,b],i)=><div className="card p-6" key={a}><div className="text-sm font-bold text-blue-700">0{i+1}</div><h3 className="mt-3 text-lg font-semibold">{a}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{b}</p></div>)}</div></div></section>
  <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-8 text-sm text-slate-500 md:flex-row"><span>© {new Date().getFullYear()} Alex</span><span>Informational support · Not a substitute for a qualified lawyer</span></footer>
 </main>;
}
