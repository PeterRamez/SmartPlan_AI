import { Sparkles } from "lucide-react";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${compact ? "" : ""}`} aria-label="Alex">
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg shadow-blue-950/15">
        <span className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-cyan-400/70 blur-md" />
        <span className="relative text-lg font-black tracking-tight">A</span>
        <Sparkles className="absolute bottom-1 right-1 text-cyan-300" size={9} />
      </span>
      {!compact && <span className="text-xl font-bold tracking-tight text-slate-950">alex<span className="text-cyan-600">.</span></span>}
    </span>
  );
}
