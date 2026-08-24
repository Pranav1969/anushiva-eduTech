//src\app\student\login\components\BackgroundEffects.tsx
"use client";

import { motion } from "framer-motion";

export function AnimatedGrid() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"
      />
    </div>
  );
}

export function BackgroundEffects() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 2 }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-blue-600 to-indigo-900 blur-[120px]"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2.5 }}
        className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-purple-600 to-cyan-900 blur-[100px]"
      />
    </div>
    );
}