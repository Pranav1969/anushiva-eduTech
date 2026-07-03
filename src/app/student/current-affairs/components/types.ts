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

export const SOURCE_META: Record<
  SourceType,
  { label: string; text: string; bg: string; border: string }
> = {
  rbi: {
    label: "RBI",
    text: "text-[#8A6216]",
    bg: "bg-[#B98B3E]/[0.08]",
    border: "border-[#B98B3E]/30",
  },
  pib: {
    label: "PIB",
    text: "text-[#2F6FAB]",
    bg: "bg-[#2F6FAB]/[0.07]",
    border: "border-[#2F6FAB]/25",
  },
  economy: {
    label: "Economy",
    text: "text-[#7A5FA0]",
    bg: "bg-[#7A5FA0]/[0.07]",
    border: "border-[#7A5FA0]/25",
  },
};