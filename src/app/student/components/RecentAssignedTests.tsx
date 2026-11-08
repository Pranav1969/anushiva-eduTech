//src\app\student\components\RecentAssignedTests.tsx
"use client";

import { Hourglass, Calendar, ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { TestRecord } from "../page";
import { useTheme } from "../theme/ThemeProvider";

interface RecentAssignedTestsProps {
  tests: TestRecord[];
  onLockedClick: (planName: string) => void;
}

export default function RecentAssignedTests({ tests, onLockedClick }: RecentAssignedTestsProps) {
  const { theme: th } = useTheme(); // `th` because the map callback below uses `t` for each test
  const horizontalPendingTests = tests.filter(t => !t.userAttempt || t.userAttempt.is_active_retest_granted).slice(0, 5);

  if (horizontalPendingTests.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-xs font-black uppercase ${th.ui.cyanText} tracking-widest`}>⚡ Priority Work Pipeline</h2>
          <p className={`${th.text.muted} text-[11px] mt-0.5`}>Recently assigned evaluations requiring completion</p>
        </div>
      </div>

      {/* Horizontal Scroller container - SaaS Slick Aspect Ratio */}
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent -mx-1 px-1">
        {horizontalPendingTests.map((t) => {
          const isPremium = t.required_plan === "premium";

          return (
            <div 
              key={t.id} 
              className={`w-[280px] sm:w-[320px] shrink-0 border rounded-2xl p-5 snap-start shadow-xl relative overflow-hidden group flex flex-col justify-between transition-all duration-300 ${
                isPremium && !t.is_locked ? th.ui.premiumCard : th.ui.pipelineCard
              }`}
              onClickCapture={(e) => {
                if (t.is_locked) {
                  e.stopPropagation();
                  e.preventDefault();
                  onLockedClick(t.required_plan || "premium");
                }
              }}
            >
              {/* Visual Top Highlight Accent Strip for Unlocked Premium Mocks */}
              {isPremium && !t.is_locked && (
                <div className={`absolute top-0 left-0 h-[2px] w-0 ${th.ui.premiumStrip} transition-all duration-500 ease-out group-hover:w-full`} />
              )}

              {/* Visual overlay indicator if locked */}
              {t.is_locked && (
                <div className={`absolute inset-0 backdrop-blur-[3px] border rounded-2xl z-20 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center ${th.dash.lockOverlay}`}>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-lg mb-1.5 ${th.dash.lockIcon}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-black tracking-widest uppercase border px-2 py-0.5 rounded shadow-md ${th.dash.lockBadge}`}>
                    Unlock {t.required_plan}
                  </span>
                </div>
              )}

              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full pointer-events-none" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-bold border px-2 py-0.5 rounded uppercase font-mono flex items-center gap-1 ${th.ui.chipBlue}`}>
                    <Calendar size={10} /> {new Date(t.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </span>
                  
                  {isPremium ? (
                    <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${th.ui.chipAmber}`}>
                      <Sparkles size={9} className={`${th.ui.chipAmberIcon} animate-pulse`} /> Premium
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold px-2 py-0.5 border rounded uppercase tracking-wide ${th.ui.chipCyan}`}>
                      Active Run
                    </span>
                  )}
                </div>

                <h4 className={`text-sm font-bold tracking-tight line-clamp-1 transition-colors ${
                  isPremium && !t.is_locked ? th.ui.titlePremium : th.ui.titleNormal
                }`}>
                  {t.test_name}
                </h4>
              </div>

              <div className={`mt-6 flex items-center justify-between border-t ${th.ui.dividerSoft} pt-3`}>
                <div className={`text-[10px] ${th.text.muted} font-medium flex items-center gap-1 font-mono`}>
                  <Hourglass size={11} className={th.text.faint} /> {t.timer_type}
                </div>
                <Link href={`/student/numerical-ability?id=${t.id}`} className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors group/link ${
                  isPremium && !t.is_locked ? th.ui.linkPremium : th.ui.linkNormal
                }`}>
                  Launch <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}