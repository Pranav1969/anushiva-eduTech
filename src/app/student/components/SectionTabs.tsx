"use client";
import Link from "next/link";
import { Layers, Calculator, BookOpen, ShieldCheck, Award } from "lucide-react";

export const SYLLABUS_SECTIONS = [
  { id: "reasoning-ability", label: "Reasoning Ability", icon: Layers },
  { id: "quantitative-ability", label: "Quantitative & DI", icon: Calculator },
  { id: "english-language", label: "English Language", icon: BookOpen },
  { id: "financial-awareness", label: "General/Financial Awareness", icon: ShieldCheck },
  { id: "combine-test", label: "Combine Test", icon: Award },
];

interface SectionTabsProps {
  activeTab?: string;
  onTabChange?: (id: string) => void;
  testsCountMap: Record<string, number>;
  useLinks?: boolean;
}

export default function SectionTabs({ activeTab, onTabChange, testsCountMap, useLinks = false }: SectionTabsProps) {
  return (
    <div className="relative border-b border-slate-800 pb-2">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
        {SYLLABUS_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeTab === sec.id;
          const count = testsCountMap[sec.id] || 0;

          const buttonContent = (
            <>
              <Icon size={14} className={isActive ? "text-[#22D3EE]" : "text-[#CBD5E1]"} />
              <span>{sec.label}</span>
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
                key={sec.id}
                href={`/student/section/${sec.id}`}
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
              key={sec.id}
              onClick={() => onTabChange && onTabChange(sec.id)}
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