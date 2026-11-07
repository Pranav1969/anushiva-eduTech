// src/app/student/current-affairs/components/QuizWidget.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { QuizQuestion, OptionLetter, LanguageCode } from "./types";

interface QuizWidgetProps {
  questions: QuizQuestion[];
  studentId: string;
  language: LanguageCode;
}

const OPTION_LETTERS: OptionLetter[] = ["a", "b", "c", "d"];

const QUESTION_TYPE_LABEL: Record<QuizQuestion["question_type"], string> = {
  concept: "Concept",
  static_link: "Static Link",
  numerical: "Numerical",
};

export default function QuizWidget({ questions, studentId, language }: QuizWidgetProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionLetter | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionLetter>>({});
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
        No quiz is available for this capsule yet.
      </div>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const hasAnswered = selected !== null;
  const isCorrect = selected === question.correct_option;

  const score = Object.entries(answers).filter(
    ([qIdx, letter]) => questions[Number(qIdx)].correct_option === letter
  ).length;

  const handleSelect = (letter: OptionLetter) => {
    if (hasAnswered) return;
    setSelected(letter);
    setAnswers((prev) => ({ ...prev, [index]: letter }));

    // Fire-and-forget: record this answer immediately rather than waiting
    // for the quiz to finish, so a student closing the drawer mid-quiz still
    // has their answered questions saved.
    fetch("/api/current-affairs/quiz-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        question_id: question.id,
        selected_option: letter,
        is_correct: letter === question.correct_option,
      }),
    }).catch((err) => console.error("Failed to save quiz attempt:", err));
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10">
          <Brain className="h-6 w-6 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">
          You scored {score}/{questions.length}
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          {pct >= 80
            ? "Strong recall -- this concept is exam-ready."
            : pct >= 50
            ? "Decent grasp. Revisit the notes above before the next revision cycle."
            : "Worth re-reading the notes -- the static link isn't sticking yet."}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Question {index + 1} of {questions.length}
        </span>
        <span className="rounded-full border border-slate-800 bg-slate-950/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
          {QUESTION_TYPE_LABEL[question.question_type]}
        </span>
      </div>

      {question.source_tag && (
        <span className="mb-3 inline-block rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300">
          {question.source_tag}
        </span>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <h4 className="mb-4 text-base font-bold leading-snug text-slate-100">
            {question.question_text[language]}
          </h4>

          <div className="space-y-2">
            {OPTION_LETTERS.map((letter) => {
              const optionText = question[`option_${letter}` as const][language];
              const isSelectedOption = selected === letter;
              const isCorrectOption = question.correct_option === letter;

              let stateClasses =
                "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-blue-500/40 hover:bg-slate-900";
              if (hasAnswered) {
                if (isCorrectOption) {
                  stateClasses = "border-emerald-500/40 bg-emerald-500/10 text-slate-100";
                } else if (isSelectedOption && !isCorrect) {
                  stateClasses = "border-red-500/40 bg-red-500/10 text-slate-100";
                } else {
                  stateClasses = "border-slate-800 bg-slate-900/30 text-slate-500";
                }
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleSelect(letter)}
                  disabled={hasAnswered}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${stateClasses}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold uppercase text-slate-500">
                      {letter}
                    </span>
                    {optionText}
                  </span>
                  {hasAnswered && isCorrectOption && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                  {hasAnswered && isSelectedOption && !isCorrect && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3.5"
            >
              <p className="text-xs leading-relaxed text-slate-400">
                <span className="font-semibold text-slate-100">
                  {isCorrect ? "Correct. " : "Not quite. "}
                </span>
                {question.explanation[language]}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {hasAnswered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          {isLast ? "See Results" : "Next Question"}
        </button>
      )}
    </div>
  );
}