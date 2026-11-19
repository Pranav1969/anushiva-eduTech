"use client";

import { useTheme } from "@/app/student/theme/ThemeProvider";

export function SecurityFooter({ message }: { message: string }) {
  const { theme } = useTheme();

  return (
    <div className={`w-full max-w-4xl mx-auto mt-8 md:mt-12 pt-6 border-t text-center ${theme.divider}`}>
      <p className={`text-[10px] md:text-[11px] leading-relaxed font-medium max-w-2xl mx-auto ${theme.text.faint}`}>
        🔒 {message}
      </p>
    </div>
  );
}