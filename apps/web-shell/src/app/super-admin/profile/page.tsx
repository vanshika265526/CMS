'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AlertCircle, CheckCircle2, Camera } from 'lucide-react';
import UserAvatar from '../../../components/ui/UserAvatar';

export default function SuperAdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    profilePicture: '',
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get('/auth/profile');
        const me = profileRes.data || {};
        const userRes = await api.get(`/super-admin/users/${me._id}`);
        const fullUser = userRes.data?.data || {};

        setProfile({
          id: me._id || '',
          name: fullUser.name || me.name || '',
          email: fullUser.email || me.email || '',
          phone: fullUser.phone || '',
          profilePicture: fullUser.profilePicture || '',
        });
        setProfilePhotoPreview(fullUser.profilePicture || '');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile settings');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      formData.append('phone', profile.phone);
      if (profilePhotoFile) {
        formData.append('profilePictureFile', profilePhotoFile);
      }

      const response = await api.put(`/super-admin/users/${profile.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updated = response.data?.data || {};
      const updatedPicture = updated.profilePicture || profile.profilePicture || '';
      setProfile((prev) => ({
        ...prev,
        name: updated.name || prev.name,
        email: updated.email || prev.email,
        phone: updated.phone || prev.phone,
        profilePicture: updatedPicture,
      }));
      setProfilePhotoPreview(updatedPicture);
      setProfilePhotoFile(null);

      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = updated.name || profile.name;
        parsed.email = updated.email || profile.email;
        parsed.profilePicture = updatedPicture;
        localStorage.setItem('user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('user-updated'));
      }

      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);
      setSuccess(null);

      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading profile settings...</div>;
  }

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfilePhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account details and password</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="text-green-600" size={18} />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Profile</h2>
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center gap-4">
            <UserAvatar
              name={profile.name}
              imageUrl={profilePhotoPreview || profile.profilePicture}
              size={88}
              className="ring-2 ring-blue-100"
            />
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition">
              <Camera size={16} />
              <span className="text-sm font-medium">Change Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
            </label>
          </div>
          <input
            type="text"
            placeholder="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="password"
            placeholder="Current Password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="New Password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg transition"
            >
              {changingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
