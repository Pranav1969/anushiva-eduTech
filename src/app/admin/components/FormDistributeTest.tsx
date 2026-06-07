// src/app/admin/components/FormDistributeTest.tsx
"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormProps {
  tests: any[];
  students: any[];
  groups: any[];
  onAssignmentComplete: (testId: string) => void;
}

export default function FormDistributeTest({ tests, students, groups, onAssignmentComplete }: FormProps) {
  const [assignTestId, setAssignTestId] = useState("");
  const [assignmentType, setAssignmentType] = useState("individual");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");

  const handleAssignTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTestId) return;

    if (assignmentType === "individual") {
      if (!assignStudentId) return;
      const { error } = await supabase.from("assigned_tests").insert({
        test_id: assignTestId,
        student_id: assignStudentId
      });

      if (error) {
        alert("This test is already assigned to this student.");
      } else {
        alert("Test target successfully assigned to the student's profile!");
        onAssignmentComplete(assignTestId);
      }
    } else {
      if (!assignGroupId) return;
      
      const { data: members, error: fetchError } = await supabase
        .from("student_groups")
        .select("student_id")
        .eq("group_id", assignGroupId);

      if (fetchError || !members || members.length === 0) {
        alert("Could not assign test: Selected group has no students assigned to it yet.");
        return;
      }

      const insertPayload = members.map(m => ({
        test_id: assignTestId,
        student_id: m.student_id
      }));

      const { error } = await supabase.from("assigned_tests").upsert(insertPayload, { onConflict: "test_id,student_id" });

      if (error) {
        alert("Error occurred during batch group assignment: " + error.message);
      } else {
        alert(`Test successfully rolled out to all ${members.length} members of the group!`);
        onAssignmentComplete(assignTestId);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
        <Send size={14} className="text-cyan-400"/>
        <h2 className="text-xs font-black text-[#22D3EE] uppercase tracking-wider">Distribute Test Modules</h2>
      </div>
      <form onSubmit={handleAssignTest} className="space-y-3">
        <select value={assignTestId} onChange={e => setAssignTestId(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer transition-colors" required>
          <option value="">-- Choose Target Test --</option>
          {tests.map(t => <option key={t.id} value={t.id}>{t.test_name}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800/60">
          <button type="button" onClick={() => setAssignmentType("individual")} className={`py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${assignmentType === "individual" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>Single Student</button>
          <button type="button" onClick={() => setAssignmentType("group")} className={`py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${assignmentType === "group" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}>Entire Group</button>
        </div>

        {assignmentType === "individual" ? (
          <select value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer transition-colors" required>
            <option value="">-- Choose Destination Student --</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.username})</option>)}
          </select>
        ) : (
          <select value={assignGroupId} onChange={e => setAssignGroupId(e.target.value)} className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer transition-colors" required>
            <option value="">-- Choose Target Cluster Group --</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        <button type="submit" className={`w-full py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${assignmentType === "individual" ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/10" : "bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/10"}`}>
          {assignmentType === "individual" ? "Grant Access Pass" : "Deploy Bulk Access Passes"}
        </button>
      </form>
    </div>
  );
}