"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, FileSearch, ArrowLeft, Download, FileText, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AuditReport {
  match_score: number;
  missing_keywords: string[];
  strong_sections: string[];
  weak_sections: string[];
  recommended_rewrites: { original: string; improved: string; reason: string }[];
  summary: string;
}

type Mode = "coach" | "cover-letter";

export default function CoachPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [mode, setMode] = useState<Mode>("coach");
  const bottomRef = useRef<HTMLDivElement>(null);
  const auditRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    fetch(`/api/chat/history?applicationId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const endpoint = mode === "cover-letter" ? "/api/cover-letter" : "/api/chat";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, applicationId: sessionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode, sessionId]);

  async function runAudit() {
    setAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: sessionId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAuditReport(data);
      setTimeout(() => auditRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      alert(`Audit failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setAuditing(false);
    }
  }

  async function exportAuditPDF() {
    if (!auditReport) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("CareerCoach AI — Resume Audit Report", 20, y); y += 12;
    doc.setFontSize(12);
    doc.text(`Match Score: ${auditReport.match_score}/100`, 20, y); y += 8;
    doc.text(`Summary: ${auditReport.summary}`, 20, y, { maxWidth: 170 }); y += 20;

    if (auditReport.missing_keywords.length) {
      doc.setFontSize(13);
      doc.text("Missing Keywords", 20, y); y += 7;
      doc.setFontSize(11);
      doc.text(auditReport.missing_keywords.join(", "), 20, y, { maxWidth: 170 }); y += 12;
    }

    if (auditReport.recommended_rewrites.length) {
      doc.setFontSize(13);
      doc.text("Recommended Rewrites", 20, y); y += 7;
      doc.setFontSize(11);
      for (const rw of auditReport.recommended_rewrites) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.text(`Original: ${rw.original}`, 20, y, { maxWidth: 170 }); y += 8;
        doc.text(`Improved: ${rw.improved}`, 20, y, { maxWidth: 170 }); y += 8;
        doc.text(`Reason: ${rw.reason}`, 20, y, { maxWidth: 170 }); y += 12;
      }
    }

    doc.save("career-coach-audit.pdf");
  }

  const placeholder = mode === "cover-letter"
    ? "Describe the role and I'll draft a tailored cover letter…"
    : "Ask your career coach anything…";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold">CareerCoach AI</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 text-sm">
            <button
              onClick={() => setMode("coach")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${mode === "coach" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Coach
            </button>
            <button
              onClick={() => setMode("cover-letter")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${mode === "cover-letter" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <FileText className="w-3.5 h-3.5" /> Cover Letter
            </button>
          </div>
          <button
            onClick={runAudit}
            disabled={auditing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {auditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
            Full Audit
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden max-w-6xl w-full mx-auto px-4 py-6 gap-6">
        {/* Chat */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {historyLoading ? (
              <div className="flex items-center justify-center mt-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-20">
                <p className="text-lg font-medium mb-2">
                  {mode === "cover-letter" ? "Cover Letter Generator" : "Ask your career coach anything"}
                </p>
                <p className="text-sm">
                  {mode === "cover-letter"
                    ? "I'll draft a tailored cover letter based on your resume and the job description."
                    : 'Try: "How should I rewrite my experience for this role?"'}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                    {m.role === "assistant" ? (
                      <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                        {m.content || "…"}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{m.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-3 mt-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Audit Panel */}
        {auditReport && (
          <div ref={auditRef} className="w-80 bg-slate-800/60 border border-slate-700 rounded-2xl p-5 overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Resume Audit</h3>
              <button
                onClick={exportAuditPDF}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>
            <div className="space-y-5 text-sm">
              {/* Score */}
              <div>
                <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wide">Match Score</p>
                <div className="flex items-end gap-2">
                  <p className={`text-4xl font-black ${auditReport.match_score >= 70 ? "text-green-400" : auditReport.match_score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {auditReport.match_score}%
                  </p>
                </div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${auditReport.match_score >= 70 ? "bg-green-400" : auditReport.match_score >= 40 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${auditReport.match_score}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              {auditReport.summary && (
                <div>
                  <p className="text-slate-400 mb-1.5 text-xs uppercase tracking-wide">Summary</p>
                  <p className="text-slate-300 leading-relaxed text-xs">{auditReport.summary}</p>
                </div>
              )}

              {/* Missing Keywords */}
              {auditReport.missing_keywords?.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-2 text-xs uppercase tracking-wide">Missing Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {auditReport.missing_keywords.map((kw) => (
                      <span key={kw} className="bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full text-xs">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strong sections */}
              {auditReport.strong_sections?.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-2 text-xs uppercase tracking-wide">Strong Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {auditReport.strong_sections.map((s) => (
                      <span key={s} className="bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak sections */}
              {auditReport.weak_sections?.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-2 text-xs uppercase tracking-wide">Needs Work</p>
                  <div className="flex flex-wrap gap-1.5">
                    {auditReport.weak_sections.map((s) => (
                      <span key={s} className="bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full text-xs">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rewrites */}
              {auditReport.recommended_rewrites?.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-2 text-xs uppercase tracking-wide">Recommended Rewrites</p>
                  <div className="space-y-3">
                    {auditReport.recommended_rewrites.map((rw, i) => (
                      <div key={i} className="bg-slate-900/60 rounded-lg p-3 space-y-1.5">
                        <p className="text-red-300 text-xs line-through">{rw.original}</p>
                        <p className="text-green-300 text-xs">{rw.improved}</p>
                        <p className="text-slate-500 text-xs italic">{rw.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
