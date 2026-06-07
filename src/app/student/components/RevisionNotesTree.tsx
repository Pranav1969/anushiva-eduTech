"use client";
import React, { useState, useEffect, useMemo } from "react";

import { 
  Loader2, ChevronDown, ChevronRight, BookOpen, Edit3, 
  Save, CheckCircle, Trash2, Check, 
  Trophy, Book, FileText, CheckCircle2, Maximize2, Minimize2,
  ChevronLeft
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import StudyDesk from "./StudyDesk"; // Update path as needed

interface RevisionNotesTreeProps {
  loadingNotes: boolean;
  courseContentTree: any[];
  expandedChapters: Record<string, boolean>;
  onToggleChapter: (chapterId: string) => void;
}

type SubjectTheme = {
  bg: string;
  accent: string;
  border: string;
  text: string;
  ring: string;
  badge: string;
  progress: string;
};

type MetricsType = {
  total: number;
  done: number;
  percentage: number;
};

const getSubjectTheme = (name: string = ""): SubjectTheme => {
  const normalized = name.toLowerCase();
  if (normalized.includes("reasoning")) {
    return {
      bg: "bg-blue-50/40", accent: "bg-blue-600 hover:bg-blue-700 text-white",
      border: "border-blue-100", text: "text-blue-900", ring: "focus-within:ring-blue-500/20",
      badge: "bg-blue-100 text-blue-800 border-blue-200", progress: "bg-blue-600"
    };
  }
  if (normalized.includes("quantitative") || normalized.includes("math") || normalized.includes("numerical")) {
    return {
      bg: "bg-indigo-50/40", accent: "bg-indigo-600 hover:bg-indigo-700 text-white",
      border: "border-indigo-100", text: "text-indigo-900", ring: "focus-within:ring-indigo-500/20",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-200", progress: "bg-indigo-600"
    };
  }
  if (normalized.includes("english") || normalized.includes("verbal") || normalized.includes("lang")) {
    return {
      bg: "bg-emerald-50/40", accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
      border: "border-emerald-100", text: "text-emerald-900", ring: "focus-within:ring-emerald-500/20",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200", progress: "bg-emerald-600"
    };
  }
  return {
    bg: "bg-amber-50/40", accent: "bg-amber-600 hover:bg-amber-700 text-slate-950",
    border: "border-amber-100", text: "text-amber-900", ring: "focus-within:ring-amber-500/20",
    badge: "bg-amber-100 text-amber-900 border-amber-200", progress: "bg-amber-600"
  };
};

// --- FLUID MEDIA PARSING RENDERING ENGINE ---
const renderNarrativeWithImages = (text: string, imageMap: Record<string, string>) => {
  if (!text) return null;

  // Global Regex capturing signature layout tags: [img:your-custom-slug-1234]
  const imageRegex = /\[img:([^\]]+)\]/g;
  const parts = text.split(imageRegex);

  return parts.map((part, index) => {
    // If the part is caught by the regex match group, it represents an image name key index
    if (index % 2 === 1) {
      const imageUrl = imageMap[part];
      if (imageUrl) {
        return (
          <span key={index} className="block my-5 clear-both text-center select-none">
            <img 
              src={imageUrl} 
              alt={`Syllabus Diagram Asset: ${part}`} 
              className="mx-auto rounded-xl border border-slate-200 shadow-xs max-h-[420px] object-contain bg-white p-1.5 hover:scale-[1.01] transition-transform duration-200"
              loading="lazy"
            />
          </span>
        );
      }
      return <span key={index} className="text-xs font-mono text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">Image Token Missing: "{part}"</span>;
    }
    return <span key={index}>{part}</span>;
  });
};

