"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, Layers, HelpCircle, Save, Plus, Trash2, ArrowLeft, 
  Braces, FileText, Hourglass, Sparkles, FolderOpen, TextQuote, Tag 
} from "lucide-react";
import { supabase } from "@/utils/supabase";

interface SubQuestion {
  question_text: string;
  a: string; b: string; c: string; d: string; e: string;
  correct: string;
  explanation: string;
  chapter: string;  
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
  groups: QuestionGroup[];
}

export default function AdminNumericalManager() {
  const router = useRouter();
  const [testName, setTestName] = useState("SBI PO Prelims Full Mock Test");
  const [sectionId, setSectionId] = useState("combine-test"); // "combine-test" or single category identifier
  const [timerType, setTimerType] = useState<"per-question" | "entire-test" | "sectional-timer">("sectional-timer");
  
  // Base configuration settings if the test is a single topic/chapter configuration
  const [globalDurationMinutes, setGlobalDurationMinutes] = useState("45");
  const [globalChapterTag, setGlobalChapterTag] = useState("General Setup");
  const [perQuestionSeconds, setPerQuestionSeconds] = useState("60");

  const [loading, setLoading] = useState(false);

  // Initialize with one default section container block
  const [sections, setSections] = useState<SectionContainer[]>([
    {
      id: crypto.randomUUID(),
      sectionName: "Reasoning Ability",
      durationMinutes: 20,
      groups: [
        {
          id: crypto.randomUUID(),
          type: "single",
          title: "",
          paragraph_text: "",
          image_url: "",
          input_mode: "form",
          sub_questions: [{ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", chapter: "Syllogism" }],
          json_paste: JSON.stringify([
            { 
              "question": "Sample Question Text?", 
              "options": { "A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4", "E": "Option 5" }, 
              "correctOption": "A", 
              "explanation": "Logic breakdown",
              "chapter": "Syllogism"
            }
          ], null, 2)
        }
      ]
    }
  ]);

  const addNewSection = () => {
    setSections([...sections, {
      id: crypto.randomUUID(),
      sectionName: "Quantitative Aptitude",
      durationMinutes: 20,
      groups: [
        {
          id: crypto.randomUUID(),
          type: "single",
          title: "",
          paragraph_text: "",
          image_url: "",
          input_mode: "form",
          sub_questions: [{ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", chapter: "General" }],
          json_paste: "[\n\n]"
        }
      ]
    }]);
  };

  const removeSection = (secId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== secId));
    }
  };

  const updateSectionMeta = (secId: string, key: "sectionName" | "durationMinutes", value: any) => {
    setSections(sections.map(s => s.id === secId ? { ...s, [key]: value } : s));
  };

  const addNewGroupToSection = (secId: string, type: "single" | "bunch") => {
    setSections(sections.map(s => {
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
          sub_questions: [{ question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", chapter: globalChapterTag || "General" }],
          json_paste: "[\n\n]"
        }]
      };
    }));
  };

  const removeGroupFromSection = (secId: string, groupId: string) => {
    setSections(sections.map(s => {
      if (s.id !== secId) return s;
      if (s.groups.length <= 1) return s;
      return { ...s, groups: s.groups.filter(g => g.id !== groupId) };
    }));
  };

  const updateGroupMeta = (secId: string, groupId: string, key: keyof QuestionGroup, value: any) => {
    setSections(sections.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map(g => g.id === groupId ? { ...g, [key]: value } : g)
      };
    }));
  };

  const addQuestionToGroup = (secId: string, groupId: string) => {
    setSections(sections.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            sub_questions: [...g.sub_questions, { question_text: "", a: "", b: "", c: "", d: "", e: "", correct: "a", explanation: "", chapter: globalChapterTag || "General" }]
          };
        })
      };
    }));
  };

  const removeQuestionFromGroup = (secId: string, groupId: string, qIdx: number) => {
    setSections(sections.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map(g => {
          if (g.id !== groupId) return g;
          if (g.sub_questions.length <= 1) return g;
          return { ...g, sub_questions: g.sub_questions.filter((_, idx) => idx !== qIdx) };
        })
      };
    }));
  };

  const updateQuestionFields = (secId: string, groupId: string, qIdx: number, field: keyof SubQuestion, value: string) => {
    setSections(sections.map(s => {
      if (s.id !== secId) return s;
      return {
        ...s,
        groups: s.groups.map(g => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            sub_questions: g.sub_questions.map((q, idx) => idx === qIdx ? { ...q, [field]: value } : q)
          };
        })
      };
    }));
  };

  const handleSubmit = async () => {
    if (!testName.trim()) return alert("Please clarify a target test framework identity name.");
    
    setLoading(true);
    try {
      let runtimeSettingsArray: any[] = [];
      let totalCalculatedMinutes = 0;

      // Clean up structure variants based on test framework scopes
      if (timerType === "sectional-timer") {
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: Number(sec.durationMinutes) || 20,
          orderIndex: idx + 1
        }));
        totalCalculatedMinutes = runtimeSettingsArray.reduce((acc, curr) => acc + curr.durationMinutes, 0);
      } else if (timerType === "entire-test") {
        totalCalculatedMinutes = parseInt(globalDurationMinutes, 10) || 45;
        // Single global timeline tracking configuration mapping
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: totalCalculatedMinutes,
          orderIndex: idx + 1
        }));
      } else {
        totalCalculatedMinutes = 0; // Per-question timing locks
        runtimeSettingsArray = sections.map((sec, idx) => ({
          sectionName: sec.sectionName.trim(),
          durationMinutes: 0,
          orderIndex: idx + 1
        }));
      }

      // 1. Post Meta Framework payload data to the 'tests' table
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          test_name: testName,
          section_id: sectionId,
          timer_type: timerType,
          duration_minutes: totalCalculatedMinutes,
          section_settings: runtimeSettingsArray
        })
        .select().single();

      if (testError) throw testError;
      const deployedTestId = testData.id;

      // 2. Loop through isolated section buckets sequentially to deploy child questions cleanly
      for (const sectionContainer of sections) {
        const activeSectionTitle = sectionContainer.sectionName.trim();

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
            let parsedArray = JSON.parse(group.json_paste);
            if (!Array.isArray(parsedArray)) throw new Error(`JSON container format mismatch inside section: ${activeSectionTitle}`);
            
            questionsToUpload = parsedArray.map((item: any) => {
              const opts = item.options || {};
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
                chapter: item.chapter || globalChapterTag || "General Layout Breakdown"
              };
            });
          } else {
            questionsToUpload = group.sub_questions.map((q) => ({
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
              chapter: q.chapter.trim() || globalChapterTag || "General Layout Breakdown"
            }));
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
                  <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><FolderOpen size={14} /> Deployment Route Hub</label>
                  <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-700 text-sm focus:bg-white focus:outline-none cursor-pointer">
                    <option value="combine-test">Combined Full-Scale Test Engine</option>
                    <option value="numerical-ability">Isolated - Quantitative Aptitude</option>
                    <option value="reasoning-ability">Isolated - Reasoning Ability</option>
                    <option value="english-language">Isolated - English Language</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-2"><Tag size={14} /> Global/Fallback Chapter Tag Designation</label>
                  <input type="text" value={globalChapterTag} onChange={(e) => setGlobalChapterTag(e.target.value)} className="w-full p-3 bg-purple-50/40 border border-purple-100 rounded-xl font-bold text-slate-800 text-sm focus:bg-white focus:outline-none" placeholder="e.g. Simplification Sets, Puzzles Core" />
                </div>
              </div>
            </div>

            {/* Structured Ordered Sections Layout Map rendering loops */}
            <div className="space-y-10">
              {sections.map((section, secIdx) => (
                <div key={section.id} className="bg-white rounded-2xl border-2 border-purple-200 shadow-md p-6 relative space-y-6">
                  <div className="absolute top-0 left-0 h-2.5 w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-600 rounded-t-xl"></div>
                  
                  {/* Section Frame Configuration Controls Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-purple-100 pb-4 mt-2">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-black uppercase px-3 py-1.5 bg-purple-950 text-white rounded-md tracking-wider shadow-xs">Section Row Rank #{secIdx + 1}</span>
                      <input 
                        type="text" 
                        value={section.sectionName} 
                        onChange={(e) => updateSectionMeta(section.id, "sectionName", e.target.value)}
                        className="p-2 bg-purple-50 border border-purple-100 rounded-lg text-sm font-black text-purple-950 focus:bg-white focus:outline-none min-w-[200px]"
                        placeholder="Section Identity Designation Name"
                      />
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

                  {/* Question Groups mapped natively strictly within this specific configured section context container */}
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
                            <textarea rows={8} value={group.json_paste} onChange={(e) => updateGroupMeta(section.id, group.id, "json_paste", e.target.value)} className="w-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-none leading-relaxed" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {group.sub_questions.map((q, qIdx) => (
                              <div key={qIdx} className="border border-slate-200 p-4 rounded-xl bg-white space-y-3 shadow-2xs">
                                <div className="flex justify-between items-center text-[10px] font-black border-b pb-1 text-slate-400 uppercase tracking-wider">
                                  <span>Objective Line Segment Row Item #{qIdx + 1}</span>
                                  {group.sub_questions.length > 1 && (
                                    <button onClick={() => removeQuestionFromGroup(section.id, group.id, qIdx)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={13}/></button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-md border text-[11px]">
                                    <Layers size={12} className="text-indigo-600" />
                                    <span className="font-bold text-slate-500 mr-1">Chapter Target Topic:</span>
                                    <input type="text" value={q.chapter} onChange={(e) => updateQuestionFields(section.id, group.id, qIdx, "chapter", e.target.value)} className="w-full bg-transparent font-bold text-slate-700 placeholder-slate-400 focus:outline-none" placeholder="Topic name tag override..." />
                                  </div>
                                </div>

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
              ))}
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

              {/* Dynamic Collapse Logic Mapping Area */}
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