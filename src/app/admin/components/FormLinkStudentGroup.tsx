"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormProps {
  groups: any[];
  students: any[];
}

export default function FormLinkStudentGroup({ groups, students }: FormProps) {
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");

  const handleAddStudentToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroupId || !targetStudentId) return;

    const { error } = await supabase.from("student_groups").insert({
      group_id: targetGroupId,
      student_id: targetStudentId
    });

    if (error) {
      alert("This student is already inside this group.");
    } else {
      alert("Student successfully linked to cluster group!");
      setTargetStudentId("");
    }
  };

  return (
    <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <h2 className="text-xs font-black text-[#A855F7] uppercase tracking-wider flex items-center gap-1.5"><Users size={14}/> Add Student to Group Cluster</h2>
      <form onSubmit={handleAddStudentToGroup} className="space-y-3">
        <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer" required>
          <option value="">-- Choose Cluster Group --</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={targetStudentId} onChange={e => setTargetStudentId(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer" required>
          <option value="">-- Choose Target Student --</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
        </select>
        <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all">Link To Group</button>
      </form>
    </div>
  );
}