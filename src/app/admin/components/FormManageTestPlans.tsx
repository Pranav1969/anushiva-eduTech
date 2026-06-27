"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { 
  RefreshCw, Shield, Layout, Layers, ShieldCheck, Check, 
  Sparkles, BookOpen, Search, X, ChevronDown, ChevronRight,
  ChevronLeft, ChevronsLeft, ChevronsRight 
} from "lucide-react";

interface FormManageTestPlansProps {
  tests: any[];
  onUpdateComplete: () => void;
}

const ITEMS_PER_PAGE = 10;
const PLAN_TIERS = ["free", "silver", "gold", "premium"];

const tierStyles: Record<string, { badge: string; text: string; bg: string; border: string; glow: string }> = {
  free: {
    badge: "bg-slate-800 text-slate-300 border-slate-700/60",
    text: "text-slate-400",
    bg: "bg-slate-900/40",
    border: "border-slate-800",
    glow: "group-hover:border-slate-700/40"
  },
  silver: {
    badge: "bg-zinc-950 text-zinc-300 border-zinc-700/60",
    text: "text-zinc-400",
    bg: "bg-zinc-950/20",
    border: "border-zinc-900/60",
    glow: "group-hover:border-zinc-500/30"
  },
  gold: {
    badge: "bg-amber-950/60 text-amber-400 border-amber-800/40",
    text: "text-amber-500",
    bg: "bg-amber-950/10",
    border: "border-amber-900/40",
    glow: "group-hover:border-amber-500/30"
  },
  premium: {
    badge: "bg-purple-950/60 text-purple-400 border-purple-800/40",
    text: "text-purple-400",
    bg: "bg-purple-950/10",
    border: "border-purple-900/40",
    glow: "group-hover:border-purple-500/40"
  }
};

