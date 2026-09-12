'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  AlertCircle,
  Activity,
  Download
} from 'lucide-react';

interface AnalyticsData {
  collegeAnalytics: any[];
  userAnalytics: any;
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const collegeCount = analyticsData?.collegeAnalytics?.length || 1;
  const totalStudents = analyticsData?.collegeAnalytics?.reduce((sum: number, c: any) => sum + (c.students || 0), 0) || 0;
  const totalTeachers = analyticsData?.collegeAnalytics?.reduce((sum: number, c: any) => sum + (c.teachers || 0), 0) || 0;

  const handleExport = async () => {
    try {
      const response = await api.get('/super-admin/analytics/export?format=csv&range=' + encodeURIComponent(dateRange), {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        const raw = await err.response.data.text();
        try {
          const parsed = JSON.parse(raw);
          setError(parsed?.message || 'Failed to export analytics');
          return;
        } catch {
          // Continue to generic message
        }
      }
      setError(err.response?.data?.message || 'Failed to export analytics');
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [collegesRes, usersRes] = await Promise.all([
          api.get('/super-admin/analytics/colleges-comparison'),
          api.get('/super-admin/analytics/users')
        ]);

        setAnalyticsData({
          collegeAnalytics: collegesRes.data.data,
          userAnalytics: usersRes.data.data
        });
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Platform-wide analytics and insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 flex items-center gap-2"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
            <Download size={20} /> Export
          </button>
        </div>
      </div>

      {/* College Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">College-wise Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">College</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Students</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Teachers</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Admins</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analyticsData?.collegeAnalytics.map((college: any) => (
                <tr key={college.collegeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{college.collegeName}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{college.students}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{college.teachers}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{college.admins}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                    {(college.students || 0) + (college.teachers || 0) + (college.admins || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Growth Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly New Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly New Users</h3>
          <div className="space-y-3">
            {analyticsData?.userAnalytics?.monthlyNewUsers?.slice(0, 6).map((month: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-700">{month._id.year}-{String(month._id.month).padStart(2, '0')}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(month.count * 5, 200)}px` }}></div>
                  <span className="font-bold text-gray-900">{month.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Users by College */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by College</h3>
          <div className="space-y-3">
            {analyticsData?.userAnalytics?.usersByCollege?.slice(0, 6).map((collegeUser: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-700">{collegeUser.college?.name || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-green-500 rounded-full" style={{ width: `${Math.min(collegeUser.count * 2, 200)}px` }}></div>
                  <span className="font-bold text-gray-900">{collegeUser.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
          <p className="text-blue-800 font-medium">Avg Students per College</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            {Math.round(totalStudents / collegeCount)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
          <p className="text-purple-800 font-medium">Avg Teachers per College</p>
          <p className="text-3xl font-bold text-purple-900 mt-2">
            {Math.round(totalTeachers / collegeCount)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
          <p className="text-green-800 font-medium">Total Active Users</p>
          <p className="text-3xl font-bold text-green-900 mt-2">
            {analyticsData?.collegeAnalytics?.reduce((sum: number, c: any) => sum + (c.students || 0) + (c.teachers || 0) + (c.admins || 0), 0) || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
