"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Check credentials.");
        setLoading(false);
        return;
      }

      router.push("/pos");
      router.refresh();
    } catch {
      setError("Unable to connect to local authentication service.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 text-zinc-100">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-bold mx-auto mb-2">
            ✚
          </div>
          <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
            Pharma Invent
          </h1>
          <p className="text-xs text-zinc-400">
            Sign in to start terminal session
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-red-950/40 border border-red-900 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Username</label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (e.g. admin)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? "Authenticating..." : "Sign In"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-3 border-t border-zinc-800 text-center text-[11px] text-zinc-500">
          Default Master User: <code className="text-zinc-400 font-mono">admin</code> / <code className="text-zinc-400 font-mono">admin123</code>
        </div>
      </div>
    </div>
  );
}
