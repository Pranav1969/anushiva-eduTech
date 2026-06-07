import { supabase } from "@/utils/supabase";
import { LoginPageData } from "../types/login.types";

export const loginContentService = {
  async fetchPageContent(): Promise<LoginPageData> {
    const { data, error } = await supabase
      .from("login_page_content")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Premium fallback data structure if network or database table fails
    const fallbacks: LoginPageData = {
      hero: {
        title: "The Absolute Closest You Can Get to the Actual Exam Day.",
        subtitle: "Engineered from the ground up for the 2026 SBI & IBPS Clerk blueprints.",
        description: "No outdated questions, no cluttered UI, and no distractions. Enter a hyper-calibrated testing sandbox designed to turn your practice routines into a final selection merit list."
      },
      pillars: [
        { title: "Blueprint Authenticity", description: "Every mock test features exact sectional timers, interface color schemes, and marking schemes that mimic the real IBPS/SBI system.", iconName: "Activity" },
        { title: "High-Yield Syllabus Nodes", description: "Our syllabus infrastructure isolates Quantitative Aptitude, Reasoning, and English into structured chapter trees that track your coverage with precision.", iconName: "Layers" },
        { title: "Advanced Concept Diagnostics", description: "The moment you hit submit, our backend analytics map your performance matrix. Instantly pinpoint your conceptual bottlenecks.", iconName: "BarChart3" }
      ],
      metrics: [
        { value: "30+", label: "Full-Length Real-Time Mock Interfaces", iconName: "Terminal" },
        { value: "150+", label: "Structured Chapter Study Trees", iconName: "Network" },
        { value: "3,000+", label: "High-Yield Sectional Practice Questions", iconName: "ShieldCheck" }
      ],
      footerSecurity: "Core user authentication and database matrices are securely isolated via Supabase relational architecture. Your personalized analytics, profiles, and preparation data remain strictly confidential and encrypted."
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