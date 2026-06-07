// src/app/admin/components/FormStudentOnboarding.tsx
"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormProps {
  onSuccess: () => void;
}

export default function FormStudentOnboarding({ onSuccess }: FormProps) {
  const [newStudentName, setNewStudentName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newUsername.trim() || !newPassword.trim()) return;

    const { error } = await supabase.from("students").insert({
      name: newStudentName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim()
    });

    if (error) {
      alert("Error adding student profile: " + error.message);
    } else {
      alert("New student credential profile registered successfully!");
      setNewStudentName(""); setNewUsername(""); setNewPassword("");
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
        <UserPlus size={14} className="text-cyan-400"/>
        <h2 className="text-xs font-black text-[#22D3EE] uppercase tracking-wider">Provision Student Account</h2>
      </div>
      <form onSubmit={handleRegisterStudent} className="space-y-3">
        <input type="text" placeholder="Full Student Name (e.g. Pranav)" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors" required />
        <input type="text" placeholder="Custom Unique Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors" required />
        <input type="text" placeholder="Secure Password Key" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors" required />
        <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10">Save Account</button>
      </form>
    </div>
  );
}