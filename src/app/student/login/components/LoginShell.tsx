import { ReactNode } from "react";
import { AnimatedGrid, BackgroundEffects } from "./BackgroundEffects";

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen w-full bg-[#090d16] text-[#F8FAFC] flex flex-col justify-between p-4 md:p-8 lg:p-12 font-sans antialiased relative overflow-x-hidden">
      <AnimatedGrid />
      <BackgroundEffects />
      <div className="w-full max-w-7xl mx-auto my-auto z-10">
        {children}
      </div>
    </main>
  );
}