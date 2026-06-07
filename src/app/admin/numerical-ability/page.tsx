"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Layers, HelpCircle, Save, Plus, Trash2, ArrowLeft, Braces, FileText, Hourglass, Sparkles, FolderOpen, TextQuote, Tag } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface SubQuestion {
  question_text: string;
  a: string; b: string; c: string; d: string; e: string;
  correct: string;
  explanation: string;
  section: string;  // New Data Tag
  chapter: string;  // New Data Tag
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

export default function AdminNumericalManager() {
  const router = useRouter();
  const [testName, setTestName] = useState("Combined Comprehensive Mock");
  const [sectionId, setSectionId] = useState("combine-test");
  
  const [timerType, setTimerType] = useState<"per-question" | "entire-test">("entire-test");
  const [perQuestionSeconds, setPerQuestionSeconds] = useState("60");
  const [entireTestMinutes, setEntireTestMinutes] = useState("45");
  const [loading, setLoading] = useState(false);

  // Dynamic Array of Question Blocks
  const [groups, setGroups] = useState<QuestionGroup[]>([
    {
      id: crypto.randomUUID(),
      type: "bunch",
      title: "Directions (Q1-Q3)",
      paragraph_text: "Analyze the following sample dataset to answer the questions...",
      image_url: "",
      input_mode: "form",
      sub_questions: [{ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", section: "Reasoning", chapter: "Syllogism" }],
      json_paste: JSON.stringify([
        { 
          "question": "Sample Prompt?", 
          "options": { "A": "Opt1", "B": "Opt2", "C": "Opt3", "D": "Opt4", "E": "Opt5" }, 
          "correctOption": "A", 
          "explanation": "",
          "section": "Reasoning",
          "chapter": "Syllogism"
        }
      ], null, 2)
    }
  ]);

  const addNewGroup = (type: "single" | "bunch") => {
    setGroups([...groups, {
      id: crypto.randomUUID(),
      type,
      title: type === "bunch" ? "Directions Title" : "",
      paragraph_text: "",
      image_url: "",
      input_mode: "form",
      sub_questions: [{ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", section: "", chapter: "" }],
      json_paste: "[\n\n]"
    }]);
  };

  const removeGroup = (groupId: string) => {
    if (groups.length > 1) setGroups(groups.filter(g => g.id !== groupId));
  };

  const updateGroupMeta = (groupId: string, key: keyof QuestionGroup, value: any) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, [key]: value } : g));
  };

  const addQuestionToGroup = (groupId: string) => {
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      sub_questions: [...g.sub_questions, { question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", section: "", chapter: "" }]
    } : g));
  };

  const removeQuestionFromGroup = (groupId: string, qIdx: number) => {
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      sub_questions: g.sub_questions.filter((_, idx) => idx !== qIdx)
    } : g));
  };

  const updateQuestionFields = (groupId: string, qIdx: number, field: keyof SubQuestion, value: string) => {
    setGroups(groups.map(g => g.id === groupId ? {
      ...g,
      sub_questions: g.sub_questions.map((q, idx) => idx === qIdx ? { ...q, [field]: value } : q)
    } : g));
  };

  const handleSubmit = async () => {
    if (!testName.trim()) return alert("Please specify a test name.");
    
    setLoading(true);
    try {
      // 1. Deploy Global Test Meta Payload
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({ 
          test_name: testName, 
          section_id: sectionId,
          timer_type: timerType,
          duration_minutes: parseInt(entireTestMinutes, 10)
        })
        .select().single();

      if (testError) throw testError;
      const createdTestId = testData.id;

      // 2. Process each Group Iteratively
      for (const group of groups) {
        let currentBlockId: string | null = null;

        if (group.type === "bunch") {
          const { data: blockData, error: blockError } = await supabase
            .from("content_blocks")
            .insert({
              section_id: sectionId,
              test_id: createdTestId,
              title: group.title,
              paragraph_text: group.paragraph_text,
              image_url: group.image_url.trim() || null
            }).select().single();

          if (blockError) throw blockError;
          currentBlockId = blockData.id;
        }

        let questionsToUpload: any[] = [];

        if (group.input_mode === "json") {
          let parsedArray = JSON.parse(group.json_paste);
          if (!Array.isArray(parsedArray)) throw new Error("JSON payload must resolve as an array array wrapper.");
          
          questionsToUpload = parsedArray.map((item: any) => ({
            question_text: item.question,
            option_a: item.options?.A || item.options?.a || "",
            option_b: item.options?.B || item.options?.b || "",
            option_c: item.options?.C || item.options?.c || "",
            option_d: item.options?.D || item.options?.d || "",
            option_e: item.options?.E || item.options?.e || "",
            correct_option: (item.correctOption || "a").toLowerCase(),
            explanation: item.explanation || "",
            timer_seconds: parseInt(perQuestionSeconds, 10),
            test_id: createdTestId,
            block_id: currentBlockId,
            section: item.section || "Unassigned", // Mapped directly to DB
            chapter: item.chapter || "General"     // Mapped directly to DB
          }));
        } else {
          questionsToUpload = group.sub_questions.map((q) => ({
            question_text: q.question_text || "Untitled Composite Question Item",
            option_a: q.a, option_b: q.b, option_c: q.c, option_d: q.d, option_e: q.e,
            correct_option: q.correct,
            explanation: q.explanation,
            timer_seconds: parseInt(perQuestionSeconds, 10),
            test_id: createdTestId,
            block_id: currentBlockId,
            section: q.section.trim() || "Unassigned", // Mapped directly to DB
            chapter: q.chapter.trim() || "General"     // Mapped directly to DB
          }));
        }

        const { error: qInsertError } = await supabase.from("questions").insert(questionsToUpload);
        if (qInsertError) throw qInsertError;
      }

      alert("Combined structural test successfully saved into server instances!");
      router.push("/admin");
    } catch (err: any) {
      alert("Database error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf9fe] text-slate-800 p-6 md:p-12 selection:bg-purple-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Navigation Strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-900/10 text-white relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase tracking-widest">
              <Sparkles size={14} className="animate-pulse" /> Advanced Exam Architecture
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">Multi-Context Combined Test Builder</h1>
            <p className="text-purple-200/70 text-xs font-medium">Build compound test templates containing mixed paragraph blocks and isolated standalone question structures with precise diagnostics analytics tagging.</p>
          </div>
          <button onClick={() => router.push("/admin")} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"><ArrowLeft size={14}/> Exit Suite</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form Fields Core */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Global Context Block Metadata */}
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><FileText size={14} /> Test Nomenclature</label>
                  <input type="text" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-800 focus:bg-white text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><FolderOpen size={14} /> Deployment Hub Selection</label>
                  <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-700 focus:bg-white text-sm focus:outline-none cursor-pointer">
                    <option value="reasoning-ability">1. Reasoning Ability</option>
                    <option value="quantitative-ability">2. Quantitative Ability and Data Interpretation</option>
                    <option value="english-language">3. English Language</option>
                    <option value="financial-awareness">4. General / Financial Awareness</option>
                    <option value="combine-test">5. Combine Test</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Render Context Groups Array */}
            <div className="space-y-8">
              {groups.map((group, groupIdx) => (
                <div key={group.id} className="bg-white rounded-2xl border border-purple-200/80 shadow-md shadow-purple-950/[0.01] p-6 relative overflow-hidden space-y-4">
                  <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600"></div>
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase px-2.5 py-1 bg-purple-900 text-white rounded-md tracking-wider shadow-sm">Block #{groupIdx + 1}</span>
                      <span className="text-[11px] font-bold text-slate-400 capitalize bg-slate-50 border px-2 py-0.5 rounded-md">
                        {group.type === "bunch" ? "💼 Paragraph/DI Context Bound" : "🎯 Standalone Items Pack"}
                      </span>
                    </div>
                    {groups.length > 1 && (
                      <button onClick={() => removeGroup(group.id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                        <Trash2 size={13} /> Delete Block
                      </button>
                    )}
                  </div>

                  {group.type === "bunch" && (
                    <div className="bg-purple-50/30 p-4 rounded-xl border border-purple-100/70 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-xs font-black text-purple-950 uppercase tracking-wider"><TextQuote size={13} fill="currentColor"/> Context Prompt Configs</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" value={group.title} onChange={(e) => updateGroupMeta(group.id, "title", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs font-bold focus:outline-none" placeholder="Directions Title Reference (e.g. Q1-5 study the chart)" />
                        <input type="text" value={group.image_url} onChange={(e) => updateGroupMeta(group.id, "image_url", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs focus:outline-none" placeholder="Image Attachment Resource URL (Optional)" />
                      </div>
                      <textarea rows={3} value={group.paragraph_text} onChange={(e) => updateGroupMeta(group.id, "paragraph_text", e.target.value)} className="w-full p-2.5 bg-white border border-purple-100 rounded-lg text-xs focus:outline-none leading-relaxed" placeholder="Enter paragraph rules, analysis texts, datasets..." />
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide pl-1">Data Input Mode Layer</span>
                    <div className="flex bg-white p-0.5 rounded-lg border shadow-sm">
                      <button onClick={() => updateGroupMeta(group.id, "input_mode", "form")} className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider transition-all ${group.input_mode === "form" ? "bg-purple-950 text-white" : "text-slate-400 hover:text-slate-700"}`}>Form</button>
                      <button onClick={() => updateGroupMeta(group.id, "input_mode", "json")} className={`px-3 py-1 text-[11px] font-black rounded-md uppercase tracking-wider transition-all flex items-center gap-1 ${group.input_mode === "json" ? "bg-purple-950 text-white" : "text-slate-400 hover:text-slate-700"}`}><Braces size={11}/> JSON</button>
                    </div>
                  </div>

                  {group.input_mode === "json" ? (
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-900 shadow-inner">
                      <div className="text-[10px] font-mono text-slate-500 mb-1.5">// JSON elements must now include "section" and "chapter" attributes.</div>
                      <textarea rows={8} value={group.json_paste} onChange={(e) => updateGroupMeta(group.id, "json_paste", e.target.value)} className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none leading-relaxed" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {group.sub_questions.map((q, qIdx) => (
                        <div key={qIdx} className="border border-slate-200 p-4 rounded-xl bg-slate-50/40 relative space-y-3">
                          <div className="flex justify-between items-center text-[11px] font-black border-b border-slate-100 pb-1.5 text-slate-400">
                            <span>Question Sub-Item #{qIdx + 1}</span>
                            {group.sub_questions.length > 1 && (
                              <button onClick={() => removeQuestionFromGroup(group.id, qIdx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={13}/></button>
                            )}
                          </div>

                          {/* Analytics Tags Settings Wrapper Block */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-purple-50/40 p-2.5 rounded-lg border border-purple-100/60">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm">
                              <Tag size={12} className="text-purple-600" />
                              <input type="text" value={q.section} onChange={(e) => updateQuestionFields(group.id, qIdx, "section", e.target.value)} className="w-full bg-transparent text-[11px] font-bold text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Section (e.g., Reasoning)" />
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm">
                              <Layers size={12} className="text-indigo-600" />
                              <input type="text" value={q.chapter} onChange={(e) => updateQuestionFields(group.id, qIdx, "chapter", e.target.value)} className="w-full bg-transparent text-[11px] font-bold text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Chapter (e.g., Syllogism)" />
                            </div>
                          </div>

                          <input type="text" value={q.question_text} onChange={(e) => updateQuestionFields(group.id, qIdx, "question_text", e.target.value)} className="w-full p-2.5 bg-white border border-slate-100 rounded-lg text-xs font-semibold focus:outline-none text-slate-800" placeholder="Question Text Description Detail" />
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {["a","b","c","d","e"].map(o => (
                              <input key={o} type="text" value={(q as any)[o]} onChange={(e) => updateQuestionFields(group.id, qIdx, o as any, e.target.value)} className="p-2 border border-slate-100 rounded-lg text-[11px] focus:outline-none" placeholder={`Option (${o.toUpperCase()})`} />
                            ))}
                            <select value={q.correct} onChange={(e) => updateQuestionFields(group.id, qIdx, "correct", e.target.value)} className="p-2 border border-purple-100 bg-purple-50 rounded-lg text-[11px] font-black text-purple-900 focus:outline-none cursor-pointer">
                              {["a","b","c","d","e"].map(o => <option key={o} value={o}>Key: {o.toUpperCase()}</option>)}
                            </select>
                          </div>
                          <input type="text" value={q.explanation} onChange={(e) => updateQuestionFields(group.id, qIdx, "explanation", e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg text-[10px] text-slate-500 focus:outline-none" placeholder="Logic Solution Breakdown Rationale..." />
                        </div>
                      ))}
                      <button onClick={() => addQuestionToGroup(group.id)} className="w-full py-2 bg-white hover:bg-purple-50/50 border border-dashed border-purple-200 text-purple-700 font-black text-[11px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all"><Plus size={12}/> Append Question Sub-Row</button>
                    </div>
                  )}

                </div>
              ))}
            </div>

            {/* Group Array Insertion Action Triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-purple-100 pt-4">
              <button onClick={() => addNewGroup("single")} className="p-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"><Plus size={14}/> + Add Standalone Items Group</button>
              <button onClick={() => addNewGroup("bunch")} className="p-4 bg-purple-900 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"><Layers size={14}/> + Add Paragraph Data Group</button>
            </div>

          </div>

          {/* Right Control Meta Core Sidebar Panel */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase flex items-center gap-2 text-purple-900 tracking-wider"><Clock size={15} /> Exam Timer Engine</h3>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400">Timer Method Type</label>
                <select value={timerType} onChange={(e: any) => setTimerType(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none cursor-pointer">
                  <option value="per-question">Individual Question Countdown</option>
                  <option value="entire-test">Whole Session Global Timer</option>
                </select>
              </div>

              {timerType === "per-question" ? (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-slate-400">Seconds Value</label>
                  <select value={perQuestionSeconds} onChange={(e) => setPerQuestionSeconds(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none cursor-pointer">
                    <option value="30">30 Seconds</option>
                    <option value="60">60 Seconds (1 Min)</option>
                    <option value="120">120 Seconds (2 Min)</option>
                    <option value="180">180 Seconds (3 Min)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase text-slate-400">Global Minutes Duration</label>
                  <div className="relative flex items-center">
                    <Hourglass size={14} className="absolute left-3 text-purple-400" />
                    <input type="number" value={entireTestMinutes} onChange={(e) => setEntireTestMinutes(e.target.value)} className="w-full p-2.5 pl-9 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none" min="1" max="180" />
                  </div>
                </div>
              )}
            </div>

            <button disabled={loading} onClick={handleSubmit} className="w-full py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-black text-xs rounded-xl uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40">
              <Save size={14} /> {loading ? "Deploying Schema..." : "Deploy Configured Test"}
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}