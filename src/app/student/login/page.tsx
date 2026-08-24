//src\app\student\login\page.tsx
"use client";

import { useLoginContent } from "./hooks/useLoginContent";
import { LoginShell } from "./components/LoginShell";
import { LoginForm } from "./components/LoginForm";
import { HeroSection } from "./components/HeroSection";
import { OperationalPillars } from "./components/OperationalPillars";
import { MetricsLedger } from "./components/MetricsLedger";
import { SecurityFooter } from "./components/SecurityFooter";
import { Loader2 } from "lucide-react";

export default function StudentLoginPage() {
  const { content, isLoading } = useLoginContent();

  if (isLoading || !content) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <LoginShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full">
        
        {/* LEFT SIDE: Platform Showcase Content (Desktop Order: 1, Mobile Order: 2) */}
        <div className="col-span-1 lg:col-span-7 space-y-8 order-2 lg:order-1">
          <HeroSection hero={content.hero} />
          <OperationalPillars pillars={content.pillars} />
          <MetricsLedger metrics={content.metrics} />
        </div>

        {/* RIGHT SIDE: Dedicated Login Container (Desktop Order: 2, Mobile Order: 1) */}
        <div className="col-span-1 lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none">
          <LoginForm />
        </div>
      </div>

      {/* Persistent Platform Security Trust Matrix */}
      <SecurityFooter message={content.footerSecurity} />
    </LoginShell>
  );
}