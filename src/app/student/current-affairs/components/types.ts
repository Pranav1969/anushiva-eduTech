// src/app/student/current-affairs/components/types.ts

export type SourceType = "rbi" | "pib" | "economy";
export type PlanTier = "free" | "silver" | "gold" | "premium";
export type LanguageCode = "en" | "hi" | "mr";

export interface NewsCapsule {
  id: string;
  source_type: SourceType;
  category_tag: string;
  original_date: string;
  source_url: string;
  read_time: string;
  required_plan: PlanTier;
  title: {
    en: string;
    hi: string;
    mr: string;
  };
  summary: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const PLAN_HIERARCHY_MAP: Record<PlanTier, number> = {
  free: 1,
  silver: 2,
  gold: 3,
  premium: 4,
};

export type ExamPillar =
  | "RBI Circulars"
  | "Government Schemes"
  | "Economic Reports"
  | "Banking Regulations";

export type QuestionType = "concept" | "static_link" | "numerical";
export type OptionLetter = "a" | "b" | "c" | "d";

export interface DailyDoseDigest {
  id: string;
  digest_date: string; // YYYY-MM-DD
  pillar_breakdown: Partial<Record<ExamPillar, number>>;
  capsule_ids: string[];
  notes_en: string;
  notes_hi: string;
  notes_mr: string;
}

export interface TrilingualText {
  en: string;
  hi: string;
  mr: string;
}

export interface QuizQuestion {
  id: string;
  digest_id: string;
  question_text: TrilingualText;
  option_a: TrilingualText;
  option_b: TrilingualText;
  option_c: TrilingualText;
  option_d: TrilingualText;
  correct_option: OptionLetter;
  explanation: TrilingualText;
  question_type: QuestionType;
  source_tag: string;
  sequence_order: number;
}

// Dark-theme tag colors (match the student dashboard palette)
export const PILLAR_META: Record<ExamPillar, { text: string; bg: string; border: string }> = {
  "RBI Circulars": {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  "Government Schemes": {
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
  },
  "Economic Reports": {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
  },
  "Banking Regulations": {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
};

export const SOURCE_META: Record<
  SourceType,
  { label: string; text: string; bg: string; border: string }
> = {
  rbi: {
    label: "RBI",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  pib: {
    label: "PIB",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
  },
  economy: {
    label: "Economy",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
  },
};