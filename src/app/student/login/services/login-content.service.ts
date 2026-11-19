import { supabase } from "@/utils/supabase";
import { LoginPageData } from "../types/login.types";

export const loginContentService = {
  async fetchPageContent(): Promise<LoginPageData> {
    const { data, error } = await supabase
      .from("login_page_content")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Fallback copy used when the table is empty or the request fails
    const fallbacks: LoginPageData = {
      hero: {
        title: "Practice Like It's the Real Exam Day.",
        subtitle: "Made for SBI, IBPS, RBI & other Bank exam aspirants.",
        description:
          "Real exam-pattern mock tests, sectional timers, chapter-wise notes and detailed analysis – everything you need to crack Clerk, PO and other Bank exams, in one place."
      },
      pillars: [
        {
          title: "Real Exam Pattern",
          description:
            "Sectional timing, marking scheme and screen layout follow the latest SBI / IBPS exam pattern, so the exam hall feels familiar.",
          iconName: "Activity"
        },
        {
          title: "Chapter-wise Notes & Practice",
          description:
            "Quant, Reasoning and English divided into clear chapters. Study, practise and track how much of the syllabus you have finished.",
          iconName: "Layers"
        },
        {
          title: "Detailed Performance Analysis",
          description:
            "As soon as you submit, see your score, accuracy, time spent and weak topics, so you know exactly what to improve next.",
          iconName: "BarChart3"
        }
      ],
      metrics: [
        { value: "30+", label: "Full-Length Mock Tests", iconName: "Terminal" },
        { value: "150+", label: "Chapter-wise Notes", iconName: "Network" },
        { value: "3,000+", label: "Topic-wise Practice Questions", iconName: "ShieldCheck" }
      ],
      footerSecurity:
        "Your login, scores and study data are stored securely and kept private. Only you can see your performance."
    };

    if (error || !data) return fallbacks;

    const result: Partial<LoginPageData> = { pillars: [], metrics: [] };

    data.forEach((row) => {
      if (row.section_key === "hero") {
        result.hero = { title: row.title || "", subtitle: row.subtitle || "", description: row.description || "" };
      } else if (row.section_key.startsWith("pillar_")) {
        result.pillars?.push({ title: row.title || "", description: row.description || "", iconName: row.icon_name || "Activity" });
      } else if (row.section_key.startsWith("metric_")) {
        result.metrics?.push({ value: row.metric_value || "", label: row.metric_label || "", iconName: row.icon_name || "Terminal" });
      } else if (row.section_key === "footer_security") {
        result.footerSecurity = row.description || "";
      }
    });

    return {
      hero: result.hero || fallbacks.hero,
      pillars: result.pillars?.length ? result.pillars : fallbacks.pillars,
      metrics: result.metrics?.length ? result.metrics : fallbacks.metrics,
      footerSecurity: result.footerSecurity || fallbacks.footerSecurity,
    };
  }
};