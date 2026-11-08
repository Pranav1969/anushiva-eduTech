//src\app\student\components\StatsCards.tsx
"use client";
import { CheckCircle, AlertCircle, Award, Target } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

interface StatsCardsProps {
  total: number;
  completed: number;
  pending: number;
  avgScore: string | number;
}

export default function StatsCards({ total, completed, pending, avgScore }: StatsCardsProps) {
  const { theme: t } = useTheme();
  const CARD = `${t.ui.statSolid} border p-4 rounded-xl flex items-center gap-3`;
  const LABEL = `${t.text.faint} text-[9px] uppercase font-bold tracking-wider`;
  const VALUE = `text-base font-black ${t.ui.textStrong}`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
      <div className={CARD}>
        <div className={`p-2 rounded-lg border ${t.ui.iconBlue}`}><Target size={16} /></div>
        <div>
          <div className={LABEL}>Total Available</div>
          <div className={VALUE}>{total} Units</div>
        </div>
      </div>

      <div className={CARD}>
        <div className={`p-2 rounded-lg border ${t.ui.iconEmerald}`}><CheckCircle size={16} /></div>
        <div>
          <div className={LABEL}>Completed</div>
          <div className={VALUE}>{completed} Units</div>
        </div>
      </div>

      <div className={CARD}>
        <div className={`p-2 rounded-lg border ${t.ui.iconAmber}`}><AlertCircle size={16} /></div>
        <div>
          <div className={LABEL}>Pending Action</div>
          <div className={VALUE}>{pending} Units</div>
        </div>
      </div>

      <div className={CARD}>
        <div className={`p-2 rounded-lg border ${t.ui.iconPurple}`}><Award size={16} /></div>
        <div>
          <div className={LABEL}>Accuracy Mean</div>
          <div className={VALUE}>{avgScore}% Ratio</div>
        </div>
      </div>
    </div>
  );
}