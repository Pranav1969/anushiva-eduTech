//src\app\student\components\TestCard.tsx
"use client";

import Link from "next/link";
import { Calculator, Lock, Eye, Play } from "lucide-react";
import { TestRecord } from "../page";
import { useTheme } from "../theme/ThemeProvider";
import ShareTestButton from "./ShareTestButton";

interface TestCardProps {
  test: TestRecord;
}

export default function TestCard({ test }: TestCardProps) {
  const { theme: t } = useTheme();
  const hasAttempted = !!test.userAttempt;
  const isRetestAllowed = test.userAttempt?.is_active_retest_granted === true;
  const lockEntryLink = hasAttempted && !isRetestAllowed;
  const isPremium = test.required_plan === "premium";

  const actionBase =
    "h-8 w-full rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider leading-none transition-all duration-200";

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex flex-col h-full min-h-[180px] p-3.5 shadow-md group transition-all duration-300 border ${
        isPremium ? t.ui.premiumCard : t.ui.testCard
      }`}
    >
      {/* Visual Top Highlight Accent Strip */}
      <div
        className={`absolute top-0 left-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full ${
          isPremium ? t.ui.premiumStrip : t.ui.normalStrip
        }`}
      />

      {/* ZONE 1: Header row -> [icon + badge] on the left, [share] on the top right */}
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg border shrink-0 flex items-center justify-center transition-colors ${
              isPremium ? t.ui.iconBoxPremium : t.ui.iconBoxNormal
            }`}
          >
            <Calculator size={14} />
          </div>

          {lockEntryLink ? (
            <span
              className={`h-5 text-[8px] font-extrabold border px-2 rounded uppercase tracking-wider inline-flex items-center gap-1 min-w-0 ${t.ui.badgeRed}`}
            >
              <Lock size={8} className="shrink-0" />
              <span className="truncate">
                Completed ({test.userAttempt?.score}/{test.userAttempt?.total_questions})
              </span>
            </span>
          ) : hasAttempted && isRetestAllowed ? (
            <span
              className={`h-5 text-[8px] font-extrabold border px-2 rounded uppercase tracking-wider inline-flex items-center gap-1 animate-pulse shrink-0 ${t.ui.badgeAmber}`}
            >
              🔄 Retest
            </span>
          ) : (
            <span
              className={`h-5 text-[8px] font-extrabold uppercase tracking-wider px-2 rounded shrink-0 border inline-flex items-center ${
                isPremium ? t.ui.chipAmber : t.ui.badgeGreen
              }`}
            >
              {isPremium ? "⭐ Premium" : "Free Assessment"}
            </span>
          )}
        </div>

        {/* Share: top right corner. Hidden for private tests. z-30 keeps it clickable above the lock overlay */}
        {!test.owner_student_id && (
          <div className="relative z-30 shrink-0">
            <ShareTestButton
              iconOnly
              testId={test.id}
              testName={test.test_name}
              className={`h-8 w-8 border rounded-lg ${t.ui.btnGhost}`}
            />
          </div>
        )}
      </div>

      {/* ZONE 2: Body */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 py-3">
        <h3
          className={`text-xs font-bold tracking-tight leading-snug line-clamp-2 min-h-[2.1rem] transition-colors duration-200 ${
            isPremium ? t.ui.titlePremium : t.ui.titleNormal
          }`}
        >
          {test.test_name}
        </h3>
        <p
          className={`${t.ui.clockLabel} font-bold uppercase tracking-wider text-[8px] flex items-center gap-1.5 flex-wrap leading-none`}
        >
          Clock:
          <span
            className={`${t.ui.clockValue} px-1.5 py-0.5 rounded font-mono text-[9px] border tracking-normal normal-case`}
          >
            {test.timer_type?.replace("-", " ")}
          </span>
        </p>
      </div>

      {/* ZONE 3: Footer (main action only, full width) */}
      <div className={`w-full pt-2.5 border-t ${t.ui.dividerSoft}`}>
        {lockEntryLink ? (
          <Link
            href={`/student/numerical-ability?id=${test.id}&viewMode=true`}
            className={`${actionBase} border ${t.ui.btnGhost}`}
          >
            <Eye size={11} />
            <span>Scorecard</span>
          </Link>
        ) : (
          <Link
            href={`/student/numerical-ability?id=${test.id}`}
            className={`${actionBase} shadow-sm group/btn text-white ${
              isPremium ? t.ui.btnPremium : t.ui.btnPrimary
            }`}
          >
            <Play
              size={9}
              fill="currentColor"
              className="group-hover/btn:translate-x-0.5 transition-transform duration-200"
            />
            <span>{isRetestAllowed ? "Retest" : "Start Test"}</span>
          </Link>
        )}
      </div>
    </div>
  );
}