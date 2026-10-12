import { useState } from "react";
import { MessageCircle, Sparkles, Send, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/use-auth";

type Message = { role: "user" | "assistant"; content: string };
type Review = {
  summary: string;
  grammarMistakes: { exactText: string; suggestedText: string; explanation: string; severity: string }[];
  improvements: { category: string; issue: string; recommendation: string; priority: string }[];
  strengths: string[];
  missingInformation: string[];
  aiRating: number | null;
  ratingNote: string;
  ats: { atsReadinessScore: number; scoreLabel: string; scoreType: string; wordCount: number; roleKeywordMatch: number | null; matchedRoleKeywords: string[]; findings: { severity: string; category: string; issue: string; recommendation: string }[] };
  aiUnavailable?: boolean;
};
type Props = { resume: unknown; savedResumeId?: string; compact?: boolean };

export default function ResumeCopilotPanel({ resume, savedResumeId, compact = false }: Props) {
  const { idToken } = useAuth();
  const [jobRole, setJobRole] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!compact);

  const reviewResume = async () => {
    if (!idToken) { setError("Please sign in to use Resume Copilot."); return; }
    setLoadingReview(true); setError("");
    try {
      const path = savedResumeId ? `/resume-copilot/review-saved/${encodeURIComponent(savedResumeId)}` : "/resume-copilot/review";
      const response = await apiRequest<Review>(path, {
        method: "POST", token: idToken,
        body: savedResumeId ? { jobRole: jobRole.trim() } : { resume, jobRole: jobRole.trim() }
      });
      setReview(response.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Resume review failed."); }
    finally { setLoadingReview(false); }
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || sending || !idToken) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setDraft(""); setSending(true); setError("");
    try {
      const response = await apiRequest<{ reply: string }>("/resume-copilot/chat", {
        method: "POST", token: idToken,
        body: { resume: typeof resume === "string" ? undefined : resume, resumeText: typeof resume === "string" ? resume : undefined, savedResumeId, jobRole: jobRole.trim(), messages: next.slice(-10) }
      });
      setMessages((current) => [...current, { role: "assistant", content: response.data.reply }]);
    } catch (e) {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn't reach the AI service. Please try again." }]);
      setError(e instanceof Error ? e.message : "Chat request failed.");
    } finally { setSending(false); }
  };

  return <section className="rounded-xl border border-primary/20 bg-background/50 overflow-hidden">
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="rounded-lg bg-primary/10 p-2"><Sparkles className="h-4 w-4 text-primary" /></div>
        <div><h3 className="font-semibold text-sm">Resume Copilot</h3><p className="text-xs text-muted-foreground">Live draft analysis · Grammar · ATS · AI chat</p></div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)}>{open ? "Collapse" : "Open AI"}</Button>
    </div>
    {open && <div className="border-t border-border/40 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
        <Input value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="Target job role (optional, e.g. Full-Stack Developer)" aria-label="Optional target job role" />
        <Button onClick={() => void reviewResume()} disabled={loadingReview} className="whitespace-nowrap">
          {loadingReview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          {loadingReview ? "Analyzing…" : "Analyze resume"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">The AI reviews the current draft when you request analysis. Suggestions never change your resume automatically. ATS score is an estimate, not a guaranteed score from an employer's ATS.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {review && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">ATS readiness estimate</p><p className="text-3xl font-bold">{review.ats.atsReadinessScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p><p className="text-xs text-muted-foreground">{review.ats.scoreLabel}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">AI resume rating</p><p className="text-3xl font-bold">{review.aiRating == null ? "—" : review.aiRating}<span className="text-sm font-normal text-muted-foreground">/100</span></p><p className="text-xs text-muted-foreground">{review.ratingNote}</p></div>
        </div>
        <p className="text-sm">{review.summary}</p>
        {review.aiUnavailable && <p className="text-xs text-amber-600">AI review was unavailable. The structural ATS estimate is still shown.</p>}
        <div><h4 className="font-semibold text-sm mb-2">Grammar and wording ({review.grammarMistakes.length})</h4>
          {review.grammarMistakes.length ? <div className="space-y-2">{review.grammarMistakes.map((item, i) => <div key={i} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="text-destructive line-through break-words">{item.exactText}</p><p className="font-medium break-words">Suggested: {item.suggestedText}</p><p className="text-xs text-muted-foreground mt-1">{item.explanation}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No specific grammar mistakes returned. This does not guarantee perfect grammar.</p>}
        </div>
        <div><h4 className="font-semibold text-sm mb-2">Improvements ({review.improvements.length})</h4>{review.improvements.length ? <ul className="space-y-2">{review.improvements.map((item, i) => <li key={i} className="rounded-lg border p-3 text-sm"><div className="flex gap-2 items-center"><AlertTriangle className="h-4 w-4 text-amber-500 shrink-0"/><span className="font-medium">{item.category || "Suggestion"}</span><span className="ml-auto text-xs text-muted-foreground">{item.priority || "medium"}</span></div><p className="mt-1">{item.issue}</p><p className="text-muted-foreground mt-1">{item.recommendation}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">No additional improvements returned.</p>}</div>
        {!!review.strengths.length && <div><h4 className="font-semibold text-sm mb-2">Strengths</h4>{review.strengths.map((x,i)=><p key={i} className="text-sm flex gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0"/>{x}</p>)}</div>}
        {!!review.missingInformation.length && <div><h4 className="font-semibold text-sm mb-2">Check whether these details are missing</h4>{review.missingInformation.map((x,i)=><p key={i} className="text-sm mb-1">• {x}</p>)}</div>}
        {!!review.ats.findings.length && <div><h4 className="font-semibold text-sm mb-2">ATS structure checks</h4>{review.ats.findings.map((x,i)=><p key={i} className="text-sm mb-2"><span className="font-medium">{x.category}:</span> {x.recommendation}</p>)}</div>}
      </div>}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="flex items-center gap-2 bg-muted/30 p-3"><MessageCircle className="h-4 w-4 text-primary"/><h4 className="font-semibold text-sm">Chat with your resume</h4></div>
        <div className="max-h-72 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Ask: “Improve my summary”, “Find grammar mistakes”, “What is missing for this role?” or “Rewrite this bullet without inventing metrics.”</p>}
          {messages.map((m,i)=><div key={i} className={`rounded-lg p-3 text-sm whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary/10 ml-5" : "bg-muted/50 mr-5"}`}><p className="text-xs font-semibold text-muted-foreground mb-1">{m.role === "user" ? "You" : "Resume Copilot"}</p>{m.content}</div>)}
          {sending && <p className="text-xs text-muted-foreground animate-pulse">Reviewing your current resume…</p>}
        </div>
        <div className="flex gap-2 p-3 border-t"><Textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Ask about your current resume…" className="min-h-10 max-h-28 resize-y" aria-label="Message Resume Copilot" /><Button onClick={() => void sendMessage()} disabled={sending || !draft.trim()} size="icon" aria-label="Send message"><Send className="h-4 w-4"/></Button></div>
      </div>
    </div>}
  </section>;
}
