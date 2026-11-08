//src\app\student\layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { useStudentSession } from "@/utils/auth";
import { ThemeProvider } from "./theme/ThemeProvider"; // ONE shared theme for every /student page

const PUBLIC_STUDENT_PATHS = ["/student/login", "/student/signup", "/student/complete-profile"];

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, loading } = useStudentSession();

  const isPublicPath = PUBLIC_STUDENT_PATHS.some((p) => pathname.startsWith(p));

  // The provider wraps every branch below, so it is mounted once for the whole
  // student area and keeps the chosen theme while the student moves between pages.
  if (isPublicPath) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Middleware already guarantees only a validly-authenticated, single-active-device
  // request reaches this point server-side. This client-side check just avoids a
  // flash of content while useStudentSession resolves the student's profile data.
  if (loading || !session) {
    return (
      <ThemeProvider>
        <div className="min-h-screen w-full bg-[#090d16]" />
      </ThemeProvider>
    );
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}