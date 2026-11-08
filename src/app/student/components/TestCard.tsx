//src\app\student\components\TestCard.tsx
"use client";

import Link from "next/link";
import { Calculator, Lock, Eye, Play, Sparkles } from "lucide-react";
import { TestRecord } from "../page";
import { useTheme } from "../theme/ThemeProvider";

interface TestCardProps {
  test: TestRecord;
}

export default function TestCard({ test }: TestCardProps) {
  const { theme: t } = useTheme();
  const hasAttempted = !!test.userAttempt;
  const isRetestAllowed = test.userAttempt?.is_active_retest_granted === true;
  const lockEntryLink = hasAttempted && !isRetestAllowed;
  const isPremium = test.required_plan === "premium";

  return (
    <div 
      className={`relative rounded-xl overflow-hidden flex flex-col justify-between h-full min-h-[170px] p-3.5 shadow-md group transition-all duration-300 border ${
        isPremium ? t.ui.premiumCard : t.ui.testCard
      }`}
    >
      {/* Visual Top Highlight Accent Strip */}
      <div className={`absolute top-0 left-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full ${
        isPremium ? t.ui.premiumStrip : t.ui.normalStrip
      }`} />

      {/* Top Header Row */}
      <div className="flex justify-between items-center gap-1.5 w-full">
        <div className={`w-7 h-7 rounded-lg border shrink-0 flex items-center justify-center transition-colors ${
          isPremium ? t.ui.iconBoxPremium : t.ui.iconBoxNormal
        }`}>
          <Calculator size={13} />
        </div>
        
        {lockEntryLink ? (
          <span className={`text-[8px] font-extrabold border px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shrink-0 ${t.ui.badgeRed}`}>
            <Lock size={8} /> Completed ({test.userAttempt?.score}/{test.userAttempt?.total_questions})
          </span>
        ) : hasAttempted && isRetestAllowed ? (
          <span className={`text-[8px] font-extrabold border px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0 ${t.ui.badgeAmber}`}>
            🔄 Retest
          </span>
        ) : (
          <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 border ${
            isPremium ? t.ui.chipAmber : t.ui.badgeGreen
          }`}>
            {isPremium ? "⭐ Premium" : "Free Assessment"}
          </span>
        )}
      </div>

      {/* Main Core Content Block */}
      <div className="my-2.5 space-y-1">
        <h3 className={`text-xs font-bold tracking-tight leading-snug line-clamp-2 transition-colors duration-200 ${
          isPremium ? t.ui.titlePremium : t.ui.titleNormal
        }`}>
          {test.test_name}
        </h3>
        <p className={`${t.ui.clockLabel} font-bold uppercase tracking-wider text-[8px] flex items-center gap-1 flex-wrap`}>
          Clock: <span className={`${t.ui.clockValue} px-1 py-0.2 rounded font-mono text-[9px] border tracking-normal normal-case`}>{test.timer_type?.replace("-", " ")}</span>
        </p>
      </div>

      {/* Button Execution Footer Layout */}
      <div className={`w-full pt-2 border-t ${t.ui.dividerSoft}`}>
        {lockEntryLink ? (
          <Link href={`/student/numerical-ability?id=${test.id}&viewMode=true`} className="block w-full">
            <button className={`w-full py-1.5 border font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-colors ${t.ui.btnGhost}`}>
              <Eye size={10} /> Scorecard
            </button>
          </Link>
        ) : (
          <Link href={`/student/numerical-ability?id=${test.id}`} className="block w-full">
            <button className={`w-full py-1.5 font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all duration-200 shadow-sm group/btn text-white ${
              isPremium ? t.ui.btnPremium : t.ui.btnPrimary
            }`}>
              <Play size={8} fill="currentColor" className="group-hover/btn:translate-x-0.5 transition-transform duration-200" /> 
              <span>{isRetestAllowed ? "Retest" : "Start Test"}</span>
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}