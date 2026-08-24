"use client";

import { useState, useEffect } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface FormProps {
  onSuccess: () => void;
}

interface StudentListDetails {
  id: string;
  name: string;
  username: string;
}

interface ExamDropdownDetails {
  id: string;
  name: string;
}

export default function FormStudentOnboarding({ onSuccess }: FormProps) {
  const [newStudentName, setNewStudentName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [gender, setGender] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [studentToDelete, setStudentToDelete] = useState("");
  const [students, setStudents] = useState<StudentListDetails[]>([]);
  const [exams, setExams] = useState<ExamDropdownDetails[]>([]);

  // Exams table isn't touched by RLS changes — this stays a direct client read
  const fetchExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("id, name")
      .order("name", { ascending: true });
    if (!error && data) setExams(data);
  };

  // Student roster now goes through the protected admin API route
  const fetchStudents = async () => {
    const res = await fetch("/api/admin/students");
    if (!res.ok) {
      console.error("Failed to load students:", await res.text());
      return;
    }
    const { students } = await res.json();
    setStudents(students || []);
  };

  useEffect(() => {
    fetchStudents();
    fetchExams();
  }, []);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newStudentName.trim() ||
      !newUsername.trim() ||
      !newPassword.trim() ||
      !state.trim() ||
      !district.trim() ||
      !gender ||
      !selectedExam
    ) {
      alert("Please fill out all fields, including the target exam classification matrix.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName.trim(),
          username: newUsername.trim().toLowerCase(),
          password: newPassword.trim(),
          state: state.trim(),
          district: district.trim(),
          gender,
          exam: selectedExam,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert("Error adding student profile: " + result.error);
        return;
      }

      alert("New student account registered successfully!");
      setNewStudentName("");
      setNewUsername("");
      setNewPassword("");
      setState("");
      setDistrict("");
      setGender("");
      setSelectedExam("");
      fetchStudents();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToDelete) {
      alert("Please select a student to delete.");
      return;
    }

    const selectedStudent = students.find(s => s.username === studentToDelete);
    const displayName = selectedStudent ? `${selectedStudent.name} (@${selectedStudent.username})` : studentToDelete;

    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete ${displayName}? This removes their login access entirely.`
    );
    if (!confirmDelete) return;

    const res = await fetch("/api/admin/students", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: studentToDelete }),
    });

    const result = await res.json();

    if (!res.ok) {
      alert("Error deleting student: " + result.error);
      return;
    }

    alert("Student account successfully deleted!");
    setStudentToDelete("");
    fetchStudents();
    onSuccess();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
          <UserPlus size={14} className="text-cyan-400" />
          <h2 className="text-xs font-black text-[#22D3EE] uppercase tracking-wider">
            Provision Student Account
          </h2>
        </div>

        <form onSubmit={handleRegisterStudent} className="space-y-3">
          <input
            type="text"
            placeholder="Full Student Name (e.g. Pranav)"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors"
            required
            disabled={submitting}
          />

          <input
            type="text"
            placeholder="Custom Unique Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors"
            required
            disabled={submitting}
          />

          <input
            type="text"
            placeholder="Secure Password Key (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors"
            required
            disabled={submitting}
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors"
              required
              disabled={submitting}
            />
            <input
              type="text"
              placeholder="District"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors"
              required
              disabled={submitting}
            />
          </div>

          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-400 focus:text-white focus:outline-none transition-colors"
            required
            disabled={submitting}
          >
            <option value="" disabled hidden>Select Gender</option>
            <option value="Male" className="text-white">Male</option>
            <option value="Female" className="text-white">Female</option>
            <option value="Other" className="text-white">Other</option>
          </select>

          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800/80 focus:border-indigo-500 rounded-xl p-2.5 text-xs text-slate-400 focus:text-white focus:outline-none transition-colors"
            required
            disabled={submitting}
          >
            <option value="" disabled hidden>Select Compulsory Target Exam Assignment...</option>
            {exams.length === 0 ? (
              <option disabled value="">No active exams found inside relational schema records</option>
            ) : (
              exams.map((ex) => (
                <option key={ex.id} value={ex.name} className="text-white">{ex.name}</option>
              ))
            )}
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/10"
          >
            {submitting ? "Saving..." : "Save Account"}
          </button>
        </form>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
          <UserMinus size={14} className="text-rose-400" />
          <h2 className="text-xs font-black text-rose-400 uppercase tracking-wider">
            Deprovision Student Account
          </h2>
        </div>

        <form onSubmit={handleDeleteStudent} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={studentToDelete}
              onChange={(e) => setStudentToDelete(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800/80 focus:border-rose-500 rounded-xl p-2.5 text-xs text-slate-400 focus:text-white focus:outline-none transition-colors"
              required
            >
              <option value="" disabled hidden>Select Student to Remove...</option>
              {students.length === 0 ? (
                <option disabled value="">No students available</option>
              ) : (
                students.map((student) => (
                  <option key={student.id} value={student.username} className="text-white">
                    {student.name} ({student.username})
                  </option>
                ))
              )}
            </select>
            <button
              type="submit"
              disabled={students.length === 0 || !studentToDelete}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/10 disabled:shadow-none"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}