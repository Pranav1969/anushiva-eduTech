// src/app/admin/components/FormManageTestSequence.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Save, Loader2, Layers, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface Props {
  tests: any[];                 // same `tests` array your admin page already loads
  onUpdateComplete: () => void;
}

type TestType = "topic" | "sectional" | "mock";
interface Chapter { id: string; exam_id: string; section_id: string; name: string; sequence_order: number }
interface Item { id: string; test_name: string; chapter_id: string | null; test_type: TestType; sequence_order: number }

const MOCK = "__mock", SECTIONAL = "__sectional", NONE = "__none";
const groupKey = (i: Item) =>
  i.test_type === "mock" ? MOCK : i.test_type === "sectional" ? SECTIONAL : i.chapter_id ?? NONE;
const seqSort = (a: Item, b: Item) => a.sequence_order - b.sequence_order;

const selectCls = "bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500";
const iconBtn = "p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-colors";

export default function FormManageTestSequence({ tests: allTests, onUpdateComplete }: Props) {
  // Student-private Mistake Vault practice tests are never part of the admin syllabus order
  const tests = useMemo(() => allTests.filter((t: any) => !t.owner_student_id), [allTests]);

  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newChapter, setNewChapter] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  // exams
  useEffect(() => {
    supabase.from("exams").select("*").order("name").then(({ data }) => {
      if (data?.length) { setExams(data); setExamId(data[0].id); }
    });
  }, []);

  // sections available for this exam (only tests already linked to the exam bucket)
  const sectionOptions = useMemo(
    () => Array.from(new Set(tests.filter((t) => t.exam_id === examId).map((t) => t.section_id).filter(Boolean))) as string[],
    [tests, examId]
  );
  useEffect(() => {
    if (!sectionOptions.includes(sectionId)) setSectionId(sectionOptions[0] ?? "");
  }, [sectionOptions]); // eslint-disable-line

  // chapters
  useEffect(() => {
    if (!examId || !sectionId) { setChapters([]); return; }
    supabase.from("test_chapters").select("*").eq("exam_id", examId).eq("section_id", sectionId)
      .order("sequence_order").then(({ data }) => setChapters((data as Chapter[]) || []));
  }, [examId, sectionId]);

  // items (reset whenever parent reloads tests)
  useEffect(() => {
    setItems(
      tests.filter((t) => t.exam_id === examId && t.section_id === sectionId).map((t) => ({
        id: t.id, test_name: t.test_name,
        chapter_id: t.chapter_id ?? null,
        test_type: (t.test_type ?? "topic") as TestType,
        sequence_order: t.sequence_order ?? 0,
      }))
    );
    setDirty(false);
  }, [tests, examId, sectionId]);

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 3500); };

  // ---------- chapters (saved immediately) ----------
  const addChapter = async () => {
    const name = newChapter.trim();
    if (!name || !examId || !sectionId) return;
    const next = (chapters.at(-1)?.sequence_order ?? 0) + 1;
    const { data, error } = await supabase.from("test_chapters")
      .insert({ exam_id: examId, section_id: sectionId, name, sequence_order: next }).select().single();
    if (error) return flash(error.message, false);
    setChapters((p) => [...p, data as Chapter]);
    setNewChapter("");
  };

  const saveChapterName = async (c: Chapter) => {
    const { error } = await supabase.from("test_chapters").update({ name: c.name.trim() }).eq("id", c.id);
    if (error) flash(error.message, false);
  };

  const deleteChapter = async (c: Chapter) => {
    if (!confirm(`Delete chapter "${c.name}"? Its tests are NOT deleted, they just become unassigned.`)) return;
    const { error } = await supabase.from("test_chapters").delete().eq("id", c.id);
    if (error) return flash(error.message, false);
    setChapters((p) => p.filter((x) => x.id !== c.id));
    setItems((p) => p.map((i) => (i.chapter_id === c.id ? { ...i, chapter_id: null } : i)));
  };

  const moveChapter = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= chapters.length) return;
    const copy = [...chapters];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    const renum = copy.map((c, k) => ({ ...c, sequence_order: k + 1 }));
    setChapters(renum);
    await Promise.all([idx, j].map((k) =>
      supabase.from("test_chapters").update({ sequence_order: renum[k].sequence_order }).eq("id", renum[k].id)
    ));
  };

  // ---------- tests (saved with the Save button) ----------
  const patchItem = (id: string, patch: Partial<Item>) => {
    setItems((prev) => {
      const old = prev.find((i) => i.id === id)!;
      const merged = { ...old, ...patch };
      if (merged.test_type !== "topic") merged.chapter_id = null;      // only topic tests live in chapters
      const targetKey = groupKey(merged);
      const maxSeq = Math.max(0, ...prev.filter((i) => i.id !== id && groupKey(i) === targetKey).map((i) => i.sequence_order));
      if (targetKey !== groupKey(old)) merged.sequence_order = maxSeq + 1; // land at the end of new group
      return prev.map((i) => (i.id === id ? merged : i));
    });
    setDirty(true);
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id)!;
      const key = groupKey(it);
      const grp = prev.filter((x) => groupKey(x) === key).sort(seqSort);
      const i = grp.findIndex((x) => x.id === id), j = i + dir;
      if (j < 0 || j >= grp.length) return prev;
      [grp[i], grp[j]] = [grp[j], grp[i]];
      const order = new Map(grp.map((x, k) => [x.id, k + 1]));
      return prev.map((x) => (order.has(x.id) ? { ...x, sequence_order: order.get(x.id)! } : x));
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const results = await Promise.all(items.map((i) =>
      supabase.from("tests").update({ chapter_id: i.chapter_id, test_type: i.test_type, sequence_order: i.sequence_order }).eq("id", i.id)
    ));
    const failed = results.find((r) => r.error);
    setSaving(false);
    if (failed?.error) return flash(failed.error.message, false);
    setDirty(false);
    flash("Order saved. Students will see it immediately.");
    onUpdateComplete();
  };

  // ---------- render helpers ----------
  const renderGroup = (title: string, key: string, accent = "text-slate-300") => {
    const list = items.filter((i) => groupKey(i) === key).sort(seqSort);
    if (list.length === 0 && key !== NONE) {
      return (
        <div key={key} className="border border-dashed border-slate-800 rounded-xl p-3 text-[11px] text-slate-500">
          <span className={`font-bold ${accent}`}>{title}</span> — no tests yet. Assign a test to this group from the dropdowns below.
        </div>
      );
    }
    if (list.length === 0) return null;
    return (
      <div key={key} className="border border-slate-800 rounded-xl overflow-hidden">
        <div className={`px-4 py-2.5 bg-slate-900/60 text-xs font-black uppercase tracking-wider ${accent}`}>
          {title} <span className="text-slate-500 font-mono ml-1">({list.length})</span>
        </div>
        <div className="divide-y divide-slate-800/60 bg-[#070b12]">
          {list.map((t, idx) => (
            <div key={t.id} className="p-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-6 text-center text-[11px] font-mono text-slate-500">{idx + 1}</span>
                <span className="text-xs font-semibold text-slate-200 truncate">{t.test_name}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select className={selectCls} value={t.test_type} onChange={(e) => patchItem(t.id, { test_type: e.target.value as TestType })}>
                  <option value="topic">Topic / Chapter test</option>
                  <option value="sectional">Sectional test</option>
                  <option value="mock">Full mock</option>
                </select>
                <select className={selectCls} disabled={t.test_type !== "topic"} value={t.chapter_id ?? ""}
                  onChange={(e) => patchItem(t.id, { chapter_id: e.target.value || null })}>
                  <option value="">— No chapter —</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className={iconBtn} disabled={idx === 0} onClick={() => moveItem(t.id, -1)} title="Move up"><ArrowUp size={12} /></button>
                <button type="button" className={iconBtn} disabled={idx === list.length - 1} onClick={() => moveItem(t.id, 1)} title="Move down"><ArrowDown size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400"><Layers className="w-5 h-5" /></div>
        <div>
          <h3 className="text-base font-semibold text-white">Syllabus Order & Chapters</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick an exam and a section, create chapters, then place each test in a chapter and arrange the order students will follow.
            Tests must first be linked to the exam in <b>Exam Buckets</b>.
          </p>
        </div>
      </div>

      {/* Exam + section pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Exam</label>
          <select className={`${selectCls} w-full mt-1 py-2.5 text-xs`} value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Section</label>
          <select className={`${selectCls} w-full mt-1 py-2.5 text-xs`} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sectionOptions.length === 0 && <option value="">No tests linked to this exam yet</option>}
            {sectionOptions.map((s) => <option key={s} value={s}>{s.replace(/-/g, " ")}</option>)}
          </select>
        </div>
      </div>

      {sectionId && (
        <>
          {/* Chapters */}
          <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-900/30">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">1. Chapters (top to bottom = student order)</h4>
            <div className="space-y-2">
              {chapters.length === 0 && <p className="text-[11px] text-slate-500 italic">No chapters yet. Add the first one below.</p>}
              {chapters.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-6 text-center text-[11px] font-mono text-slate-500">{idx + 1}</span>
                  <input
                    value={c.name}
                    onChange={(e) => setChapters((p) => p.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                    onBlur={() => saveChapterName(c)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button type="button" className={iconBtn} disabled={idx === 0} onClick={() => moveChapter(idx, -1)}><ArrowUp size={12} /></button>
                  <button type="button" className={iconBtn} disabled={idx === chapters.length - 1} onClick={() => moveChapter(idx, 1)}><ArrowDown size={12} /></button>
                  <button type="button" className={`${iconBtn} hover:text-red-400`} onClick={() => deleteChapter(c)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChapter()}
                placeholder="New chapter name, e.g. Syllogism"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button type="button" onClick={addChapter} className="px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold flex items-center gap-1">
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">2. Tests (set type, chapter, and order)</h4>
            {chapters.map((c) => renderGroup(c.name, c.id))}
            {renderGroup("Sectional Tests", SECTIONAL, "text-cyan-400")}
            {renderGroup("Full Mocks", MOCK, "text-amber-400")}
            {renderGroup("Unassigned (shown last as “More Practice Tests”)", NONE, "text-slate-400")}
          </div>

          {msg.text && (
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              msg.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
              {msg.ok ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />} {msg.text}
            </div>
          )}

          <button
            type="button" onClick={saveAll} disabled={!dirty || saving}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-30 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={14} />}
            {dirty ? "Save Test Order" : "Everything saved"}
          </button>
        </>
      )}
    </div>
  );
}