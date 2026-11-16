// src/app/student/components/StudyDesk.tsx
// Smriti-Sync · Phase 3: topic-wise saved conversation + feedback rating.
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Bot, User, X, MapPin, Quote, Trash2, RotateCcw, ChevronUp, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/utils/supabase";
import { useStudentSession, StudentSession } from "@/utils/auth";
import type { GuruContext, GuruAsk, SelectionKind } from "./GurujiSelectionAsk";

type Ref = { topicId: string; chapterId: string; topic: string; chapter: string };

interface Message {
  id?: string;            // present when the message is saved in the database
  role: "user" | "ai";
  text: string;
  quote?: string;         // text the student highlighted in the notes
  kind?: "nudge";         // local-only message (welcome / encouragement) - never saved
  at?: string;            // ISO time, used for the date separators
  refs?: Ref[];           // topics Guruji suggests revising
  feedback?: 1 | -1;      // student vote on AI answer
}

interface ExtendedStudentProfile extends StudentSession {
  firstName: string;
}

interface StudyDeskProps {
  currentSection: string;
  /** Fill the parent's height/width with no outer card styling (used inside Focus Canvas) */
  fullHeight?: boolean;
  /** When provided, a close button is shown in the header */
  onClose?: () => void;
  /** Deep notes context (topicId / chapter / topic / progress) */
  noteContext?: GuruContext;
  /** A "highlight -> ask" request coming from the notes */
  ask?: GuruAsk | null;
  /** Called when the student taps a "Related" chip under an AI answer */
  onOpenTopic?: (topicId: string) => void;
}

type Quoted = { text: string; kind: SelectionKind };

const PAGE = 30;

const timeGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trim() + "…" : s);
const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export default function StudyDesk({ currentSection, fullHeight = false, onClose, noteContext, ask, onOpenTopic }: StudyDeskProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [student, setStudent] = useState<ExtendedStudentProfile | null>(null);
  const [quote, setQuote] = useState<Quoted | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [persistOk, setPersistOk] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const topicRef = useRef<string | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const loadSeq = useRef(0);
  const pendingAsk = useRef<GuruAsk | null>(null);
  const scrollMode = useRef<"smooth" | "instant" | "keep">("smooth");
  const prevHeight = useRef(0);
  const { session } = useStudentSession();

  messagesRef.current = messages;

  const topicId = noteContext?.topicId || null;
  const topic = noteContext?.topic;
  const chapter = noteContext?.chapter;
  const topicDone = !!noteContext?.topicDone;
  const breadcrumb = [currentSection, chapter, topic].filter(Boolean).join(" › ");
  // one conversation per topic; without a topic, one per section (not saved)
  const threadKey = topicId || `sec:${currentSection}`;

  const firstName = session?.name ? session.name.split(" ")[0] : "Student";
  const isFemale = session?.gender?.toLowerCase() === "female" || session?.gender?.toLowerCase() === "girl";
  const niceName = isFemale ? `${firstName}, dear` : firstName;

  // ------------------------------------------------------------------
  // Local (never saved) messages
  // ------------------------------------------------------------------
  const sectionGreeting = (): Message => ({
    role: "ai",
    text: `${timeGreeting()}, **${niceName}**! 🌟 I'm Guruji, ready to walk with you through **${currentSection}**.\n\nOpen any topic and I'll remember our chat there. Select a word, line or example in your notes and I'll explain it right on the spot — or ask me anything below. No question is too small. 💛`,
    kind: "nudge",
  });

  const firstVisitMessage = (): Message => ({
    role: "ai",
    kind: "nudge",
    text: topicDone
      ? `${timeGreeting()}, **${niceName}**! ✅ You've already completed **${topic}** — nicely done. Want a quick recap or a few practice questions to lock it in?`
      : `${timeGreeting()}, **${niceName}**! 📖 Welcome to **${topic}**. Anything feel tricky? Highlight any word or line in the notes, or ask me here — I'll keep this conversation saved for you. 💪`,
  });

  const welcomeBackMessage = (hist: Message[]): Message => {
    const lastQ = [...hist].reverse().find((m) => m.role === "user");
    const tail = lastQ ? ` Your last question here was “${short(lastQ.text, 70)}”.` : "";
    return {
      role: "ai",
      kind: "nudge",
      text: `Welcome back, **${niceName}**! 👋 We're on **${topic}** again.${tail} Shall we pick up from there, or is there something new on your mind?`,
    };
  };

  // ------------------------------------------------------------------
  // History loading (RLS guarantees a student only ever sees their own rows)
  // ------------------------------------------------------------------
  const fetchPage = async (tid: string, before?: string) => {
    try {
      let threadId = threadIdRef.current;
      if (!before) {
        const { data: thread, error } = await supabase
          .from("guru_threads").select("id").eq("topic_id", tid).maybeSingle();
        if (error) throw error;
        threadId = thread?.id || null;
        threadIdRef.current = threadId;
      }
      if (!threadId) return { rows: [] as Message[], more: false };

      let q = supabase
        .from("guru_messages")
        .select("id, role, content, quote, refs, feedback, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })
        .limit(PAGE + 1);
      if (before) q = q.lt("created_at", before);
      const { data, error } = await q;
      if (error) throw error;

      const more = (data?.length || 0) > PAGE;
      const rows: Message[] = (data || [])
        .slice(0, PAGE)
        .reverse()
        .map((r: any) => ({
          id: r.id,
          role: r.role,
          text: r.content,
          quote: r.quote || undefined,
          refs: r.refs || undefined,
          feedback: r.feedback || undefined,
          at: r.created_at,
        }));
      return { rows, more };
    } catch (e) {
      console.warn("Could not load Guruji history:", e);
      return null;
    }
  };

  useEffect(() => {
    const seq = ++loadSeq.current;
    topicRef.current = topicId;
    threadIdRef.current = null;
    setQuote(null);
    setConfirmClear(false);
    setHasMore(false);
    setIsTyping(false);
    setPersistOk(true);
    if (!session) return;

    setStudent({ ...session, firstName });

    if (!topicId) {
      setHistoryLoading(false);
      scrollMode.current = "instant";
      setMessages([sectionGreeting()]);
      return;
    }

    setHistoryLoading(true);
    setMessages([]);
    (async () => {
      const page = await fetchPage(topicId);
      if (seq !== loadSeq.current) return; // the student already moved to another topic
      const hist = page?.rows || [];
      scrollMode.current = "instant";
      setMessages([...hist, hist.length ? welcomeBackMessage(hist) : firstVisitMessage()]);
      setHasMore(!!page?.more);
      setHistoryLoading(false);
      if (pendingAsk.current) {
        const a = pendingAsk.current;
        pendingAsk.current = null;
        runAsk(a);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadKey, session?.id]);

  const loadEarlier = async () => {
    const tid = topicRef.current;
    const oldest = messagesRef.current.find((m) => m.id && m.at);
    if (!tid || !oldest?.at || loadingMore) return;
    setLoadingMore(true);
    const page = await fetchPage(tid, oldest.at);
    if (page && tid === topicRef.current) {
      prevHeight.current = scrollRef.current?.scrollHeight || 0;
      scrollMode.current = "keep";
      setMessages((prev) => [...page.rows, ...prev]);
      setHasMore(page.more);
    }
    setLoadingMore(false);
  };

  // ------------------------------------------------------------------
  // Scrolling
  // ------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (scrollMode.current === "keep") {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      scrollMode.current = "smooth";
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: scrollMode.current === "instant" ? "auto" : "smooth" });
    scrollMode.current = "smooth";
  }, [messages, isTyping, historyLoading]);

  // ------------------------------------------------------------------
  // Highlight -> Ask (waits until this topic's history has loaded)
  // ------------------------------------------------------------------
  const runAsk = (a: GuruAsk) => {
    const q: Quoted = { text: a.quote, kind: a.kind };
    if (a.action === "doubt") {
      setQuote(q);
      setTimeout(() => inputRef.current?.focus(), 60);
      return;
    }
    const prompt =
      a.action === "explain"
        ? a.kind === "word"
          ? `What does “${short(a.quote, 40)}” mean in this context? Please explain simply.`
          : "Please explain this in simple words, step by step."
        : "Give me a clear, simple example to understand this.";
    sendText(prompt, q, a.action);
  };

  useEffect(() => {
    if (!ask) return;
    if (historyLoading) { pendingAsk.current = ask; return; }
    runAsk(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.id]);

  // ------------------------------------------------------------------
  // Sending
  // ------------------------------------------------------------------
  const sendText = async (text: string, q?: Quoted | null, intent?: "explain" | "example" | "doubt") => {
    const clean = text.trim();
    if (!clean || isTyping || historyLoading) return;

    const sentTopic = topicRef.current;
    const userMsg: Message = { role: "user", text: clean, quote: q?.text, at: new Date().toISOString() };

    // only used when no topic is open (nothing is saved, so the browser carries the context)
    const ephemeral = sentTopic
      ? undefined
      : messagesRef.current.filter((m) => m.kind !== "nudge").slice(-6).map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setQuote(null);
    setIsTyping(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: clean,
          currentSection: breadcrumb || currentSection,
          noteContext: noteContext || null,
          selectedText: q?.text ?? null,
          selectionKind: q?.kind ?? null,
          intent: intent ?? null,
          student: student ? { firstName: student.firstName, gender: student.gender } : null,
          chatHistory: ephemeral,
        }),
      });
      const data = await response.json();
      if (topicRef.current !== sentTopic) return; // moved to another topic; the server already saved this one
      if (sentTopic) setPersistOk(data.persisted !== false);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId || undefined,
          role: "ai",
          text: data.reply || "Guruji is processing your solution. Please try again in a moment.",
          refs: data.refs?.length ? data.refs : undefined,
          at: new Date().toISOString(),
        },
      ]);
    } catch {
      if (topicRef.current !== sentTopic) return;
      setMessages((prev) => [...prev, { role: "ai", text: "Guruji is processing your solution. Please try again in a moment." }]);
    } finally {
      if (topicRef.current === sentTopic) setIsTyping(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendText(input, quote, quote ? "doubt" : undefined);
  };

  // ------------------------------------------------------------------
  // Clear this topic's chat (deletes the saved thread) & Rate messages
  // ------------------------------------------------------------------
  const clearChat = async () => {
    setConfirmClear(false);
    const tid = topicRef.current;
    if (tid) {
      const { error } = await supabase.rpc("clear_guru_thread", { p_topic: tid });
      if (error) { console.warn("Clear failed:", error.message); return; }
    }
    threadIdRef.current = null;
    setHasMore(false);
    setQuote(null);
    scrollMode.current = "instant";
    setMessages(tid ? [firstVisitMessage()] : [sectionGreeting()]);
  };

  const rate = async (m: Message, value: 1 | -1) => {
    if (!m.id) return;
    const next = m.feedback === value ? 0 : value;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, feedback: next === 0 ? undefined : (next as 1 | -1) } : x)));
    const { error } = await supabase.rpc("rate_guru_message", { p_message: m.id, p_value: next });
    if (error) console.warn("rating failed:", error.message);
  };

  const chips = topic
    ? [
        "Explain this topic simply",
        "Give me a real example",
        "Key points to remember",
        "Common mistakes here",
        topicDone ? "Quiz me (3 questions)" : "Quiz me after I read",
      ]
    : ["How should I study this section?", "What should I revise first?"];

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <div
      className={`bg-[#0A0D16] border-slate-800 shadow-2xl flex flex-col overflow-hidden w-full font-sans ${
        fullHeight ? "h-full rounded-none border-0 shadow-none" : "h-[600px] max-w-lg mx-auto rounded-3xl border"
      }`}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-amber-500/10 via-[#0A0D16] to-[#0A0D16] backdrop-blur-md">
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="p-2.5 bg-gradient-to-br from-amber-400/20 to-amber-600/10 rounded-2xl text-amber-400 ring-1 ring-amber-500/30 shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0A0D16] animate-pulse" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                AI-Guruji
                <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Pro</span>
              </h4>
              <p className="text-[10px] text-emerald-400/90 font-medium">Online · Your personal mentor</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {student && (
              <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-1.5">
                <User size={10} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 max-w-[70px] truncate">{student.firstName}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => (topicId ? setConfirmClear(true) : clearChat())}
              title={topicId ? "Clear this topic's chat" : "Start fresh"}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              {topicId ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close AI-Guruji"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live topic breadcrumb */}
        <div className="px-4 pb-3 -mt-1 space-y-1.5">
          <div className="inline-flex max-w-full items-center gap-1.5 text-[10px] font-semibold text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{breadcrumb || currentSection}</span>
          </div>
          {topicId && !persistOk && (
            <p className="text-[10px] text-slate-500">This chat isn't being saved on this account right now.</p>
          )}
          {confirmClear && (
            <div className="flex items-center justify-between gap-2 text-[11px] bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-rose-200">
              <span>Delete your saved chat for this topic?</span>
              <span className="flex gap-1.5 shrink-0">
                <button onClick={clearChat} className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold hover:bg-rose-400">Delete</button>
                <button onClick={() => setConfirmClear(false)} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">Keep</button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Window */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-5 scrollbar-thin">
        {historyLoading && (
          <div className="space-y-4 animate-pulse" aria-label="Loading your earlier chat">
            <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-slate-800" /><div className="h-14 w-3/4 rounded-2xl bg-slate-800" /></div>
            <div className="flex justify-end"><div className="h-9 w-1/2 rounded-2xl bg-amber-500/20" /></div>
            <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-slate-800" /><div className="h-20 w-4/5 rounded-2xl bg-slate-800" /></div>
          </div>
        )}

        {!historyLoading && hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadEarlier}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronUp className="w-3 h-3" />}
              Earlier messages
            </button>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDay = !!m.at && (!prev?.at || dayKey(prev.at) !== dayKey(m.at));
          return (
            <React.Fragment key={m.id || `${i}-${m.at || m.kind || "m"}`}>
              {showDay && (
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                  <span className="flex-1 h-px bg-slate-800" />
                  {dayLabel(m.at!)}
                  <span className="flex-1 h-px bg-slate-800" />
                </div>
              )}
              <div className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-500" />
                  </div>
                )}

                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] min-w-0 break-words shadow-sm ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-none"
                      : m.kind === "nudge"
                      ? "bg-gradient-to-br from-amber-500/10 to-slate-800 text-slate-200 rounded-bl-none border border-amber-500/25"
                      : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                  }`}
                >
                  {m.quote && (
                    <div className="mb-2 flex items-start gap-1.5 text-[11px] italic bg-black/20 border-l-2 border-white/60 rounded-r-md px-2 py-1.5 text-white/90">
                      <Quote className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{short(m.quote, 160)}</span>
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      strong: ({ node, ...props }) => <strong className="text-amber-400 font-bold" {...props} />,
                      code: ({ node, ...props }) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-amber-200" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                  {m.role === "ai" && m.refs && m.refs.length > 0 && onOpenTopic && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.refs.map((r) => (
                        <button
                          key={r.topicId}
                          type="button"
                          onClick={() => onOpenTopic(r.topicId)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors max-w-full"
                          title="Open this topic in your notes"
                        >
                          <span>📚</span>
                          <span className="truncate">Related: {r.topic}{r.chapter ? ` · ${r.chapter}` : ""}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "ai" && m.id && !m.kind && (
                    <div className="mt-2 flex items-center gap-1">
                      {([1, -1] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => rate(m, v)}
                          title={v === 1 ? "Helpful" : "Not helpful"}
                          className={`p-1 rounded-md transition-colors ${m.feedback === v ? "text-amber-400 bg-amber-500/15" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {v === 1 ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-500" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-slate-800 border border-slate-700 flex items-center gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {!isTyping && !historyLoading && (
        <div className="shrink-0 px-4 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => sendText(c)}
              className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* User Input Module Area */}
      <form onSubmit={handleSendMessage} className="shrink-0 p-4 bg-[#0A0D16] border-t border-slate-800/60 mt-2">
        {quote && (
          <div className="mb-2 flex items-start gap-2 text-[11px] bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-200">
            <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span className="flex-1 italic">
              <span className="not-italic font-bold text-amber-400">Asking about: </span>
              {short(quote.text, 140)}
            </span>
            <button type="button" onClick={() => setQuote(null)} className="text-amber-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="relative flex items-center bg-[#04060B] rounded-2xl border border-slate-800 focus-within:border-amber-500/50 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] transition-all">
          <input
            ref={inputRef}
            value={input}
            disabled={historyLoading}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              historyLoading ? "Loading your earlier chat..."
                : quote ? "Tell me what confuses you here..."
                : topic ? `Ask anything about ${short(topic, 28)}...`
                : "Ask a question..."
            }
            className="w-full bg-transparent pl-4 pr-12 py-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={historyLoading || isTyping}
            className="absolute right-2 p-2 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}