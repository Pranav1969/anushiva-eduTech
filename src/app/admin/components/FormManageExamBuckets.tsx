// src/app/admin/components/FormManageExamBuckets.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, CheckCircle2, ShieldAlert, Search, Filter, Layers, Edit3, PlusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormManageExamBucketsProps {
  tests: any[];
  onUpdateComplete: () => void;
}

export default function FormManageExamBuckets({ tests, onUpdateComplete }: FormManageExamBucketsProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // High-Volume UX Performance States
  const [searchQuery, setSearchQuery] = useState("");
  const [operationMode, setOperationMode] = useState<"add" | "edit">("add");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // 1. Fetch available Exam Buckets from database
  useEffect(() => {
    async function loadExams() {
      setLoadingExams(true);
      const { data, error } = await supabase.from("exams").select("*").order("name", { ascending: true });
      if (!error && data) {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0].id);
      }
      setLoadingExams(false);
    }
    loadExams();
  }, []);

  // 2. Adjust selection state and initialize sections based on mode & selected exam
  useEffect(() => {
    if (!selectedExamId) return;
    
    if (operationMode === "edit") {
      // In Edit Mode, we pre-select tests currently inside this bucket
      const currentBucketTests = tests.filter((t) => t.exam_id === selectedExamId).map((t) => t.id);
      setSelectedTestIds(currentBucketTests);
    } else {
      // In Add Mode, clear working array for new staging assignments
      setSelectedTestIds([]);
    }
    setMessage({ text: "", type: "" });
  }, [selectedExamId, operationMode, tests]);

  const handleToggleTest = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const toggleSectionAccordion = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // 3. Process, Partition Section-Wise, and Filter data structures on the fly
  const segmentedSectionsData = useMemo(() => {
    // Filter by search query text
    let targetDataset = tests.filter(test => {
      const matchText = `${test.test_name || ""} ${test.id || ""} ${test.section_id || ""}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });

    // Partition by targeted screen mode to handle large records efficiently
    if (operationMode === "add") {
      // Add Mode: Only show tests that don't belong to ANY exam yet
      targetDataset = targetDataset.filter(test => !test.exam_id);
    } else {
      // Edit Mode: Only show tests already explicitly linked to this exam
      targetDataset = targetDataset.filter(test => test.exam_id === selectedExamId);
    }

    // Grouping the matching tests into section dictionary arrays
    const groupsMap: Record<string, any[]> = {};
    targetDataset.forEach(test => {
      const sectionKey = test.section_id || "Unassigned Sections";
      if (!groupsMap[sectionKey]) groupsMap[sectionKey] = [];
      groupsMap[sectionKey].push(test);
    });

    // Initialize expand headers dynamically if they don't exist yet
    Object.keys(groupsMap).forEach(key => {
      if (expandedSections[key] === undefined) {
        expandedSections[key] = true;
      }
    });

    return groupsMap;
  }, [tests, searchQuery, operationMode, selectedExamId]);

  // 4. Save and commit transactions to backend database safely
  const handleSaveBucketConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      if (operationMode === "edit") {
        // Step A: Disconnect everything belonging to this bucket first
        await supabase.from("tests").update({ exam_id: null }).eq("exam_id", selectedExamId);

        // Step B: Re-bind only the items chosen during the edit checkout layout
        if (selectedTestIds.length > 0) {
          const { error } = await supabase.from("tests").update({ exam_id: selectedExamId }).in("id", selectedTestIds);
          if (error) throw error;
        }
      } else {
        // Add Mode: Attach new items directly alongside existing ones without clobbering other inventory
        if (selectedTestIds.length > 0) {
          const { error } = await supabase.from("tests").update({ exam_id: selectedExamId }).in("id", selectedTestIds);
          if (error) throw error;
        }
      }

      setMessage({ 
        text: `Successfully synced changes inside the bucket repository!`, 
        type: "success" 
      });
      setSelectedTestIds([]);
      onUpdateComplete();
    } catch (err: any) {
      setMessage({ text: "Database save compilation failed: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExams) {
    return (
      <div className="flex justify-center items-center py-24 text-slate-400 gap-2 text-xs">
        <Loader2 className="animate-spin text-indigo-400 w-4 h-4" />
        <span>Syncing comprehensive Exam Repository datasets...</span>
      </div>
    );
  }

  const sectionsListKeys = Object.keys(segmentedSectionsData);

  return (
    <form onSubmit={handleSaveBucketConfig} className="space-y-6">
      
      {/* SECTION 1: BUCKET PROFILE SELECTOR & WORKSPACE TOGGLE MODES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="flex flex-col gap-1.5 lg:col-span-6">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> 1. Target Exam Bucket Profile
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full bg-[#070b12] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} (ID: {ex.id.substring(0,8)}...)
              </option>
            ))}
          </select>
        </div>

        {/* WORKSPACE OPERATIONS FILTER MODES */}
        <div className="flex flex-col gap-1.5 lg:col-span-6">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider">
            2. Choose Layout Configuration Intent
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#070b12] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setOperationMode("add")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                operationMode === "add" 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add New Tests</span>
            </button>
            <button
              type="button"
              onClick={() => setOperationMode("edit")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                operationMode === "edit" 
                  ? "bg-amber-600 text-white shadow-md" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Existing Bucket ({tests.filter(t => t.exam_id === selectedExamId).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: HIGH-VOLUME DATA REALTIME FUZZY SEARCH FILTER INPUT BOX */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search through hundreds of blueprints via test name string or section key metrics..."
          className="w-full bg-[#070b12] border border-slate-800/80 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder-slate-600 transition-colors"
        />
      </div>

      {/* SECTION 3: PARTITIONED SECTION ID MANIFEST TREES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
            3. Dynamic Catalog List Matrix ({selectedTestIds.length} Checked Stage Entries)
          </label>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            Context: {operationMode === "add" ? "Displaying available files unassigned to any exam" : "Displaying linked items in bucket"}
          </span>
        </div>

        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 border border-slate-800/60 p-4 bg-[#070b12]/50 rounded-2xl custom-scrollbar">
          {sectionsListKeys.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-12 flex flex-col items-center justify-center gap-2">
              <Filter className="w-5 h-5 text-slate-700" />
              <span>No corresponding test data blocks matched the query settings here.</span>
            </div>
          ) : (
            sectionsListKeys.map((sectionId) => {
              const itemsInSection = segmentedSectionsData[sectionId];
              const isExpanded = expandedSections[sectionId];

              return (
                <div key={sectionId} className="border border-slate-900 bg-[#070b12] rounded-xl overflow-hidden shadow-sm">
                  {/* Section Group Table Header Link */}
                  <div 
                    onClick={() => toggleSectionAccordion(sectionId)}
                    className="bg-slate-900/60 px-4 py-3 flex items-center justify-between border-b border-slate-900 cursor-pointer hover:bg-slate-900 transition-colors selection:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wide font-mono">{sectionId}</span>
                    </div>
                    <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] font-mono text-slate-400 font-bold">
                      {itemsInSection.length} Blueprints
                    </span>
                  </div>

                  {/* Partition Content Grid Matrix Wrapper */}
                  {isExpanded && (
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      {itemsInSection.map((test) => {
                        const isChecked = selectedTestIds.includes(test.id);
                        return (
                          <div
                            key={test.id}
                            onClick={() => handleToggleTest(test.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all selection:bg-transparent ${
                              isChecked
                                ? operationMode === 'edit'
                                  ? "bg-amber-600/10 border-amber-500 text-white"
                                  : "bg-indigo-600/10 border-indigo-500 text-white"
                                : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-slate-300"
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold truncate">{test.test_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">UUID: {test.id}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                              isChecked 
                                ? operationMode === 'edit' ? "bg-amber-600 border-amber-400" : "bg-indigo-600 border-indigo-400" 
                                : "border-slate-800 bg-slate-950"
                            }`}>
                              {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TRANSACTION RESULT MESSAGES */}
      {message.text && (
        <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
          message.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* COMMIT ACTION BUTTON */}
      <button
        type="submit"
        disabled={saving || !selectedExamId || (operationMode === "add" && selectedTestIds.length === 0)}
        className={`w-full text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 ${
          operationMode === 'edit' 
            ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-950/20" 
            : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-indigo-950/20"
        }`}
      >
        {saving && <Loader2 className="animate-spin w-3.5 h-3.5" />}
        <span>
          {operationMode === "edit" 
            ? "Overwrite & Deploy Edited Bucket Manifest" 
            : `Deploy and Link ${selectedTestIds.length} Selected Tests to Bucket`}
        </span>
      </button>
    </form>
  );
}