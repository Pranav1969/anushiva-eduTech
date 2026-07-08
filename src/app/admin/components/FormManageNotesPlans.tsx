//srcappadmincomponentsFormManageNotesPlans.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { Loader2, Save, BookOpen, Layers, CheckCircle } from "lucide-react";

interface FormManageNotesPlansProps {
  onUpdateComplete?: () => void;
}

export default function FormManageNotesPlans({ onUpdateComplete }: FormManageNotesPlansProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const plans = ["free", "silver", "gold", "premium"];

  // Load basic foundational records on mount
  useEffect(() => {
    async function initFetch() {
      setLoading(true);
      try {
        const { data: ex } = await supabase.from("exams").select("*").order("name");
        const { data: sec } = await supabase.from("notes_sections").select("*").order("name");
        const { data: ph } = await supabase.from("notes_phases").select("*").order("sequence_order");
        
        if (ex) setExams(ex);
        if (sec) setSections(sec);
        if (ph) setPhases(ph);

        // Pick initial select defaults if values exist
        if (ex && ex.length > 0) setSelectedExamId(ex[0].id);
      } catch (err) {
        console.error("Error setting up hierarchy:", err);
      } finally {
        setLoading(false);
      }
    }
    initFetch();
  }, []);

  // Fetch chapters reactively when parent phase/section contexts shift
  useEffect(() => {
    async function fetchChapters() {
      if (!selectedPhaseId) {
        setChapters([]);
        return;
      }
      const { data, error } = await supabase
        .from("notes_chapters")
        .select("*")
        .eq("phase_id", selectedPhaseId)
        .order("sequence_order");

      if (!error && data) {
        setChapters(data);
      }
    }
    fetchChapters();
  }, [selectedPhaseId]);

  // Handle cascaded updates for UI filters
  const filteredSections = sections.filter(s => s.exam_id === selectedExamId);
  useEffect(() => {
    if (filteredSections.length > 0) {
      setSelectedSectionId(filteredSections[0].id);
    } else {
      setSelectedSectionId("");
    }
  }, [selectedExamId, sections]);

  const filteredPhases = phases.filter(p => p.section_id === selectedSectionId);
  useEffect(() => {
    if (filteredPhases.length > 0) {
      setSelectedPhaseId(filteredPhases[0].id);
    } else {
      setSelectedPhaseId("");
    }
  }, [selectedSectionId, phases]);

  // Update specific chapter's tier lock restriction mapping
  const handlePlanChange = async (chapterId: string, newPlan: string) => {
    setUpdatingId(chapterId);
    setStatusMessage("");
    try {
      const { error } = await supabase
        .from("notes_chapters")
        .update({ required_plan: newPlan })
        .eq("id", chapterId);

      if (error) throw error;

      // Update local state instantly
      setChapters(prev => prev.map(ch => ch.id === chapterId ? { ...ch, required_plan: newPlan } : ch));
      setStatusMessage("Chapter authorization plan modified successfully.");
      if (onUpdateComplete) onUpdateComplete();
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed targeting record tier update schema.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="animate-spin text-indigo-500 w-6 h-6" />
        <span className="text-xs">Parsing educational tree configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" /> Chapter Access Gating Control Panel
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Select target trees downward to configure content tier visibility restrictions.
        </p>
      </div>

      {/* FILTER CASCADE ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0F172A] p-4 rounded-xl border border-slate-800/80">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">1. Target Exam</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-[#1E293B] text-slate-200 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select an Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">2. Notes Section</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            disabled={!selectedExamId}
            className="w-full bg-[#1E293B] text-slate-200 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">Select Section</option>
            {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">3. Content Phase</label>
          <select
            value={selectedPhaseId}
            onChange={(e) => setSelectedPhaseId(e.target.value)}
            disabled={!selectedSectionId}
            className="w-full bg-[#1E293B] text-slate-200 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">Select Phase</option>
            {filteredPhases.map(p => <option key={p.id} value={p.id}>Seq {p.sequence_order}: {p.name}</option>)}
          </select>
        </div>
      </div>

      {/* CHAPTER MANAGEMENT WORKSPACE */}
      <div className="bg-[#0F172A]/40 rounded-xl border border-slate-800/50 overflow-hidden">
        <div className="bg-[#0F172A] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Targeted Phase Chapters Matrix
          </span>
          {statusMessage && (
            <span className="text-[11px] bg-emerald-950/50 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
              <CheckCircle className="w-3 h-3" /> {statusMessage}
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-900">
          {chapters.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No matching chapters established under this active path schema node.
            </div>
          ) : (
            chapters.map((chapter) => (
              <div key={chapter.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                    <span className="bg-slate-800 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded">
                      Idx {chapter.sequence_order}
                    </span>
                    {chapter.name}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {chapter.id}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">Access Restriction:</span>
                  <div className="flex gap-1 bg-[#1E293B] p-1 rounded-lg border border-slate-800">
                    {plans.map((p) => {
                      const isActive = chapter.required_plan === p;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePlanChange(chapter.id, p)}
                          disabled={updatingId === chapter.id}
                          className={`text-[10px] uppercase font-bold tracking-tight px-2.5 py-1 rounded-md transition-all ${
                            isActive
                              ? p === "free"
                                ? "bg-emerald-600 text-white shadow"
                                : p === "silver"
                                ? "bg-slate-400 text-slate-950 shadow"
                                : p === "gold"
                                ? "bg-amber-500 text-slate-950 shadow"
                                : "bg-indigo-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                          }`}
                        >
                          {updatingId === chapter.id && isActive ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            p
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}