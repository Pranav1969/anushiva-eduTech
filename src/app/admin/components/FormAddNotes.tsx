// src/app/admin/components/FormAddNotes.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Save, Eye, Layers, FileText, Plus, X, FolderPlus, Trash2, Edit2, Check, Languages, Sparkles } from "lucide-react";
import { supabase } from "@/utils/supabase";
import ImageManager from "./ImageManager";
import NotesPreviewRenderer from "./NotesPreviewRenderer";

interface FormAddNotesProps {
  onSuccess: () => void;
}

interface DeleteModalState {
  isOpen: boolean;
  type: "exam" | "section" | "phase" | "chapter" | "topic" | null;
  expectedName: string;
  onConfirm: () => Promise<void>;
}

interface TrilingualNameValue {
  en: string;
  hi: string;
  mr: string;
}

// Compact EN/HI/MR title input used for section/phase/chapter/topic
// create + edit forms. English drives the "Auto" translate button since
// hi/mr are derived from it; both translated fields stay freely editable.
function TrilingualNameFields({
  value,
  onChange,
  onTranslate,
  isTranslating,
  placeholderPrefix,
  accentBorderClass = "border-indigo-500/40",
}: {
  value: TrilingualNameValue;
  onChange: (next: TrilingualNameValue) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  placeholderPrefix: string;
  accentBorderClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <input
          type="text"
          placeholder={`${placeholderPrefix} (English)`}
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
          className={`flex-1 bg-[#070c19] border ${accentBorderClass} rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-700 outline-none`}
        />
        <button
          type="button"
          onClick={onTranslate}
          disabled={isTranslating || !value.en.trim()}
          title="Auto-fill Hindi + Marathi from the English title"
          className="shrink-0 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 disabled:opacity-30 px-2 rounded-lg flex items-center justify-center transition-all"
        >
          {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        </button>
      </div>
      <input
        type="text"
        dir="auto"
        placeholder={`${placeholderPrefix} (हिंदी) -- optional`}
        value={value.hi}
        onChange={(e) => onChange({ ...value, hi: e.target.value })}
        className="bg-[#070c19] border border-slate-900 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-slate-800"
      />
      <input
        type="text"
        dir="auto"
        placeholder={`${placeholderPrefix} (मराठी) -- optional`}
        value={value.mr}
        onChange={(e) => onChange({ ...value, mr: e.target.value })}
        className="bg-[#070c19] border border-slate-900 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-slate-800"
      />
    </div>
  );
}

export default function FormAddNotes({ onSuccess }: FormAddNotesProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingNewNode, setIsProcessingNewNode] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [exams, setExams] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  
  type LangCode = "en" | "hi" | "mr";
  const LANGS: { code: LangCode; label: string }[] = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
    { code: "mr", label: "मराठी" },
  ];

  const [topicContent, setTopicContent] = useState<Record<LangCode, string>>({ en: "", hi: "", mr: "" });
  const [activeContentLang, setActiveContentLang] = useState<LangCode>("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState("");
  
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isCreatingPhase, setIsCreatingPhase] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  
  interface TrilingualName {
    en: string;
    hi: string;
    mr: string;
  }
  const EMPTY_NAME: TrilingualName = { en: "", hi: "", mr: "" };

  const [newExamName, setNewExamName] = useState("");
  const [newSectionName, setNewSectionName] = useState<TrilingualName>(EMPTY_NAME);
  const [newPhaseName, setNewPhaseName] = useState<TrilingualName>(EMPTY_NAME);
  const [newChapterName, setNewChapterName] = useState<TrilingualName>(EMPTY_NAME);
  const [newTopicName, setNewTopicName] = useState<TrilingualName>(EMPTY_NAME);
  
  const [newPhaseOrder, setNewPhaseOrder] = useState("");
  const [newChapterOrder, setNewChapterOrder] = useState("");
  const [newTopicOrder, setNewTopicOrder] = useState("");

  // Edit Option States
  const [isEditingExamName, setIsEditingExamName] = useState(false);
  const [isEditingSectionName, setIsEditingSectionName] = useState(false);
  const [isEditingPhaseName, setIsEditingPhaseName] = useState(false);
  const [isEditingChapterName, setIsEditingChapterName] = useState(false);
  const [isEditingTopicName, setIsEditingTopicName] = useState(false);

  const [editExamName, setEditExamName] = useState("");
  const [editSectionName, setEditSectionName] = useState<TrilingualName>(EMPTY_NAME);
  const [editPhaseName, setEditPhaseName] = useState<TrilingualName>(EMPTY_NAME);
  const [editChapterName, setEditChapterName] = useState<TrilingualName>(EMPTY_NAME);
  const [editTopicName, setEditTopicName] = useState<TrilingualName>(EMPTY_NAME);

  // Per-level "translating" flags for the name auto-translate buttons
  const [isTranslatingSectionName, setIsTranslatingSectionName] = useState(false);
  const [isTranslatingPhaseName, setIsTranslatingPhaseName] = useState(false);
  const [isTranslatingChapterName, setIsTranslatingChapterName] = useState(false);
  const [isTranslatingTopicNameField, setIsTranslatingTopicNameField] = useState(false);

  // Shared helper: calls the lightweight label-translation endpoint and
  // returns {hi, mr}, or null (with an alert) on failure.
  const translateLabel = async (text: string): Promise<{ hi: string; mr: string } | null> => {
    if (!text.trim()) {
      alert("Enter the English title first -- translation needs a source to work from.");
      return null;
    }
    try {
      const res = await fetch("/api/admin/translate-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `Translation request failed (${res.status})`);
      }
      return { hi: result.hi, mr: result.mr };
    } catch (err: any) {
      alert("Auto-translate failed: " + err.message);
      return null;
    }
  };

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    type: null,
    expectedName: "",
    onConfirm: async () => {},
  });
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

  useEffect(() => {
    loadInitialExams();
  }, []);

  async function loadInitialExams() {
    const { data } = await supabase.from("exams").select("*");
    if (data) setExams(data);
  }

  const handleExamChange = async (id: string) => {
    setSelectedExam(id);
    setSelectedSection(""); setSelectedPhase(""); setSelectedChapter(""); setSelectedTopic(""); setTopicContent({ en: "", hi: "", mr: "" });
    setSections([]); setPhases([]); setChapters([]); setTopics([]);
    setIsCreatingSection(false); setIsCreatingPhase(false); setIsCreatingChapter(false); setIsCreatingTopic(false);
    setIsEditingExamName(false); setIsEditingSectionName(false); setIsEditingPhaseName(false); setIsEditingChapterName(false); setIsEditingTopicName(false);
    if (!id) return;
    const match = exams.find(e => e.id === id);
    if (match) setEditExamName(match.name);
    const { data } = await supabase
      .from("notes_sections")
      .select("*")
      .eq("exam_id", id);
    if (data) setSections(data);
  };

  const handleSectionChange = async (id: string) => {
    setSelectedSection(id);
    setSelectedPhase(""); setSelectedChapter(""); setSelectedTopic(""); setTopicContent({ en: "", hi: "", mr: "" });
    setPhases([]); setChapters([]); setTopics([]);
    setIsCreatingPhase(false); setIsCreatingChapter(false); setIsCreatingTopic(false);
    setIsEditingSectionName(false); setIsEditingPhaseName(false); setIsEditingChapterName(false); setIsEditingTopicName(false);
    if (!id) return;
    const match = sections.find(s => s.id === id);
    if (match) setEditSectionName({ en: match.name_en || "", hi: match.name_hi || "", mr: match.name_mr || "" });
    const { data } = await supabase
      .from("notes_phases")
      .select("*")
      .eq("section_id", id)
      .order("sequence_order");
    if (data) {
      setPhases(data);
      setNewPhaseOrder((data.length + 1).toString());
    }
  };

  const handlePhaseChange = async (id: string) => {
    setSelectedPhase(id);
    setSelectedChapter(""); setSelectedTopic(""); setTopicContent({ en: "", hi: "", mr: "" });
    setChapters([]); setTopics([]);
    setIsCreatingChapter(false); setIsCreatingTopic(false);
    setIsEditingPhaseName(false); setIsEditingChapterName(false); setIsEditingTopicName(false);
    if (!id) return;
    const match = phases.find(p => p.id === id);
    if (match) setEditPhaseName({ en: match.name_en || "", hi: match.name_hi || "", mr: match.name_mr || "" });
    const { data } = await supabase
      .from("notes_chapters")
      .select("*")
      .eq("phase_id", id)
      .order("sequence_order");
    if (data) {
      setChapters(data);
      setNewChapterOrder((data.length + 1).toString());
    }
  };

  const handleChapterChange = async (id: string) => {
    setSelectedChapter(id);
    setSelectedTopic(""); setTopicContent({ en: "", hi: "", mr: "" });
    setTopics([]);
    setIsCreatingTopic(false);
    setIsEditingChapterName(false); setIsEditingTopicName(false);
    if (!id) return;
    const match = chapters.find(c => c.id === id);
    if (match) setEditChapterName({ en: match.name_en || "", hi: match.name_hi || "", mr: match.name_mr || "" });
    const { data } = await supabase
      .from("notes_topics")
      .select("*")
      .eq("chapter_id", id)
      .order("sequence_order");
    if (data) {
      setTopics(data);
      setNewTopicOrder((data.length + 1).toString());
    }
  };

  const handleTopicSelect = (id: string) => {
    setSelectedTopic(id);
    setIsEditingTopicName(false);
    const match = topics.find(t => t.id === id);
    if (match) {
      setTopicContent({
        en: match.paragraph_text_en || "",
        hi: match.paragraph_text_hi || "",
        mr: match.paragraph_text_mr || "",
      });
      setSelectedTopicTitle(match.name_en || "");
      setEditTopicName({ en: match.name_en || "", hi: match.name_hi || "", mr: match.name_mr || "" });
    } else {
      setTopicContent({ en: "", hi: "", mr: "" });
      setSelectedTopicTitle("");
      setEditTopicName(EMPTY_NAME);
    }
    setActiveContentLang("en");
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
    if (!newSectionName.en.trim() || !selectedExam) return;
    try {
      setIsProcessingNewNode(true);
      const { data, error } = await supabase
        .from("notes_sections")
        .insert({
          exam_id: selectedExam,
          name_en: newSectionName.en.trim(),
          name_hi: newSectionName.hi.trim() || null,
          name_mr: newSectionName.mr.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      setSections([...sections, data]);
      setSelectedSection(data.id);
      setIsCreatingSection(false);
      setNewSectionName(EMPTY_NAME);
      handleSectionChange(data.id);
    } catch (err: any) {
      alert("Error committing Section axis: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreatePhase = async () => {
    if (!newPhaseName.en.trim() || !selectedSection) return;
    try {
      setIsProcessingNewNode(true);
      const customOrder = parseInt(newPhaseOrder, 10);
      const targetOrder = isNaN(customOrder) ? phases.length + 1 : customOrder;
      const { data, error } = await supabase
        .from("notes_phases")
        .insert({
          section_id: selectedSection,
          name_en: newPhaseName.en.trim(),
          name_hi: newPhaseName.hi.trim() || null,
          name_mr: newPhaseName.mr.trim() || null,
          sequence_order: targetOrder
        })
        .select()
        .single();
      if (error) throw error;
      const updatedPhases = [...phases, data].sort((a, b) => a.sequence_order - b.sequence_order);
      setPhases(updatedPhases);
      setSelectedPhase(data.id);
      setIsCreatingPhase(false);
      setNewPhaseName(EMPTY_NAME);
      handlePhaseChange(data.id);
    } catch (err: any) {
      alert("Error committing Phase spectrum: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreateChapter = async () => {
    if (!newChapterName.en.trim() || !selectedPhase) return;
    try {
      setIsProcessingNewNode(true);
      const customOrder = parseInt(newChapterOrder, 10);
      const targetOrder = isNaN(customOrder) ? chapters.length + 1 : customOrder;
      const { data, error } = await supabase
        .from("notes_chapters")
        .insert({
          name_en: newChapterName.en.trim(),
          name_hi: newChapterName.hi.trim() || null,
          name_mr: newChapterName.mr.trim() || null,
          phase_id: selectedPhase,
          sequence_order: targetOrder
        })
        .select()
        .single();
      if (error) throw error;
      const updatedChapters = [...chapters, data].sort((a, b) => a.sequence_order - b.sequence_order);
      setChapters(updatedChapters);
      setSelectedChapter(data.id);
      setIsCreatingChapter(false);
      setNewChapterName(EMPTY_NAME);
      handleChapterChange(data.id);
    } catch (err: any) {
      alert("Error committing Chapter index: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.en.trim() || !selectedChapter) return;
    try {
      setIsProcessingNewNode(true);
      const customOrder = parseInt(newTopicOrder, 10);
      const targetOrder = isNaN(customOrder) ? topics.length + 1 : customOrder;
      const { data, error } = await supabase
        .from("notes_topics")
        .insert({
          name_en: newTopicName.en.trim(),
          name_hi: newTopicName.hi.trim() || null,
          name_mr: newTopicName.mr.trim() || null,
          chapter_id: selectedChapter,
          sequence_order: targetOrder,
          paragraph_text_en: ""
        })
        .select()
        .single();
      if (error) throw error;
      const updatedTopics = [...topics, data].sort((a, b) => a.sequence_order - b.sequence_order);
      setTopics(updatedTopics);
      setSelectedTopic(data.id);
      setSelectedTopicTitle(data.name_en);
      setTopicContent({ en: "", hi: "", mr: "" });
      setActiveContentLang("en");
      setIsCreatingTopic(false);
      setNewTopicName(EMPTY_NAME);
    } catch (err: any) {
      alert("Error committing Topic workspace block: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleUpdateExam = async () => {
    if (!selectedExam || !editExamName.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const { error } = await supabase
        .from("exams")
        .update({ name: editExamName.trim() })
        .eq("id", selectedExam);
      if (error) throw error;
      setExams(prev => prev.map(e => e.id === selectedExam ? { ...e, name: editExamName.trim() } : e));
      setIsEditingExamName(false);
    } catch (err: any) {
      alert("Error updating Exam: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleUpdateSection = async () => {
    if (!selectedSection || !editSectionName.en.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const { error } = await supabase
        .from("notes_sections")
        .update({
          name_en: editSectionName.en.trim(),
          name_hi: editSectionName.hi.trim() || null,
          name_mr: editSectionName.mr.trim() || null,
        })
        .eq("id", selectedSection);
      if (error) throw error;
      setSections(prev => prev.map(s => s.id === selectedSection ? {
        ...s,
        name_en: editSectionName.en.trim(),
        name_hi: editSectionName.hi.trim() || null,
        name_mr: editSectionName.mr.trim() || null,
      } : s));
      setIsEditingSectionName(false);
    } catch (err: any) {
      alert("Error updating Section: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleUpdatePhase = async () => {
    if (!selectedPhase || !editPhaseName.en.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const { error } = await supabase
        .from("notes_phases")
        .update({
          name_en: editPhaseName.en.trim(),
          name_hi: editPhaseName.hi.trim() || null,
          name_mr: editPhaseName.mr.trim() || null,
        })
        .eq("id", selectedPhase);
      if (error) throw error;
      setPhases(prev => prev.map(p => p.id === selectedPhase ? {
        ...p,
        name_en: editPhaseName.en.trim(),
        name_hi: editPhaseName.hi.trim() || null,
        name_mr: editPhaseName.mr.trim() || null,
      } : p));
      setIsEditingPhaseName(false);
    } catch (err: any) {
      alert("Error updating Phase: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleUpdateChapter = async () => {
    if (!selectedChapter || !editChapterName.en.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const { error } = await supabase
        .from("notes_chapters")
        .update({
          name_en: editChapterName.en.trim(),
          name_hi: editChapterName.hi.trim() || null,
          name_mr: editChapterName.mr.trim() || null,
        })
        .eq("id", selectedChapter);
      if (error) throw error;
      setChapters(prev => prev.map(c => c.id === selectedChapter ? {
        ...c,
        name_en: editChapterName.en.trim(),
        name_hi: editChapterName.hi.trim() || null,
        name_mr: editChapterName.mr.trim() || null,
      } : c));
      setIsEditingChapterName(false);
    } catch (err: any) {
      alert("Error updating Chapter: " + err.message);
    } finally {
      setIsProcessingNewNode(false);
    }
  };

  const handleUpdateTopic = async () => {
    if (!selectedTopic || !editTopicName.en.trim()) return;
    try {
      setIsProcessingNewNode(true);
      const { error } = await supabase
        .from("notes_topics")
        .update({
          name_en: editTopicName.en.trim(),
          name_hi: editTopicName.hi.trim() || null,
          name_mr: editTopicName.mr.trim() || null,
        })
        .eq("id", selectedTopic);
      if (error) throw error;
      setTopics(prev => prev.map(t => t.id === selectedTopic ? {
        ...t,
        name_en: editTopicName.en.trim(),
        name_hi: editTopicName.hi.trim() || null,
        name_mr: editTopicName.mr.trim() || null,
      } : t));
      setSelectedTopicTitle(editTopicName.en.trim());
      setIsEditingTopicName(false);
    } catch (err: any) {
      alert("Error updating Topic: " + err.message);
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
        .update({
          paragraph_text_en: topicContent.en,
          paragraph_text_hi: topicContent.hi,
          paragraph_text_mr: topicContent.mr,
        })
        .eq("id", selectedTopic);
      if (error) throw error;
      setTopics(prev => prev.map(t => t.id === selectedTopic ? {
        ...t,
        paragraph_text_en: topicContent.en,
        paragraph_text_hi: topicContent.hi,
        paragraph_text_mr: topicContent.mr,
      } : t));
      onSuccess();
    } catch (err: any) {
      alert("Pipeline Exception: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calls Gemini (via /api/admin/translate-topic) to auto-fill Hindi and
  // Marathi from the current English draft. This only updates local editor
  // state -- the admin still reviews the result and hits "Commit Changes"
  // to persist it, same as any manual edit.
  const handleAutoTranslate = async () => {
    if (!topicContent.en.trim()) {
      alert("Write the English content first -- translation needs a source to work from.");
      return;
    }
    try {
      setIsTranslating(true);
      const res = await fetch("/api/admin/translate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: topicContent.en }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || `Translation request failed (${res.status})`);
      }
      setTopicContent(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
      setActiveContentLang("hi");
    } catch (err: any) {
      alert("Auto-translate failed: " + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;
    const target = exams.find(e => e.id === selectedExam);
    if (!target) return;
    setDeleteConfirmationInput("");
    setDeleteModal({
      isOpen: true,
      type: "exam",
      expectedName: target.name,
      onConfirm: async () => {
        try {
          setIsDeleting("exam");
          const { error } = await supabase.from("exams").delete().eq("id", selectedExam);
          if (error) throw error;
          setExams(prev => prev.filter(e => e.id !== selectedExam));
          handleExamChange("");
          onSuccess();
        } catch (err: any) {
          alert("Error removing Exam structure: " + err.message);
        } finally {
          setIsDeleting(null);
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    const target = sections.find(s => s.id === selectedSection);
    if (!target) return;
    setDeleteConfirmationInput("");
    setDeleteModal({
      isOpen: true,
      type: "section",
      expectedName: target.name_en,
      onConfirm: async () => {
        try {
          setIsDeleting("section");
          const { error } = await supabase.from("notes_sections").delete().eq("id", selectedSection);
          if (error) throw error;
          setSections(prev => prev.filter(s => s.id !== selectedSection));
          handleSectionChange("");
          onSuccess();
        } catch (err: any) {
          alert("Error removing Section node: " + err.message);
        } finally {
          setIsDeleting(null);
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeletePhase = async () => {
    if (!selectedPhase) return;
    const target = phases.find(p => p.id === selectedPhase);
    if (!target) return;
    setDeleteConfirmationInput("");
    setDeleteModal({
      isOpen: true,
      type: "phase",
      expectedName: target.name_en,
      onConfirm: async () => {
        try {
          setIsDeleting("phase");
          const { error } = await supabase.from("notes_phases").delete().eq("id", selectedPhase);
          if (error) throw error;
          setPhases(prev => prev.filter(p => p.id !== selectedPhase));
          handlePhaseChange("");
          onSuccess();
        } catch (err: any) {
          alert("Error removing Phase element: " + err.message);
        } finally {
          setIsDeleting(null);
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteChapter = async () => {
    if (!selectedChapter) return;
    const target = chapters.find(c => c.id === selectedChapter);
    if (!target) return;
    setDeleteConfirmationInput("");
    setDeleteModal({
      isOpen: true,
      type: "chapter",
      expectedName: target.name_en,
      onConfirm: async () => {
        try {
          setIsDeleting("chapter");
          const { error } = await supabase.from("notes_chapters").delete().eq("id", selectedChapter);
          if (error) throw error;
          setChapters(prev => prev.filter(c => c.id !== selectedChapter));
          handleChapterChange("");
          onSuccess();
        } catch (err: any) {
          alert("Error removing Chapter asset: " + err.message);
        } finally {
          setIsDeleting(null);
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteTopic = async () => {
    if (!selectedTopic) return;
    const target = topics.find(t => t.id === selectedTopic);
    if (!target) return;
    setDeleteConfirmationInput("");
    setDeleteModal({
      isOpen: true,
      type: "topic",
      expectedName: target.name_en,
      onConfirm: async () => {
        try {
          setIsDeleting("topic");
          const { error } = await supabase.from("notes_topics").delete().eq("id", selectedTopic);
          if (error) throw error;
          setTopics(prev => prev.filter(t => t.id !== selectedTopic));
          setSelectedTopic("");
          setTopicContent({ en: "", hi: "", mr: "" });
          setSelectedTopicTitle("");
          onSuccess();
        } catch (err: any) {
          alert("Error removing Topic leaf entry: " + err.message);
        } finally {
          setIsDeleting(null);
          setDeleteModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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
            <p className="text-[11px] text-slate-500 tracking-wide font-mono">CMS Panel v4.0 // Extended Learning Phases Schema</p>
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

      <section className="bg-[#040814] border-b border-slate-900/50 px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Exam Selection Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Exam Vector</label>
            {!isCreatingExam ? (
              <div className="flex gap-2">
                {selectedExam && (
                  <button onClick={() => setIsEditingExamName(!isEditingExamName)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-2.5 h-2.5" /> {isEditingExamName ? "Cancel" : "Edit"}
                  </button>
                )}
                <button onClick={() => setIsCreatingExam(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Create New
                </button>
              </div>
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
          ) : isEditingExamName && selectedExam ? (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Edit exam name..."
                value={editExamName}
                onChange={(e) => setEditExamName(e.target.value)}
                className="flex-1 bg-[#070c19] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none"
              />
              <button onClick={handleUpdateExam} disabled={isProcessingNewNode} className="bg-amber-600 hover:bg-amber-500 rounded-xl px-2.5 flex items-center justify-center disabled:opacity-50">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-white" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select value={selectedExam} onChange={(e) => handleExamChange(e.target.value)} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800">
                <option value="">Select Exam Target...</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {selectedExam && (
                <button
                  onClick={handleDeleteExam}
                  disabled={isDeleting !== null}
                  title="Delete Selected Exam Entity"
                  className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs tracking-wide font-medium transition-all disabled:opacity-30"
                >
                  {isDeleting === "exam" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Current Exam
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section Selection Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Section Node</label>
            {selectedExam && (!isCreatingSection ? (
              <div className="flex gap-2">
                {selectedSection && (
                  <button onClick={() => setIsEditingSectionName(!isEditingSectionName)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-2.5 h-2.5" /> {isEditingSectionName ? "Cancel" : "Edit"}
                  </button>
                )}
                <button onClick={() => setIsCreatingSection(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Create New
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingSection(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingSection ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-slate-900">
              <TrilingualNameFields
                value={newSectionName}
                onChange={setNewSectionName}
                onTranslate={async () => {
                  setIsTranslatingSectionName(true);
                  const result = await translateLabel(newSectionName.en);
                  if (result) setNewSectionName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingSectionName(false);
                }}
                isTranslating={isTranslatingSectionName}
                placeholderPrefix="Section name"
              />
              <button onClick={handleCreateSection} disabled={isProcessingNewNode} className="bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1.5">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Section
              </button>
            </div>
          ) : isEditingSectionName && selectedSection ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-amber-900/40">
              <TrilingualNameFields
                value={editSectionName}
                onChange={setEditSectionName}
                onTranslate={async () => {
                  setIsTranslatingSectionName(true);
                  const result = await translateLabel(editSectionName.en);
                  if (result) setEditSectionName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingSectionName(false);
                }}
                isTranslating={isTranslatingSectionName}
                placeholderPrefix="Section name"
                accentBorderClass="border-amber-500/40"
              />
              <button onClick={handleUpdateSection} disabled={isProcessingNewNode} className="bg-amber-600 hover:bg-amber-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1.5">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)} disabled={!selectedExam} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
                <option value="">Select Section Axis...</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
              {selectedSection && (
                <button
                  onClick={handleDeleteSection}
                  disabled={isDeleting !== null}
                  title="Delete Selected Section"
                  className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs tracking-wide font-medium transition-all disabled:opacity-30"
                >
                  {isDeleting === "section" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Current Section
                </button>
              )}
            </div>
          )}
        </div>

        {/* Phase Selection Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Phase Milestone</label>
            {selectedSection && (!isCreatingPhase ? (
              <div className="flex gap-2">
                {selectedPhase && (
                  <button onClick={() => setIsEditingPhaseName(!isEditingPhaseName)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-2.5 h-2.5" /> {isEditingPhaseName ? "Cancel" : "Edit"}
                  </button>
                )}
                <button onClick={() => setIsCreatingPhase(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Create New
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingPhase(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingPhase ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-slate-900">
              <TrilingualNameFields
                value={newPhaseName}
                onChange={setNewPhaseName}
                onTranslate={async () => {
                  setIsTranslatingPhaseName(true);
                  const result = await translateLabel(newPhaseName.en);
                  if (result) setNewPhaseName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingPhaseName(false);
                }}
                isTranslating={isTranslatingPhaseName}
                placeholderPrefix="Phase name"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Order Index"
                  value={newPhaseOrder}
                  onChange={(e) => setNewPhaseOrder(e.target.value)}
                  className="w-16 bg-[#070c19] border border-slate-900 rounded-lg px-2 py-1 text-xs text-slate-400 font-mono outline-none"
                />
                <button onClick={handleCreatePhase} disabled={isProcessingNewNode} className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1">
                  {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Phase
                </button>
              </div>
            </div>
          ) : isEditingPhaseName && selectedPhase ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-amber-900/40">
              <TrilingualNameFields
                value={editPhaseName}
                onChange={setEditPhaseName}
                onTranslate={async () => {
                  setIsTranslatingPhaseName(true);
                  const result = await translateLabel(editPhaseName.en);
                  if (result) setEditPhaseName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingPhaseName(false);
                }}
                isTranslating={isTranslatingPhaseName}
                placeholderPrefix="Phase name"
                accentBorderClass="border-amber-500/40"
              />
              <button onClick={handleUpdatePhase} disabled={isProcessingNewNode} className="bg-amber-600 hover:bg-amber-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1.5">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select value={selectedPhase} onChange={(e) => handlePhaseChange(e.target.value)} disabled={!selectedSection} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
                <option value="">Select Phase Milestone...</option>
                {phases.map(p => <option key={p.id} value={p.id}>[{p.sequence_order}] {p.name_en}</option>)}
              </select>
              {selectedPhase && (
                <button
                  onClick={handleDeletePhase}
                  disabled={isDeleting !== null}
                  title="Delete Selected Phase Entity"
                  className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs tracking-wide font-medium transition-all disabled:opacity-30"
                >
                  {isDeleting === "phase" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Current Phase
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chapter Selection Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Chapter Core</label>
            {selectedPhase && (!isCreatingChapter ? (
              <div className="flex gap-2">
                {selectedChapter && (
                  <button onClick={() => setIsEditingChapterName(!isEditingChapterName)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-2.5 h-2.5" /> {isEditingChapterName ? "Cancel" : "Edit"}
                  </button>
                )}
                <button onClick={() => setIsCreatingChapter(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Create New
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingChapter(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingChapter ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-slate-900">
              <TrilingualNameFields
                value={newChapterName}
                onChange={setNewChapterName}
                onTranslate={async () => {
                  setIsTranslatingChapterName(true);
                  const result = await translateLabel(newChapterName.en);
                  if (result) setNewChapterName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingChapterName(false);
                }}
                isTranslating={isTranslatingChapterName}
                placeholderPrefix="Chapter name"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Order"
                  value={newChapterOrder}
                  onChange={(e) => setNewChapterOrder(e.target.value)}
                  className="w-16 bg-[#070c19] border border-slate-900 rounded-lg px-2 py-1 text-xs text-slate-400 font-mono outline-none"
                />
                <button onClick={handleCreateChapter} disabled={isProcessingNewNode} className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1">
                  {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Chapter
                </button>
              </div>
            </div>
          ) : isEditingChapterName && selectedChapter ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-amber-900/40">
              <TrilingualNameFields
                value={editChapterName}
                onChange={setEditChapterName}
                onTranslate={async () => {
                  setIsTranslatingChapterName(true);
                  const result = await translateLabel(editChapterName.en);
                  if (result) setEditChapterName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingChapterName(false);
                }}
                isTranslating={isTranslatingChapterName}
                placeholderPrefix="Chapter name"
                accentBorderClass="border-amber-500/40"
              />
              <button onClick={handleUpdateChapter} disabled={isProcessingNewNode} className="bg-amber-600 hover:bg-amber-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1.5">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select value={selectedChapter} onChange={(e) => handleChapterChange(e.target.value)} disabled={!selectedPhase} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
                <option value="">Select Chapter...</option>
                {chapters.map(c => <option key={c.id} value={c.id}>[{c.sequence_order}] {c.name_en}</option>)}
              </select>
              {selectedChapter && (
                <button
                  onClick={handleDeleteChapter}
                  disabled={isDeleting !== null}
                  title="Delete Selected Chapter"
                  className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs tracking-wide font-medium transition-all disabled:opacity-30"
                >
                  {isDeleting === "chapter" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Current Chapter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Topic Selection Block */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Topic Workspace Block</label>
            {selectedChapter && (!isCreatingTopic ? (
              <div className="flex gap-2">
                {selectedTopic && (
                  <button onClick={() => setIsEditingTopicName(!isEditingTopicName)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-2.5 h-2.5" /> {isEditingTopicName ? "Cancel" : "Edit"}
                  </button>
                )}
                <button onClick={() => setIsCreatingTopic(true)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors">
                  <Plus className="w-2.5 h-2.5" /> Create New
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingTopic(false)} className="text-[10px] text-slate-500 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
                <X className="w-2.5 h-2.5" /> Cancel
              </button>
            ))}
          </div>
          {isCreatingTopic ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-slate-900">
              <TrilingualNameFields
                value={newTopicName}
                onChange={setNewTopicName}
                onTranslate={async () => {
                  setIsTranslatingTopicNameField(true);
                  const result = await translateLabel(newTopicName.en);
                  if (result) setNewTopicName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingTopicNameField(false);
                }}
                isTranslating={isTranslatingTopicNameField}
                placeholderPrefix="Topic name"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Order"
                  value={newTopicOrder}
                  onChange={(e) => setNewTopicOrder(e.target.value)}
                  className="w-16 bg-[#070c19] border border-slate-900 rounded-lg px-2 py-1 text-xs text-slate-400 font-mono outline-none"
                />
                <button onClick={handleCreateTopic} disabled={isProcessingNewNode} className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1">
                  {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Topic
                </button>
              </div>
            </div>
          ) : isEditingTopicName && selectedTopic ? (
            <div className="flex flex-col gap-1 bg-[#050a16] p-2 rounded-xl border border-amber-900/40">
              <TrilingualNameFields
                value={editTopicName}
                onChange={setEditTopicName}
                onTranslate={async () => {
                  setIsTranslatingTopicNameField(true);
                  const result = await translateLabel(editTopicName.en);
                  if (result) setEditTopicName(prev => ({ ...prev, hi: result.hi, mr: result.mr }));
                  setIsTranslatingTopicNameField(false);
                }}
                isTranslating={isTranslatingTopicNameField}
                placeholderPrefix="Topic name"
                accentBorderClass="border-amber-500/40"
              />
              <button onClick={handleUpdateTopic} disabled={isProcessingNewNode} className="bg-amber-600 hover:bg-amber-500 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 text-white disabled:opacity-50 py-1.5">
                {isProcessingNewNode ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <select value={selectedTopic} onChange={(e) => handleTopicSelect(e.target.value)} disabled={!selectedChapter} className="w-full bg-[#070c19] border border-slate-900/90 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-800 disabled:opacity-40">
                <option value="">Select Target Topic...</option>
                {topics.map(t => <option key={t.id} value={t.id}>[{t.sequence_order}] {t.name_en}</option>)}
              </select>
              {selectedTopic && (
                <button
                  onClick={handleDeleteTopic}
                  disabled={isDeleting !== null}
                  title="Delete Selected Topic Leaf Entry"
                  className="w-full bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl py-1.5 flex items-center justify-center gap-1.5 text-xs tracking-wide font-medium transition-all disabled:opacity-30"
                >
                  {isDeleting === "topic" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete Current Topic
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <main className="flex-1 flex overflow-hidden">
        {activeTab === "editor" ? (
          <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-900">
            <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between bg-[#040814] border border-slate-900 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {selectedTopicTitle ? `Editing: ${selectedTopicTitle}` : "No Active Topic Context Selected"}
                  </span>
                </div>
                {selectedTopic && (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono">
                    ID: {selectedTopic}
                  </span>
                )}
              </div>

              {/* LANGUAGE TAB SELECTOR */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-[#090f1d] p-1 border border-slate-900 rounded-xl">
                  {LANGS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setActiveContentLang(code)}
                      disabled={!selectedTopic}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-30 ${
                        activeContentLang === code ? "bg-slate-800/80 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Languages className="w-3 h-3" />
                      {label}
                      {code !== "en" && topicContent[code]?.trim() && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAutoTranslate}
                  disabled={!selectedTopic || isTranslating || !topicContent.en.trim()}
                  title="Auto-fill Hindi and Marathi from the English draft using Gemini"
                  className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 disabled:opacity-30 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                >
                  {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Auto-Translate HI + MR
                </button>
              </div>

              <textarea
                value={topicContent[activeContentLang]}
                onChange={(e) => setTopicContent(prev => ({ ...prev, [activeContentLang]: e.target.value }))}
                disabled={!selectedTopic}
                placeholder={
                  activeContentLang === "en"
                    ? "Initialize paragraph payload here (Markdown/Plain-Text formatting authorized)..."
                    : `Empty -- will fall back to English on the student view until filled in, or use "Auto-Translate" above.`
                }
                className="flex-1 min-h-[300px] bg-[#040814] border border-slate-900/90 rounded-xl p-4 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-slate-800 resize-none font-mono leading-relaxed disabled:opacity-30"
                dir="auto"
              />
            </div>
            <div className="w-full md:w-80 bg-[#020408] p-6 overflow-y-auto">
              <ImageManager />
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto bg-[#020408]">
            <div className="max-w-4xl mx-auto bg-[#040814] border border-slate-900/60 rounded-2xl p-8 shadow-xl">
              <NotesPreviewRenderer content={topicContent[activeContentLang]} title={selectedTopicTitle} />
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Guard Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#040814] border border-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Destructive Drop Operation Requested</h3>
                <p className="text-[11px] text-slate-500 font-mono">Type: cascading_removal_hook // {deleteModal.type}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You are attempting to clear the entry <span className="text-slate-200 font-semibold font-mono">"{deleteModal.expectedName}"</span>. 
              This action operates with cascading drop authorization. All subsequent nodes attached below this relational axis will be lost.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Verification Security Signature</label>
              <input
                type="text"
                placeholder="Type target string exactly to confirm deletion..."
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                className="w-full bg-[#070c19] border border-slate-900 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 placeholder:text-slate-700 outline-none focus:border-rose-500/40"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl py-2 text-xs font-medium text-slate-400 transition-colors"
              >
                Abort Action
              </button>
              <button
                type="button"
                onClick={deleteModal.onConfirm}
                disabled={deleteConfirmationInput !== deleteModal.expectedName}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-900 disabled:text-slate-700 border border-rose-500/20 disabled:border-slate-800/60 text-white rounded-xl py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                Confirm Purge Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}