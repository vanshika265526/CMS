"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Lock,
  Loader2,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import api from "@/lib/api";
import CampusBackdrop from "@/components/landing/CampusBackdrop";

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
  const stageRef = useRef<HTMLDivElement>(null);

  // OTP State
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("05:00");

  // The auth screens share the landing page's light-only treatment, so the
  // portal's stored dark theme must not bleed into them.
  useEffect(() => {
    document.documentElement.classList.remove("theme-dark");
  }, []);

  // Entrance, mirroring the landing hero's staggered rise.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let cancelled = false;
    let clear: (() => void) | undefined;
    let guard = 0;

    (async () => {
      const gsapMod = await import("gsap");
      if (cancelled) return;
      const gsap = gsapMod.gsap ?? gsapMod.default;
      const items = stage.querySelectorAll("[data-stage-item]");
      const reset = () => gsap.set(items, { clearProps: "opacity,transform" });
      clear = reset;
      const tween = gsap.from(items, {
        y: 26,
        opacity: 0,
        duration: 0.85,
        stagger: 0.09,
        ease: "power3.out",
        onComplete: reset,
        onInterrupt: reset,
      });

      // GSAP's ticker sleeps whenever requestAnimationFrame is throttled — a
      // background tab, or an embedded view. Since the form animates FROM
      // opacity 0, a sleeping ticker would leave the sign-in card invisible.
      guard = window.setTimeout(() => {
        if (tween.progress() < 1) {
          tween.progress(1);
          reset();
        }
      }, 2500);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(guard);
      clear?.();
    };
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
    <div className="auth-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <CampusBackdrop />

      <Link href="/" className="auth-back">
        <ArrowLeft size={14} /> Back to site
      </Link>

      <div className="auth-stage" ref={stageRef}>
        <h1 className="auth-title" data-stage-item>
          {challengeId ? "Verify it’s " : "Welcome "}
          <span className="auth-title-accent">{challengeId ? "you" : "back"}</span>
        </h1>

        <p className="auth-sub" data-stage-item>
          {challengeId
            ? "Enter the 6-digit code from your authenticator or email to finish signing in."
            : "Sign in to your institution’s campus operating system."}
        </p>

        <div className="auth-card" data-stage-item>
          {challengeId ? (
            /* OTP VIEW */
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-field">
                <div className="auth-label-row">
                  <label className="auth-label">Security Code</label>
                  <span className="auth-timer">{timeLeft}</span>
                </div>
                <div className="auth-input-wrap">
                  <KeyRound className="auth-input-icon" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="auth-input auth-input-otp"
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={18} />
                  <p>{error}</p>
                </div>
              )}

              <button disabled={loading || timeLeft === "00:00"} className="auth-submit">
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Verify Identity</span>
                    <ShieldCheck size={18} />
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
                className="auth-ghost"
              >
                Cancel &amp; Return
              </button>
            </form>
          ) : (
            /* LOGIN VIEW */
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Institutional Identifier</label>
                <div className="auth-input-wrap">
                  <Mail className="auth-input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="name@institution.edu or ID-2024001"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                    className="auth-input"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <Lock className="auth-input-icon" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="auth-input auth-input-pad"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="auth-reveal"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={18} />
                  <p>{error}</p>
                </div>
              )}

              <button disabled={loading} className="auth-submit">
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="auth-foot">
            <div className="auth-secure">
              <ShieldCheck size={14} />
              <span>Secure connection active</span>
            </div>
            <p className="auth-note">
              Access is restricted to authorised personnel. Unauthenticated attempts are logged.
            </p>
          </div>
        </div>

        <p className="auth-version" data-stage-item>NgCMS ERP v1.0</p>
      </div>
    </div>
  );
}

