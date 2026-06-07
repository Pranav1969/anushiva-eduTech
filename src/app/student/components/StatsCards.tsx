"use client";
import { CheckCircle, AlertCircle, Award, Target } from "lucide-react";

interface StatsCardsProps {
  total: number;
  completed: number;
  pending: number;
  avgScore: string | number;
}

export default function StatsCards({ total, completed, pending, avgScore }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
      <div className="bg-[#1E293B] border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20"><Target size={16} /></div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Total Available</div>
          <div className="text-base font-black text-white">{total} Units</div>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20"><CheckCircle size={16} /></div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Completed</div>
          <div className="text-base font-black text-white">{completed} Units</div>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20"><AlertCircle size={16} /></div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Pending Action</div>
          <div className="text-base font-black text-white">{pending} Units</div>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800/80 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20"><Award size={16} /></div>
        <div>
          <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Accuracy Mean</div>
          <div className="text-base font-black text-white">{avgScore}% Ratio</div>
        </div>
      </div>
    </div>
  );
}
