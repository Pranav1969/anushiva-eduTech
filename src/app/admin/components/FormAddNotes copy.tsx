// // src/components/admin/cms/FormAddNotes.tsx
// "use client";
// import React, { useState, useEffect } from "react";
// import { Loader2, Save, Eye, Layers, FileText, ChevronRight } from "lucide-react";
// import { supabase } from "@/utils/supabase";
// import ImageManager from "./ImageManager";
// import NotesPreviewRenderer from "./NotesPreviewRenderer";

// interface FormAddNotesProps {
//   onSuccess: () => void;
// }

// export default function FormAddNotes({ onSuccess }: FormAddNotesProps) {
//   // Navigation Flow State Machine Tracker
//   const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
//   const [isSaving, setIsSaving] = useState(false);

//   // Structural Core Mapping Matrices
//   const [exams, setExams] = useState<any[]>([]);
//   const [sections, setSections] = useState<any[]>([]);
//   const [chapters, setChapters] = useState<any[]>([]);
//   const [topics, setTopics] = useState<any[]>([]);

//   // Selection Vectors
//   const [selectedExam, setSelectedExam] = useState("");
//   const [selectedSection, setSelectedSection] = useState("");
//   const [selectedChapter, setSelectedChapter] = useState("");
//   const [selectedTopic, setSelectedTopic] = useState("");

//   // Editor Working Content Trackers
//   const [topicContent, setTopicContent] = useState("");
//   const [selectedTopicTitle, setSelectedTopicTitle] = useState("");

//   useEffect(() => {
//     loadInitialExams();
//   }, []);

//   async function loadInitialExams() {
//     const { data } = await supabase.from("exams").select("*");
//     if (data) setExams(data);
//   }

//   // Chain cascaded lookups identically adhering to native schemas 
//   const handleExamChange = async (id: string) => {
//     setSelectedExam(id);
//     setSelectedSection(""); setSelectedChapter(""); setSelectedTopic(""); setTopicContent("");
//     const { data } = await supabase.from("sections").select("*"); // maps logically against global lists
//     if (data) setSections(data);
//   };

//   const handleSectionChange = async (id: string) => {
//     setSelectedSection(id);
//     setSelectedChapter(""); setSelectedTopic(""); setTopicContent("");
//     const { data } = await supabase.from("chapters").select("*").eq("section_id", id).order("chapter_order");
//     if (data) setChapters(data);
//   };

//   const handleChapterChange = async (id: string) => {
//     setSelectedChapter(id);
//     setSelectedTopic(""); setTopicContent("");
//     const { data } = await supabase.from("content_blocks").select("*").eq("chapter_id", id).order("topic_order");
//     if (data) setTopics(data);
//   };

//   const handleTopicSelect = (id: string) => {
//     setSelectedTopic(id);
//     const match = topics.find(t => t.id === id);
//     if (match) {
//       setTopicContent(match.topic_content || "");
//       setSelectedTopicTitle(match.topic_name || "");
//     }
//   };

//   const commitContentUpdate = async () => {
//     if (!selectedTopic) return;
//     try {
//       setIsSaving(true);
//       const { error } = await supabase
//         .from("content_blocks")
//         .update({ topic_content: topicContent })
//         .eq("id", selectedTopic);

//       if (error) throw error;
//       onSuccess();
//     } catch (err: any) {
//       alert("Pipeline Exception: " + err.message);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="w-full min-h-screen bg-[#020408] text-slate-100 flex flex-col font-sans">
      
//       {/* Dynamic Header Toolbar Option Grid */}
//       <header className="sticky top-0 z-50 bg-[#040814]/80 backdrop-blur-md border-b border-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
//         <div className="flex items-center gap-3">
//           <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
//             <Layers className="w-5 h-5 text-emerald-400" />
//           </div>
//           <div>
//             <h1 className="text-base font-bold text-slate-100 tracking-tight">Syllabus Engine Core</h1>
//             <p className="text-[11px] text-slate-500 tracking-wide font-mono">CMS Panel v2.4 // Active Relational Flow</p>
//           </div>
//         </div>

