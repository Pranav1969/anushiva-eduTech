// src/app/admin/components/AnalyticsMatrix.tsx
"use client";

interface AnalyticsMatrixProps {
  analytics: any;
}

export default function AnalyticsMatrix({ analytics }: AnalyticsMatrixProps) {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
        Select a test "Stats" switch above to pull current metric evaluations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#0F172A]/50 border border-slate-800/50 p-3 rounded-xl text-xs">
        <span className="text-slate-400">Completion Ratio:</span>
        <span className="text-indigo-400 font-bold">{analytics.completedCount} / {analytics.assignedCount} Submitted</span>
      </div>

      <div className="max-h-[250px] overflow-y-auto pr-1">
        {analytics.attempts.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-10 font-medium bg-[#0F172A]/20 rounded-xl border border-slate-800/40">
            No active performance attempts recorded for this template yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-[#0F172A]/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0F172A] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-bold">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Score</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {analytics.attempts.map((att: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 font-semibold text-white">{att.students?.name}</td>
                    <td className="p-3 font-mono text-slate-400">{att.students?.username}</td>
                    <td className="p-3 font-bold text-emerald-400">{att.score} / {att.total_questions}</td>
                    <td className="p-3 text-slate-500 text-right">{new Date(att.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}