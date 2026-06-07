"use client";

import { FileText, Trash2 } from "lucide-react";
import { supabase } from "@/utils/supabase";

interface TestCatalogsProps {
  tests: any[];
  onSelectTest: (id: string) => void;
  onRefresh: () => void;
}

export default function TestCatalogs({ tests, onSelectTest, onRefresh }: TestCatalogsProps) {
  const handleDeleteTest = async (id: string) => {
    if (!confirm("Delete this mock test entirely?")) return;
    await supabase.from("tests").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><FileText size={14}/> Configured Test Catalogs ({tests.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
        {tests.map(t => (
          <div key={t.id} className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl flex items-center justify-between group">
            <div>
              <h4 className="font-bold text-sm text-white">{t.test_name}</h4>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Scope: {t.timer_type} | Category: {t.section_id}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onSelectTest(t.id)} className="p-1.5 text-xs font-bold bg-[#312E81]/60 border border-slate-800 rounded-lg hover:text-[#22D3EE]">Stats</button>
              <button onClick={() => handleDeleteTest(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}