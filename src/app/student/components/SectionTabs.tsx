"use client";
import Link from "next/link";
import { Layers, Calculator, BookOpen, ShieldCheck, Award, HelpCircle } from "lucide-react";

// Fallback icon mapping handler helper
const getSectionIcon = (id: string) => {
  if (id.includes("reasoning")) return Layers;
  if (id.includes("quant") || id.includes("numerical")) return Calculator;
  if (id.includes("english")) return BookOpen;
  if (id.includes("aware") || id.includes("finance")) return ShieldCheck;
  if (id.includes("combine")) return Award;
  return HelpCircle; // Default fallback icon for brand-new custom sections
};

// Formatting Helper: converts 'reasoning-ability' to 'REASONING ABILITY'
const formatSectionLabel = (id: string) => {
  if (!id) return "UNASSIGNED";
  return id.replace(/-/g, " ");
};

interface SectionTabsProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
  testsCountMap: Record<string, number>;
  useLinks?: boolean;
}

export default function SectionTabs({ activeTab, onTabChange, testsCountMap, useLinks = false }: SectionTabsProps) {
  
  // DYNAMIC SECTION GENERATION: Get ALL section keys present in the data right now
  const visibleSectionIds = Object.keys(testsCountMap).filter(
    (id) => testsCountMap[id] > 0 || id === activeTab
  );

  return (
    <div className="relative border-b border-slate-800 pb-2">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
        {visibleSectionIds.map((secId) => {
          const Icon = getSectionIcon(secId);
          const isActive = activeTab === secId;
          const count = testsCountMap[secId] || 0;
          const formattedLabel = formatSectionLabel(secId);

          const buttonContent = (
            <>
              <Icon size={14} className={isActive ? "text-[#22D3EE]" : "text-[#CBD5E1]"} />
              <span className="truncate max-w-[180px]">{formattedLabel}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                isActive ? "bg-white/20 text-white shadow-inner" : "bg-slate-900 text-[#CBD5E1]"
              }`}>
                {count}
              </span>
            </>
          );

          if (useLinks) {
            return (
              <Link
                key={secId}
                href={`/student/section/${secId}`}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border shrink-0 snap-bleed relative ${
                  isActive
                    ? "bg-gradient-to-r from-[#312E81] to-[#2563EB] border-[#2563EB]/50 text-white shadow-lg shadow-[#2563EB]/20 scale-[1.01]"
                    : "bg-[#1E293B]/70 backdrop-blur-sm border-slate-800 text-[#CBD5E1] hover:text-white hover:border-slate-700 hover:bg-[#1E293B]"
                }`}
              >
                {buttonContent}
              </Link>
            );
          }

          return (
            <button
              key={secId}
              onClick={() => onTabChange && onTabChange(secId)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200 border shrink-0 snap-bleed relative ${
                isActive
                  ? "bg-gradient-to-r from-[#312E81] to-[#2563EB] border-[#2563EB]/50 text-white shadow-lg shadow-[#2563EB]/20 scale-[1.01]"
                  : "bg-[#1E293B]/70 backdrop-blur-sm border-slate-800 text-[#CBD5E1] hover:text-white hover:border-slate-700 hover:bg-[#1E293B]"
              }`}
            >
              {buttonContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}