export default function RevisionNotesTree({
  loadingNotes,
  courseContentTree,
  expandedChapters,
  onToggleChapter,
}: RevisionNotesTreeProps) {
  const [personalNotes, setPersonalNotes] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [selectedTopicIdMap, setSelectedTopicIdMap] = useState<Record<string, string>>({});
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  
  // Custom Dynamic State for Index Sidebar Slider Collapse Panel
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  // Storage dictionary keeping all image records compiled in state
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const savedWorkspace = localStorage.getItem("student_desk_scratchpad");
    if (savedWorkspace) setPersonalNotes(savedWorkspace);

    const savedProgress = localStorage.getItem("student_syllabus_progress");
    if (savedProgress) {
      try { setCompletedTopics(JSON.parse(savedProgress)); } catch (e) { console.error(e); }
    }
  }, []);

  // Hydrate asset library metadata mappings directly from Supabase
  useEffect(() => {
    async function loadAssetLibrary() {
      try {
        const { data } = await supabase.from("notes_images").select("image_name, image_url");
        if (data) {
          const mapping = data.reduce((acc, curr) => {
            if (curr.image_name && curr.image_url) {
              acc[curr.image_name] = curr.image_url;
            }
            return acc;
          }, {} as Record<string, string>);
          setImageMap(mapping);
        }
      } catch (err) {
        console.error("Error building dashboard image token map:", err);
      }
    }
    loadAssetLibrary();
  }, []);

  useEffect(() => {
    if (courseContentTree?.length > 0 && !activeSectionId) {
      setActiveSectionId(courseContentTree[0].id);
    }
  }, [courseContentTree, activeSectionId]);

  const currentActiveSection = useMemo(() => {
    return courseContentTree.find((sec) => sec.id === activeSectionId);
  }, [courseContentTree, activeSectionId]);

  const theme = useMemo(() => {
    return getSubjectTheme(currentActiveSection?.name);
  }, [currentActiveSection?.name]);

  const metrics = useMemo<MetricsType>(() => {
    if (!currentActiveSection) return { total: 0, done: 0, percentage: 0 };
    let total = 0, done = 0;
    currentActiveSection.notes_chapters?.forEach((chap: any) => {
      chap.notes_topics?.forEach((topic: any) => {
        total++;
        if (completedTopics[topic.id]) done++;
      });
    });
    return { total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [currentActiveSection, completedTopics]);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(true);
    localStorage.setItem("student_desk_scratchpad", personalNotes);
    setTimeout(() => setSaveStatus(false), 1500);
  };

  const clearScratchpad = () => {
    if (window.confirm("Are you sure you want to clear your current scratchpad notes?")) {
      setPersonalNotes("");
      localStorage.removeItem("student_desk_scratchpad");
    }
  };

  const toggleTopicCompletion = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedProgress = { ...completedTopics, [topicId]: !completedTopics[topicId] };
    setCompletedTopics(updatedProgress);
    localStorage.setItem("student_syllabus_progress", JSON.stringify(updatedProgress));
  };

  if (loadingNotes) {
    return (
      <div className="text-center py-32 flex flex-col items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl shadow-xs w-full max-w-5xl mx-auto">
        <Loader2 className="animate-spin text-slate-800 w-8 h-8" />
        <p className="text-sm font-medium text-slate-600 tracking-wide">Assembling syllabus volumes...</p>
      </div>
    );
  }

  if (courseContentTree.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 max-w-xl mx-auto px-6 shadow-xs">
        <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">Library Volume Missing</h3>
        <p className="text-xs text-slate-500 leading-relaxed">No lecture blueprints mapped onto this configuration yet.</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch w-full transition-all duration-300 ${
      isFullscreenMode ? "fixed inset-2 z-50 bg-[#FDFBF7] p-4 rounded-2xl border shadow-2xl h-[calc(100vh-16px)]" : "h-[calc(100vh-140px)]"
    }`}>
      
      {/* 📖 LEFT MODULE: MAIN WORKSPACE INTERFACE */}
      <div className="lg:col-span-3 overflow-hidden h-full flex flex-col space-y-3">
        
        {/* Course Horizontal Switcher Bar & Focus Switchers */}
        <div className="flex items-center justify-between gap-4 bg-white p-1.5 rounded-xl border border-slate-200 sticky top-0 z-30 shrink-0 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {courseContentTree.map((sec) => {
              const isActive = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold tracking-tight rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive ? "bg-stone-950 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Book className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{sec.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsFullscreenMode(!isFullscreenMode)}
            className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg transition-all"
          >
            {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreenMode ? "Minimize" : "Focus Canvas"}</span>
          </button>
        </div>

        {currentActiveSection && (
          <div className="flex-grow overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            
            {/* Upper Interactive Milestone Dashboard Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${theme.badge}`}>
                  {currentActiveSection.exams?.name || "ARCHIVES"}
                </span>
                <span className="text-xs font-semibold text-slate-500">Study Materials Blueprint</span>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> 
                  <span>{metrics.done}/{metrics.total} Completed</span>
                </div>
                <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border">
                  <div className={`h-full rounded-full transition-all duration-500 ${theme.progress}`} style={{ width: `${metrics.percentage}%` }} />
                </div>
              </div>
            </div>

            {/* Curriculum Accordion Units */}
            <div className="space-y-3">
              {currentActiveSection.notes_chapters?.map((chap: any) => {
                const isExpanded = !!expandedChapters[chap.id];
                const totalTopics = chap.notes_topics || [];
                const totalInChapter = totalTopics.length;
                const doneInChapter = totalTopics.filter((t: any) => completedTopics[t.id]).length;
                const isChapterComplete = totalInChapter > 0 && totalInChapter === doneInChapter;

                const activeTopicId = selectedTopicIdMap[chap.id] || (totalTopics[0]?.id || "");
                const currentActiveTopic = totalTopics.find((t: any) => t.id === activeTopicId);

                return (
                  <div key={chap.id} className={`border rounded-xl bg-white shadow-xs transition-all ${isChapterComplete ? "border-emerald-200" : "border-slate-200"}`}>
                    <button
                      onClick={() => onToggleChapter(chap.id)}
                      className="w-full flex items-center justify-between p-4 text-left bg-slate-50/60 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase ${isChapterComplete ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-white border-slate-200"}`}>
                          {isChapterComplete ? "Done" : `CH ${chap.sequence_order}`}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">{chap.name}</span>
                        <span className="text-[11px] text-slate-400 font-medium font-mono shrink-0">({doneInChapter}/{totalInChapter} Read)</span>
                      </div>
                      <div className="text-slate-400">{isExpanded && <ChevronDown className="w-4 h-4 text-slate-800" />}{!isExpanded && <ChevronRight className="w-4 h-4" />}</div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-white flex h-[550px] relative overflow-hidden transition-all duration-300">
                        
                        {/* 📖 TOPIC INDEX SIDEBAR */}
                        <div 
                          className={`bg-stone-50/60 border-r border-slate-100 flex flex-col gap-1.5 p-2 overflow-y-auto transition-all duration-300 ease-in-out shrink-0 h-full select-none ${
                            isSidebarOpen ? "w-1/4 opacity-100" : "w-0 !p-0 opacity-0 pointer-events-none"
                          }`}
                        >
                          {totalInChapter === 0 ? (
                            <div className="p-3 text-xs text-slate-400 italic">No topics mapped.</div>
                          ) : (
                            totalTopics.map((topic: any) => {
                              const isTopicActive = topic.id === activeTopicId;
                              const isTopicDone = !!completedTopics[topic.id];
                              return (
                                <button
                                  key={topic.id}
                                  onClick={() => setSelectedTopicIdMap(prev => ({ ...prev, [chap.id]: topic.id }))}
                                  className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between gap-2 border ${
                                    isTopicActive ? "bg-white border-slate-300 shadow-xs font-bold text-slate-900" : "border-transparent text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div 
                                      onClick={(e) => toggleTopicCompletion(topic.id, e)}
                                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isTopicDone ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"}`}
                                    >
                                      {isTopicDone && <Check className="w-2 h-2 stroke-[3]" />}
                                    </div>
                                    <span className={`truncate ${isTopicDone ? "text-slate-400 line-through font-normal" : ""}`}>
                                      {topic.sequence_order}. {topic.name}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* ↔ ADJUSTABLE COLLAPSE BUTTON PILL DRAG AXIS */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-in-out" 
                          style={{ left: isSidebarOpen ? "25%" : "0px", transform: "translate(-50%, -50%)" }}
                        >
                          <button
                            type="button"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-6 h-12 bg-white border border-slate-200 hover:border-slate-400 shadow-md rounded-full flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95 group"
                            title={isSidebarOpen ? "Hide Index (Full Focus Mode)" : "Show Topic Selector Index"}
                          >
                            {isSidebarOpen && (
                              <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                            )}
                            {!isSidebarOpen && (
                              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                            )}
                          </button>
                        </div>

                        {/* HIGH VISIBILITY FOCUS CANVA DISPLAY */}
                        <div className={`overflow-y-auto p-6 bg-white flex flex-col scrollbar-thin transition-all duration-300 ${
                          isSidebarOpen ? "w-3/4" : "w-full"
                        }`}>
                          {currentActiveTopic ? (
                            <div className="space-y-4 h-full flex flex-col justify-between animate-in fade-in duration-200">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">{currentActiveTopic.name}</h4>
                                  <button
                                    onClick={(e) => toggleTopicCompletion(currentActiveTopic.id, e)}
                                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                                      completedTopics[currentActiveTopic.id] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                    }`}
                                  >
                                    <CheckCircle2 className={`w-4 h-4 ${completedTopics[currentActiveTopic.id] ? "text-emerald-600 fill-emerald-100" : "text-slate-300"}`} />
                                    <span>{completedTopics[currentActiveTopic.id] ? "Completed" : "Mark Done"}</span>
                                  </button>
                                </div>
                                <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap pt-1 font-sans font-normal antialiased tracking-wide bg-stone-50/40 p-5 rounded-xl border border-stone-100 select-text">
                                  {renderNarrativeWithImages(currentActiveTopic.paragraph_text, imageMap)}
                                </div>
                              </div>
                              <div className="pt-6 text-center border-t border-slate-50 shrink-0">
                                <span className="text-[10px] text-slate-300 tracking-widest font-bold uppercase block">End of Module Material</span>
                              </div>
                            </div>
                          ) : (
                            <div className="m-auto text-center space-y-1 text-slate-400">
                              <FileText className="w-8 h-8 mx-auto stroke-1" />
                              <p className="text-xs italic">Select a lesson node item from index tracking sheet.</p>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
      {/* 📝 RIGHT MODULE: PERSONAL SCRATCHPAD DOCK */}
         <div className="lg:col-span-1 h-full min-h-[500px]">
           {/* The StudyDesk component will now take the full height of this div */}
           <StudyDesk currentSection={currentActiveSection?.name || "the current topic"} />
         </div>
    </div>
  );
}