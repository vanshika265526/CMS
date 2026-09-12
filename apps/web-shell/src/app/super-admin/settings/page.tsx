'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { AlertCircle, Activity, Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/super-admin/settings');
        setSettings(response.data.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/super-admin/settings', settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure global platform settings</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Activity className="text-green-500" />
          <p className="text-green-700">Settings saved successfully!</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <input
                type="text"
                value={settings?.timezone || ''}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings?.session_timeout || 30}
                onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Failed Login Attempts</label>
              <input
                type="number"
                value={settings?.rate_limiting?.max_failed_attempts || 5}
                onChange={(e) => setSettings({
                  ...settings,
                  rate_limiting: {
                    ...settings?.rate_limiting,
                    max_failed_attempts: parseInt(e.target.value)
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={settings?.rate_limiting?.lockout_duration || 15}
                onChange={(e) => setSettings({
                  ...settings,
                  rate_limiting: {
                    ...settings?.rate_limiting,
                    lockout_duration: parseInt(e.target.value)
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Password Policy */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Password Policy</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Length</label>
              <input
                type="number"
                value={settings?.password_policy?.min_length || 8}
                onChange={(e) => setSettings({
                  ...settings,
                  password_policy: {
                    ...settings?.password_policy,
                    min_length: parseInt(e.target.value)
                  }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!settings?.password_policy?.require_uppercase}
                  onChange={(e) => setSettings({
                    ...settings,
                    password_policy: {
                      ...settings?.password_policy,
                      require_uppercase: e.target.checked
                    }
                  })}
                />
                <span className="text-sm font-medium text-gray-700">Require Uppercase</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!settings?.password_policy?.require_numbers}
                  onChange={(e) => setSettings({
                    ...settings,
                    password_policy: {
                      ...settings?.password_policy,
                      require_numbers: e.target.checked
                    }
                  })}
                />
                <span className="text-sm font-medium text-gray-700">Require Numbers</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!settings?.password_policy?.require_special_chars}
                  onChange={(e) => setSettings({
                    ...settings,
                    password_policy: {
                      ...settings?.password_policy,
                      require_special_chars: e.target.checked
                    }
                  })}
                />
                <span className="text-sm font-medium text-gray-700">Require Special Characters</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition font-medium"
        >
          <Save size={20} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