//         {/* Workspace Layout Toggle Switches */}
//         <div className="flex items-center gap-2 bg-[#090f1d] p-1 border border-slate-900 rounded-xl">
//           <button
//             onClick={() => setActiveTab("editor")}
//             className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "editor" ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
//           >
//             <FileText className="w-3.5 h-3.5" /> Editor Panel
//           </button>
//           <button
//             onClick={() => setActiveTab("preview")}
//             className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "preview" ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
//           >
//             <Eye className="w-3.5 h-3.5" /> Live Preview Container
//           </button>
//         </div>

//         {/* Global Pipeline Commit Interface Controller */}
//         <button
//           onClick={commitContentUpdate}
//           disabled={isSaving || !selectedTopic}
//           className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 border border-emerald-400/20 disabled:border-slate-800/60 text-slate-950 font-semibold px-5 py-2 rounded-xl text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/5 disabled:shadow-none"
//         >
//           {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
//           Commit Changes
//         </button>
//       </header>

//       {/* Main Relational Selector Grid Strip */}
//       <section className="bg-[#040814] border-b border-slate-900/50 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <div className="space-y-1">
//           <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Exam Vector</label>
//           <select value={selectedExam} onChange={(e) => handleExamChange(e.target.value)} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800">
//             <option value="">Select Exam Target...</option>
//             {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
//           </select>
//         </div>

//         <div className="space-y-1">
//           <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Section Node</label>
//           <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)} disabled={!selectedExam} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
//             <option value="">Select Section Axis...</option>
//             {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//           </select>
//         </div>

//         <div className="space-y-1">
//           <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Chapter Reference</label>
//           <select value={selectedChapter} onChange={(e) => handleChapterChange(e.target.value)} disabled={!selectedSection} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
//             <option value="">Select Chapter Core...</option>
//             {chapters.map(c => <option key={c.id} value={c.id}>{c.chapter_name}</option>)}
//           </select>
//         </div>

//         <div className="space-y-1">
//           <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Topic Instance Target</label>
//           <select value={selectedTopic} onChange={(e) => handleTopicSelect(e.target.value)} disabled={!selectedChapter} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
//             <option value="">Select Target Topic Block...</option>
//             {topics.map(t => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
//           </select>
//         </div>
//       </section>

//       {/* Main Operational Workspace Canvas */}
//       <main className="flex-1 p-6">
//         {activeTab === "editor" ? (
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] items-start">
            
//             {/* Input Component Text Block Panel */}
//             <div className="lg:col-span-2 flex flex-col h-full bg-[#040814] border border-slate-900 rounded-xl overflow-hidden relative">
              
//               {/* Context Formatting Toolbar Guide Strip */}
//               <div className="bg-[#070c19] px-4 py-2.5 border-b border-slate-900 flex items-center justify-between text-slate-400 text-xs">
//                 <span className="font-mono text-[11px] text-slate-400">Syntax Helpers: <code className="text-emerald-400 bg-slate-950 px-1 rounded">## Heading</code> <code className="text-emerald-400 bg-slate-950 px-1 rounded">&gt; Blockquote</code> <code className="text-emerald-400 bg-slate-950 px-1 rounded">[img:name]</code></span>
//                 <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">Workspace Slate</span>
//               </div>

//               {/* Working Text Input Area */}
//               <div className="flex-1 relative">
//                 <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-slate-900 pointer-events-none" />
//                 <textarea
//                   value={topicContent}
//                   onChange={(e) => setTopicContent(e.target.value)}
//                   placeholder="Initiate text entry. Reference active media layers or use text headers natively..."
//                   disabled={!selectedTopic}
//                   className="w-full h-full bg-transparent p-6 pl-8 text-sm text-slate-200 font-mono tracking-wide leading-relaxed outline-none resize-none disabled:opacity-30 disabled:cursor-not-allowed placeholder:text-slate-700"
//                 />
//               </div>
//             </div>

//             {/* Right Asset Drawer Column Grid */}
//             <div className="h-full overflow-y-auto custom-scrollbar">
//               <ImageManager />
//             </div>
//           </div>
//         ) : (
//           /* Live Sandbox Unified Preview View System */
//           <div className="w-full h-[calc(100vh-190px)] max-w-5xl mx-auto">
//             <NotesPreviewRenderer title={selectedTopicTitle} content={topicContent} />
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }