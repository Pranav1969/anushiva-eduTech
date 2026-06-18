// // src/app/student/numerical-ability/page.tsx
// "use client";

// import { useSearchParams, useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { supabase } from "@/utils/supabase";
// import { authManager } from "@/utils/auth";
// import { Loader2, HelpCircle, Timer, ChevronLeft, ChevronRight, Send, BookOpen } from "lucide-react";
// import AntiCheatWrapper from "../components/AntiCheatWrapper";
// import TestScorecardView from "../components/TestScorecardView";

// interface Question {
//   id: string;
//   question_text: string;
//   option_a: string; option_b: string; option_c: string; option_d: string; option_e: string;
//   correct_option: string;
//   explanation: string;
//   block_id: string | null;
//   timer_seconds: number;
//   chapter: string;
//   section: string;
//   content_blocks?: { title: string; paragraph_text: string; image_url: string | null; } | null;
// }

// function LiveTestEngineCore() {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const testId = searchParams.get("id");
//   const isUrlViewMode = searchParams.get("viewMode") === "true";

//   const [loading, setLoading] = useState(true);
//   const [studentId, setStudentId] = useState<string | null>(null);
//   const [studentName, setStudentName] = useState<string>("Anonymous Student");
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [testMeta, setTestMeta] = useState<any>(null);
  
//   const [currentIdx, setCurrentIdx] = useState(0);
//   const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
//   const [isExamOver, setIsExamOver] = useState(isUrlViewMode);
//   const [score, setScore] = useState(0);
//   const [timeLeft, setTimeLeft] = useState(30);

//   useEffect(() => {
//     const session = authManager.getSession();
//     if (!session) {
//       router.push("/student/login");
//       return;
//     }
//     setStudentId(session.id);
//     if (session.name) setStudentName(session.name);
//   }, [router]);

//   useEffect(() => {
//     if (!testId || !studentId) return;

//     async function initializeEngine() {
//       try {
//         const { data: testData } = await supabase.from("tests").select("*").eq("id", testId).single();
//         setTestMeta(testData);

//         const { data: qData } = await supabase
//           .from("questions")
//           .select("id, question_text, option_a, option_b, option_c, option_d, option_e, correct_option, explanation, block_id, timer_seconds, chapter, section, content_blocks(title, paragraph_text, image_url)")
//           .eq("test_id", testId)
//           .order("created_at", { ascending: true });

//         if (qData) {
//           setQuestions(qData as any);
//           setTimeLeft(testData?.timer_type === "entire-test" ? (testData.duration_minutes || 20) * 60 : (qData[0]?.timer_seconds || 30));
//         }

//         const { data: attemptData } = await supabase
//           .from("attempts")
//           .select("*")
//           .eq("test_id", testId)
//           .eq("student_id", studentId)
//           .maybeSingle();

//         if (attemptData) {
//           setScore(attemptData.score);
//           if (!isUrlViewMode && !(attemptData.is_active_retest_granted === true || String(attemptData.is_active_retest_granted) === "true")) {
//             setIsExamOver(true);
//           }
//           if (isUrlViewMode && attemptData.answers_matrix) setSelectedAnswers(attemptData.answers_matrix);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     initializeEngine();
//   }, [testId, studentId, isUrlViewMode]);

//   useEffect(() => {
//     if (loading || questions.length === 0 || isExamOver || isUrlViewMode) return;
//     const countdown = setInterval(() => {
//       setTimeLeft((prev) => {
//         if (prev <= 1) {
//           if (testMeta?.timer_type === "entire-test") {
//             handleFinalSubmit(selectedAnswers);
//             clearInterval(countdown);
//             return 0;
//           } else {
//             if (currentIdx < questions.length - 1) {
//               const nextIdx = currentIdx + 1;
//               setCurrentIdx(nextIdx);
//               return questions[nextIdx]?.timer_seconds || 30;
//             } else {
//               handleFinalSubmit(selectedAnswers);
//               clearInterval(countdown);
//               return 0;
//             }
//           }
//         }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(countdown);
//   }, [currentIdx, loading, isExamOver, testMeta, selectedAnswers, questions, isUrlViewMode]);

//   const handleOptionSelect = (optionKey: string) => {
//     if (isExamOver || !questions[currentIdx]) return;
//     const qId = questions[currentIdx].id;
//     const updatedAnswers = { ...selectedAnswers, [qId]: optionKey };
//     setSelectedAnswers(updatedAnswers);

