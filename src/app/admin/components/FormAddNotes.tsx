// src/components/admin/cms/FormAddNotes.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Save, Eye, Layers, FileText, Plus, X, FolderPlus } from "lucide-react";
import { supabase } from "@/utils/supabase";
import ImageManager from "./ImageManager";
import NotesPreviewRenderer from "./NotesPreviewRenderer";

interface FormAddNotesProps {
  onSuccess: () => void;
}

export default function FormAddNotes({ onSuccess }: FormAddNotesProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingNewNode, setIsProcessingNewNode] = useState(false);

  const [exams, setExams] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");

  const [topicContent, setTopicContent] = useState("");
  const [selectedTopicTitle, setSelectedTopicTitle] = useState("");

  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  const [newExamName, setNewExamName] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");

  // Target Sequence States allowing manual entry overrides
  const [newChapterOrder, setNewChapterOrder] = useState("");
  const [newTopicOrder, setNewTopicOrder] = useState("");

  useEffect(() => {
    loadInitialExams();
  }, []);

  async function loadInitialExams() {
    const { data } = await supabase.from("exams").select("*");
    if (data) setExams(data);
  }

  const handleExamChange = async (id: string) => {
    setSelectedExam(id);
    setSelectedSection(""); setSelectedChapter(""); setSelectedTopic(""); setTopicContent("");
    setSections([]); setChapters([]); setTopics([]);
    setIsCreatingSection(false); setIsCreatingChapter(false); setIsCreatingTopic(false);
    
    if (!id) return;
    
    const { data } = await supabase
      .from("notes_sections")
      .select("*")
      .eq("exam_id", id);
    if (data) setSections(data);
  };

  const handleSectionChange = async (id: string) => {
    setSelectedSection(id);
    setSelectedChapter(""); setSelectedTopic(""); setTopicContent("");
    setChapters([]); setTopics([]);
    setIsCreatingChapter(false); setIsCreatingTopic(false);
    
    if (!id) return;
    
    const { data } = await supabase
      .from("notes_chapters")
      .select("*")
      .eq("section_id", id)
      .order("sequence_order");
    if (data) {
      setChapters(data);
      // Auto-set the next order fallback layout index
      setNewChapterOrder((data.length + 1).toString());
    }
  };

  const handleChapterChange = async (id: string) => {
    setSelectedChapter(id);
    setSelectedTopic(""); setTopicContent("");
    setTopics([]);
    setIsCreatingTopic(false);
    
    if (!id) return;
    
    const { data } = await supabase
      .from("notes_topics")
      .select("*")
      .eq("chapter_id", id)
      .order("sequence_order");
    if (data) {
      setTopics(data);
      // Auto-set the next order fallback layout index
      setNewTopicOrder((data.length + 1).toString());
    }
  };

  const handleTopicSelect = (id: string) => {
    setSelectedTopic(id);
    const match = topics.find(t => t.id === id);
    if (match) {
      setTopicContent(match.paragraph_text || "");
      setSelectedTopicTitle(match.name || "");
    } else {
      setTopicContent("");
      setSelectedTopicTitle("");
    }
  };
  
  const handleCreateExam = async () => {
    if (!newExamName.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const examPayload = { name: newExamName.trim() };
      
      const { data, error } = await supabase
        .from("exams")
        .insert(examPayload)
        .select()
        .single();
      
      if (error) throw error;
      setExams([...exams, data]);
      setSelectedExam(data.id);
      setIsCreatingExam(false);
      setNewExamName("");
      handleExamChange(data.id);
    } catch (err: any) {
      alert("Error committing Exam entity: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim() || !selectedExam) return;
    try {
      setIsProcessingNewNode(true);
      const { data, error } = await supabase
        .from("notes_sections") 
        .insert({ 
          exam_id: selectedExam, 
          name: newSectionName.trim() 
        })
        .select()
        .single();

      if (error) throw error;
      setSections([...sections, data]);
      setSelectedSection(data.id);
      setIsCreatingSection(false);
      setNewSectionName("");
      handleSectionChange(data.id);
    } catch (err: any) {
      alert("Error committing Section axis: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreateChapter = async () => {
    if (!newChapterName.trim() || !selectedSection) return;
    try {
      setIsProcessingNewNode(true);
      
      // Parse manual input value or fall back to length calculation
      const customOrder = parseInt(newChapterOrder, 10);
      const targetOrder = isNaN(customOrder) ? chapters.length + 1 : customOrder;

      const { data, error } = await supabase
        .from("notes_chapters")
        .insert({ 
          name: newChapterName.trim(), 
          section_id: selectedSection,
          sequence_order: targetOrder
        })
        .select()
        .single();

      if (error) throw error;
      const updatedChapters = [...chapters, data].sort((a, b) => a.sequence_order - b.sequence_order);
      setChapters(updatedChapters);
      setSelectedChapter(data.id);
      setIsCreatingChapter(false);
      setNewChapterName("");
      handleChapterChange(data.id);
    } catch (err: any) {
      alert("Error committing Chapter index: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !selectedChapter) return;
    try {
      setIsProcessingNewNode(true);

      // Parse manual input value or fall back to length calculation
      const customOrder = parseInt(newTopicOrder, 10);
      const targetOrder = isNaN(customOrder) ? topics.length + 1 : customOrder;

      const { data, error } = await supabase
        .from("notes_topics")
        .insert({ 
          name: newTopicName.trim(), 
          chapter_id: selectedChapter,
          sequence_order: targetOrder,
          paragraph_text: ""
        })
        .select()
        .single();

      if (error) throw error;
      const updatedTopics = [...topics, data].sort((a, b) => a.sequence_order - b.sequence_order);
      setTopics(updatedTopics);
      setSelectedTopic(data.id);
      setSelectedTopicTitle(data.name);
      setTopicContent("");
      setIsCreatingTopic(false);
      setNewTopicName("");
    } catch (err: any) {
      alert("Error committing Topic workspace block: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const commitContentUpdate = async () => {
    if (!selectedTopic) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("notes_topics")
        .update({ paragraph_text: topicContent })
        .eq("id", selectedTopic);

      if (error) throw error;
      
      setTopics(prev => prev.map(t => t.id === selectedTopic ? { ...t, paragraph_text: topicContent } : t));
      onSuccess();
    } catch (err: any) {
      alert("Pipeline Exception: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#020408] text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[#040814]/80 backdrop-blur-md border-b border-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight">Syllabus Engine Core</h1>
            <p className="text-[11px] text-slate-500 tracking-wide font-mono">CMS Panel v3.5 // Reconciled UUID Constraints Schema</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#090f1d] p-1 border border-slate-900 rounded-xl">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "editor" ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <FileText className="w-3.5 h-3.5" /> Editor Panel
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${activeTab === "preview" ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Eye className="w-3.5 h-3.5" /> Live Preview Container
          </button>
        </div>

        <button
          onClick={commitContentUpdate}
          disabled={isSaving || !selectedTopic}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-900 disabled:text-slate-600 border border-emerald-400/20 disabled:border-slate-800/60 text-slate-950 font-semibold px-5 py-2 rounded-xl text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/5 disabled:shadow-none"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Commit Changes
        </button>
      </header>

      <section className="bg-[#040814] border-b border-slate-900/50 px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Exam Vector</label>
            {!isCreatingExam ? (
              <button onClick={() => setIsCreatingExam(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                <Plus className="w-2.5 h-2.5" /> Create New
              </button>
            ) : (
              <button onClick={() => setIsCreatingExam(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            )}
          </div>
          {isCreatingExam ? (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Enter new exam..."
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                className="flex-1 bg-[#070c19] border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              />
              <button onClick={handleCreateExam} disabled={isProcessingNewNode} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-2.5 flex items-center justify-center disabled:opacity-50">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white" />}
              </button>
            </div>
          ) : (
            <select value={selectedExam} onChange={(e) => handleExamChange(e.target.value)} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800">
              <option value="">Select Exam Target...</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Section Node</label>
            {selectedExam && (!isCreatingSection ? (
              <button onClick={() => setIsCreatingSection(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                <Plus className="w-2.5 h-2.5" /> Create New
              </button>
            ) : (
              <button onClick={() => setIsCreatingSection(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingSection ? (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Enter new section..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="flex-1 bg-[#070c19] border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              />
              <button onClick={handleCreateSection} disabled={isProcessingNewNode} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-2.5 flex items-center justify-center disabled:opacity-50">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white" />}
              </button>
            </div>
          ) : (
            <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)} disabled={!selectedExam} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
              <option value="">Select Section Axis...</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Chapter Reference</label>
            {selectedSection && (!isCreatingChapter ? (
              <button onClick={() => setIsCreatingChapter(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                <Plus className="w-2.5 h-2.5" /> Create New
              </button>
            ) : (
              <button onClick={() => setIsCreatingChapter(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingChapter ? (
            <div className="flex gap-1.5">
              <input
                type="number"
                placeholder="Seq"
                title="Sequence Order"
                value={newChapterOrder}
                onChange={(e) => setNewChapterOrder(e.target.value)}
                className="w-16 bg-[#070c19] border border-indigo-500/40 rounded-xl px-2 py-1.5 text-xs text-center text-slate-200 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
              <input
                type="text"
                placeholder="Enter new chapter name..."
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                className="flex-1 bg-[#070c19] border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              />
              <button onClick={handleCreateChapter} disabled={isProcessingNewNode} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-2.5 flex items-center justify-center disabled:opacity-50 shrink-0">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white" />}
              </button>
            </div>
          ) : (
            <select value={selectedChapter} onChange={(e) => handleChapterChange(e.target.value)} disabled={!selectedSection} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
              <option value="">Select Chapter Core...</option>
              {chapters.map(c => <option key={c.id} value={c.id}>({c.sequence_order}) {c.name}</option>)}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Topic Instance Target</label>
            {selectedChapter && (!isCreatingTopic ? (
              <button onClick={() => setIsCreatingTopic(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                <Plus className="w-2.5 h-2.5" /> Create New
              </button>
            ) : (
              <button onClick={() => setIsCreatingTopic(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingTopic ? (
            <div className="flex gap-1.5">
              <input
                type="number"
                placeholder="Seq"
                title="Sequence Order"
                value={newTopicOrder}
                onChange={(e) => setNewTopicOrder(e.target.value)}
                className="w-16 bg-[#070c19] border border-indigo-500/40 rounded-xl px-2 py-1.5 text-xs text-center text-slate-200 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:margin-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:margin-0 [&::-webkit-inner-spin-button]:appearance-none"
              />
              <input
                type="text"
                placeholder="Enter new topic name..."
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                className="flex-1 bg-[#070c19] border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              />
              <button onClick={handleCreateTopic} disabled={isProcessingNewNode} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-2.5 flex items-center justify-center disabled:opacity-50 shrink-0">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white" />}
              </button>
            </div>
          ) : (
            <select value={selectedTopic} onChange={(e) => handleTopicSelect(e.target.value)} disabled={!selectedChapter} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
              <option value="">Select Target Topic Block...</option>
              {topics.map(t => <option key={t.id} value={t.id}>({t.sequence_order}) {t.name}</option>)}
            </select>
          )}
        </div>
      </section>

      <main className="flex-1 p-6">
        {!selectedTopic ? (
          <div className="max-w-xl mx-auto my-16 bg-[#040814] border border-slate-900 p-8 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">No Syllabus Topic Active</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Choose an existing structure from the selector tracks above, or use the <span className="text-indigo-400 font-medium">"Create New"</span> actions to initialize an entry immediately.
              </p>
            </div>
          </div>
        ) : activeTab === "editor" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)] items-start">
            <div className="lg:col-span-2 flex flex-col h-full bg-[#040814] border border-slate-900 rounded-xl overflow-hidden relative">
              <div className="bg-[#070c19] px-4 py-2.5 border-b border-slate-900 flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono text-[11px] text-slate-400">
                  Syntax Helpers: <code className="text-emerald-400 bg-slate-950 px-1 rounded">## Heading</code> <code className="text-emerald-400 bg-slate-950 px-1 rounded">&gt; Blockquote</code> <code className="text-emerald-400 bg-slate-950 px-1 rounded">[img:name]</code>
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-500">Workspace Slate</span>
              </div>

              <div className="flex-1 relative">
                <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-slate-900 pointer-events-none" />
                <textarea
                  value={topicContent}
                  onChange={(e) => setTopicContent(e.target.value)}
                  placeholder="Initiate text entry. Reference active media layers or use text headers natively..."
                  className="w-full h-full bg-transparent p-6 pl-8 text-sm text-slate-200 font-mono tracking-wide leading-relaxed outline-none resize-none placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="h-full overflow-y-auto custom-scrollbar">
              <ImageManager />
            </div>
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-210px)] max-w-5xl mx-auto">
            <NotesPreviewRenderer title={selectedTopicTitle} content={topicContent} />
          </div>
        )}
      </main>
    </div>
  );
}