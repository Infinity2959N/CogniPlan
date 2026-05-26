"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const axios = (await import("axios")).default;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
      const res = await axios.post(`${apiBase}/auth/login`, {
        email,
        password,
      });

      if (res.data.access_token) {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("username", res.data.user?.name || "User");
        router.push("/");
      } else {
        setError("Invalid server response. Token not found.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errMsg = err.response?.data?.error || "Invalid credentials or backend offline.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30">
            <Zap size={28} className="text-blue-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              StudySync
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Sign in to your workspace
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="you@university.edu"
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all hover:border-slate-500"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className={[
                  "w-full rounded-lg bg-slate-900 border px-4 py-2.5 pr-10 text-sm text-slate-100",
                  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                  "transition-all hover:border-slate-500",
                  error ? "border-red-500" : "border-slate-600",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                ⚠ {error}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500">
          No account?{" "}
          <span className="text-blue-400 cursor-pointer hover:underline">
            Request access
          </span>
        </p>
      </div>
    </div>
  );
}
