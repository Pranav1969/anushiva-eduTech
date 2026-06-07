"use client";
import { Sparkles, UserCheck, LogOut } from "lucide-react";
import { StudentSession } from "@/utils/auth";

interface DashboardHeaderProps {
  student: StudentSession;
  onLogout: () => void;
  subtitle?: string;
}

export default function DashboardHeader({ student, onLogout, subtitle }: DashboardHeaderProps) {
  return (
    <div className="relative bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-[#111827] p-6 md:p-8 rounded-2xl border border-slate-800/60 shadow-xl overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="absolute top-0 right-0 w-[320px] h-full bg-gradient-to-l from-[#2563EB]/5 to-transparent pointer-events-none" />
      
      <div className="space-y-2 max-w-2xl relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#312E81]/60 border border-[#8B5CF6]/30 text-[#22D3EE] text-[11px] font-bold uppercase tracking-wider rounded-md">
          <Sparkles size={12} className="animate-pulse" /> Authorized Terminal Workspace
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center gap-2">
          Welcome Back, <span className="text-[#2563EB] drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]">{student.name}</span>
        </h1>
        <p className="text-[#CBD5E1] text-xs md:text-sm leading-relaxed">
          {subtitle || "Review your customized assignment space, tracking progress metrics allocated explicitly to your account identity."}
        </p>
      </div>

      <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 w-full md:w-auto justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center border border-[#2563EB]/20 text-[#22D3EE]">
            <UserCheck size={14} />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white leading-none">{student.username}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {student.id.substring(0, 8)}</div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-all active:scale-95"
          title="Terminate secure session"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}