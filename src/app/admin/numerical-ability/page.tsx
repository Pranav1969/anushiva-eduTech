//src\app\admin\numerical-ability\page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, Layers, Save, Plus, Trash2, ArrowLeft, 
  Braces, FileText, Hourglass, Sparkles, FolderOpen, TextQuote, Bookmark, GraduationCap, Link2
} from "lucide-react";
import { supabase } from "@/utils/supabase";

// =====================================================================
// SYLLABUS TREE (loaded from the notes tables - nothing is changed there)
//   exams -> notes_sections -> notes_phases -> notes_chapters -> notes_topics
// =====================================================================
const CUSTOM = "__custom__"; // "write my own" marker
const isId = (v: string) => !!v && v !== CUSTOM;
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

interface TreeTopic { id: string; name: string }
interface TreeChapter { id: string; name: string; topics: TreeTopic[] }
interface TreeSection { id: string; name: string; chapters: TreeChapter[] }

// chapterSel / topicSel: "" (nothing) | <uuid> (picked from notes) | CUSTOM (typed by admin)
interface Taxonomy { chapterSel: string; chapter: string; topicSel: string; topic: string }
const EMPTY_TAX: Taxonomy = { chapterSel: "", chapter: "", topicSel: "", topic: "" };
const clearIdTax = (t: Taxonomy): Taxonomy => (isId(t.chapterSel) || isId(t.topicSel) ? { ...EMPTY_TAX } : t);

interface SubQuestion {
  question_text: string;
  a: string; b: string; c: string; d: string; e: string;
  correct: string;
  explanation: string;
  tax: Taxonomy; // chapter + topic (optional)
}

interface QuestionGroup {
  id: string;
  type: "single" | "bunch";
  title: string;          
  paragraph_text: string; 
  image_url: string;
  input_mode: "form" | "json";
  sub_questions: SubQuestion[];
  json_paste: string;
}

interface SectionContainer {
  id: string;
  sectionName: string;
  durationMinutes: number;
  syllabusSectionId: string; // "" | notes_sections.id | CUSTOM
  groups: QuestionGroup[];
}

const emptyQuestion = (tax: Taxonomy = EMPTY_TAX): SubQuestion => ({
  question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", tax: { ...tax },
});

// =====================================================================
// Chapter + Topic picker  (choose from notes OR write your own)
// =====================================================================
function TaxonomyPicker({
  value, onChange, sectionNode, allSections, compact = false,
}: {
  value: Taxonomy;
  onChange: (next: Taxonomy) => void;
  sectionNode: TreeSection | null;
  allSections: TreeSection[];
  compact?: boolean;
}) {
  const chapterPool: TreeChapter[] = sectionNode ? sectionNode.chapters : allSections.flatMap((s) => s.chapters);
  const hasChapterOptions = chapterPool.length > 0;
  const chapterNode = isId(value.chapterSel) ? allSections.flatMap((s) => s.chapters).find((c) => c.id === value.chapterSel) ?? null : null;
  const hasTopicOptions = !!chapterNode && chapterNode.topics.length > 0;

  const boxCls = `flex flex-col gap-1 bg-slate-50 px-2 py-1.5 rounded-md border ${compact ? "text-[11px]" : "text-xs"}`;
  const selCls = "w-full bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer";
  const inpCls = "w-full bg-white border border-slate-200 rounded px-1.5 py-1 font-bold text-slate-700 placeholder-slate-400 focus:outline-none";

  const linked = isId(value.chapterSel);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {/* CHAPTER */}
      <div className={boxCls}>
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-500 whitespace-nowrap">Chapter:</span>
          {hasChapterOptions ? (
            <select
              value={value.chapterSel}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange({ ...EMPTY_TAX });
                else if (v === CUSTOM) onChange({ chapterSel: CUSTOM, chapter: "", topicSel: "", topic: value.topic });
                else {
                  const ch = chapterPool.find((c) => c.id === v);
                  onChange({ chapterSel: v, chapter: ch?.name || "", topicSel: "", topic: "" });
                }
              }}
              className={selCls}
            >
              <option value="">— not set (optional) —</option>
              {sectionNode
                ? sectionNode.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                : allSections.map((s) => (
                    <optgroup key={s.id} label={s.name}>
                      {s.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
              <option value={CUSTOM}>✍ Write my own…</option>
            </select>
          ) : (
            <input
              type="text"
              value={value.chapter}
              onChange={(e) => onChange({ ...value, chapterSel: "", chapter: e.target.value })}
              className="w-full bg-transparent font-bold text-slate-700 placeholder-slate-400 focus:outline-none"
              placeholder="Chapter name (optional)..."
            />
          )}
        </div>
        {hasChapterOptions && value.chapterSel === CUSTOM && (
          <input
            type="text"
            value={value.chapter}
            onChange={(e) => onChange({ ...value, chapter: e.target.value })}
            className={inpCls}
            placeholder="Type your chapter name..."
          />
        )}
        <span className={`text-[9px] font-bold ${linked ? "text-emerald-600" : "text-slate-400"}`}>
          {linked ? "🔗 linked to syllabus chapter" : value.chapter.trim() ? "typed name — auto-linked if it matches a syllabus chapter" : "optional"}
        </span>
      </div>

      {/* TOPIC */}
      <div className={boxCls}>
        <div className="flex items-center gap-1.5">
          <Bookmark size={12} className="text-purple-600 shrink-0" />
          <span className="font-bold text-slate-500 whitespace-nowrap">Topic:</span>
          {hasTopicOptions ? (
            <select
              value={value.topicSel}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") onChange({ ...value, topicSel: "", topic: "" });
                else if (v === CUSTOM) onChange({ ...value, topicSel: CUSTOM, topic: "" });
                else {
                  const tp = chapterNode?.topics.find((t) => t.id === v);
                  onChange({ ...value, topicSel: v, topic: tp?.name || "" });
                }
              }}
              className={selCls}
            >
              <option value="">— not set (optional) —</option>
              {chapterNode!.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              <option value={CUSTOM}>✍ Write my own…</option>
            </select>
          ) : (
            <input
              type="text"
              value={value.topic}
              onChange={(e) => onChange({ ...value, topicSel: "", topic: e.target.value })}
              className="w-full bg-transparent font-bold text-slate-700 placeholder-slate-400 focus:outline-none"
              placeholder="Topic name (optional)..."
            />
          )}
        </div>
        {hasTopicOptions && value.topicSel === CUSTOM && (
          <input
            type="text"
            value={value.topic}
            onChange={(e) => onChange({ ...value, topic: e.target.value })}
            className={inpCls}
            placeholder="Type your topic name..."
          />
        )}
        <span className={`text-[9px] font-bold ${isId(value.topicSel) ? "text-emerald-600" : "text-slate-400"}`}>
          {isId(value.topicSel) ? "🔗 linked to syllabus topic" : value.topic.trim() ? "typed name — auto-linked if it matches" : "optional"}
        </span>
      </div>
    </div>
  );
}

