//src/app/student/components/DashboardHeader.tsx
"use client";
import { useState } from "react";
import { Sparkles, UserCheck, LogOut, ChevronRight } from "lucide-react";
import { StudentSession } from "@/utils/auth";
import { useTheme } from "../theme/ThemeProvider";
import ThemeToggle from "../theme/ThemeToggle";
import ProfileDrawer, { StudentProfile } from "./ProfileDrawer";

interface DashboardHeaderProps {
  // StudentSession must carry the profile columns (exam, state, phone, plan...).
  student: StudentSession & Partial<StudentProfile>;
  onLogout: () => void;
  subtitle?: string;
}

export default function DashboardHeader({ student, onLogout, subtitle }: DashboardHeaderProps) {
  const { theme: t } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className={`relative p-6 md:p-8 rounded-2xl border shadow-xl overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${t.panel}`}>
      <div className="absolute top-0 right-0 w-[320px] h-full bg-gradient-to-l from-[#2563EB]/5 to-transparent pointer-events-none" />

      <div className="space-y-2 max-w-2xl relative z-10">
        <div className={`inline-flex items-center gap-2 px-3 py-1 border ${t.accent.soft} ${t.accent.text} text-[11px] font-bold uppercase tracking-wider rounded-md`}>
          <Sparkles size={12} className="animate-pulse" /> Authorized Terminal Workspace
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-2">
          <span className={t.text.heading}>Welcome Back,</span> <span className={`${t.accent.text} drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]`}>{student.name}</span>
        </h1>
        <p className={`${t.text.muted} text-xs md:text-sm leading-relaxed`}>
          {subtitle || "Review your customized assignment space, tracking progress metrics allocated explicitly to your account identity."}
        </p>
      </div>

      <div className={`flex items-center gap-3 p-3 rounded-xl border w-full md:w-auto justify-between shrink-0 relative z-10 ${t.inset}`}>
        {/* Clicking the identity block opens the profile drawer */}
        <button
          onClick={() => setProfileOpen(true)}
          aria-label="Open my profile"
          className="group flex items-center gap-2 rounded-lg text-left transition-all active:scale-[0.98]"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${t.accent.iconWrap} ${t.accent.text}`}>
            <UserCheck size={14} />
          </div>
          <div>
            <div className={`text-xs font-bold leading-none ${t.text.heading}`}>{student.username}</div>
            <div className={`text-[10px] font-mono mt-0.5 ${t.text.faint}`}>UID: {student.id.substring(0, 8)}</div>
          </div>
          <ChevronRight size={14} className={`${t.text.faint} transition-transform group-hover:translate-x-0.5`} />
        </button>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onLogout}
            className={`p-2 border rounded-lg transition-all active:scale-95 ${t.dash.logoutButton}`}
            title="Terminate secure session"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} student={student} />
    </div>
  );
}