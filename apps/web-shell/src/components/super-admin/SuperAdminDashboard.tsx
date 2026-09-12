'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  BookOpen, 
  Activity,
  AlertCircle
} from 'lucide-react';

interface DashboardData {
  kpis: {
    totalColleges: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
    activeColleges: number;
    activeSessions: number;
    systemHealth: number;
  };
  collegesByStatus: any[];
  usersByRole: any[];
}

export default function SuperAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/super-admin/analytics/dashboard');
        setDashboardData(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
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

  const kpiCards = [
    {
      title: 'Total Colleges',
      value: dashboardData?.kpis.totalColleges || 0,
      icon: Building2,
      gradient: 'from-blue-500 to-blue-600',
      change: '+5% from last month'
    },
    {
      title: 'Total Users',
      value: dashboardData?.kpis.totalUsers || 0,
      icon: Users,
      gradient: 'from-purple-500 to-purple-600',
      change: '+12% from last month'
    },
    {
      title: 'Total Students',
      value: dashboardData?.kpis.totalStudents || 0,
      icon: BookOpen,
      gradient: 'from-green-500 to-green-600',
      change: 'Across all colleges'
    },
    {
      title: 'Admins',
      value: dashboardData?.kpis.totalAdmins || 0,
      icon: Activity,
      gradient: 'from-orange-500 to-orange-600',
      change: 'College & Super Admins'
    },
    {
      title: 'System Health',
      value: dashboardData?.kpis.systemHealth || 0,
      unit: '%',
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600',
      change: 'All systems operational'
    },
    {
      title: 'Active Sessions',
      value: dashboardData?.kpis.activeSessions || 0,
      icon: Activity,
      gradient: 'from-pink-500 to-pink-600',
      change: 'Current active users'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and key metrics</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
              <div className={`h-20 bg-gradient-to-r ${card.gradient} p-4 flex items-center justify-between`}>
                <div>
                  <p className="text-white text-sm font-medium">{card.title}</p>
                  <p className="text-white text-2xl font-bold mt-1">{card.value}{card.unit || ''}</p>
                </div>
                <Icon className="text-white opacity-80" size={32} />
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm">{card.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* College Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">College Status</h3>
          <div className="space-y-3">
            {dashboardData?.collegesByStatus.map((status: any) => (
              <div key={status._id} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize font-medium">{status._id}</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 rounded-full ${
                    status._id === 'active' ? 'bg-green-500' :
                    status._id === 'suspended' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} style={{ width: `${(status.count / 5) * 100}px` }}></div>
                  <span className="font-bold text-gray-900">{status.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Roles Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Roles</h3>
          <div className="space-y-3">
            {dashboardData?.usersByRole.map((role: any) => (
              <div key={role._id} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize font-medium">{role._id}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(role.count / dashboardData.kpis.totalUsers) * 200}px` }}></div>
                  <span className="font-bold text-gray-900">{role.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Active Colleges</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{dashboardData?.kpis.activeColleges || 0}/5</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Teachers</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{dashboardData?.kpis.totalTeachers || 0}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Active Sessions</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{dashboardData?.kpis.activeSessions || 0}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">System Health</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardData?.kpis.systemHealth || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
