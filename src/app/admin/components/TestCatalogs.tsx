"use client";

import { useState, useMemo } from "react";
import { FileText, Trash2, RefreshCw, Search, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface TestCatalogsProps {
  tests: any[];
  onSelectTest: (id: string) => void;
  onRefresh: () => void;
}

export default function TestCatalogs({ tests, onSelectTest, onRefresh }: TestCatalogsProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionTab, setActiveSectionTab] = useState<string>("all");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 1. Dynamically calculate section tabs from current database test rows
  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    tests.forEach((t) => {
      if (t.section_id) sections.add(t.section_id);
    });
    return ["all", ...Array.from(sections)];
  }, [tests]);

  // 2. Client-side combination filter (Section Category tab selection + Search matches)
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesSection = activeSectionTab === "all" || t.section_id === activeSectionTab;
      const matchesSearch = t.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.timer_type && t.timer_type.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSection && matchesSearch;
    });
  }, [tests, activeSectionTab, searchQuery]);

  // 3. Deletion Core Executable Handler for single target tests
  const handleDeleteTest = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to delete this mock test entirely? This will remove all student assignments, questions, and attempt records associated with it from the database.")) return;
    
    setDeletingId(id);
    try {
      await supabase.from("assigned_tests").delete().eq("test_id", id);
      await supabase.from("attempts").delete().eq("test_id", id);
      await supabase.from("questions").delete().eq("test_id", id);

      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;

      setSelectedTestIds((prev) => prev.filter((item) => item !== id));
      onRefresh();
    } catch (err: any) {
      console.error("Database hard deletion failure:", err);
      alert(`Database Execution Failure: ${err.message || "Unable to complete request."}`);
    } finally {
      setDeletingId(null);
    }
  };

  // 4. Multiple Bulk-Deletion Core Action Handler
  const handleBulkDelete = async () => {
    if (selectedTestIds.length === 0) return;
    if (!confirm(`Are you absolutely sure you want to bulk delete the ${selectedTestIds.length} selected tests? This will completely drop all associated records, questions, and attempts for all targets!`)) return;

    setBulkDeleting(true);
    try {
      // Clear all relational foreign key rows concurrently
      await supabase.from("assigned_tests").delete().in("test_id", selectedTestIds);
      await supabase.from("attempts").delete().in("test_id", selectedTestIds);
      await supabase.from("questions").delete().in("test_id", selectedTestIds);

      // Erase core table row entities
      const { error } = await supabase.from("tests").delete().in("id", selectedTestIds);
      if (error) throw error;

      setSelectedTestIds([]);
      onRefresh();
      alert("Selected mock tests successfully purged from the database ecosystem.");
    } catch (err: any) {
      console.error("Bulk database deletion execution error context:", err);
      alert(`Bulk Deletion Failed: ${err.message || "Error processing table clear vectors."}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredTests.map((t) => t.id);
    const hasAllSelected = allFilteredIds.every((id) => selectedTestIds.includes(id));

    if (hasAllSelected) {
      setSelectedTestIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedTestIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const hasAllSelected = filteredTests.length > 0 && filteredTests.map((t) => t.id).every((id) => selectedTestIds.includes(id));

  return (
    <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      
      {/* Header and Bulk Control Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14}/> Configured Test Catalogs ({tests.length})
        </h2>
        
        {selectedTestIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            {bulkDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete Selected ({selectedTestIds.length})
          </button>
        )}
      </div>

      {/* Interactive Controls Component Section (Search + Section Categories) */}
      <div className="space-y-3">
        {/* Dynamic Search Box Layout */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search mock repository titles or scope attributes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
          />
        </div>

        {/* Section ID Dynamic Tabs Navigation Array */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          {uniqueSections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSectionTab(sec)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                activeSectionTab === sec
                  ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-400"
                  : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {sec === "all" ? "📊 All Categories" : sec.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Mass Check Selection Switcher Row */}
      {filteredTests.length > 0 && (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 border-b border-slate-800/40 pb-1">
          <button 
            onClick={toggleSelectAllFiltered}
            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors font-semibold"
          >
            {hasAllSelected ? <CheckSquare size={13} className="text-indigo-400" /> : <Square size={13} />}
            Select All Filtered Rows
          </button>
          <span>Showing {filteredTests.length} nodes</span>
        </div>
      )}

      {/* Output Configuration Repository Map Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
        {filteredTests.length === 0 ? (
          <div className="col-span-full py-10 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <p className="text-xs text-slate-500 font-medium">No matching test catalogs discovered within this sub-matrix scope.</p>
          </div>
        ) : (
          filteredTests.map(t => {
            const isDeleting = deletingId === t.id;
            const isChecked = selectedTestIds.includes(t.id);
            
            return (
              <div 
                key={t.id} 
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 group transition-all duration-200 ${
                  isChecked 
                    ? "bg-indigo-950/20 border-indigo-500/30 shadow-md shadow-indigo-950/40" 
                    : "bg-slate-900 border-slate-800/60 hover:border-slate-700/80"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Select Checkbox Box Toggle */}
                  <button
                    onClick={() => toggleSelectTest(t.id)}
                    disabled={isDeleting || bulkDeleting}
                    className="text-slate-600 hover:text-indigo-400 transition-colors shrink-0 disabled:opacity-30"
                  >
                    {isChecked ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
                  </button>

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-[150px] lg:max-w-[200px]">
                      {t.test_name}
                    </h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5 truncate">
                      Scope: {t.timer_type || "N/A"} | Category: <span className="text-indigo-400/80 font-medium">{t.section_id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => onSelectTest(t.id)} 
                    disabled={isDeleting || bulkDeleting}
                    className="p-1.5 text-xs font-bold bg-[#312E81]/60 border border-slate-800 rounded-lg hover:text-[#22D3EE] transition-colors disabled:opacity-40"
                  >
                    Stats
                  </button>
                  <button 
                    onClick={() => handleDeleteTest(t.id)} 
                    disabled={isDeleting || bulkDeleting}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <RefreshCw size={14} className="animate-spin text-slate-400" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}