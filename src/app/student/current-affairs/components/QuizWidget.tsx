// src/app/student/current-affairs/components/QuizWidget.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
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
  const { theme: t } = useTheme();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<OptionLetter | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionLetter>>({});
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed ${t.panelDashed} p-6 text-center text-sm ${t.text.faint}`}>
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
        className={`rounded-xl border ${t.panel} p-6 text-center`}
      >
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border ${t.accent.iconWrap}`}>
          <Brain className={`h-6 w-6 ${t.accent.text}`} />
        </div>
        <h3 className={`text-lg font-bold ${t.text.heading}`}>
          You scored {score}/{questions.length}
        </h3>
        <p className={`mt-1 text-sm ${t.text.muted}`}>
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
    <div className={`rounded-xl border ${t.panel} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${t.text.faint}`}>
          Question {index + 1} of {questions.length}
        </span>
        <span className={`rounded-full border ${t.inset} px-2 py-0.5 font-mono text-[10px] font-semibold ${t.text.muted}`}>
          {QUESTION_TYPE_LABEL[question.question_type]}
        </span>
      </div>

      {question.source_tag && (
        <span className={`mb-3 inline-block rounded-full border ${t.accent.soft} px-2.5 py-0.5 text-[10px] font-semibold ${t.accent.textStrong}`}>
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
          <h4 className={`mb-4 text-base font-bold leading-snug ${t.text.heading}`}>
            {question.question_text[language]}
          </h4>

          <div className="space-y-2">
            {OPTION_LETTERS.map((letter) => {
              const optionText = question[`option_${letter}` as const][language];
              const isSelectedOption = selected === letter;
              const isCorrectOption = question.correct_option === letter;

              let stateClasses = t.quiz.option;
              if (hasAnswered) {
                if (isCorrectOption) {
                  stateClasses = t.quiz.correct;
                } else if (isSelectedOption && !isCorrect) {
                  stateClasses = t.quiz.wrong;
                } else {
                  stateClasses = t.quiz.dim;
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
                    <span className={`font-mono text-xs font-bold uppercase ${t.text.faint}`}>
                      {letter}
                    </span>
                    {optionText}
                  </span>
                  {hasAnswered && isCorrectOption && (
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${t.quiz.correctIcon}`} />
                  )}
                  {hasAnswered && isSelectedOption && !isCorrect && (
                    <XCircle className={`h-4 w-4 shrink-0 ${t.quiz.wrongIcon}`} />
                  )}
                </button>
              );
            })}
          </div>

          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`mt-4 rounded-lg border ${t.inset} p-3.5`}
            >
              <p className={`text-xs leading-relaxed ${t.text.muted}`}>
                <span className={`font-semibold ${t.text.heading}`}>
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
          className={`mt-4 w-full rounded-lg ${t.accent.solid} ${t.accent.solidHover} py-2.5 text-sm font-semibold transition-colors`}
        >
          {isLast ? "See Results" : "Next Question"}
        </button>
      )}
    </div>
  );
}