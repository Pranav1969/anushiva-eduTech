// src/app/student/current-affairs/components/types.ts
//
// Types + non-visual constants only. All colors now live in
// src/app/student/theme/themes.ts (theme.source / theme.pillar).

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

// Display labels for source badges (colors come from the active theme).
export const SOURCE_META: Record<SourceType, { label: string }> = {
  rbi: { label: "RBI" },
  pib: { label: "PIB" },
  economy: { label: "Economy" },
};