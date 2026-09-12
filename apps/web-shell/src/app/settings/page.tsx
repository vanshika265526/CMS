"use client";

import React, { useEffect, useMemo, useState } from "react";
import { changeMyPassword, fetchAuthProfile, uploadSettingsAsset } from "@/lib/api/admin";
import api from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Loader2, Lock, ShieldCheck, Upload, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const SELF_SERVICE_ROLES = new Set(["STUDENT", "TEACHER", "PARENT"]);

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    role: "",
    name: "",
    email: "",
    phone: "",
    profilePicture: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const assetBase = useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";
    return apiUrl.replace(/\/api$/, "");
  }, []);

  const resolveAssetUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${assetBase}${url}`;
  };

  const syncStoredUser = (patch: Record<string, any>) => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return;
      const user = JSON.parse(stored);
      const nextUser = { ...user, ...patch };
      localStorage.setItem("user", JSON.stringify(nextUser));
      window.dispatchEvent(new Event("user-updated"));
    } catch {
      // Ignore local cache sync errors; backend state is authoritative.
    }
  };

  useEffect(() => {
    const user = getSessionUser();
    const role = String(user?.role || "").toUpperCase();

    if (role === "SUPER_ADMIN" || role === "COLLEGE_ADMIN") {
      router.replace("/admin/settings");
      return;
    }

    if (!SELF_SERVICE_ROLES.has(role)) {
      setError("You are not allowed to access this settings page.");
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchAuthProfile();
        setProfile({
          role,
          name: res?.name || "",
          email: res?.email || "",
          phone: res?.phone || "",
          profilePicture: res?.profilePicture || "",
        });
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const updatePassword = async () => {
    try {
      setError(null);
      setMessage(null);
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setError("All password fields are required");
        return;
      }
      if (!PASSWORD_REGEX.test(passwordForm.newPassword)) {
        setError("Password must be at least 8 chars with uppercase, number, and special character");
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("New and confirm password must match");
        return;
      }

      setSavingPassword(true);
      const res = await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res?.success) {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setMessage("Password updated successfully");
        syncStoredUser({ mustChangePassword: false, isFirstLogin: false });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    try {
      setUploadingPhoto(true);
      setError(null);
      setMessage(null);
      const uploadRes = await uploadSettingsAsset(file);
      if (!uploadRes?.success) {
        throw new Error("Upload failed");
      }

      const imageUrl = uploadRes.data?.url || "";
      const saveRes = await api.patch("/auth/profile", { profilePicture: imageUrl });
      if (saveRes?.data?.success) {
        setProfile((prev) => ({ ...prev, profilePicture: imageUrl }));
        syncStoredUser({ profilePicture: imageUrl });
        setMessage("Profile photo updated successfully");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Account Settings</h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
          {profile.role || "USER"} Self-Service Security
        </p>
      </header>

      {message ? <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Profile Photo</h2>
            <p className="text-xs text-slate-500 mt-1">Upload a passport-size professional photograph only.</p>
          </div>
          <label className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest cursor-pointer inline-flex items-center gap-2 disabled:opacity-60">
            {uploadingPhoto ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            Upload Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPhoto}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadProfilePhoto(file);
              }}
            />
          </label>
        </div>

        <div className="flex items-center gap-4">
          {profile.profilePicture ? (
            <img
              src={resolveAssetUrl(profile.profilePicture)}
              alt="Profile"
              className="h-20 w-20 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <UserCircle size={64} className="text-slate-300" />
          )}
          <div className="text-xs text-slate-500 leading-relaxed">
            Images should be clear, front-facing, and suitable for official records.
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-slate-500" />
          <h2 className="text-lg font-black text-slate-900">Protected Personal Details</h2>
        </div>
        <p className="text-xs text-slate-500">Name, email, and phone are managed by administration and cannot be edited here.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input value={profile.name} readOnly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
          <input value={profile.email} readOnly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
          <input value={profile.phone} readOnly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-900">Change Password</h2>
        <p className="text-xs text-slate-500">Use a strong password with uppercase, number, and special character.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            placeholder="Current password"
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
            placeholder="New password"
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="Confirm password"
            className="rounded-xl border border-slate-200 px-3 py-2"
          />
        </div>

        <button
          onClick={updatePassword}
          disabled={savingPassword}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 inline-flex items-center gap-2"
        >
          {savingPassword ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
          Update Password
        </button>
      </section>
    </div>
  );
}
