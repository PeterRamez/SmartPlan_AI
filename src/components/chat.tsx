"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, ChevronDown, ChevronUp, MessageSquarePlus, Sparkles, Scale } from "lucide-react";
import type { RetrievedSource } from "@/lib/rag/retrieve";

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: RetrievedSource[];
  language?: string;
};

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function sourceLabel(source: RetrievedSource) {
  const law = source.law_code ?? source.law_name;
  const provision = source.article_number ? `§ ${source.article_number}` : null;
  return [law, provision, source.paragraph_number ? `Abs. ${source.paragraph_number}` : null]
    .filter(Boolean).join(" · ") || source.title || "Document reference";
}

function followUpOptions(language: string | undefined) {
  if (language === "de") return ["Können Sie das genauer erklären?", "Welche Voraussetzungen und Ausnahmen gelten?", "Was sollte ich als Nächstes tun?"];
  if (language === "fr") return ["Pouvez-vous expliquer davantage ?", "Quelles sont les conditions et exceptions ?", "Quelles sont les prochaines étapes ?"];
  if (language === "es") return ["¿Puede explicarlo con más detalle?", "¿Qué condiciones y excepciones existen?", "¿Qué debería hacer ahora?"];
  if (language === "en") return ["Explain this in more detail", "What conditions and exceptions apply?", "What should I do next?"];
  return ["اشرحلي الإجابة بشكل أعمق", "إيه الشروط والاستثناءات اللي ممكن تغير النتيجة؟", "إيه الخطوات العملية اللي أقدر أعملها؟"];
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [analysisMode, setAnalysisMode] = useState(false);
  const [openSources, setOpenSources] = useState<number[]>([]);


  async function send(e?: FormEvent, suppliedQuestion?: string) {
    e?.preventDefault();
    const question = (suppliedQuestion ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, conversationId, analysisMode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setConversationId(data.conversationId);
      setMessages((current) => [...current, {
        role: "assistant", content: data.answer, citations: data.citations ?? [], language: data.language,
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    setMessages([]); setConversationId(null); setError(""); setOpenSources([]);
  }

  return (
    <section className="alex-panel">
      <header className="alex-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="alex-avatar"><Scale size={20} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h2 className="font-semibold text-slate-900">Alex</h2><span className="alex-status">AI legal assistant</span></div>
            <p className="text-xs text-slate-500">LegalMind consultation</p>
          </div>
        </div>
        <button type="button" className="alex-new-chat" onClick={newChat}><MessageSquarePlus size={15} /><span>New chat</span></button>
      </header>

      <div className="alex-messages">
        {messages.length === 0 && (
          <div className="alex-welcome">
            <div className="alex-welcome-icon"><Sparkles size={22} /></div>
            <p className="text-sm font-medium text-blue-700">Hello, I’m Alex.</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">How can I help you today?</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">Tell me what happened or ask a legal question. I’ll explain the relevant rules in clear language and show you the references behind my answer.</p>
            <div className="mt-6 grid w-full max-w-xl gap-2 text-left sm:grid-cols-2">
              {["What are my rights if a product is defective?", "Explain a German legal provision", "Can I withdraw from a contract?", "Help me understand a legal document"].map((sample) => (
                <button key={sample} type="button" className="alex-suggestion" onClick={() => setInput(sample)}>{sample}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const rtl = isArabic(message.content);
          const options = message.role === "assistant" && index === messages.length - 1 ? followUpOptions(message.language) : [];
          const hasSources = Boolean(message.citations?.length);
          return (
            <article key={index} className={`alex-message-row ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && <div className="alex-mini-avatar"><Scale size={15} /></div>}
              <div className={`alex-bubble ${message.role === "user" ? "alex-user-bubble" : "alex-assistant-bubble"}`} dir={rtl ? "rtl" : "auto"}>
                {message.role === "assistant" && <div className="mb-2 text-xs font-semibold text-blue-700">Alex</div>}
                <div className="whitespace-pre-wrap text-[14px] leading-8">{message.content}</div>

                {hasSources && (
                  <div className="mt-4 border-t border-slate-200 pt-3" dir="auto">
                    <button type="button" className="alex-sources-toggle" onClick={() => setOpenSources((current) => current.includes(index) ? current.filter((n) => n !== index) : [...current, index])}>
                      <BookOpen size={15} /><span>References used ({message.citations!.length})</span>
                      {openSources.includes(index) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {openSources.includes(index) && (
                      <div className="mt-3 space-y-2">
                        {message.citations!.map((source, sourceIndex) => (
                          <div key={source.id} className="alex-source-card">
                            <div className="text-xs font-semibold text-slate-800">[{sourceIndex + 1}] {sourceLabel(source)}</div>
                            <p className="mt-1 text-xs leading-6 text-slate-600">{source.content}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{source.filename ?? source.title ?? "Knowledge base document"}{source.page_number ? ` · Page ${source.page_number}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {options.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-3" dir="auto">
                    <p className="mb-2 text-xs font-medium text-slate-500">Want to explore this further?</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => <button key={option} type="button" disabled={busy} className="alex-followup" onClick={() => send(undefined, option)}>{option}</button>)}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {busy && <div className="flex items-center gap-2 pl-9 text-sm text-slate-500"><span className="alex-typing-dots"><i /><i /><i /></span>Alex is reviewing the relevant legal sources…</div>}
        {error && <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </div>

      <form onSubmit={(event) => send(event)} className="alex-composer">
        <textarea aria-label="Ask Alex a legal question" className="alex-input" rows={2} placeholder="Ask Alex anything about your legal situation…" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} />
        <button type="submit" disabled={busy || !input.trim()} className="alex-send" aria-label="Send question"><ArrowUp size={19} /></button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 text-[11px] text-slate-400 sm:px-6">
        <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={analysisMode} onChange={(event) => setAnalysisMode(event.target.checked)} /> Detailed case analysis</label>
        <span>AI information is not a substitute for advice from a qualified lawyer.</span>
      </div>
    </section>
  );
}
