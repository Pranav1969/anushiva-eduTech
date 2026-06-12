// src/app/page.tsx
"use client";

import Link from "next/link";
import { ShieldCheck, GraduationCap, ArrowRight, Sparkles, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans antialiased">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#2563EB]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#312E81]/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Legacy Partnership Badge */}
      <div className="relative z-10 mb-6 animate-in fade-in duration-500">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-semibold rounded-full shadow-sm">
          <BookOpen size={13} className="text-blue-500" />
          In Association with <span className="text-white font-bold">Karuna Book Centre</span>
        </div>
      </div>

      {/* Portal Branding */}
      <div className="text-center mb-14 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500 delay-75">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#312E81]/40 border border-[#8B5CF6]/30 text-[#22D3EE] text-[11px] font-bold uppercase tracking-widest rounded-full mb-4">
          <Sparkles size={11} className="animate-pulse" /> IBPS • SBI • RRB Clerk Practice Hub
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Anushiva Exam Portal
        </h1>
        <p className="text-slate-400 font-medium text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Your complete practice platform for bank exams. Accessible, simple, and structured to help you succeed.
        </p>
      </div>

      {/* Gateway Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
        
        {/* Admin Gateway Card */}
        <Link href="/admin_login" className="group">
          <div className="h-full bg-gradient-to-br from-[#1E293B] to-[#131C2E] p-8 md:p-10 rounded-[32px] shadow-2xl border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-1">
            <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-500 ease-out" />
            
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-indigo-950/50 group-hover:border-indigo-500/30 transition-all duration-300 text-indigo-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Admin Gateway</h2>
            <p className="text-slate-400 font-medium text-sm mt-3 leading-relaxed max-w-xs flex-1">
              Manage test papers, organize question banks, and review overall student performance metrics.
            </p>
            
            <div className="mt-8 w-full py-3.5 bg-slate-900 hover:bg-slate-950 border border-slate-800 group-hover:border-indigo-500/30 text-slate-300 group-hover:text-white rounded-xl font-bold text-xs tracking-widest transition-all uppercase flex items-center justify-center gap-2">
              Access Panel <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Student Gateway Card */}
        <Link href="/student/login" className="group">
          <div className="h-full bg-gradient-to-br from-[#1E293B] to-[#131C2E] p-8 md:p-10 rounded-[32px] shadow-2xl border border-slate-800/80 hover:border-[#2563EB]/50 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden group hover:-translate-y-1">
            <div className="absolute top-0 left-0 h-[3px] w-0 bg-gradient-to-r from-[#2563EB] to-[#22D3EE] group-hover:w-full transition-all duration-500 ease-out" />
            
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-blue-950/50 group-hover:border-[#2563EB]/30 transition-all duration-300 text-[#22D3EE]">
              <GraduationCap className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Student Portal</h2>
            <p className="text-slate-400 font-medium text-sm mt-3 leading-relaxed max-w-xs flex-1">
              Take full-length mock tests in a realistic exam layout to build speed, accuracy, and confidence.
            </p>
            
            <div className="mt-8 w-full py-3.5 bg-gradient-to-r from-[#2563EB] to-[#312E81] text-white rounded-xl font-bold text-xs tracking-widest transition-all uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-[#2563EB]/10">
              Start Practice <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Footer Branding */}
      <footer className="mt-16 text-center relative z-10 font-sans">
        <p className="text-slate-500 text-xs font-semibold tracking-wider uppercase">
          Powered by <span className="text-slate-300 font-bold">Anushiva Publications</span>
        </p>
      </footer>
    </main>
  );
}