export default function FormManageTestPlans({ tests, onUpdateComplete }: FormManageTestPlansProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track pagination states individually per section index/name
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  // Track collapsed state per section to save DOM cycles
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Clean, high-speed text matching filter
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const cleanQuery = searchQuery.toLowerCase().trim();
    return tests.filter((test) => 
      (test.test_name || "").toLowerCase().includes(cleanQuery) ||
      (test.section_id || "").toLowerCase().includes(cleanQuery) ||
      (test.required_plan || "").toLowerCase().includes(cleanQuery)
    );
  }, [tests, searchQuery]);

  // Section Dynamic Split
  const sectionsGroupMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredTests.forEach((test) => {
      const sec = test.section_id || "Unassigned Sections";
      if (!map[sec]) map[sec] = [];
      map[sec].push(test);
    });
    return map;
  }, [filteredTests]);

  // Tier metrics accumulator calculated independently
  const plansGroupMap = useMemo(() => {
    const map: Record<string, any[]> = { free: [], silver: [], gold: [], premium: [] };
    filteredTests.forEach((test) => {
      const plan = (test.required_plan || "free").toLowerCase().trim();
      if (map[plan]) {
        map[plan].push(test);
      } else {
        map["free"].push(test);
      }
    });
    return map;
  }, [filteredTests]);

  const handleQuickPlanUpdate = async (testId: string, nextPlan: string) => {
    setUpdatingId(testId);
    setStatusMessage({ text: "", type: "" });

    try {
      const normalizedPlan = nextPlan.trim().toLowerCase();
      const { error } = await supabase
        .from("tests")
        .update({ required_plan: normalizedPlan })
        .eq("id", testId);

      if (error) throw error;

      setStatusMessage({ text: "Gating structure modified successfully!", type: "success" });
      onUpdateComplete();
      setTimeout(() => setStatusMessage({ text: "", type: "" }), 3000);
    } catch (err: any) {
      console.error("Gating matrix update failure:", err);
      setStatusMessage({ 
        text: err.message || "Database execution failure vector mismatch.", 
        type: "error" 
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const changeSectionPage = (sectionName: string, targetPage: number) => {
    setSectionPages(prev => ({ ...prev, [sectionName]: targetPage }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-slate-100 max-w-[1600px] mx-auto p-4">
      
      {/* Informational Matrix Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-transparent border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl shrink-0 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">Enterprise Access Control Registry</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimized administrative panel scaling efficiently past hundreds of continuous examinations mapped across cloud databases.
            </p>
          </div>
        </div>

        {statusMessage.text && (
          <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold border hidden sm:flex items-center gap-2 transition-all ${
            statusMessage.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusMessage.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusMessage.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            </span>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Global Search Node */}
      <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-2xl shadow-lg">
        <div className="relative max-w-xl w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records instantly by name, section tag, or restriction tier..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#070b12] border border-slate-800/80 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SYSTEM SECTION 1: High Scaling Collapsible & Paginated Section Lists */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layout size={14} /> 1. Operational Repositories Grouped By Category
        </h4>

        {Object.keys(sectionsGroupMap).length === 0 ? (
          <div className="p-12 text-center bg-slate-900/10 border border-slate-800/40 rounded-2xl text-xs text-slate-500 italic">
            No elements correspond with the requested query settings.
          </div>
        ) : (
          Object.entries(sectionsGroupMap).map(([sectionName, sectionTests]) => {
            const isCollapsed = collapsedSections[sectionName] ?? false;
            const currentPage = sectionPages[sectionName] ?? 1;
            const totalPages = Math.ceil(sectionTests.length / ITEMS_PER_PAGE);
            
            // Slice the array safely for high performance rendering limits
            const paginatedTests = useMemo(() => {
              const start = (currentPage - 1) * ITEMS_PER_PAGE;
              return sectionTests.slice(start, start + ITEMS_PER_PAGE);
            }, [sectionTests, currentPage]);

            return (
              <div key={sectionName} className="bg-[#0f1626]/40 border border-slate-800/70 rounded-2xl overflow-hidden shadow-xl transition-all">
                
                {/* Header Row acting as Accordion Controller */}
                <div 
                  onClick={() => toggleSection(sectionName)}
                  className="flex items-center justify-between p-4 bg-slate-900/30 cursor-pointer select-none border-b border-slate-800/50 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </div>
                    <h5 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/30">
                      <span>📂</span> {sectionName.replace("-", " ")}
                    </h5>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 px-2.5 py-0.5 rounded-full">
                      {sectionTests.length} Allocations
                    </span>
                  </div>
                </div>

                {/* Sub-Matrix Display Body */}
                {!isCollapsed && (
                  <div className="p-4 space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col divide-y divide-slate-800/60 bg-[#070b12] rounded-xl border border-slate-800/80 overflow-hidden shadow-inner">
                      {paginatedTests.map((test) => {
                        const currentPlan = (test.required_plan || "free").toLowerCase().trim();
                        const isTestUpdating = updatingId === test.id;
                        const currentStyle = tierStyles[currentPlan] || tierStyles.free;

                        return (
                          <div 
                            key={test.id} 
                            className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#090e18] transition-colors group"
                          >
                            <div className="min-w-0 flex items-start sm:items-center gap-3">
                              <div className="hidden sm:flex flex-col gap-1 items-end min-w-[90px] shrink-0">
                                <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase border border-slate-800">
                                  {test.timer_type || "Standard"}
                                </span>
                              </div>
                              <h6 className="font-semibold text-xs text-slate-200 tracking-wide truncate max-w-sm lg:max-w-xl">
                                {test.test_name}
                              </h6>
                            </div>

                            {/* Controls Segment Container */}
                            <div className="flex items-center gap-3 ml-auto md:ml-0 self-end md:self-auto">
                              <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest border ${currentStyle.badge}`}>
                                {currentPlan}
                              </span>

                              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                {PLAN_TIERS.map((tier) => {
                                  const isActive = currentPlan === tier;
                                  return (
                                    <button
                                      key={tier}
                                      type="button"
                                      disabled={isTestUpdating}
                                      onClick={() => handleQuickPlanUpdate(test.id, tier)}
                                      className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 ${
                                        isActive
                                          ? `bg-indigo-600 text-white shadow-sm font-black`
                                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/60"
                                      } disabled:opacity-40`}
                                    >
                                      {isTestUpdating && isActive ? (
                                        <RefreshCw size={8} className="animate-spin text-white" />
                                      ) : isActive ? (
                                        <Check size={8} className="stroke-[3.5]" />
                                      ) : null}
                                      {tier}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Core Component UI */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between bg-slate-900/10 border border-slate-800/40 p-2.5 rounded-xl text-xs">
                        <span className="text-slate-400 font-medium text-[11px]">
                          Showing <span className="text-white font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-white font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, sectionTests.length)}</span> of <span className="text-indigo-400 font-bold">{sectionTests.length}</span> entries
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button 
                            disabled={currentPage === 1} 
                            onClick={() => changeSectionPage(sectionName, 1)}
                            className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronsLeft size={12} />
                          </button>
                          <button 
                            disabled={currentPage === 1} 
                            onClick={() => changeSectionPage(sectionName, currentPage - 1)}
                            className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <span className="px-3 text-[11px] font-mono text-slate-300">
                            Page {currentPage} / {totalPages}
                          </span>
                          <button 
                            disabled={currentPage === totalPages} 
                            onClick={() => changeSectionPage(sectionName, currentPage + 1)}
                            className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight size={12} />
                          </button>
                          <button 
                            disabled={currentPage === totalPages} 
                            onClick={() => changeSectionPage(sectionName, totalPages)}
                            className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                          >
                            <ChevronsRight size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SYSTEM SECTION 2: Dynamic Ecosystem Metrics Box */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers size={14} /> 2. Complete Distribution Ecosystem Metrics
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_TIERS.map((tier) => {
            const planTests = plansGroupMap[tier] || [];
            const currentStyle = tierStyles[tier];

            return (
              <div key={tier} className={`border ${currentStyle.border} ${currentStyle.bg} rounded-xl p-4 flex flex-col justify-between h-[220px] shadow-lg relative overflow-hidden backdrop-blur-sm group transition-all hover:border-slate-700/60`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 capitalize ${currentStyle.text}`}>
                      <Shield size={13} className="stroke-[2.5]" />
                      {tier}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-slate-400 rounded-md border border-slate-800/80 shadow-inner">
                      {planTests.length} Nodes
                    </span>
                  </div>

                  <div className="max-h-[110px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800/80">
                    {planTests.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic py-6 text-center">
                        No active targets restricted.
                      </div>
                    ) : (
                      planTests.slice(0, 30).map((t) => ( // Capped visual log array to maintain scrolling layouts
                        <div key={t.id} className="p-1.5 bg-slate-950/50 rounded-lg text-[10px] text-slate-300 border border-slate-900/80 flex items-center gap-2">
                          <BookOpen size={10} className="text-slate-500 shrink-0" />
                          <span className="truncate tracking-wide font-medium">{t.test_name}</span>
                        </div>
                      ))
                    )}
                    {planTests.length > 30 && (
                      <div className="text-[9px] text-slate-500 text-center font-mono py-1">
                        + {planTests.length - 30} more entries hidden
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900/60 text-[9px] text-slate-500 font-mono flex items-center gap-1">
                  <Sparkles size={10} className="text-indigo-500/50" /> System Tier Safe Isolation
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}