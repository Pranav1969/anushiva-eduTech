//src\app\student\components\SolutionReviewExamView.tsx
"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Target, Lightbulb, BookOpen, Filter,
} from "lucide-react";
import { getVerdict, resolveTaxonomy, Verdict } from "./resultMeta";

export interface ReviewQuestion {
  id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string; option_e: string;
  correct_option: string;
  explanation: string | null;
  section: string;
  chapter: string;
  topic_name?: string | null;
  section_id?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;
  content_blocks?: { title: string; paragraph_text: string; image_url: string | null } | null;
}

interface Props {
  questions: ReviewQuestion[];
  selectedAnswers: Record<string, string>;
  sectionOrder?: string[];
  testName?: string;
}

const NONE = "__none__";
const secOf = (q: ReviewQuestion) => (q.section || "").trim() || "Assessment Section";
type Stat = { total: number; correct: number };
const pct = (s?: Stat) => (s && s.total ? Math.round((s.correct / s.total) * 100) : 0);

export default function SolutionReviewExamView({ questions, selectedAnswers, sectionOrder, testName }: Props) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [idx, setIdx] = useState(0);
  const [verdictF, setVerdictF] = useState<"all" | Verdict>("all");
  const [chapterF, setChapterF] = useState<string>("all"); // chapter KEY (id based) | NONE | all
  const [topicF, setTopicF] = useState<string>("all");     // topic KEY
  const [full, setFull] = useState(false);

  const taxonomy = useMemo(() => resolveTaxonomy(questions), [questions]);

  const sections = useMemo(() => {
    const seen: string[] = [];
    questions.forEach((q) => { const s = secOf(q); if (!seen.includes(s)) seen.push(s); });
    if (!sectionOrder?.length) return seen;
    const ordered = sectionOrder.filter((s) => seen.includes(s));
    return [...ordered, ...seen.filter((s) => !ordered.includes(s))];
  }, [questions, sectionOrder]);

  // Enrich every question once
  const rows = useMemo(() => {
    const counters: Record<string, number> = {};
    return questions.map((q, i) => {
      const section = secOf(q);
      counters[section] = (counters[section] || 0) + 1;
      const tx = taxonomy[i];
      return {
        q,
        section,
        no: counters[section],
        chapterKey: tx.chapterTagged ? tx.chapterKey : null,
        chapterName: tx.chapterTagged ? tx.chapterName : null,
        topicKey: tx.topicTagged ? tx.topicKey : null,
        topicName: tx.topicTagged ? tx.topicName : null,
        userAns: (selectedAnswers[q.id] || "").trim().toLowerCase(),
        correctAns: (q.correct_option || "").trim().toLowerCase(),
        verdict: getVerdict(selectedAnswers[q.id], q.correct_option),
      };
    });
  }, [questions, selectedAnswers, taxonomy]);

  // Accuracy per chapter and per topic (whole test), grouped by id / normalised name
  const { chapterStats, topicStats, focusChapters, chapterNames } = useMemo(() => {
    const cs: Record<string, Stat> = {};
    const ts: Record<string, Stat> = {};
    const bad: Record<string, number> = {};
    const names: Record<string, string> = {};
    rows.forEach((r) => {
      if (r.chapterKey) {
        names[r.chapterKey] = r.chapterName as string;
        cs[r.chapterKey] = cs[r.chapterKey] || { total: 0, correct: 0 };
        cs[r.chapterKey].total++;
        if (r.verdict === "correct") cs[r.chapterKey].correct++;
        if (r.verdict !== "correct") bad[r.chapterKey] = (bad[r.chapterKey] || 0) + 1;
      }
      if (r.topicKey) {
        ts[r.topicKey] = ts[r.topicKey] || { total: 0, correct: 0 };
        ts[r.topicKey].total++;
        if (r.verdict === "correct") ts[r.topicKey].correct++;
      }
    });
    const focus = Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { chapterStats: cs, topicStats: ts, focusChapters: focus, chapterNames: names };
  }, [rows]);

  const secRows = useMemo(() => rows.filter((r) => r.section === sections[sectionIdx]), [rows, sections, sectionIdx]);

  const chapterOptions = useMemo(() => {
    const m = new Map<string, string>();
    secRows.forEach((r) => { if (r.chapterKey) m.set(r.chapterKey, r.chapterName as string); });
    return Array.from(m.entries()).map(([key, name]) => ({ key, name }));
  }, [secRows]);
  const hasUntagged = secRows.some((r) => !r.chapterKey);

  const topicOptions = useMemo(() => {
    const m = new Map<string, string>();
    secRows
      .filter((r) => chapterF === "all" || (chapterF === NONE ? !r.chapterKey : r.chapterKey === chapterF))
      .forEach((r) => { if (r.topicKey) m.set(r.topicKey, r.topicName as string); });
    return Array.from(m.entries()).map(([key, name]) => ({ key, name }));
  }, [secRows, chapterF]);

  const filtered = secRows.filter((r) =>
    (verdictF === "all" || r.verdict === verdictF) &&
    (chapterF === "all" || (chapterF === NONE ? !r.chapterKey : r.chapterKey === chapterF)) &&
    (topicF === "all" || r.topicKey === topicF)
  );

  const counts = {
    correct: secRows.filter((r) => r.verdict === "correct").length,
    wrong: secRows.filter((r) => r.verdict === "wrong").length,
    skipped: secRows.filter((r) => r.verdict === "skipped").length,
  };

  const safeIdx = Math.min(idx, Math.max(filtered.length - 1, 0));
  const cur = filtered[safeIdx];

  const resetFilters = () => { setVerdictF("all"); setChapterF("all"); setTopicF("all"); setIdx(0); };
  const applyFocus = (chapterKey: string) => {
    setChapterF(chapterKey); setTopicF("all"); setVerdictF("all"); setIdx(0);
    // jump to the section that contains this chapter's mistakes
    const hit = rows.find((r) => r.chapterKey === chapterKey && r.verdict !== "correct");
    if (hit) setSectionIdx(Math.max(sections.indexOf(hit.section), 0));
  };

  const verdictMeta = {
    correct: { label: "CORRECT", marks: "+1", cls: "bg-[#dff0d8] border-[#5cb85c] text-[#2d6a2d]" },
    wrong: { label: "INCORRECT", marks: "-0.25", cls: "bg-[#f2dede] border-[#d9534f] text-[#a94442]" },
    skipped: { label: "NOT ATTEMPTED", marks: "0", cls: "bg-[#fcf8e3] border-[#f0ad4e] text-[#8a6d3b]" },
  };

  const wrapper = full
    ? "fixed inset-0 z-50 bg-[#F4F4F4]"
    : "relative h-[780px] rounded-xl overflow-hidden border border-slate-700 shadow-2xl";

  return (
    <div className={`${wrapper} flex flex-col font-sans text-xs text-black select-none`}>
      {/* HEADER (same as exam) */}
      <header className="h-12 bg-[#1E1E24] text-white px-4 flex items-center justify-between shrink-0 border-b border-zinc-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[15px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-100 to-white uppercase">
            ANUSHIVA™
          </span>
          <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-mono bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm font-bold">
            SOLUTION REVIEW
          </span>
          <span className="text-zinc-600">/</span>
          <h1 className="text-[13px] font-bold text-zinc-100 truncate">{testName || "Answer Key & Solutions"}</h1>
        </div>
        <button
          onClick={() => setFull((f) => !f)}
          className="flex items-center gap-1.5 bg-[#2b2b36] px-2.5 py-1 border border-zinc-700/60 rounded-sm text-[11px] font-bold text-zinc-300 hover:text-white"
        >
          {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />} {full ? "Exit Full Screen" : "Full Screen"}
        </button>
      </header>

      {/* SECTION TABS (same as exam) */}
      <nav className="h-[34px] bg-[#dfdfdf] border-b border-gray-400 flex items-end px-2 shrink-0 gap-0.5">
        {sections.map((s, i) => (
          <button
            key={s}
            onClick={() => { setSectionIdx(i); setIdx(0); setChapterF("all"); setTopicF("all"); }}
            className={`px-4 h-[28px] text-[11px] font-bold flex items-center border rounded-t-sm shadow-sm ${
              i === sectionIdx
                ? "bg-[#428bca] border-[#357ebd] text-white font-black translate-y-[1px] z-10"
                : "bg-[#f1f1f1] border-gray-300 text-gray-700 hover:bg-[#e6e6e6]"
            }`}
          >
            {s}
          </button>
        ))}
      </nav>

      {/* FOCUS + FILTER BAR */}
      <div className="bg-white border-b border-gray-300 px-3 py-2 flex flex-wrap items-center gap-2 shrink-0">
        {focusChapters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#a94442]">
              <Target size={12} /> Focus on:
            </span>
            {focusChapters.map(([key, n]) => (
              <button
                key={key}
                onClick={() => applyFocus(key)}
                className="text-[10px] font-bold px-2 py-1 rounded-full border border-[#ebccd1] bg-[#f2dede] text-[#a94442] hover:bg-[#ebcccc]"
                title={`${pct(chapterStats[key])}% accuracy in this chapter`}
              >
                {chapterNames[key]} · {n} to revise
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <Filter size={12} className="text-gray-500" />
          <select value={verdictF} onChange={(e) => { setVerdictF(e.target.value as any); setIdx(0); }}
            className="h-6 border border-gray-300 rounded-sm text-[11px] font-bold px-1 bg-white">
            <option value="all">All questions</option>
            <option value="wrong">Wrong only</option>
            <option value="skipped">Not attempted only</option>
            <option value="correct">Correct only</option>
          </select>
          {(chapterOptions.length > 0 || hasUntagged) && (
            <select value={chapterF} onChange={(e) => { setChapterF(e.target.value); setTopicF("all"); setIdx(0); }}
              className="h-6 border border-gray-300 rounded-sm text-[11px] font-bold px-1 bg-white max-w-[170px]">
              <option value="all">All chapters</option>
              {chapterOptions.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              {hasUntagged && <option value={NONE}>Chapter not tagged</option>}
            </select>
          )}
          {topicOptions.length > 0 && (
            <select value={topicF} onChange={(e) => { setTopicF(e.target.value); setIdx(0); }}
              className="h-6 border border-gray-300 rounded-sm text-[11px] font-bold px-1 bg-white max-w-[170px]">
              <option value="all">All topics</option>
              {topicOptions.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          )}
          {(verdictF !== "all" || chapterF !== "all" || topicF !== "all") && (
            <button onClick={resetFilters} className="text-[10px] font-bold text-[#337ab7] underline">Reset</button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: QUESTION AREA */}
        <div className="w-[76%] flex flex-col h-full bg-white border-r border-gray-300">
          {cur ? (
            <>
              <div className="bg-gradient-to-b from-[#f9f9f9] to-[#f0f0f0] border-b border-gray-300 px-4 py-2 font-bold text-[11px] flex justify-between items-center shrink-0">
                <div className="text-[#337ab7] text-xs font-black">
                  Section: {cur.section} &gt; Question No. {cur.no}
                </div>
                <div className={`px-2.5 py-0.5 border rounded-sm font-black tracking-wider ${verdictMeta[cur.verdict].cls}`}>
                  {verdictMeta[cur.verdict].label} ({verdictMeta[cur.verdict].marks})
                </div>
              </div>

              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                {cur.q.content_blocks?.paragraph_text && (
                  <div className="p-4 bg-[#f4f8fa] border border-[#bce8f1] rounded-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-800 tracking-wide">
                      {cur.q.content_blocks.paragraph_text}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#fdfdfd] border border-gray-300 rounded-sm text-[13px] font-semibold text-gray-900 leading-relaxed">
                  {cur.q.question_text}
                </div>

                <div className="space-y-2">
                  {["a", "b", "c", "d", "e"].map((key) => {
                    const text = (cur.q as any)[`option_${key}`];
                    if (!text) return null;
                    const isCorrect = key === cur.correctAns;
                    const isUser = key === cur.userAns;
                    let cls = "bg-[#fafafa] border-gray-200 text-gray-800";
                    if (isCorrect) cls = "bg-[#dff0d8] border-[#5cb85c] text-[#2d6a2d] font-bold";
                    else if (isUser) cls = "bg-[#f2dede] border-[#d9534f] text-[#a94442] font-bold";
                    return (
                      <div key={key} className={`w-full flex items-start gap-3 p-3 border rounded-sm font-medium ${cls}`}>
                        <input type="radio" readOnly disabled checked={isUser} className="mt-0.5 h-3.5 w-3.5 accent-[#337ab7]" />
                        <span className="leading-relaxed flex-1">
                          <span className="font-bold opacity-60 mr-1">({key.toUpperCase()})</span> {text}
                        </span>
                        {isCorrect && <span className="text-[10px] font-black uppercase bg-[#5cb85c] text-white px-1.5 py-0.5 rounded-sm shrink-0">✓ Correct answer</span>}
                        {isUser && !isCorrect && <span className="text-[10px] font-black uppercase bg-[#d9534f] text-white px-1.5 py-0.5 rounded-sm shrink-0">Your answer</span>}
                        {isUser && isCorrect && <span className="text-[10px] font-black uppercase bg-[#337ab7] text-white px-1.5 py-0.5 rounded-sm shrink-0">Your answer</span>}
                      </div>
                    );
                  })}
                  {cur.verdict === "skipped" && (
                    <p className="text-[11px] font-bold text-[#8a6d3b]">You did not attempt this question.</p>
                  )}
                </div>

                {/* FOCUS CARD */}
                <div className={`p-3 rounded-sm border flex items-start gap-3 ${
                  cur.verdict === "correct" ? "bg-[#f3faf0] border-[#d6e9c6]" : "bg-[#fff6f3] border-[#ebccd1]"
                }`}>
                  <BookOpen size={18} className={cur.verdict === "correct" ? "text-[#3c763d]" : "text-[#a94442]"} />
                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      {cur.verdict === "correct" ? "Strong area" : "Where to focus"}
                    </div>
                    {cur.chapterKey ? (
                      <>
                        <div className="text-gray-800">
                          <span className="font-bold">Chapter:</span> {cur.chapterName}
                          <span className="ml-1.5 text-gray-500">(your accuracy {pct(chapterStats[cur.chapterKey])}% · {chapterStats[cur.chapterKey]?.correct}/{chapterStats[cur.chapterKey]?.total})</span>
                        </div>
                        {cur.topicKey ? (
                          <div className="text-gray-800">
                            <span className="font-bold">Topic inside this chapter:</span> {cur.topicName}
                            <span className="ml-1.5 text-gray-500">(your accuracy {pct(topicStats[cur.topicKey])}% · {topicStats[cur.topicKey]?.correct}/{topicStats[cur.topicKey]?.total})</span>
                          </div>
                        ) : (
                          <div className="text-gray-500">Specific topic is not tagged for this question.</div>
                        )}
                        {cur.verdict !== "correct" && (
                          <div className="font-bold text-[#a94442]">
                            → Revise {cur.topicName ? `“${cur.topicName}” in ` : ""}the chapter “{cur.chapterName}”, then retry similar questions.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500">Chapter and topic are not tagged for this question yet.</div>
                    )}
                  </div>
                </div>

                {cur.q.explanation?.trim() && (
                  <div className="p-3 bg-[#fcf8e3] border border-[#faebcc] rounded-sm">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#8a6d3b] mb-1">
                      <Lightbulb size={12} /> Explanation / Solution
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-800 text-xs">{cur.q.explanation}</p>
                  </div>
                )}
              </div>

              {/* FOOTER (same position as exam) */}
              <footer className="h-[46px] bg-[#e5e5e5] border-t border-gray-400 px-4 flex items-center justify-between shrink-0">
                <div className="text-[11px] font-bold text-gray-600">
                  Showing {safeIdx + 1} of {filtered.length} {filtered.length !== secRows.length && "(filtered)"}
                </div>
                <div className="flex items-center gap-2">
                  <button disabled={safeIdx === 0} onClick={() => setIdx(safeIdx - 1)}
                    className="h-[30px] px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-sm disabled:opacity-30 flex items-center gap-0.5 text-[11px] uppercase">
                    <ChevronLeft size={13} /> Previous
                  </button>
                  <button disabled={safeIdx >= filtered.length - 1} onClick={() => setIdx(safeIdx + 1)}
                    className="h-[30px] px-[22px] bg-[#337ab7] border border-[#2e6da4] hover:bg-[#286090] disabled:opacity-40 text-white font-black rounded-sm flex items-center gap-0.5 text-[11px] uppercase tracking-wider">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="p-4 bg-amber-50 text-amber-900 text-center font-bold border border-amber-200 rounded">
                No questions match these filters. <button onClick={resetFilters} className="underline">Reset filters</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (same as exam) */}
        <div className="w-[24%] bg-[#f5f5f5] flex flex-col h-full overflow-hidden shadow-md">
          <div className="bg-[#fcfcfc] border-b border-gray-300 p-2.5 grid grid-cols-1 gap-1.5 text-[10px] shrink-0 font-bold">
            <div className="bg-white border rounded p-1 flex items-center justify-between px-2">
              <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#5CB85C] rounded-b-md text-white text-[9px] flex items-center justify-center">✓</span> Correct</span>
              <span className="text-xs font-black text-green-700">{counts.correct}</span>
            </div>
            <div className="bg-white border rounded p-1 flex items-center justify-between px-2">
              <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#D9534F] rounded-t-md text-white text-[9px] flex items-center justify-center">✗</span> Wrong</span>
              <span className="text-xs font-black text-red-700">{counts.wrong}</span>
            </div>
            <div className="bg-white border rounded p-1 flex items-center justify-between px-2">
              <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#EEEEEE] border text-[9px] flex items-center justify-center">–</span> Not Attempted</span>
              <span className="text-xs font-black text-gray-500">{counts.skipped}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-[#474747] text-white text-[10px] font-black tracking-widest uppercase">Question Palette</div>

          <div className="flex-1 p-4 overflow-y-auto bg-white/90">
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 max-w-[190px] mx-auto">
              {filtered.map((r, i) => {
                let s = "w-9 h-[34px] text-xs font-black flex items-center justify-center cursor-pointer transition-transform ";
                if (r.verdict === "correct") s += "bg-[#5CB85C] text-white rounded-b-xl border border-green-600";
                else if (r.verdict === "wrong") s += "bg-[#D9534F] text-white rounded-t-xl border border-red-600";
                else s += "bg-[#EEEEEE] text-gray-800 border border-gray-300";
                if (i === safeIdx) s += " ring-2 ring-[#337ab7] ring-offset-1 z-10 scale-105";
                return <button key={r.q.id} onClick={() => setIdx(i)} className={s}>{r.no}</button>;
              })}
            </div>
          </div>

          <div className="p-3 bg-[#f5f5f5] border-t border-gray-300 text-[10px] shrink-0">
            <div className="grid grid-cols-1 gap-y-1.5 text-gray-700 font-medium">
              <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#5CB85C] border border-green-600 rounded-b-md" /> Correct (+1)</div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#D9534F] border border-red-600 rounded-t-md" /> Wrong (-0.25)</div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#EEEEEE] border border-gray-400" /> Not attempted (0)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}