export default function AdminNumericalManager() {
  const router = useRouter();
  const [testName, setTestName] = useState("SBI PO Prelims Full Mock Test");
  const [sectionId, setSectionId] = useState("combine-test"); // deployment route hub
  const [timerType, setTimerType] = useState<"per-question" | "entire-test" | "sectional-timer">("sectional-timer");
  
  const [globalDurationMinutes, setGlobalDurationMinutes] = useState("45");
  const [globalTax, setGlobalTax] = useState<Taxonomy>({ ...EMPTY_TAX }); // optional fallback chapter/topic
  const [perQuestionSeconds, setPerQuestionSeconds] = useState("60");

  const [loading, setLoading] = useState(false);
  const [existingSectionIds, setExistingSectionIds] = useState<string[]>([]);
  const [isCustomSectionId, setIsCustomSectionId] = useState(false);

  // ---- Syllabus link (exam -> tree) ----
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(""); // "" | exam uuid | CUSTOM
  const [customExamName, setCustomExamName] = useState("");
  const [tree, setTree] = useState<TreeSection[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  useEffect(() => {
    async function fetchUniqueSectionIds() {
      try {
        const { data, error } = await supabase.from("tests").select("section_id");
        if (error) throw error;
        if (data) {
          const uniques = Array.from(
            new Set(data.map((item: any) => item.section_id).filter(Boolean))
          ) as string[];
          setExistingSectionIds(uniques);
        }
      } catch (err) {
        console.error("Error fetching deployment routes:", err);
      }
    }
    async function fetchExams() {
      try {
        const { data, error } = await supabase.from("exams").select("id, name").order("name");
        if (error) throw error;
        setExams((data as any[]) || []);
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
    }
    fetchUniqueSectionIds();
    fetchExams();
  }, []);

  // Load the syllabus tree of the chosen exam
  useEffect(() => {
    if (!isId(selectedExamId)) {
      setTree([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setTreeLoading(true);
      try {
        const { data, error } = await supabase
          .from("notes_sections")
          .select("id, name_en, notes_phases(id, sequence_order, notes_chapters(id, name_en, sequence_order, notes_topics(id, name_en, sequence_order)))")
          .eq("exam_id", selectedExamId);
        if (error) throw error;
        const bySeq = (a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0);
        const mapped: TreeSection[] = ((data as any[]) || [])
          .map((s) => {
            const phases = [...(s.notes_phases || [])].sort(bySeq);
            const chapters: TreeChapter[] = phases.flatMap((p: any) =>
              [...(p.notes_chapters || [])].sort(bySeq).map((c: any) => ({
                id: c.id,
                name: c.name_en || "",
                topics: [...(c.notes_topics || [])].sort(bySeq).map((t: any) => ({ id: t.id, name: t.name_en || "" })),
              }))
            );
            return { id: s.id, name: s.name_en || "", chapters };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setTree(mapped);
      } catch (err) {
        console.error("Error loading syllabus tree:", err);
        if (!cancelled) setTree([]);
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedExamId]);

  const findSectionNode = (container: SectionContainer): TreeSection | null =>
    isId(container.syllabusSectionId) ? tree.find((s) => s.id === container.syllabusSectionId) ?? null : null;

  const [sections, setSections] = useState<SectionContainer[]>([
    {
      id: crypto.randomUUID(),
      sectionName: "Reasoning Ability",
      durationMinutes: 20,
      syllabusSectionId: "",
      groups: [
        {
          id: crypto.randomUUID(),
          type: "single",
          title: "",
          paragraph_text: "",
          image_url: "",
          input_mode: "form",
          sub_questions: [emptyQuestion()],
          json_paste: JSON.stringify([
            { 
              "question": "Sample Question Text?", 
              "options": { "A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4", "E": "Option 5" }, 
              "correctOption": "A", 
              "explanation": "Logic breakdown",
              "chapter": "Syllogism",
              "topic": "Statement and Conclusion"
            }
          ], null, 2)
        }
      ]
    }
  ]);

  const handleExamChange = (value: string) => {
    setSelectedExamId(value);
    // old picks belong to the previous exam -> clear them (typed text is kept)
    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        syllabusSectionId: isId(s.syllabusSectionId) ? "" : s.syllabusSectionId,
        groups: s.groups.map((g) => ({ ...g, sub_questions: g.sub_questions.map((q) => ({ ...q, tax: clearIdTax(q.tax) })) })),
      }))
    );
    setGlobalTax((t) => clearIdTax(t));
  };

  const handleSyllabusSectionChange = (secId: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== secId) return s;
        const node = tree.find((n) => n.id === value);
        return {
          ...s,
          syllabusSectionId: value,
          sectionName: node ? node.name : s.sectionName,
          groups: s.groups.map((g) => ({ ...g, sub_questions: g.sub_questions.map((q) => ({ ...q, tax: clearIdTax(q.tax) })) })),
        };
      })
    );
  };

  const addNewSection = () => {
    setSections((prev) => [...prev, {
      id: crypto.randomUUID(),
      sectionName: "Quantitative Aptitude",
      durationMinutes: 20,
      syllabusSectionId: "",
      groups: [
        {
          id: crypto.randomUUID(),
          type: "single",
          title: "",
          paragraph_text: "",
          image_url: "",
          input_mode: "form",
          sub_questions: [emptyQuestion()],
          json_paste: "[\n\n]"
        }
      ]
    }]);
  };

  const removeSection = (secId: string) => {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== secId) : prev));
  };

  const updateSectionMeta = (secId: string, key: "sectionName" | "durationMinutes", value: any) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, [key]: value } : s)));
  };

  const addNewGroupToSection = (secId: string, type: "single" | "bunch") => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: [...s.groups, {
          id: crypto.randomUUID(),
          type,
          title: type === "bunch" ? "Directions Panel Context Reference" : "",
          paragraph_text: "",
          image_url: "",
          input_mode: "form",
          sub_questions: [emptyQuestion(globalTax)],
          json_paste: "[\n\n]"
        }]
      };
    }));
  };

  const removeGroupFromSection = (secId: string, groupId: string) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      if (s.groups.length <= 1) return s;
      return { ...s, groups: s.groups.filter((g) => g.id !== groupId) };
    }));
  };

  const updateGroupMeta = (secId: string, groupId: string, key: keyof QuestionGroup, value: any) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return { ...s, groups: s.groups.map((g) => (g.id === groupId ? { ...g, [key]: value } : g)) };
    }));
  };

  // new question inherits the previous question's chapter/topic (saves a lot of clicking)
  const addQuestionToGroup = (secId: string, groupId: string) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          const last = g.sub_questions[g.sub_questions.length - 1];
          return { ...g, sub_questions: [...g.sub_questions, emptyQuestion(last ? last.tax : globalTax)] };
        })
      };
    }));
  };

  const removeQuestionFromGroup = (secId: string, groupId: string, qIdx: number) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          if (g.sub_questions.length <= 1) return g;
          return { ...g, sub_questions: g.sub_questions.filter((_, idx) => idx !== qIdx) };
        })
      };
    }));
  };

  const updateQuestionFields = (secId: string, groupId: string, qIdx: number, field: Exclude<keyof SubQuestion, "tax">, value: string) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, sub_questions: g.sub_questions.map((q, idx) => (idx === qIdx ? { ...q, [field]: value } : q)) };
        })
      };
    }));
  };

  const updateQuestionTax = (secId: string, groupId: string, qIdx: number, tax: Taxonomy) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, sub_questions: g.sub_questions.map((q, idx) => (idx === qIdx ? { ...q, tax } : q)) };
        })
      };
    }));
  };

  const applyTaxToGroup = (secId: string, groupId: string, tax: Taxonomy) => {
    setSections((prev) => prev.map((s) => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map((g) => (g.id !== groupId ? g : { ...g, sub_questions: g.sub_questions.map((q) => ({ ...q, tax: { ...tax } })) }))
      };
    }));
  };

  // =====================================================================
  // Resolve typed / picked chapter + topic into canonical ids + names
  // =====================================================================
  const resolveTax = (tax: Taxonomy, sectionNode: TreeSection | null) => {
    const allChapters = tree.flatMap((s) => s.chapters);
    const pool = sectionNode ? sectionNode.chapters : allChapters;

    let chapterNode: TreeChapter | null = null;
    if (isId(tax.chapterSel)) chapterNode = allChapters.find((c) => c.id === tax.chapterSel) ?? null;
    const chapterText = (tax.chapter || "").trim();
    if (!chapterNode && chapterText) chapterNode = pool.find((c) => norm(c.name) === norm(chapterText)) ?? null;

    let topicNode: TreeTopic | null = null;
    const topicText = (tax.topic || "").trim();
    if (chapterNode) {
      if (isId(tax.topicSel)) topicNode = chapterNode.topics.find((t) => t.id === tax.topicSel) ?? null;
      if (!topicNode && topicText) topicNode = chapterNode.topics.find((t) => norm(t.name) === norm(topicText)) ?? null;
    }

    return {
      chapter_id: chapterNode?.id ?? null,
      chapter: chapterNode?.name ?? chapterText,
      topic_id: topicNode?.id ?? null,
      topic_name: topicNode?.name ?? (topicText || null),
    };
  };

  // Question value first, then the global fallback, then the default
  const finalTax = (tax: Taxonomy, sectionNode: TreeSection | null) => {
    const r = resolveTax(tax, sectionNode);
    const g = resolveTax(globalTax, sectionNode);

    if (!r.chapter) {
      // no chapter on the question -> use global fallback chapter + topic
      return {
        chapter_id: g.chapter ? g.chapter_id : null,
        chapter: g.chapter || "General",
        topic_id: g.chapter ? g.topic_id : null,
        topic_name: g.chapter ? g.topic_name : (r.topic_name || g.topic_name || null),
      };
    }
    if (!r.topic_name && g.topic_name) {
      const sameChapter = !g.chapter || (g.chapter_id && r.chapter_id ? g.chapter_id === r.chapter_id : norm(g.chapter) === norm(r.chapter));
      if (sameChapter) return { ...r, topic_id: g.chapter ? g.topic_id : null, topic_name: g.topic_name };
    }
    return r;
  };

  const handleSubmit = async () => {
    if (!sectionId.trim()) return alert("Please specify or select a valid Deployment Route Hub identifier.");
    
    setLoading(true);
    try {
      let runtimeSettingsArray: any[] = [];
      let totalCalculatedMinutes = 0;

      if (timerType === "sectional-timer") {
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: Number(sec.durationMinutes) || 20,
          orderIndex: idx + 1
        }));
        totalCalculatedMinutes = runtimeSettingsArray.reduce((acc, curr) => acc + curr.durationMinutes, 0);
      } else if (timerType === "entire-test") {
        totalCalculatedMinutes = parseInt(globalDurationMinutes, 10) || 45;
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: totalCalculatedMinutes,
          orderIndex: idx + 1
        }));
      } else {
        totalCalculatedMinutes = 0;
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: 0,
          orderIndex: idx + 1
        }));
      }

      // 1. Test meta (exam_id links the test to the syllabus exam when one was picked)
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          test_name: testName,
          section_id: sectionId,
          timer_type: timerType,
          duration_minutes: totalCalculatedMinutes,
          section_settings: runtimeSettingsArray,
          exam_id: isId(selectedExamId) ? selectedExamId : null
        })
        .select().single();

      if (testError) throw testError;
      const deployedTestId = testData.id;

      // 2. Sections -> groups -> questions
      for (const sectionContainer of sections) {
        const activeSectionTitle = sectionContainer.sectionName.trim();
        const sectionNode = findSectionNode(sectionContainer);
        const questionSectionId = sectionNode ? sectionNode.id : null; // questions.section_id

        for (const group of sectionContainer.groups) {
          let databaseBlockId: string | null = null;

          if (group.type === "bunch") {
            const { data: blockData, error: blockError } = await supabase
              .from("content_blocks")
              .insert({
                section_id: sectionId,
                test_id: deployedTestId,
                title: group.title,
                paragraph_text: group.paragraph_text,
                image_url: group.image_url.trim() || null
              }).select().single();

            if (blockError) throw blockError;
            databaseBlockId = blockData.id;
          }

          let questionsToUpload: any[] = [];

          if (group.input_mode === "json") {
            const parsedArray = JSON.parse(group.json_paste);
            if (!Array.isArray(parsedArray)) throw new Error(`JSON container format mismatch inside section: ${activeSectionTitle}`);
            
            questionsToUpload = parsedArray.map((item: any) => {
              const opts = item.options || {};
              const jsonTax: Taxonomy = {
                chapterSel: String(item.chapter_id || item.chapterId || ""),
                chapter: String(item.chapter || ""),
                topicSel: String(item.topic_id || item.topicId || ""),
                topic: String(item.topic || item.topic_name || item.topicName || ""),
              };
              const t = finalTax(jsonTax, sectionNode);
              return {
                question_text: item.question || "Untitled Question Item Prompt",
                option_a: String(opts.A || opts.a || ""),
                option_b: String(opts.B || opts.b || ""),
                option_c: String(opts.C || opts.c || ""),
                option_d: String(opts.D || opts.d || ""),
                option_e: String(opts.E || opts.e || ""),
                correct_option: String(item.correctOption || item.correct || "a").toLowerCase().trim(),
                explanation: item.explanation || "",
                timer_seconds: parseInt(perQuestionSeconds, 10) || 60,
                test_id: deployedTestId,
                block_id: databaseBlockId,
                section: activeSectionTitle,
                section_id: questionSectionId,
                chapter: t.chapter,
                chapter_id: t.chapter_id,
                topic_name: t.topic_name,
                topic_id: t.topic_id
              };
            });
          } else {
            questionsToUpload = group.sub_questions.map((q) => {
              const t = finalTax(q.tax, sectionNode);
              return {
                question_text: q.question_text || "Untitled Question Item Prompt",
                option_a: q.a,
                option_b: q.b,
                option_c: q.c,
                option_d: q.d,
                option_e: q.e,
                correct_option: q.correct.toLowerCase().trim(),
                explanation: q.explanation,
                timer_seconds: parseInt(perQuestionSeconds, 10) || 60,
                test_id: deployedTestId,
                block_id: databaseBlockId,
                section: activeSectionTitle,
                section_id: questionSectionId,
                chapter: t.chapter,
                chapter_id: t.chapter_id,
                topic_name: t.topic_name,
                topic_id: t.topic_id
              };
            });
          }

          if (questionsToUpload.length > 0) {
            const { error: qInsertError } = await supabase.from("questions").insert(questionsToUpload);
            if (qInsertError) throw qInsertError;
          }
        }
      }

      alert("Enterprise Test Pipeline deployed successfully with normalized JSONB metrics mapping contract configurations!");
      router.push("/admin");
    } catch (err: any) {
      alert("Validation configuration error state: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf9fe] text-slate-800 p-4 md:p-10 selection:bg-purple-200 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Banner Top Bar Control Panel Setup */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-900/10 text-white relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase tracking-widest">
              <Sparkles size={14} className="animate-pulse" /> Section-Driven Test Architect
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">Structured Banking Exam Deployer</h1>
            <p className="text-purple-200/70 text-xs font-medium">Segregate uploads by section boundaries natively to preserve matching sequential routing maps during real-time student evaluation runtime blocks.</p>
          </div>
          <button onClick={() => router.push("/admin")} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><ArrowLeft size={14}/> Suite Dashboard</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Workspace Stream Panel Grid Block */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Global Test Parameter Controls */}
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><FileText size={14} /> Exam Blueprint Identity Title</label>
                  <input type="text" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-800 text-sm focus:bg-white focus:outline-none" placeholder="e.g. SBI PO Mock Exam #4" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2">
                      <FolderOpen size={14} /> Deployment Route Hub
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSectionId(!isCustomSectionId);
                        setSectionId("");
                      }}
                      className="text-[10px] font-bold text-purple-600 hover:underline bg-purple-50 px-2 py-0.5 rounded"
                    >
                      {isCustomSectionId ? "Select Existing" : "+ Create New Route ID"}
                    </button>
                  </div>

                  {isCustomSectionId ? (
                    <input
                      type="text"
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="e.g. general-awareness-mock"
                    />
                  ) : (
                    <select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-700 text-sm focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Deployment Target Route --</option>
                      {existingSectionIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                      {existingSectionIds.length === 0 && (
                        <>
                          <option value="combine-test">Combined Full-Scale Test Engine</option>
                          <option value="numerical-ability">Isolated - Quantitative Aptitude</option>
                          <option value="reasoning-ability">Isolated - Reasoning Ability</option>
                          <option value="english-language">Isolated - English Language</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* SYLLABUS LINK: exam picker */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap size={14} /> Syllabus Exam (links this test to your notes structure)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-700 text-sm focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Not linked (optional) --</option>
                    {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    <option value={CUSTOM}>✍ Write my own exam…</option>
                  </select>
                  {selectedExamId === CUSTOM && (
                    <input
                      type="text"
                      value={customExamName}
                      onChange={(e) => setCustomExamName(e.target.value)}
                      className="w-full p-3 bg-white border-2 border-purple-200 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="Your exam name (not linked to the syllabus)"
                    />
                  )}
                </div>
                <p className="text-[11px] font-medium text-slate-500 flex items-start gap-1.5">
                  <Link2 size={12} className="mt-0.5 shrink-0 text-purple-500" />
                  {isId(selectedExamId)
                    ? treeLoading
                      ? "Loading syllabus sections, chapters and topics…"
                      : tree.length > 0
                        ? `${tree.length} syllabus section(s) loaded. Pick a syllabus section inside each section block below, then choose chapter and topic for every question — or write your own anywhere.`
                        : "No syllabus sections found for this exam yet. You can still type chapter and topic names."
                    : "Pick an exam to choose sections, chapters and topics from your notes structure. Questions linked this way are analysed accurately (same chapter/topic = always counted together)."}
                </p>
              </div>

              {/* GLOBAL FALLBACK chapter + topic */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><Bookmark size={14} /> Global/Fallback Chapter & Topic (optional)</label>
                <TaxonomyPicker value={globalTax} onChange={setGlobalTax} sectionNode={null} allSections={tree} />
                <p className="text-[10px] text-slate-400 font-medium">Used only for questions where chapter / topic is left empty.</p>
              </div>
            </div>

            {/* Structured Ordered Sections Layout Map rendering loops */}
            <div className="space-y-10">
              {sections.map((section, secIdx) => {
                const sectionNode = findSectionNode(section);
                return (
                <div key={section.id} className="bg-white rounded-2xl border-2 border-purple-200 shadow-md p-6 relative space-y-6">
                  <div className="absolute top-0 left-0 h-2.5 w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-600 rounded-t-xl"></div>
                  
                  {/* Section Frame Configuration Controls Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-purple-100 pb-4 mt-2">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-black uppercase px-3 py-1.5 bg-purple-950 text-white rounded-md tracking-wider shadow-xs">Section Row Rank #{secIdx + 1}</span>
                      {isId(selectedExamId) && tree.length > 0 && (
                        <select
                          value={section.syllabusSectionId}
                          onChange={(e) => handleSyllabusSectionChange(section.id, e.target.value)}
                          className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none cursor-pointer max-w-[220px]"
                          title="Syllabus section from your notes"
                        >
                          <option value="">Syllabus section (optional)</option>
                          {tree.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          <option value={CUSTOM}>✍ Write my own…</option>
                        </select>
                      )}
                      <input 
                        type="text" 
                        value={section.sectionName} 
                        onChange={(e) => updateSectionMeta(section.id, "sectionName", e.target.value)}
                        className="p-2 bg-purple-50 border border-purple-100 rounded-lg text-sm font-black text-purple-950 focus:bg-white focus:outline-none min-w-[200px]"
                        placeholder="Section Identity Designation Name"
                      />
                      {sectionNode && <span className="text-[10px] font-bold text-emerald-600">🔗 linked</span>}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {timerType === "sectional-timer" && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          <Clock size={13} className="text-amber-700" />
                          <span className="text-[11px] font-bold text-amber-900 mr-1">Duration:</span>
                          <input 
                            type="number" 
                            value={section.durationMinutes} 
                            onChange={(e) => updateSectionMeta(section.id, "durationMinutes", parseInt(e.target.value, 10) || 0)}
                            className="w-12 p-1 bg-white border border-amber-200 text-center text-xs font-black rounded-md focus:outline-none"
                            min="1"
                          />
                          <span className="text-[11px] font-bold text-amber-900">Mins</span>
                        </div>
                      )}
                      
                      {sections.length > 1 && (
                        <button onClick={() => removeSection(section.id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                          <Trash2 size={13} /> Delete Section
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Groups */}
                  <div className="space-y-6">
                    {section.groups.map((group, groupIdx) => (
                      <div key={group.id} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 relative space-y-4 shadow-2xs">
                        
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-slate-700 text-white rounded">Group Packet #{groupIdx + 1}</span>
                            <span className="text-[10px] font-bold text-slate-400 capitalize bg-white border px-2 py-0.5 rounded">
                              {group.type === "bunch" ? "💼 Comprehension Passage Matrix" : "🎯 Isolated Standalone Items"}
                            </span>
                          </div>
                          {section.groups.length > 1 && (
                            <button onClick={() => removeGroupFromSection(section.id, group.id)} className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-0.5">
                              <Trash2 size={12} /> Drop Group
                            </button>
                          )}
                        </div>

                        {group.type === "bunch" && (
                          <div className="bg-purple-50/30 p-4 rounded-xl border border-purple-100/70 space-y-3">
                            <div className="flex items-center gap-1.5 text-xs font-black text-purple-950 uppercase tracking-wider"><TextQuote size={13} fill="currentColor"/> Comprehension Passage Mapping Parameters</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input type="text" value={group.title} onChange={(e) => updateGroupMeta(section.id, group.id, "title", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs font-bold focus:outline-none" placeholder="Directions Headline reference text (e.g. Q1-5 Line graph analysis)" />
                              <input type="text" value={group.image_url} onChange={(e) => updateGroupMeta(section.id, group.id, "image_url", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs focus:outline-none" placeholder="Optional Chart Plot Graphic URL Asset" />
                            </div>
                            <textarea rows={3} value={group.paragraph_text} onChange={(e) => updateGroupMeta(section.id, group.id, "paragraph_text", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs focus:outline-none leading-relaxed" placeholder="Enter full context, data matrix tables, puzzle specifications..." />
                          </div>
                        )}

                        <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide pl-1">Configuration Capture Format Mode</span>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg border">
                            <button onClick={() => updateGroupMeta(section.id, group.id, "input_mode", "form")} className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider transition-all ${group.input_mode === "form" ? "bg-purple-950 text-white" : "text-slate-400 hover:text-slate-700"}`}>Form UI Builder</button>
                            <button onClick={() => updateGroupMeta(section.id, group.id, "input_mode", "json")} className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider transition-all flex items-center gap-1 ${group.input_mode === "json" ? "bg-purple-950 text-white" : "text-slate-400 hover:text-slate-700"}`}><Braces size={11}/> Bulk Paste JSON</button>
                          </div>
                        </div>

                        {group.input_mode === "json" ? (
                          <div className="bg-slate-950 rounded-xl p-3 border border-slate-900 shadow-inner">
                            <div className="text-[10px] font-mono text-slate-400 mb-1.5">// Normalized engine maps properties automatically. Keys are auto-sorted under section: <span className="text-purple-400 font-bold">"{section.sectionName}"</span></div>
                            <div className="text-[10px] font-mono text-slate-500 mb-1.5">// Per question (all optional): "chapter", "topic" (names - auto-linked to your syllabus when they match) or "chapter_id", "topic_id".</div>
                            <textarea rows={8} value={group.json_paste} onChange={(e) => updateGroupMeta(section.id, group.id, "json_paste", e.target.value)} className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none leading-relaxed" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {group.sub_questions.map((q, qIdx) => (
                              <div key={qIdx} className="border border-slate-200 p-4 rounded-xl bg-white space-y-3 shadow-2xs">
                                <div className="flex justify-between items-center text-[10px] font-black border-b pb-1 text-slate-400 uppercase tracking-wider">
                                  <span>Objective Line Segment Row Item #{qIdx + 1}</span>
                                  <div className="flex items-center gap-2">
                                    {group.sub_questions.length > 1 && (q.tax.chapter.trim() || isId(q.tax.chapterSel)) && (
                                      <button
                                        type="button"
                                        onClick={() => applyTaxToGroup(section.id, group.id, q.tax)}
                                        className="normal-case tracking-normal text-[10px] font-bold text-indigo-600 hover:underline"
                                      >
                                        Apply this chapter/topic to all in group
                                      </button>
                                    )}
                                    {group.sub_questions.length > 1 && (
                                      <button onClick={() => removeQuestionFromGroup(section.id, group.id, qIdx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={13}/></button>
                                    )}
                                  </div>
                                </div>

                                <TaxonomyPicker
                                  value={q.tax}
                                  onChange={(tax) => updateQuestionTax(section.id, group.id, qIdx, tax)}
                                  sectionNode={sectionNode}
                                  allSections={tree}
                                  compact
                                />

                                <input type="text" value={q.question_text} onChange={(e) => updateQuestionFields(section.id, group.id, qIdx, "question_text", e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold focus:outline-none text-slate-800" placeholder="Question statement prompt detail specification..." />
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {["a","b","c","d","e"].map(o => (
                                    <input key={o} type="text" value={(q as any)[o]} onChange={(e) => updateQuestionFields(section.id, group.id, qIdx, o as any, e.target.value)} className="p-2 border border-slate-100 rounded-lg text-[11px] focus:outline-none" placeholder={`Option (${o.toUpperCase()})`} />
                                  ))}
                                  <select value={q.correct} onChange={(e) => updateQuestionFields(section.id, group.id, qIdx, "correct", e.target.value)} className="p-2 border border-purple-100 bg-purple-50 rounded-lg text-[11px] font-black text-purple-900 focus:outline-none cursor-pointer">
                                    {["a","b","c","d","e"].map(o => <option key={o} value={o}>Correct Answer: {o.toUpperCase()}</option>)}
                                  </select>
                                </div>
                                <input type="text" value={q.explanation} onChange={(e) => updateQuestionFields(section.id, group.id, qIdx, "explanation", e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg text-[10px] text-slate-400 focus:outline-none" placeholder="Logic breakdown strategy rationale solution path..." />
                              </div>
                            ))}
                            <button onClick={() => addQuestionToGroup(section.id, group.id)} className="w-full py-2 bg-white hover:bg-purple-50/50 border border-dashed border-purple-200 text-purple-700 font-black text-[11px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all"><Plus size={12}/> Append Question Entry Row</button>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button onClick={() => addNewGroupToSection(section.id, "single")} className="p-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs">+ Add Objective Items Block</button>
                      <button onClick={() => addNewGroupToSection(section.id, "bunch")} className="p-3 bg-purple-900 hover:bg-purple-800 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs">+ Add Linked Comprehension Passage</button>
                    </div>
                  </div>

                </div>
                );
              })}
            </div>

            {/* Core Section Level Split Control Trigger */}
            <button onClick={addNewSection} className="w-full py-4 bg-white border-2 border-dashed border-purple-400 hover:bg-purple-50/30 text-purple-900 font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm">
              <Plus size={16} /> Create Next Sequenced Exam Section Block Array
            </button>
          </div>

          {/* Right Configuration Strategy Parameter Sidebar Block Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-4 sticky top-6">
              <h3 className="text-xs font-black uppercase flex items-center gap-2 text-purple-900 tracking-wider"><Clock size={15} /> Banking Timing Engine Profile</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Timer Isolation Structure Configuration</label>
                <select value={timerType} onChange={(e: any) => setTimerType(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none cursor-pointer">
                  <option value="sectional-timer">Section-Isolated Strict Timers (SBI / IBPS Frameworks)</option>
                  <option value="entire-test">Whole Mock Composite Countdown (RRB Clerk / Static Specs)</option>
                  <option value="per-question">Individual Question Countdown Isolation Loops</option>
                </select>
              </div>

              {timerType === "sectional-timer" ? (
                <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100 text-[11px] space-y-2 text-purple-950 font-medium">
                  <span className="font-bold block uppercase tracking-wider text-[9px] text-purple-800 mb-1">Sectional Timing Engaged:</span>
                  <p>Assign durations independently inside each section boundary header container on the left workspace window panel layout row slots.</p>
                  <div className="bg-white p-2.5 rounded border border-purple-200 mt-2 font-black text-center shadow-2xs">
                    Combined Exam Runtime Length: {sections.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0)} Minutes
                  </div>
                </div>
              ) : timerType === "entire-test" ? (
                <div className="space-y-2 p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-indigo-950 block">Global Unified Mock Duration Window</label>
                  <div className="relative flex items-center">
                    <Hourglass size={14} className="absolute left-3 text-indigo-500" />
                    <input 
                      type="number" 
                      value={globalDurationMinutes} 
                      onChange={(e) => setGlobalDurationMinutes(e.target.value)} 
                      className="w-full p-2.5 pl-9 bg-white border border-indigo-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none" 
                      min="1" 
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight font-medium">// Collapsed single global duration pool applied symmetrically across all section components.</span>
                </div>
              ) : (
                <div className="space-y-2 p-3.5 bg-amber-50/40 rounded-xl border border-amber-100 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-amber-950 block">Countdown Clock Boundary Per Item</label>
                  <select value={perQuestionSeconds} onChange={(e) => setPerQuestionSeconds(e.target.value)} className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                    <option value="30">30 Seconds</option>
                    <option value="45">45 Seconds</option>
                    <option value="60">60 Seconds (1 Minute Loop)</option>
                    <option value="90">90 Seconds</option>
                    <option value="120">120 Seconds (2 Minutes Loop)</option>
                  </select>
                </div>
              )}

              <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white font-black text-xs rounded-xl uppercase tracking-widest hover:opacity-95 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Save size={14} /> {loading ? "Uploading Exam Assets Layer..." : "Deploy Configured Framework Test"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}