//     if (testMeta?.timer_type === "per-question") {
//       if (currentIdx < questions.length - 1) {
//         const nextIdx = currentIdx + 1;
//         setCurrentIdx(nextIdx);
//         setTimeLeft(questions[nextIdx]?.timer_seconds || 30);
//       } else {
//         handleFinalSubmit(updatedAnswers);
//       }
//     }
//   };

//   const handleFinalSubmit = async (answersToEvaluate: Record<string, string>, isViolationSubmit = false) => {
//     if (!studentId || !testId) return;

//     if (isViolationSubmit) {
//       setTimeout(async () => {
//         setLoading(true);
//         let finalScore = 0;
//         questions.forEach((q) => {
//           if ((answersToEvaluate[q.id] || "").toLowerCase() === q.correct_option.toLowerCase()) finalScore += 1;
//         });

//         try {
//           await supabase.from("attempts").upsert({
//             test_id: testId,
//             student_id: studentId,
//             student_name: studentName,
//             score: finalScore,
//             total_questions: questions.length,
//             answers_matrix: answersToEvaluate,
//             is_active_retest_granted: false,
//           }, { onConflict: "test_id,student_id" });

//           setScore(finalScore);
//           setIsExamOver(true);
//         } catch (err) {
//           console.error("Failed to commit violation packet:", err);
//         } finally {
//           setLoading(false);
//         }
//       }, 0);
//       return;
//     }

//     setLoading(true);
//     let finalScore = 0;
//     questions.forEach((q) => {
//       if ((answersToEvaluate[q.id] || "").toLowerCase() === q.correct_option.toLowerCase()) finalScore += 1;
//     });

//     try {
//       await supabase.from("attempts").upsert({
//         test_id: testId,
//         student_id: studentId,
//         student_name: studentName,
//         score: finalScore,
//         total_questions: questions.length,
//         answers_matrix: answersToEvaluate,
//         is_active_retest_granted: false,
//       }, { onConflict: "test_id,student_id" });

//       setScore(finalScore);
//       setIsExamOver(true);
//     } catch (err) {
//       console.error("Failed to commit attempt packet:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading || !studentId) {
//     return (
//       <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-xs font-bold uppercase text-slate-400 gap-3">
//         <Loader2 className="animate-spin text-[#2563EB]" size={32} />
//         <span className="tracking-widest animate-pulse">Syncing Examination Node...</span>
//       </div>
//     );
//   }

//   // 🚀 CLEAN COMPONENT INJECTION HANDLER
//   if (isExamOver) {
//     return (
//       <TestScorecardView
//         score={score}
//         questions={questions}
//         selectedAnswers={selectedAnswers}
//         testId={testId}
//         isUrlViewMode={isUrlViewMode}
//         onReturnToDashboard={() => router.push('/student')}
//       />
//     );
//   }

//   const currentQuestion = questions[currentIdx];
//   const activeBlockCtx = currentQuestion?.content_blocks;

//   return (
//     <AntiCheatWrapper enabled={true} onViolationSubmit={() => handleFinalSubmit(selectedAnswers, true)}>
//       <main className="h-screen bg-[#0F172A] flex flex-col overflow-hidden font-sans antialiased text-slate-200">
//         <div className="bg-[#1E293B] border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0 shadow-md relative z-20">
//           <div className="flex items-center gap-3">
//             <span className="bg-[#312E81]/60 text-[#22D3EE] font-black text-[10px] px-3 py-1.5 rounded-md border border-[#8B5CF6]/20 uppercase tracking-widest">
//               Secure Exam Workspace
//             </span>
//             <h2 className="text-xs font-bold text-slate-400 hidden sm:block truncate max-w-xs">
//               {testMeta?.test_name}
//             </h2>
//           </div>
          
//           <div className="flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs font-bold bg-slate-900 text-white border-slate-800 shadow-inner">
//             <Timer size={14} className="text-cyan-400 animate-pulse" />
//             <span>
//               {testMeta?.timer_type === "entire-test" 
//                 ? `Time Remaining: ${Math.floor(timeLeft/60)}:${timeLeft%60 < 10 ? '0':''}${timeLeft%60}` 
//                 : `Question Tracker: ${timeLeft}s`}
//             </span>
//           </div>
//         </div>

