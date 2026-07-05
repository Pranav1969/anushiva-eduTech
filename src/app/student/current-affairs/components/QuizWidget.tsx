// src/app/student/current-affairs/components/QuizWidget.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Brain } from "lucide-react";
import { QuizQuestion, OptionLetter } from "./types";

interface QuizWidgetProps {
  questions: QuizQuestion[];
  studentId: string;
}

const OPTION_LETTERS: OptionLetter[] = ["a", "b", "c", "d"];

const QUESTION_TYPE_LABEL: Record<QuizQuestion["question_type"], string> = {
  concept: "Concept",
  static_link: "Static Link",
  numerical: "Numerical",
};

export default function QuizWidget({ questions, studentId }: QuizWidgetProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionLetter | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionLetter>>({});
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#DCE1E8] bg-[#F9FAFB] p-6 text-center text-sm text-[#8992A0]">
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

  const handleRestart = () => {
    setIndex(0);
    setSelected(null);
    setAnswers({});
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#DCE1E8] bg-white p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1F5F4A]/10">
          <Brain className="h-6 w-6 text-[#1F5F4A]" />
        </div>
        <h3 className="font-serif text-lg font-bold text-[#1B2430]">
          You scored {score}/{questions.length}
        </h3>
        <p className="mt-1 text-sm text-[#5B6472]">
          {pct >= 80
            ? "Strong recall -- this concept is exam-ready."
            : pct >= 50
            ? "Decent grasp. Revisit the notes above before the next revision cycle."
            : "Worth re-reading the notes -- the static link isn't sticking yet."}
        </p>
        <button
          onClick={handleRestart}
          className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#DCE1E8] bg-[#F9FAFB] px-4 py-2 text-xs font-semibold text-[#5B6472] transition-colors hover:text-[#1B2430]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-[#DCE1E8] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8992A0]">
          Question {index + 1} of {questions.length}
        </span>
        <span className="rounded-full border border-[#E3E7EC] bg-[#F9FAFB] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#5B6472]">
          {QUESTION_TYPE_LABEL[question.question_type]}
        </span>
      </div>

      {question.source_tag && (
        <span className="mb-3 inline-block rounded-full border border-[#1F5F4A]/20 bg-[#1F5F4A]/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-[#1F5F4A]">
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
          <h4 className="mb-4 font-serif text-base font-bold leading-snug text-[#1B2430]">
            {question.question_text}
          </h4>

          <div className="space-y-2">
            {OPTION_LETTERS.map((letter) => {
              const optionText = question[`option_${letter}` as const];
              const isSelectedOption = selected === letter;
              const isCorrectOption = question.correct_option === letter;

              let stateClasses =
                "border-[#E3E7EC] bg-[#F9FAFB] text-[#1B2430] hover:border-[#1F5F4A]/30";
              if (hasAnswered) {
                if (isCorrectOption) {
                  stateClasses = "border-[#1F5F4A]/40 bg-[#1F5F4A]/[0.06] text-[#1B2430]";
                } else if (isSelectedOption && !isCorrect) {
                  stateClasses = "border-red-300 bg-red-50 text-[#1B2430]";
                } else {
                  stateClasses = "border-[#E3E7EC] bg-white text-[#8992A0]";
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
                    <span className="font-mono text-xs font-bold uppercase text-[#8992A0]">
                      {letter}
                    </span>
                    {optionText}
                  </span>
                  {hasAnswered && isCorrectOption && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F5F4A]" />
                  )}
                  {hasAnswered && isSelectedOption && !isCorrect && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 rounded-lg border border-[#E3E7EC] bg-[#F9FAFB] p-3.5"
            >
              <p className="text-xs leading-relaxed text-[#5B6472]">
                <span className="font-semibold text-[#1B2430]">
                  {isCorrect ? "Correct. " : "Not quite. "}
                </span>
                {question.explanation}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {hasAnswered && (
        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-lg bg-[#1F5F4A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A5240]"
        >
          {isLast ? "See Results" : "Next Question"}
        </button>
      )}
    </div>
  );
}