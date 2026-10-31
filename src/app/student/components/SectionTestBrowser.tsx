// src/app/student/components/SectionTestBrowser.tsx
"use client";

import { useMemo, useState, ReactNode } from "react";
import { ChevronDown, CheckCircle2, PlayCircle, Trophy, ListChecks, Layers } from "lucide-react";
import type { TestRecord, ChapterRecord } from "../page";

interface Props {
  sectionId: string;
  tests: TestRecord[];                 // already filtered to the active section
  chapters: ChapterRecord[];           // all chapters of the student's exam
  renderTest: (t: TestRecord) => ReactNode; // page.tsx passes its existing lock-overlay + <TestCard/>
}

type View = "chapters" | "sectional" | "mocks";

// Admin sequence first; ties fall back to NEWEST first (= your current behaviour)
const bySeq = (a: TestRecord, b: TestRecord) =>
  (a.sequence_order ?? 0) - (b.sequence_order ?? 0) ||
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const GRID = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5";

export default function SectionTestBrowser({ sectionId, tests, chapters, renderTest }: Props) {
  const [view, setView] = useState<View>("chapters");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sectionChapters = useMemo(
    () => chapters.filter((c) => c.section_id === sectionId).sort((a, b) => a.sequence_order - b.sequence_order),
    [chapters, sectionId]
  );
  const chapterIds = useMemo(() => new Set(sectionChapters.map((c) => c.id)), [sectionChapters]);

  const topicTests = tests.filter((t) => (t.test_type ?? "topic") === "topic").sort(bySeq);
  const sectionalTests = tests.filter((t) => t.test_type === "sectional").sort(bySeq);
  const mockTests = tests.filter((t) => t.test_type === "mock").sort(bySeq);

  // Nothing configured for this section -> behave exactly like the old flat grid
  if (sectionChapters.length === 0 && sectionalTests.length === 0 && mockTests.length === 0) {
    return <div className={GRID}>{[...tests].sort(bySeq).map((t) => <div key={t.id}>{renderTest(t)}</div>)}</div>;
  }

  const grouped = sectionChapters.map((c) => ({
    chapter: c,
    items: topicTests.filter((t) => t.chapter_id === c.id),
  })).filter((g) => g.items.length > 0);

  const looseTests = topicTests.filter((t) => !t.chapter_id || !chapterIds.has(t.chapter_id));

  // "Continue where you left off": first unattempted, unlocked test in syllabus order
  const nextUp = [...grouped.flatMap((g) => g.items), ...looseTests].find(
    (t) => !t.userAttempt && !t.is_locked
  );
  const nextChapter = grouped.find((g) => g.items.some((t) => t.id === nextUp?.id));
  const defaultOpenId = nextChapter?.chapter.id ?? grouped[0]?.chapter.id;
  const isOpen = (id: string) => open[id] ?? id === defaultOpenId;

  const tabs: { key: View; label: string; count: number; icon: any }[] = [
    { key: "chapters", label: "Chapter-wise", count: topicTests.length, icon: Layers },
    { key: "sectional", label: "Sectional Tests", count: sectionalTests.length, icon: ListChecks },
    { key: "mocks", label: "Full Mocks", count: mockTests.length, icon: Trophy },
  ];
  const visibleTabs = tabs.filter((t) => t.count > 0);
  const activeView = visibleTabs.some((t) => t.key === view) ? view : visibleTabs[0]?.key ?? "chapters";

  const Progress = ({ items }: { items: TestRecord[] }) => {
    const done = items.filter((t) => t.userAttempt).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    return (
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-slate-400 font-medium">{done}/{items.length} done</span>
        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const flat = (list: TestRecord[]) => (
    <div className={GRID}>{list.map((t) => <div key={t.id}>{renderTest(t)}</div>)}</div>
  );

  return (
    <div className="space-y-5">
      {/* Sub-section switcher */}
      {visibleTabs.length > 1 && (
        <div className="inline-flex gap-1 bg-slate-900/70 border border-slate-800 p-1 rounded-xl">
          {visibleTabs.map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeView === key ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={13} /> {label}
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">{count}</span>
            </button>
          ))}
        </div>
      )}

      {activeView === "chapters" && (
        <div className="space-y-4">
          {nextUp && (
            <div className="flex items-center gap-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-4 py-3">
              <PlayCircle className="text-indigo-400 shrink-0" size={20} />
              <div className="text-xs min-w-0">
                <div className="text-indigo-300 font-bold uppercase tracking-wider text-[10px]">Up next for you</div>
                <div className="text-white font-semibold truncate">
                  {nextUp.test_name}
                  {nextChapter && <span className="text-slate-400 font-normal"> · {nextChapter.chapter.name}</span>}
                </div>
              </div>
            </div>
          )}

          {grouped.map(({ chapter, items }, idx) => {
            const expanded = isOpen(chapter.id);
            const allDone = items.every((t) => t.userAttempt);
            return (
              <div key={chapter.id} className="bg-[#1E293B]/50 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen((p) => ({ ...p, [chapter.id]: !expanded }))}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-slate-800/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      allDone ? "bg-emerald-500/15 text-emerald-400" : "bg-indigo-500/15 text-indigo-300"
                    }`}>
                      {allDone ? <CheckCircle2 size={16} /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Chapter {idx + 1}</div>
                      <div className="text-sm font-bold text-white truncate">{chapter.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress items={items} />
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expanded && (
                  <div className={`${GRID} p-4 pt-1 border-t border-slate-800/60`}>
                    {items.map((t) => (
                      <div key={t.id} className={t.id === nextUp?.id ? "rounded-xl ring-2 ring-indigo-500/60" : ""}>
                        {renderTest(t)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {looseTests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                {grouped.length > 0 ? "More Practice Tests" : "Tests"}
              </h3>
              {flat(looseTests)}
            </div>
          )}
        </div>
      )}

      {activeView === "sectional" && flat(sectionalTests)}
      {activeView === "mocks" && flat(mockTests)}
    </div>
  );
}