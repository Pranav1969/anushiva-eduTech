"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { authManager } from "@/utils/auth";
import { Loader2, Timer, ChevronLeft, ChevronRight, Send, Globe2 } from "lucide-react";
import AntiCheatWrapper from "../components/AntiCheatWrapper";
import TestScorecardView from "../components/TestScorecardView";


interface Question {
  id: string;
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string; option_e: string;
  correct_option: string;
  explanation: string;
  block_id: string | null;
  timer_seconds: number;
  chapter: string;
  section: string;
  content_blocks?: { title: string; paragraph_text: string; image_url: string | null; } | null;
}

interface SectionSettingContract {
  sectionName: string;
  durationMinutes: number;
  orderIndex: number;
}

type QuestionStatus = "not_visited" | "not_answered" | "answered" | "marked" | "marked_answered";

function LiveTestEngineCore() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const testId = searchParams.get("id");
  const isUrlViewMode = searchParams.get("viewMode") === "true";

  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("Anonymous Student");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testMeta, setTestMeta] = useState<any>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isExamOver, setIsExamOver] = useState(isUrlViewMode);
  const [score, setScore] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(1200); 
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [examLanguage, setExamLanguage] = useState<"english" | "hindi">("english");
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});

  useEffect(() => {
    const session = authManager.getSession();
    if (!session) {
      router.push("/student/login");
      return;
    }
    setStudentId(session.id);
    if (session.name) setStudentName(session.name);
  }, [router]);

  // FIXED STABLE ROUTING INTERFACE ARCHITECTURE CONTRACT TYPE GUARDS
  const uniqueSections = useMemo<string[]>(() => {
    if (testMeta?.section_settings && Array.isArray(testMeta.section_settings) && testMeta.section_settings.length > 0) {
      const sorted = [...(testMeta.section_settings as SectionSettingContract[])].sort(
        (a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)
      );
      return sorted.map(s => String(s.sectionName).trim());
    }
    const fallbackSet = new Set<string>();
    questions.forEach(q => { if (q.section) fallbackSet.add(q.section.trim()); });
    return fallbackSet.size > 0 ? Array.from(fallbackSet) : ["Assessment Section"];
  }, [testMeta, questions]);

  const currentSectionQuestions = useMemo<Question[]>(() => {
    if (uniqueSections.length === 0) return [];
    const targetActiveSectionName = uniqueSections[activeSectionIdx];
    return questions.filter(q => (q.section || "").trim() === targetActiveSectionName);
  }, [questions, uniqueSections, activeSectionIdx]);

  const globalCurrentIdx = useMemo(() => {
    const targetActiveQuestion = currentSectionQuestions[currentIdx];
    if (!targetActiveQuestion) return 0;
    return questions.findIndex(q => q.id === targetActiveQuestion.id);
  }, [questions, currentSectionQuestions, currentIdx]);

  useEffect(() => {
    if (!testId || !studentId) return;

    async function initializeEngine() {
      try {
        const { data: testData } = await supabase.from("tests").select("*").eq("id", testId).single();
        setTestMeta(testData);

        const { data: qData } = await supabase
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, option_e, correct_option, explanation, block_id, timer_seconds, chapter, section, content_blocks(title, paragraph_text, image_url)")
          .eq("test_id", testId)
          .order("created_at", { ascending: true });

        if (qData && qData.length > 0) {
          setQuestions(qData as any);
          
          const sectionSettings = testData?.section_settings as SectionSettingContract[] | undefined;
          if (testData?.timer_type === "sectional-timer" && sectionSettings && sectionSettings.length > 0) {
            const sortedSettings = [...sectionSettings].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setTimeLeft((sortedSettings[0]?.durationMinutes || 20) * 60);
          } else if (testData?.timer_type === "entire-test") {
            setTimeLeft((testData.duration_minutes || 45) * 60);
          } else {
            setTimeLeft(qData[0]?.timer_seconds || 60);
          }
          
          const initialStatuses: Record<string, QuestionStatus> = {};
          qData.forEach((q: any, idx: number) => {
            initialStatuses[q.id] = idx === 0 ? "not_answered" : "not_visited";
          });
          setQuestionStatuses(initialStatuses);
        }

        const { data: attemptData } = await supabase
          .from("attempts")
          .select("*")
          .eq("test_id", testId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (attemptData) {
          setScore(attemptData.score);
          if (!isUrlViewMode && !(attemptData.is_active_retest_granted === true || String(attemptData.is_active_retest_granted) === "true")) {
            setIsExamOver(true);
          }
          if (isUrlViewMode && attemptData.answers_matrix) setSelectedAnswers(attemptData.answers_matrix);
        }
      } catch (err) {
        console.error("Critical initialization failure hook context:", err);
      } finally {
        setLoading(false);
      }
    }
    initializeEngine();
  }, [testId, studentId, isUrlViewMode]);

  useEffect(() => {
    if (loading || questions.length === 0 || isExamOver || isUrlViewMode) return;
    
    const clockEngineInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (testMeta?.timer_type === "sectional-timer") {
            if (activeSectionIdx < uniqueSections.length - 1) {
              const insideNextIdx = activeSectionIdx + 1;
              const nextSectionTitleString = uniqueSections[insideNextIdx];
              const sectionSettings = testMeta?.section_settings as SectionSettingContract[] | undefined;
              const settingsMatchPayload = sectionSettings?.find(s => String(s.sectionName).trim() === nextSectionTitleString);
              
              setActiveSectionIdx(insideNextIdx);
              setCurrentIdx(0);
              
              const matchQ = questions.find(q => (q.section || "").trim() === nextSectionTitleString);
              if (matchQ) {
                setQuestionStatuses(prevS => ({ ...prevS, [matchQ.id]: "not_answered" }));
              }
              
              return (settingsMatchPayload?.durationMinutes || 20) * 60;
            } else {
              handleFinalSubmit(selectedAnswers);
              clearInterval(clockEngineInterval);
              return 0;
            }
          } else if (testMeta?.timer_type === "entire-test") {
            handleFinalSubmit(selectedAnswers);
            clearInterval(clockEngineInterval);
            return 0;
          } else {
            if (globalCurrentIdx < questions.length - 1) {
              const targetNextGlobalPos = globalCurrentIdx + 1;
              const nextQuestionObj = questions[targetNextGlobalPos];
              const currentQId = questions[globalCurrentIdx].id;
              
              setQuestionStatuses(prevStatus => {
                const copy = { ...prevStatus };
                if (!["answered", "marked", "marked_answered"].includes(copy[currentQId])) {
                  copy[currentQId] = "not_answered";
                }
                if (copy[nextQuestionObj.id] === "not_visited") {
                  copy[nextQuestionObj.id] = "not_answered";
                }
                return copy;
              });

              const targetSectionTabIdx = uniqueSections.indexOf((nextQuestionObj.section || "").trim());
              if (targetSectionTabIdx !== -1 && targetSectionTabIdx !== activeSectionIdx) {
                setActiveSectionIdx(targetSectionTabIdx);
              }
              
              const scopedIndexMatch = questions
                .filter(q => (q.section || "").trim() === (nextQuestionObj.section || "").trim())
                .findIndex(q => q.id === nextQuestionObj.id);

              setCurrentIdx(scopedIndexMatch !== -1 ? scopedIndexMatch : 0);
              return nextQuestionObj?.timer_seconds || 60;
            } else {
              handleFinalSubmit(selectedAnswers);
              clearInterval(clockEngineInterval);
              return 0;
            }
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(clockEngineInterval);
  }, [globalCurrentIdx, activeSectionIdx, uniqueSections, loading, isExamOver, testMeta, selectedAnswers, questions, isUrlViewMode]);

  const handleOptionSelect = (optionValueKey: string) => {
    if (isExamOver || !currentSectionQuestions[currentIdx]) return;
    const activeQuestionUuid = currentSectionQuestions[currentIdx].id;
    const updatedMatrix = { ...selectedAnswers, [activeQuestionUuid]: optionValueKey };
    setSelectedAnswers(updatedMatrix);

    // Update status immediately for real-time counter accuracy
    setQuestionStatuses(prev => {
      const currentStatus = prev[activeQuestionUuid] || "not_visited";
      const isMarked = currentStatus === "marked" || currentStatus === "marked_answered";
      return {
        ...prev,
        [activeQuestionUuid]: isMarked ? "marked_answered" : "answered"
      };
    });

    if (testMeta?.timer_type === "per-question") {
      if (globalCurrentIdx < questions.length - 1) {
        const targetNextGlobalPos = globalCurrentIdx + 1;
        const nextQuestionObj = questions[targetNextGlobalPos];
        
        setQuestionStatuses(prev => {
          const updated = { ...prev };
          updated[activeQuestionUuid] = "answered";
          if (updated[nextQuestionObj.id] === "not_visited") {
            updated[nextQuestionObj.id] = "not_answered";
          }
          return updated;
        });
        const targetSectionTabIdx = uniqueSections.indexOf((nextQuestionObj.section || "").trim());
        if (targetSectionTabIdx !== -1 && targetSectionTabIdx !== activeSectionIdx) {
          setActiveSectionIdx(targetSectionTabIdx);
        }

        const scopedIndexMatch = questions
          .filter(q => (q.section || "").trim() === (nextQuestionObj.section || "").trim())
          .findIndex(q => q.id === nextQuestionObj.id);
        setCurrentIdx(scopedIndexMatch !== -1 ? scopedIndexMatch : 0);
        setTimeLeft(nextQuestionObj?.timer_seconds || 60);
      } else {
        handleFinalSubmit(updatedMatrix);
      }
    }
  };

  const handleSaveAndNext = () => {
    if (!currentSectionQuestions[currentIdx]) return;
    const activeQuestionUuid = currentSectionQuestions[currentIdx].id;
    const questionIsAnswered = !!selectedAnswers[activeQuestionUuid];

    setQuestionStatuses(prev => ({
      ...prev,
      [activeQuestionUuid]: questionIsAnswered ? "answered" : "not_answered"
    }));

    if (currentIdx < currentSectionQuestions.length - 1) {
      const stepForwardIndex = currentIdx + 1;
      const targetNextQId = currentSectionQuestions[stepForwardIndex].id;
      setQuestionStatuses(prev => ({
        ...prev,
        [targetNextQId]: prev[targetNextQId] === "not_visited" ? "not_answered" : prev[targetNextQId]
      }));
      setCurrentIdx(stepForwardIndex);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentSectionQuestions[currentIdx]) return;
    const activeQuestionUuid = currentSectionQuestions[currentIdx].id;
    const questionIsAnswered = !!selectedAnswers[activeQuestionUuid];

    setQuestionStatuses(prev => ({
      ...prev,
      [activeQuestionUuid]: questionIsAnswered ? "marked_answered" : "marked"
    }));

    if (currentIdx < currentSectionQuestions.length - 1) {
      const stepForwardIndex = currentIdx + 1;
      const targetNextQId = currentSectionQuestions[stepForwardIndex].id;
      setQuestionStatuses(prev => ({
        ...prev,
        [targetNextQId]: prev[targetNextQId] === "not_visited" ? "not_answered" : prev[targetNextQId]
      }));
      setCurrentIdx(stepForwardIndex);
    }
  };

  const handleClearResponse = () => {
    if (!currentSectionQuestions[currentIdx]) return;
    const activeQuestionUuid = currentSectionQuestions[currentIdx].id;
    const copyAnswers = { ...selectedAnswers };
    delete copyAnswers[activeQuestionUuid];
    setSelectedAnswers(copyAnswers);

    setQuestionStatuses(prev => ({
      ...prev,
      [activeQuestionUuid]: "not_answered"
    }));
  };

  const handlePaletteClick = (targetSubIndex: number) => {
    if (isUrlViewMode) {
      setCurrentIdx(targetSubIndex);
      return;
    }
    if (testMeta?.timer_type === "per-question") return;

    const currentQId = currentSectionQuestions[currentIdx].id;
    setQuestionStatuses(prev => {
      const updated = { ...prev };
      const isAnswered = !!selectedAnswers[currentQId];
      
      // Keep marked statuses accurate, otherwise set answered/not_answered dynamically
      if (updated[currentQId] === "marked" || updated[currentQId] === "marked_answered") {
        updated[currentQId] = isAnswered ? "marked_answered" : "marked";
      } else {
        updated[currentQId] = isAnswered ? "answered" : "not_answered";
      }
      
      const targetQId = currentSectionQuestions[targetSubIndex].id;
      if (updated[targetQId] === "not_visited") {
        updated[targetQId] = "not_answered";
      }
      return updated;
    });
    setCurrentIdx(targetSubIndex);
  };

  const handleSectionTabSwitch = (secIndex: number) => {
    if (testMeta?.timer_type === "sectional-timer" && !isUrlViewMode) return; 
    setActiveSectionIdx(secIndex);
    setCurrentIdx(0);
  };

  const handleFinalSubmit = async (answersToEvaluate: Record<string, string>, isViolationSubmit = false) => {
    if (!studentId || !testId) return;
    setLoading(true);
    
    let cumulativeScoreValue = 0;
    questions.forEach((q) => {
      const givenAns = (answersToEvaluate[q.id] || "").trim().toLowerCase();
      const trueCorrectOption = (q.correct_option || "").trim().toLowerCase();
      
      if (givenAns === trueCorrectOption && givenAns !== "") {
        cumulativeScoreValue += 1;
      } else if (givenAns !== "") {
        cumulativeScoreValue -= 0.25; 
      }
    });

    try {
      await supabase.from("attempts").upsert({
        test_id: testId,
        student_id: studentId,
        student_name: studentName,
        score: parseFloat(cumulativeScoreValue.toFixed(2)),
        total_questions: questions.length,
        answers_matrix: answersToEvaluate,
        is_active_retest_granted: false,
      }, { onConflict: "test_id,student_id" });

      setScore(parseFloat(cumulativeScoreValue.toFixed(2)));
      setIsExamOver(true);
    } catch (err) {
      console.error("Submission packet failure:", err);
    } finally {
      setLoading(false);
    }
  };

  const sectionFilteredCounts = useMemo(() => {
    const tracker = { answered: 0, not_answered: 0, not_visited: 0, marked: 0, marked_answered: 0 };
    currentSectionQuestions.forEach(q => {
      const status = questionStatuses[q.id] || "not_visited";
      tracker[status]++;
    });
    return tracker;
  }, [currentSectionQuestions, questionStatuses]);

  if (loading || !studentId) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center text-sm font-semibold text-slate-700 gap-2">
        <Loader2 className="animate-spin text-[#337AB7]" size={32} />
        <span>Loading Live Examination Execution Grid Matrix...</span>
      </div>
    );
  }

  if (isExamOver) {
    return (
      <TestScorecardView
        score={score}
        questions={questions}
        selectedAnswers={selectedAnswers}
        testId={testId}
        isUrlViewMode={isUrlViewMode}
        onReturnToDashboard={() => router.push('/student')}
      />
    );
  }

  const currentQuestion = currentSectionQuestions[currentIdx];
  const activeBlockCtx = currentQuestion?.content_blocks;

  return (
    <AntiCheatWrapper enabled={!isUrlViewMode} onViolationSubmit={() => handleFinalSubmit(selectedAnswers, true)}>
      <main className="h-screen w-screen bg-[#F4F4F4] flex flex-col overflow-hidden font-sans text-xs text-black select-none">
        <header className="h-12 bg-[#1E1E24] text-white px-4 flex items-center justify-between shrink-0 border-b border-zinc-800 shadow-lg relative">
  {/* Modern Sleek Left Side - Enlarged Branding */}
  <div className="flex items-center gap-4 min-w-0 flex-1">
    {/* Prominent Glowing Brand Label */}
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[15px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-100 to-white uppercase drop-shadow-sm">
        ANUSHIVA™
      </span>
      <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-mono bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded-sm font-bold">
        OFFICIAL SUITE
      </span>
    </div>

    <span className="text-zinc-600 font-light text-base">/</span>

    {/* Test Identity & Modern Legal Tag Pill */}
    <div className="flex items-center gap-3 min-w-0">
      <h1 className="text-[13px] font-bold text-zinc-100 truncate">
        {testMeta?.test_name || "Online Institutional Bank Test Portal"}
      </h1>
      
      {/* Capsule Style Disclaimer: High design, low risk */}
      <div className="hidden xl:flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1 text-[10px] text-zinc-400 font-medium">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" />
        <span className="truncate">
          <strong className="text-zinc-300 font-semibold">Simulation Notice:</strong> This platform is an independent practice sandbox for student conditioning and carries no official affiliation.
        </span>
      </div>
    </div>
  </div>

  {/* Right Side: Language & Tech-Style Clock Interface */}
  <div className="flex items-center gap-3 shrink-0">
    <div className="flex items-center gap-1 bg-[#2b2b36] px-2 py-1 border border-zinc-700/60 rounded-sm">
      <Globe2 size={12} className="text-indigo-400" />
      <select value={examLanguage} onChange={(e: any) => setExamLanguage(e.target.value)} className="bg-transparent text-[11px] font-bold text-zinc-300 outline-none cursor-pointer">
        <option value="english" className="bg-[#1e1e24] text-white">EN</option>
        <option value="hindi" className="bg-[#1e1e24] text-white">HI</option>
      </select>
    </div>

    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3.5 h-8 font-mono text-xs rounded-sm">
      <Timer size={13} className="text-zinc-400 shrink-0" />
      <span className="text-blue-400 font-black tracking-wider text-[12px]">
        {testMeta?.timer_type === "per-question" 
          ? `T-MINUS: ${timeLeft}s`
          : `${Math.floor(timeLeft/60).toString().padStart(2, '0')}:${(timeLeft%60).toString().padStart(2, '0')}`}
      </span>
    </div>
  </div>
</header>
        <nav className="h-[34px] bg-[#dfdfdf] border-b border-gray-400 flex items-end px-2 shrink-0 gap-0.5">
          {uniqueSections.map((secName, sIdx) => {
            const isActive = sIdx === activeSectionIdx;
            const isLocked = testMeta?.timer_type === "sectional-timer" && !isUrlViewMode && !isActive;

            return (
              <button
                key={secName}
                disabled={isLocked}
                onClick={() => handleSectionTabSwitch(sIdx)}
                className={`px-4 h-[28px] text-[11px] font-bold flex items-center border rounded-t-sm shadow-sm relative ${
                  isActive
                    ? "bg-[#428bca] border-[#357ebd] text-white z-10 font-black bottom-0 translate-y-[1px]"
                    : isLocked
                    ? "bg-[#cbcbcb] border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                    : "bg-[#f1f1f1] border-gray-300 text-gray-700 hover:bg-[#e6e6e6]"
                }`}
              >
                {secName}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDE: QUESTION AREA */}
          <div className="w-[76%] flex flex-col h-full bg-white border-r border-gray-300 relative shadow-sm">
            <div className="bg-gradient-to-b from-[#f9f9f9] to-[#f0f0f0] border-b border-gray-300 px-4 py-2 font-bold text-gray-700 shrink-0 flex justify-between items-center text-[11px]">
              <div className="text-[#337ab7] text-xs font-black">
                Section: {uniqueSections[activeSectionIdx]} &gt; Question No. {currentIdx + 1}
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
                <span>Correct: <span className="text-[#5cb85c]">1</span></span>
                <span>Negative: <span className="text-[#d9534f]">-0.25</span></span>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-white">
              {activeBlockCtx && (
                <div className="p-4 bg-[#f4f8fa] border border-[#bce8f1] text-gray-900 text-xs rounded-sm shadow-xs space-y-2">
                  <p className="whitespace-pre-wrap leading-relaxed font-normal text-gray-800 tracking-wide">
                    {activeBlockCtx.paragraph_text}
                  </p>
                </div>
              )}

              {currentQuestion ? (
                <div className="p-4 bg-[#fdfdfd] border border-gray-300 rounded-sm text-[13px] font-semibold text-gray-900 leading-relaxed">
                  {currentQuestion.question_text}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-900 text-center font-bold border border-amber-200 rounded">
                  No questions uploaded or configured inside this testing layout section.
                </div>
              )}

              <div className="space-y-2 mt-1">
                {["a", "b", "c", "d", "e"].map((key) => {
                  if (!currentQuestion) return null;
                  const targetOptionStringVal = (currentQuestion as any)[`option_${key}`];
                  if (!targetOptionStringVal) return null;
                  const isOptionSelected = selectedAnswers[currentQuestion.id] === key;

                  return (
                    <label key={key} className={`w-full flex items-start gap-3 p-3 border rounded-sm text-xs font-medium cursor-pointer transition-colors ${isOptionSelected ? "bg-[#d9edf7] border-[#bce8f1] text-[#31708f] font-bold" : "bg-[#fafafa] border-gray-200 text-gray-800 hover:bg-gray-100/80"}`}>
                      <input type="radio" name={`q-uuid-${currentQuestion.id}`} checked={isOptionSelected} onChange={() => handleOptionSelect(key)} className="mt-0.5 h-3.5 w-3.5 text-[#337ab7] accent-[#337ab7]" />
                      <span className="leading-relaxed"><span className="font-bold text-gray-500 mr-1">({key.toUpperCase()})</span> {targetOptionStringVal}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <footer className="h-[46px] bg-[#e5e5e5] border-t border-gray-400 px-4 flex items-center justify-between shrink-0 shadow-inner">
              <div className="flex items-center gap-2">
                <button onClick={handleMarkForReviewAndNext} disabled={testMeta?.timer_type === "per-question" || currentSectionQuestions.length === 0} className="h-[30px] px-4 bg-[#f0ad4e] border border-[#eea236] hover:bg-[#ed9c28] disabled:opacity-40 text-white font-bold rounded-sm text-[11px] uppercase">Mark for Review & Next</button>
                <button onClick={handleClearResponse} disabled={currentSectionQuestions.length === 0} className="h-[30px] px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-sm text-[11px] uppercase">Clear Response</button>
              </div>

              <div className="flex items-center gap-2">
                {testMeta?.timer_type === "entire-test" || testMeta?.timer_type === "sectional-timer" ? (
                  <>
                    <button disabled={currentIdx === 0} onClick={() => handlePaletteClick(currentIdx - 1)} className="h-[30px] px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-sm disabled:opacity-30 flex items-center gap-0.5 text-[11px] uppercase"><ChevronLeft size={13} /> Back</button>
                    
                    {currentIdx === currentSectionQuestions.length - 1 && activeSectionIdx === uniqueSections.length - 1 ? (
                      <button onClick={() => handleFinalSubmit(selectedAnswers)} className="h-[30px] px-5 bg-[#d9534f] border border-[#d43f3a] hover:bg-[#c9302c] text-white font-black rounded-sm uppercase flex items-center gap-1 text-[11px] tracking-wider transition-colors"><Send size={12} /> Submit Exam</button>
                    ) : currentIdx === currentSectionQuestions.length - 1 ? (
                      <button onClick={() => {
                        if (testMeta?.timer_type === "sectional-timer") {
                          alert("You cannot advance sections manually under strict sectional clock configurations.");
                          return;
                        }
                        setActiveSectionIdx(prev => prev + 1);
                        setCurrentIdx(0);
                      }} className="h-[30px] px-4 bg-purple-700 border border-purple-800 hover:bg-purple-800 text-white font-black rounded-sm flex items-center gap-0.5 text-[11px] uppercase tracking-wider">Next Section <ChevronRight size={13} /></button>
                    ) : (
                      <button onClick={handleSaveAndNext} className="h-[30px] px-[22px] bg-[#337ab7] border border-[#2e6da4] hover:bg-[#286090] text-white font-black rounded-sm flex items-center gap-0.5 text-[11px] uppercase tracking-wider">Save & Next <ChevronRight size={13} /></button>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-red-600 font-black tracking-wide bg-red-50 border border-red-200 px-3 py-1 rounded-sm">⚡ ITEM Countdown LOCK LOOP ACTIVE</div>
                )}
              </div>
            </footer>
          </div>

          {/* RIGHT SIDEBAR: USER PROFILE, LIVE COUNTERS, AND PALETTE */}
          <div className="w-[24%] bg-[#f5f5f5] flex flex-col h-full overflow-hidden border-l border-gray-300 shadow-md">
            {/* User Profile Info */}
            <div className="p-3 bg-[#e5e5e5] border-b border-gray-300 flex items-center gap-3 shrink-0">
              <div className="w-[52px] h-[64px] bg-[#dfdfdf] border border-gray-400 flex flex-col items-center justify-center shrink-0 rounded-xs">
                <span className="text-[9px] text-gray-400 font-black tracking-tighter">PHOTO</span>
              </div>
              <div className="overflow-hidden leading-tight space-y-0.5">
                <p className="text-xs font-black text-gray-800 truncate">{studentName}</p>
                <p className="text-[10px] text-[#286090] font-mono font-bold truncate bg-white/60 border border-gray-300 px-1 py-0.5 rounded-xs mt-1">
                  ID: {studentId ? studentId.substring(0, 10).toUpperCase() : "N/A"}
                </p>
              </div>
            </div>

            {/* LIVE COUNTERS GRID (Moved here and redesigned as a clear vertical/compact grid layout) */}
            <div className="bg-[#fcfcfc] border-b border-gray-300 p-2.5 grid grid-cols-2 gap-1.5 text-[10px] shrink-0 font-bold">
              <div className="bg-white border rounded p-1 flex items-center justify-between px-2 shadow-2xs">
                <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#5CB85C] rounded-b-md text-white text-[9px] flex items-center justify-center">✓</span> Answered</span>
                <span className="text-xs font-black text-green-700">{sectionFilteredCounts.answered}</span>
              </div>
              <div className="bg-white border rounded p-1 flex items-center justify-between px-2 shadow-2xs">
                <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#D9534F] rounded-t-md text-white text-[9px] flex items-center justify-center">🛈</span> Not Ans</span>
                <span className="text-xs font-black text-red-700">{sectionFilteredCounts.not_answered}</span>
              </div>
              <div className="bg-white border rounded p-1 flex items-center justify-between px-2 shadow-2xs">
                <span className="flex items-center gap-1"><span className="w-4 h-3.5 bg-[#EEEEEE] border text-black text-[9px] flex items-center justify-center">0</span> Not Visited</span>
                <span className="text-xs font-black text-gray-500">{sectionFilteredCounts.not_visited}</span>
              </div>
              <div className="bg-white border rounded p-1 flex items-center justify-between px-2 shadow-2xs">
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-[#777777] rounded-full text-white text-[9px] flex items-center justify-center">●</span> Marked</span>
                <span className="text-xs font-black text-purple-700">{sectionFilteredCounts.marked}</span>
              </div>
              <div className="bg-white border rounded p-1 flex items-center justify-between px-2 shadow-2xs col-span-2">
                <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 bg-[#8A6D3B] rounded-full text-white text-[8px] flex items-center justify-center relative">●<span className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-[#5cb85c] rounded-full" /></span> Ans & Marked for Review</span>
                <span className="text-xs font-black text-amber-800">{sectionFilteredCounts.marked_answered}</span>
              </div>
            </div>

            {/* Question Palette Header */}
            <div className="px-3 py-1.5 bg-[#474747] text-white text-[10px] font-black tracking-widest uppercase border-b border-zinc-700">Question Palette Matrix</div>

            {/* Question Grid Numbers */}
            <div className="flex-1 p-4 overflow-y-auto bg-white/90">
              <div className="grid grid-cols-4 gap-x-2 gap-y-3 max-w-[190px] mx-auto">
                {currentSectionQuestions.map((q, idx) => {
                  const status = questionStatuses[q.id] || "not_visited";
                  const isCurrent = idx === currentIdx;
                  
                  let shapeStyles = "w-9 h-[34px] text-xs font-black flex items-center justify-center relative cursor-pointer transition-transform shadow-2xs ";
                  switch(status) {
                    case "not_visited": shapeStyles += "bg-[#EEEEEE] text-gray-800 border border-gray-300"; break;
                    case "not_answered": shapeStyles += "bg-[#D9534F] text-white rounded-t-xl border border-red-600"; break;
                    case "answered": shapeStyles += "bg-[#5CB85C] text-white rounded-b-xl border border-green-600"; break;
                    case "marked": shapeStyles += "bg-[#777777] text-white rounded-full border border-zinc-600"; break;
                    case "marked_answered": shapeStyles += "bg-[#8A6D3B] text-white rounded-full border border-amber-700"; break;
                  }

                  if (isCurrent) shapeStyles += " ring-3 ring-[#337ab7] ring-offset-1 z-10 scale-105";
                  return (
                    <button key={q.id} disabled={testMeta?.timer_type === "per-question"} onClick={() => handlePaletteClick(idx)} className={shapeStyles}>
                      {idx + 1}
                      {status === "marked_answered" && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-[#5CB85C] border border-white rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="p-3 bg-[#f5f5f5] border-t border-gray-300 text-[10px] space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-gray-700 font-medium">
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#EEEEEE] border border-gray-400 rounded-xs text-center text-[8px] font-bold">0</span><span className="truncate">Not Visited</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#D9534F] border border-red-600 rounded-t-md inline-block" /><span className="truncate">Not Answered</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#5CB85C] border border-green-600 rounded-b-md inline-block" /><span className="truncate">Answered</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-[#777777] border border-zinc-600 rounded-full inline-block" /><span className="truncate">Marked</span></div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </AntiCheatWrapper>
  );
}

export default function StudentLiveTestingEngine() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-700 font-bold uppercase gap-2 tracking-wider">
        <Loader2 className="animate-spin text-[#337AB7]" size={24} />
        <span>Loading Live Examination Suite...</span>
      </div>
    }>
      <LiveTestEngineCore />
    </Suspense>
  );
}