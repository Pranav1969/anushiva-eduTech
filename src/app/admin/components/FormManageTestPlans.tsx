"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { RefreshCw, Shield, Layout, Layers, ShieldCheck, Check, Sparkles, BookOpen, Search, X } from "lucide-react";

interface FormManageTestPlansProps {
  tests: any[];
  onUpdateComplete: () => void;
}

export default function FormManageTestPlans({ tests, onUpdateComplete }: FormManageTestPlansProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const PLAN_TIERS = ["free", "silver", "gold", "premium"];

  // Color mappings based on tiers for consistent premium styling across components
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

  // Filter tests based on search criteria
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const cleanQuery = searchQuery.toLowerCase().trim();
    return tests.filter((test) => 
      (test.test_name || "").toLowerCase().includes(cleanQuery) ||
      (test.section_id || "").toLowerCase().includes(cleanQuery) ||
      (test.required_plan || "").toLowerCase().includes(cleanQuery)
    );
  }, [tests, searchQuery]);

  // 1. Group filtered tests dynamically by Section ID
  const sectionsGroupMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredTests.forEach((test) => {
      const sec = test.section_id || "Unassigned Sections";
      if (!map[sec]) map[sec] = [];
      map[sec].push(test);
    });
    return map;
  }, [filteredTests]);

  // 2. Group filtered tests dynamically by Subscription Plan Tier
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

  // 3. Inline Quick-Change Plan Updater Method
  const handleQuickPlanUpdate = async (testId: string, nextPlan: string) => {
    setUpdatingId(testId);
    setStatusMessage({ text: "", type: "" });

    try {
      const normalizedPlan = nextPlan.trim().toLowerCase();

      const { error } = await supabase
        .from("tests")
        .update({ 
          required_plan: normalizedPlan 
        })
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

  return (
    <div className="space-y-10 animate-in fade-in duration-300 text-slate-100">
      
      {/* Informational Matrix Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-transparent border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl shrink-0 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">Dynamic Access Control Settings</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage product tiering parameters over active examination instances. Selection modifications sync globally instantly across client application states.
            </p>
          </div>
        </div>

        {/* Global Toast Notification inside header to minimize layout shift */}
        {statusMessage.text && (
          <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold border hidden sm:flex items-center gap-2 animate-in slide-in-from-right-3 duration-200 shrink-0 ${
            statusMessage.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusMessage.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${statusMessage.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            </span>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Mobile-only fallback notification position */}
      {statusMessage.text && (
        <div className={`p-3 rounded-xl text-xs font-medium border block sm:hidden animate-in slide-in-from-top-2 duration-200 ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* SEARCH INTERFACE BAR CONTAINER */}
      <div className="bg-slate-900/30 border border-slate-800/80 p-4 rounded-2xl shadow-lg">
        <div className="relative max-w-xl w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filters by test name, plan tier category, or section id..."
            className="w-full pl-10 pr-10 py-2.5 bg-[#070b12] border border-slate-800/80 rounded-xl text-xs font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SYSTEM SECTION 1: Grouping by Section IDs */}
      <div className="space-y-6">
        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layout size={14} className="text-indigo-400" /> 1. Operational Repositories Grouped By Category
        </h4>

        {Object.keys(sectionsGroupMap).length === 0 ? (
          <div className="p-12 text-center bg-slate-900/10 border border-slate-800/40 rounded-2xl text-xs text-slate-500 italic">
            No dynamic test nodes match the active search constraints.
          </div>
        ) : (
          Object.entries(sectionsGroupMap).map(([sectionName, sectionTests]) => (
            <div key={sectionName} className="bg-[#0f1626]/60 border border-slate-800/70 rounded-2xl p-5 space-y-4 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-2.5">
                <h5 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/30">
                  <span className="text-indigo-400">📂</span> {sectionName.replace("-", " ")}
                </h5>
                <span className="text-[10px] font-mono font-bold bg-indigo-950/50 text-indigo-400 border border-indigo-900/40 px-2.5 py-0.5 rounded-full">
                  {sectionTests.length} Allocation Targets
                </span>
              </div>

              {/* Grid System tailored beautifully for wider desktop configurations */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sectionTests.map((test) => {
                  const currentPlan = (test.required_plan || "free").toLowerCase().trim();
                  const isTestUpdating = updatingId === test.id;
                  const currentStyle = tierStyles[currentPlan] || tierStyles.free;

                  return (
                    <div 
                      key={test.id} 
                      className={`p-4 bg-[#070b12] border ${currentStyle.border} ${currentStyle.glow} rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all duration-300 hover:bg-[#090e18] shadow-inner`}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md font-mono uppercase border border-slate-800 tracking-tight">
                            {test.timer_type || "Standard"}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest border ${currentStyle.badge}`}>
                            {currentPlan} Locked
                          </span>
                        </div>
                        <h6 className="font-bold text-xs text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
                          {test.test_name}
                        </h6>
                      </div>

                      {/* Interactive Tier Change Interface Selector Triggers */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/60 border border-slate-900 p-1 rounded-xl">
                        {PLAN_TIERS.map((tier) => {
                          const isActive = currentPlan === tier;
                          const activeTierStyle = tierStyles[tier];
                          
                          return (
                            <button
                              key={tier}
                              type="button"
                              disabled={isTestUpdating}
                              onClick={() => handleQuickPlanUpdate(test.id, tier)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                isActive
                                  ? `${activeTierStyle.badge} bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/80`
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/60"
                              } disabled:opacity-40`}
                            >
                              {isTestUpdating && isActive ? (
                                <RefreshCw size={10} className="animate-spin text-white" />
                              ) : isActive ? (
                                <Check size={10} className="stroke-[3.5] text-white" />
                              ) : null}
                              {tier}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* SYSTEM SECTION 2: Structural Overview Breakdown mapped beneath Tier Allocations */}
      <div className="space-y-4 pt-4">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers size={14} className="text-amber-400" /> 2. Complete Distribution Ecosystem Metrics
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_TIERS.map((tier) => {
            const planTests = plansGroupMap[tier] || [];
            const currentStyle = tierStyles[tier];

            return (
              <div 
                key={tier} 
                className={`border ${currentStyle.border} ${currentStyle.bg} rounded-2xl p-4 flex flex-col justify-between h-[260px] shadow-lg relative overflow-hidden backdrop-blur-sm group hover:border-slate-700/60 transition-all`}
              >
                {/* Decorative background accent layout tab */}
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full opacity-[0.03] blur-sm transition-all duration-300 group-hover:scale-125 ${
                  tier === "free" ? "bg-slate-400" :
                  tier === "silver" ? "bg-zinc-300" :
                  tier === "gold" ? "bg-amber-400" : "bg-purple-400"
                }`} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 capitalize ${currentStyle.text}`}>
                      <Shield size={13} className="stroke-[2.5]" />
                      {tier} Tier
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-slate-400 rounded-md border border-slate-800/80 shadow-inner">
                      {planTests.length} Nodes
                    </span>
                  </div>

                  {/* List of elements inside the view wrapper box */}
                  <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800/80">
                    {planTests.length === 0 ? (
                      <div className="text-[11px] text-slate-600 italic py-6 text-center">
                        No active targets restricted under this perimeter gate.
                      </div>
                    ) : (
                      planTests.map((t) => (
                        <div 
                          key={t.id} 
                          className="p-2.5 bg-slate-950/50 rounded-xl text-[11px] text-slate-300 border border-slate-900/80 hover:border-slate-800 transition-colors flex items-center gap-2"
                        >
                          <BookOpen size={11} className="text-slate-500 shrink-0" />
                          <span className="truncate tracking-wide font-medium">{t.test_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900/60 text-[10px] text-slate-500 font-mono flex items-center gap-1">
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