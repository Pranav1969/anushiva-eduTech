// src/app/student/current-affairs/components/FilterSidebar.tsx

"use client";

import {
  Search,
  Layers,
  Building2,
  BookOpen,
  TrendingUp,
  Globe,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { SourceType, LanguageCode } from "./types";

type FilterOption = "all" | SourceType;

interface FilterSidebarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterOption;
  onFilterChange: (value: FilterOption) => void;
  language: LanguageCode;
  onLanguageChange: (value: LanguageCode) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  readCount: number;
  totalCount: number;
}

const SOURCE_TABS: { id: FilterOption; label: string; icon: typeof Layers }[] = [
  { id: "all", label: "All Aggregates", icon: Layers },
  { id: "rbi", label: "Reserve Bank Directives", icon: Building2 },
  { id: "pib", label: "PIB Finance Press", icon: BookOpen },
  { id: "economy", label: "Macro Economic Trends", icon: TrendingUp },
];

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function FilterSidebar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  language,
  onLanguageChange,
  isFocusMode,
  onToggleFocusMode,
  readCount,
  totalCount,
}: FilterSidebarProps) {
  const { theme: t } = useTheme();

  const PANEL = `rounded-2xl border ${t.panel} p-4`;
  const LABEL = `block text-xs font-semibold uppercase tracking-wider ${t.text.muted}`;

  return (
    <aside className="space-y-5">
      {/* Reading progress */}
      <div className={PANEL}>
        <div className="mb-2 flex items-center justify-between">
          <span className={LABEL}>Reading Progress</span>
          <span className={`font-mono text-[11px] font-semibold ${t.accent.text}`}>
            {readCount}/{totalCount}
          </span>
        </div>
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${t.accent.track}`}>
          <div
            className={`h-1.5 rounded-full ${t.accent.gradient} transition-all duration-300`}
            style={{ width: `${totalCount > 0 ? (readCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Focus mode toggle */}
      <button
        onClick={onToggleFocusMode}
        className={`flex w-full items-center justify-between rounded-2xl border ${t.panel} p-4 text-left transition-colors ${t.accent.hoverBorder}`}
      >
        <div className="flex items-center gap-2.5">
          {isFocusMode ? (
            <Minimize2 className={`h-4 w-4 ${t.accent.text}`} />
          ) : (
            <Maximize2 className={`h-4 w-4 ${t.text.muted}`} />
          )}
          <span className={`text-xs font-semibold uppercase tracking-wider ${t.text.heading}`}>
            Focus Mode
          </span>
        </div>
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${
            isFocusMode ? t.toggle.on : t.toggle.off
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              isFocusMode ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>

      {/* Search */}
      <div className={`space-y-3 ${PANEL}`}>
        <label className={LABEL}>Search Capsule Index</label>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.text.faint}`} />
          <input
            type="text"
            placeholder="Type dynamic keywords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full rounded-xl border ${t.input} py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-1`}
          />
        </div>
      </div>

      {/* Source filter */}
      <div className={`space-y-3 ${PANEL}`}>
        <label className={LABEL}>Knowledge Matrix</label>
        <div className="flex flex-col gap-1.5">
          {SOURCE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-xs font-medium transition-all ${
                  isSelected ? `${t.filter.selected} font-bold shadow-sm` : t.filter.idle
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div className={`space-y-3 ${PANEL}`}>
        <div className={`flex items-center gap-1.5 ${t.text.muted}`}>
          <Globe className="h-3.5 w-3.5" />
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Translation Layer
          </label>
        </div>
        <div className={`grid grid-cols-3 rounded-xl border ${t.inset} p-1`}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageChange(lang.code)}
              className={`rounded-lg py-2 text-xs font-bold transition-all duration-200 ${
                language === lang.code ? t.segmented.active : t.segmented.idle
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}