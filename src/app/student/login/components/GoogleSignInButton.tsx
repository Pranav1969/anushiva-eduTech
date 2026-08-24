//src\app\student\login\components\GoogleSignInButton.tsx
"use client";

import { supabase } from "@/utils/supabase";

export function GoogleSignInButton() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/student/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14.1-5l-6.5-5.5C29.6 35.4 26.9 36 24 36c-5.3 0-9.8-3.1-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.7-2.7 5-5.2 6.5l6.5 5.5C39.9 37.3 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
      </svg>
      Continue with Google
    </button>
  );
}