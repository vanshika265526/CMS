"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Moon,
  Sun,
  Loader2, 
  ChevronRight, 
  AlertCircle,
  ShieldCheck,
  KeyRound
} from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import api from "@/lib/api";
import Card from "@/components/ui/Card";

// Validation Schema
const loginSchema = z.object({
  identifier: z.string()
    .trim()
    .min(3, { message: "Identifier is too short" }),
  password: z.string()
    .min(6, { message: "Security protocol requires at least 6 characters" })
});

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // OTP State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("05:00");

  useEffect(() => {
    const storedTheme = localStorage.getItem("portal_theme");
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = storedTheme === "dark" || storedTheme === "light"
      ? (storedTheme as "light" | "dark")
      : (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("theme-dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiresAt.getTime() - now;
      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
        setError("Security challenge expired. Please restart initialization.");
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("portal_theme", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  };

  const handleLoginSuccess = (data: any) => {
    localStorage.removeItem("portal_notice");
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({
      _id: data._id,
      id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      collegeId: data.collegeId,
      profilePicture: data.profilePicture || '',
      mustChangePassword: Boolean(data.mustChangePassword),
      isFirstLogin: Boolean(data.isFirstLogin),
    }));
    router.push("/");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = loginSchema.safeParse(formData);
    
    if (!result.success) {
      setError(result.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login", result.data);
      const data = response.data;

      if (response.status === 202) {
        setChallengeId(data.challengeId);
        setExpiresAt(new Date(data.expiresAt));
      } else if (response.status === 200 || response.status === 201) {
        handleLoginSuccess(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Institutional cluster connectivity failure");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit security code");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/verify-otp", { challengeId, otp });
      if (response.status === 200 || response.status === 201) {
        handleLoginSuccess(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Security verification failed");
      // If challenge expired or invalid, reset to login
      if (err.response?.status === 400 && err.response?.data?.message?.includes("expired")) {
        setChallengeId(null);
        setOtp("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-xl bg-white/90 border border-slate-200 text-slate-700 shadow-lg hover:bg-white transition-all flex items-center justify-center"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col items-center mb-10 group">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-600/30 shadow-xl transition-all group-hover:scale-105 duration-500">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="mt-8 text-3xl font-bold text-slate-900 tracking-tight">NgCMS ERP</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">St. Xavier's Digital Curator</p>
        </div>

        <Card className="p-10 bg-white shadow-xl shadow-slate-200/50 relative border-t-4 border-t-indigo-600 rounded-3xl border-slate-100 overflow-hidden">
          
          {/* OTP VIEW */}
          {challengeId ? (
             <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
               <div className="text-center mb-6">
                 <h2 className="text-lg font-bold text-slate-800">Two-Step Verification</h2>
                 <p className="text-sm text-slate-500 mt-2">Enter the 6-digit security code generated by your authenticator or sent to your email.</p>
               </div>

               <div className="space-y-2">
                 <div className="flex items-center justify-between pl-1 pr-1">
                   <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Security Code</label>
                   <span className="text-xs font-bold text-rose-500 font-mono tracking-widest">{timeLeft}</span>
                 </div>
                 <div className="relative group">
                   <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                   <input 
                     type="text" 
                     maxLength={6}
                     placeholder="000000"
                     value={otp}
                     onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                     className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-2xl pl-12 pr-4 py-3.5 text-center text-2xl tracking-[0.5em] font-mono outline-none text-slate-800 placeholder:text-slate-300 shadow-sm"
                   />
                 </div>
               </div>

               {error && (
                 <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
                   <AlertCircle className="text-rose-600 shrink-0" size={18} />
                   <p className="text-xs font-bold text-rose-700 leading-tight">{error}</p>
                 </div>
               )}

               <button 
                 disabled={loading || timeLeft === "00:00"}
                 className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 group"
               >
                 {loading ? (
                   <Loader2 className="animate-spin text-white" size={20} />
                 ) : (
                   <>
                     <span>Verify Identity</span>
                     <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                   </>
                 )}
               </button>

               <button
                 type="button"
                 onClick={() => {
                   setChallengeId(null);
                   setOtp("");
                   setError(null);
                 }}
                 className="w-full text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider transition-colors"
               >
                 Cancel & Return
               </button>
             </form>
          ) : (
             /* LOGIN VIEW */
             <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-left-8 duration-500">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">Institutional Identifier (Email or ID)</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="name@institution.edu or ID-2024001"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Security Protocol</label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-2xl pl-12 pr-12 py-3.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
                  <AlertCircle className="text-rose-600 shrink-0" size={18} />
                  <p className="text-xs font-bold text-rose-700 leading-tight">{error}</p>
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-white" size={20} />
                ) : (
                  <>
                    <span>Initialize Connection</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-indigo-600/60 bg-indigo-50 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Secure Connection Active</span>
             </div>
             <p className="text-[11px] text-slate-400 text-center font-medium leading-relaxed max-w-[280px]">
               Access restricted to authorized personnel. Unauthenticated attempts are securely logged.
             </p>
          </div>
        </Card>

        <p className="mt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
          NgCMS ERP v.1.0
        </p>
      </div>
    </div>
  );
}