//         <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
//           <div className="w-full md:w-1/2 bg-[#0F172A] p-6 md:p-10 border-r border-slate-800/50 overflow-y-auto flex flex-col justify-center">
//             {activeBlockCtx ? (
//               <div className="space-y-4 max-w-xl mx-auto w-full animate-in fade-in slide-in-from-left-4 duration-300">
//                 <div className="inline-flex items-center gap-1.5 text-[#2563EB] text-[10px] font-black uppercase tracking-wider bg-blue-950/40 px-2.5 py-1 rounded border border-blue-900/30">
//                   <BookOpen size={11} /> Contextual Comprehension Material
//                 </div>
//                 <h2 className="text-sm font-black text-white border-l-4 border-[#2563EB] pl-3 uppercase tracking-wide">
//                   {activeBlockCtx.title}
//                 </h2>
//                 <div className="text-[#CBD5E1] p-5 rounded-xl bg-[#1E293B]/40 border border-slate-800/60 text-xs leading-relaxed whitespace-pre-wrap font-medium shadow-inner">
//                   {activeBlockCtx.paragraph_text}
//                 </div>
//               </div>
//             ) : (
//               <div className="text-center text-slate-500 py-10 opacity-60">
//                 <HelpCircle className="mx-auto mb-2 text-slate-700" size={32} />
//                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Standalone Prompt Context</p>
//               </div>
//             )}
//           </div>

//           <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto flex flex-col justify-between bg-[#111827]/30 relative">
//             <div className="my-auto max-w-md w-full mx-auto space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
//               <div className="text-[10px] font-mono font-bold text-[#22D3EE] bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-900/30 inline-block uppercase tracking-wider">
//                 Question Item Matrix {currentIdx + 1} of {questions.length}
//               </div>

//               <h3 className="text-sm md:text-base font-extrabold text-white leading-snug tracking-tight">
//                 {currentQuestion?.question_text}
//               </h3>

//               <div className="space-y-2.5">
//                 {["a", "b", "c", "d", "e"].map((key) => {
//                   if (!currentQuestion) return null;
//                   const text = (currentQuestion as any)[`option_${key}`];
//                   if (!text) return null;
//                   const isSel = selectedAnswers[currentQuestion.id] === key;
//                   return (
//                     <button 
//                       key={key} 
//                       onClick={() => handleOptionSelect(key)} 
//                       className={`w-full text-left p-4 rounded-xl border text-xs transition-all duration-150 flex justify-between items-center group/btn relative ${
//                         isSel 
//                           ? "bg-gradient-to-r from-[#2563EB] to-[#312E81] text-white border-transparent shadow-md shadow-blue-900/20 font-bold" 
//                           : "bg-[#1E293B] border-slate-800/80 text-[#CBD5E1] hover:border-slate-700 hover:text-white"
//                       }`}
//                     >
//                       <span className="pr-4 leading-relaxed"><span className="font-mono font-bold mr-1 opacity-70">({key.toUpperCase()})</span> {text}</span>
//                       <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
//                         isSel ? "border-white bg-white/20" : "border-slate-600 group-hover/btn:border-slate-400"
//                       }`}>
//                         {isSel && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
//                       </div>
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>

//             <div className="pt-8 flex justify-between items-center max-w-md w-full mx-auto border-t border-slate-800/50 mt-auto shrink-0">
//               {testMeta?.timer_type === "entire-test" ? (
//                 <>
//                   <button 
//                     disabled={currentIdx === 0} 
//                     onClick={() => setCurrentIdx(currentIdx - 1)} 
//                     className="px-4 py-2 bg-[#1E293B] hover:bg-slate-800 disabled:hover:bg-[#1E293B] text-[#CBD5E1] hover:text-white border border-slate-800/80 rounded-xl text-xs font-bold disabled:opacity-20 transition-all flex items-center gap-1"
//                   >
//                     <ChevronLeft size={14} /> Back
//                   </button>
                  
//                   {currentIdx === questions.length - 1 ? (
//                     <button 
//                       onClick={() => handleFinalSubmit(selectedAnswers)} 
//                       className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
//                     >
//                       <Send size={12} /> Submit Examination
//                     </button>
//                   ) : (
//                     <button 
//                       onClick={() => setCurrentIdx(currentIdx + 1)} 
//                       className="px-4 py-2 bg-[#2563EB] hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
//                     >
//                       Next <ChevronRight size={14} />
//                     </button>
//                   )}
//                 </>
//               ) : (
//                 <div className="w-full text-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
//                   ⚡ Question lock timer operational. Selection auto-advances sequence.
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </main>
//     </AntiCheatWrapper>
//   );
// }

// export default function StudentLiveTestingEngine() {
//   return (
//     <Suspense fallback={
//       <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center text-xs text-slate-400 font-bold uppercase gap-2 tracking-widest">
//         <Loader2 className="animate-spin text-blue-500" size={24} />
//         <span>Loading Test Session Node...</span>
//       </div>
//     }>
//       <LiveTestEngineCore />
//     </Suspense>
//   );
// }

