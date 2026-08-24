//C:\projects\exam-prep-platform\src\app\admin_login\page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Initialize the Supabase Client for client components
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(false);

    // If they typed 'admin', convert it internally to the email we registered in the SQL script
    const emailCredential = username.trim() === "admin" ? "admin@example.com" : username;

    try {
      setLoading(true);

      // 1. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailCredential,
        password: password,
      });

      if (authError) {
        setError("Invalid admin credentials");
        setLoading(false);
        return;
      }

      // 2. Fetch user role from your newly created profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user?.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        setError("Unauthorized access: You do not have administrator permissions.");
        await supabase.auth.signOut(); // Wipe session cookies immediately
        setLoading(false);
        return;
      }

      // 3. Success! Sync browser cookies and push past the middleware boundary
      router.refresh();
      router.push("/admin");
      
    } catch (err) {
      setError("An unexpected server error occurred.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Admin Gateway Login</h2>
        <p className="text-slate-400 text-sm mb-6">Enter details to manage quizzes</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 text-sm"
              placeholder="admin"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 text-sm"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors disabled:bg-slate-400"
          >
            {loading ? "Verifying Identity..." : "Verify Identity"}
          </button>
        </form>
      </div>
    </main>
  );
}