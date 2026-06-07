// src/app/admin/components/AdminHeader.tsx
"use client";

import { useRouter } from "next/navigation";

export default function AdminHeader() {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Admin Operation Control Center</h1>
        <p className="text-slate-400 text-xs mt-1">Manage credential provisioning, clustering, assignments, and audit ledgers.</p>
      </div>
      <button 
        onClick={() => router.push("/admin/numerical-ability")} 
        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all"
      >
        + Create New Test Module
      </button>
    </div>
  );
}