const CSS = `
.auth-page{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:4.5rem 1.25rem 3rem;background:#F7F9FC;
  font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased}

.auth-back{position:fixed;top:1.4rem;left:1.5rem;z-index:5;display:inline-flex;align-items:center;gap:.4rem;
  background:rgba(255,255,255,.82);backdrop-filter:blur(12px);
  border:1px solid rgba(17,24,39,.08);border-radius:999px;
  padding:.5rem 1rem;font-size:.78rem;font-weight:650;color:#475467;text-decoration:none;
  box-shadow:0 4px 16px rgba(17,24,39,.05);transition:.2s}
.auth-back:hover{color:#111827;border-color:rgba(17,24,39,.2);transform:translateY(-1px)}

.auth-stage{position:relative;z-index:2;width:100%;max-width:440px;text-align:center}

.auth-title{margin:0;font-size:clamp(1.9rem,4.6vw,2.6rem);font-weight:800;
  letter-spacing:-.035em;color:#111827;line-height:1.08}
.auth-title-accent{background:linear-gradient(100deg,#2563EB 0%,#5B7CF5 40%,#8B5CF6 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}

.auth-sub{margin:.75rem auto 0;max-width:340px;color:#475467;font-size:.9rem;line-height:1.65}

.auth-card{margin-top:1.9rem;text-align:left;
  background:linear-gradient(165deg,rgba(255,255,255,.94) 0%,rgba(247,250,255,.86) 100%);
  backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);
  border:1px solid rgba(255,255,255,.9);border-radius:22px;padding:1.75rem;
  box-shadow:0 -1px 0 rgba(255,255,255,.95) inset,
             0 24px 70px rgba(15,35,80,.18),
             0 6px 22px rgba(15,35,80,.08)}

.auth-form{display:flex;flex-direction:column;gap:1.15rem}
.auth-field{display:flex;flex-direction:column;gap:.5rem}
.auth-label-row{display:flex;align-items:center;justify-content:space-between}
.auth-label{font-size:.68rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8A97AC}
.auth-timer{font-size:.72rem;font-weight:700;color:#E11D48;font-variant-numeric:tabular-nums;letter-spacing:.1em}

.auth-input-wrap{position:relative}
.auth-input-icon{position:absolute;left:.95rem;top:50%;transform:translateY(-50%);color:#94A3B8;
  pointer-events:none;transition:color .18s}
.auth-input-wrap:focus-within .auth-input-icon{color:#2563EB}
.auth-input{width:100%;background:rgba(255,255,255,.75);border:1px solid rgba(17,24,39,.1);
  border-radius:14px;padding:.85rem 1rem .85rem 2.85rem;font-size:.9rem;color:#111827;
  outline:none;transition:.18s;font-family:inherit}
.auth-input::placeholder{color:#A9B4C4}
.auth-input:focus{border-color:rgba(37,99,235,.5);box-shadow:0 0 0 4px rgba(37,99,235,.1);background:#fff}
.auth-input-pad{padding-right:3rem}
.auth-input-otp{text-align:center;font-size:1.45rem;letter-spacing:.45em;padding-left:2.85rem;
  font-variant-numeric:tabular-nums}

.auth-reveal{position:absolute;right:.55rem;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;color:#94A3B8;padding:.4rem;display:flex;transition:color .18s}
.auth-reveal:hover{color:#2563EB}

.auth-error{display:flex;align-items:flex-start;gap:.65rem;background:rgba(225,29,72,.06);
  border:1px solid rgba(225,29,72,.18);border-radius:14px;padding:.85rem 1rem;color:#B91C3C}
.auth-error p{font-size:.8rem;font-weight:600;line-height:1.5;margin:0}

.auth-submit{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;
  height:3.1rem;border:none;cursor:pointer;border-radius:14px;
  background:linear-gradient(135deg,#111827 0%,#1E2A44 100%);color:#fff;
  font-family:inherit;font-size:.92rem;font-weight:700;letter-spacing:-.01em;
  box-shadow:0 8px 24px rgba(17,24,39,.22);transition:.2s}
.auth-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 30px rgba(17,24,39,.28)}
.auth-submit:disabled{opacity:.55;cursor:not-allowed}

.auth-ghost{background:none;border:none;cursor:pointer;font-family:inherit;
  font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:#8A97AC;transition:color .18s;padding:.25rem}
.auth-ghost:hover{color:#111827}

.auth-foot{margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(17,24,39,.07);
  display:flex;flex-direction:column;align-items:center;gap:.7rem}
.auth-secure{display:inline-flex;align-items:center;gap:.4rem;background:rgba(22,163,74,.08);
  border:1px solid rgba(22,163,74,.16);border-radius:999px;padding:.3rem .8rem;
  color:#16A34A;font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.auth-note{margin:0;max-width:290px;text-align:center;color:#98A2B3;
  font-size:.7rem;font-weight:500;line-height:1.6}

.auth-version{margin-top:1.75rem;font-size:.64rem;font-weight:800;letter-spacing:.18em;
  text-transform:uppercase;color:#A9B4C4}

@media (max-width:560px){
  .auth-page{padding:4rem 1rem 2.5rem}
  .auth-card{padding:1.35rem;border-radius:18px}
  .auth-back{top:1rem;left:1rem;padding:.42rem .85rem;font-size:.72rem}
}
`;
