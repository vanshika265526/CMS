"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  changeMyPassword,
  fetchActiveSessions,
  fetchAuthProfile,
  logoutAllDevices,
  revokeActiveSession,
  updateAdminProfile,
  uploadSettingsAsset,
} from "@/lib/api/admin";
import { Loader2, Save, ShieldCheck, Upload, UserCircle } from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    profilePicture: "",
  });

  const [branding, setBranding] = useState({
    collegeLogo: "",
    primaryColor: "#4f46e5",
    collegeDisplayName: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [sessions, setSessions] = useState<any[]>([]);

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
      const nextUser = {
        ...user,
        ...patch,
        branding: patch.branding ? { ...(user.branding || {}), ...patch.branding } : user.branding,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
      window.dispatchEvent(new Event("user-updated"));
    } catch {
      // Ignore local cache sync errors; backend save is the source of truth.
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const [profileRes, sessionsRes] = await Promise.all([fetchAuthProfile(), fetchActiveSessions()]);

      if (profileRes?._id) {
        setProfile({
          name: profileRes.name || savedUser.name || "",
          email: profileRes.email || savedUser.email || "",
          phone: profileRes.phone || savedUser.phone || "",
          profilePicture: profileRes.profilePicture || savedUser.profilePicture || "",
        });
        setBranding({
          collegeLogo: profileRes.branding?.collegeLogo || savedUser.branding?.collegeLogo || "",
          primaryColor: profileRes.branding?.primaryColor || savedUser.branding?.primaryColor || "#4f46e5",
          collegeDisplayName: profileRes.branding?.collegeDisplayName || savedUser.branding?.collegeDisplayName || "",
        });
      }

      if (sessionsRes?.success) {
        setSessions(sessionsRes.data || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssetUpload = async (file: File, target: "profilePicture" | "collegeLogo") => {
    try {
      const uploadRes = await uploadSettingsAsset(file);
      if (uploadRes?.success) {
        const url = uploadRes.data?.url || "";
        if (target === "profilePicture") {
          setProfile((prev) => ({ ...prev, profilePicture: url }));
          await updateAdminProfile({ profilePicture: url });
          syncStoredUser({ profilePicture: url });
          setMessage("Profile photo updated");
        } else {
          setBranding((prev) => ({ ...prev, collegeLogo: url }));
          await updateAdminProfile({ branding: { ...branding, collegeLogo: url } });
          syncStoredUser({ branding: { ...branding, collegeLogo: url } });
          setMessage("College logo updated");
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to upload image");
    }
  };

  const saveProfileAndBranding = async () => {
    try {
      setSavingProfile(true);
      setError(null);
      const res = await updateAdminProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        profilePicture: profile.profilePicture,
        branding,
      });
      if (res?.success) {
        const userRaw = localStorage.getItem("user");
        if (userRaw) {
          const user = JSON.parse(userRaw);
          user.name = profile.name;
          user.email = profile.email;
          user.phone = profile.phone;
          user.profilePicture = profile.profilePicture;
          user.branding = {
            ...(user.branding || {}),
            ...branding,
          };
          localStorage.setItem("user", JSON.stringify(user));
          window.dispatchEvent(new Event("user-updated"));
        }
        setMessage("Profile and branding saved successfully");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

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
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const refreshSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await fetchActiveSessions();
      if (res?.success) setSessions(res.data || []);
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSessionById = async (sessionId: string) => {
    try {
      await revokeActiveSession(sessionId);
      await refreshSessions();
      setMessage("Session revoked");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to revoke session");
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllDevices();
      setMessage("Logged out from all devices");
      await refreshSessions();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to logout all devices");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Settings</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Profile, Security, Notifications & Branding</p>
      </div>

      {message ? <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-900">Profile Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 px-3 py-2" />
          <label className="rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-2 cursor-pointer">
            <Upload size={14} /> Upload Profile Photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], "profilePicture")} />
          </label>
        </div>
        {profile.profilePicture ? <img src={resolveAssetUrl(profile.profilePicture)} alt="Profile" className="h-16 w-16 rounded-xl object-cover border border-slate-200" /> : <UserCircle size={48} className="text-slate-300" />}
        <button onClick={saveProfileAndBranding} disabled={savingProfile} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 inline-flex items-center gap-2">
          {savingProfile ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Profile
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-900">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="New password" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm password" className="rounded-xl border border-slate-200 px-3 py-2" />
        </div>
        <button onClick={updatePassword} disabled={savingPassword} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 inline-flex items-center gap-2">
          {savingPassword ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />} Update Password
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-900">Session & Security</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Device</th>
                <th className="text-left p-3">IP</th>
                <th className="text-left p-3">Login Time</th>
                <th className="text-left p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} className="border-t border-slate-100">
                  <td className="p-3">{session.user_agent || "Unknown device"}</td>
                  <td className="p-3">{session.ip_address || "-"}</td>
                  <td className="p-3">{session.login_timestamp ? new Date(session.login_timestamp).toLocaleString() : "-"}</td>
                  <td className="p-3">
                    <button onClick={() => revokeSessionById(session._id)} className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">Revoke</button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={4}>No active sessions</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshSessions} disabled={sessionsLoading} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest">Refresh Sessions</button>
          <button onClick={handleLogoutAll} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest">Logout All Devices</button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-black text-slate-900">College Branding</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-2 cursor-pointer">
            <Upload size={14} /> Upload College Logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAssetUpload(e.target.files[0], "collegeLogo")} />
          </label>
          <input value={branding.primaryColor} onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))} placeholder="#4f46e5" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input value={branding.collegeDisplayName} onChange={(e) => setBranding((b) => ({ ...b, collegeDisplayName: e.target.value }))} placeholder="Display Name" className="rounded-xl border border-slate-200 px-3 py-2" />
        </div>
        {branding.collegeLogo ? <img src={resolveAssetUrl(branding.collegeLogo)} alt="College logo" className="h-16 w-16 rounded-xl object-cover border border-slate-200" /> : null}
        <button onClick={saveProfileAndBranding} disabled={savingProfile} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 inline-flex items-center gap-2">
          {savingProfile ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Branding
        </button>
      </section>
    </div>
  );
}
