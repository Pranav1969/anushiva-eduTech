"use client";

import { Loader2 } from "lucide-react";
import { ThemeProvider, useTheme } from "@/app/student/theme/ThemeProvider";
import { useLoginContent } from "./hooks/useLoginContent";
import { LoginShell } from "./components/LoginShell";
import { LoginForm } from "./components/LoginForm";
import { HeroSection } from "./components/HeroSection";
import { OperationalPillars } from "./components/OperationalPillars";
import { MetricsLedger } from "./components/MetricsLedger";
import { SecurityFooter } from "./components/SecurityFooter";

function StudentLoginContent() {
  const { theme } = useTheme();
  const { content, isLoading } = useLoginContent();

  if (isLoading || !content) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.page}`}>
        <Loader2 className={`animate-spin ${theme.accent.spinnerStrong}`} size={32} />
      </div>
    );
  }

  return (
    <LoginShell>
      {/* items-start: both columns begin at the same top line (no empty gap above the card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start w-full">
        {/* LEFT: platform showcase (desktop first, mobile second) */}
        <div className="col-span-1 lg:col-span-7 space-y-8 order-2 lg:order-1">
          <HeroSection hero={content.hero} />
          <OperationalPillars pillars={content.pillars} />
          <MetricsLedger metrics={content.metrics} />
        </div>

        {/* RIGHT: login card. Sticky on desktop so it stays in view while the left side scrolls */}
        <div className="col-span-1 lg:col-span-5 order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none lg:sticky lg:top-8 flex justify-center lg:justify-end">
          <div className="w-full lg:max-w-md">
            <LoginForm />
          </div>
        </div>
      </div>

      <SecurityFooter message={content.footerSecurity} />
    </LoginShell>
  );
}

export default function StudentLoginPage() {
  // Safe even if student/layout.tsx already has a provider: nested providers just pass through.
  return (
    <ThemeProvider>
      <StudentLoginContent />
    </ThemeProvider>
  );
}