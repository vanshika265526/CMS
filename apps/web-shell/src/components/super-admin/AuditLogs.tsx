'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import {
  AlertCircle,
  Activity,
  Search,
  Download
} from 'lucide-react';

interface AuditLog {
  _id: string;
  userId: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  resource_type: string;
  resource_id: string;
  status: 'success' | 'failure';
  timestamp: string;
  error_message?: string;
  change_details?: any;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    fetchAuditLogs();
  }, [searchTerm, actionFilter, page]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (actionFilter) params.append('action', actionFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/super-admin/audit-logs?${params}`);

      setLogs(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      PUBLISH: 'bg-purple-100 text-purple-800',
      APPROVE: 'bg-emerald-100 text-emerald-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChangeDetails = (log: AuditLog) => {
    const details = log.change_details;
    if (!details) {
      if (log.action === 'CREATE') return `Created ${log.resource_type}`;
      if (log.action === 'DELETE') return `Deleted ${log.resource_type}`;
      return '-';
    }

    if (Array.isArray(details.fields) && details.fields.length) {
      return details.fields
        .slice(0, 5)
        .map((item: any) => `${item.field}: ${String(item.from ?? '-') } -> ${String(item.to ?? '-')}`)
        .join('\n');
    }

    if (details.created) {
      const createdName = details.created?.name || details.created?.email || log.resource_id || '';
      return `Created ${log.resource_type}: ${createdName}`.trim();
    }

    if (details.deleted) {
      const deletedName = details.deleted?.name || details.deleted?.email || log.resource_id || '';
      return `Deleted ${log.resource_type}: ${deletedName}`.trim();
    }

    if (details.before || details.after) {
      const lines = buildLegacyDiffLines(details.before || {}, details.after || {});
      if (lines.length) return lines.slice(0, 5).join('\n');
    }

    if (details.summary) return String(details.summary);

    if (log.status === 'failure' && log.error_message) {
      return `Failed: ${log.error_message}`;
    }

    return '-';
  };

  const buildLegacyDiffLines = (beforeObj: any, afterObj: any) => {
    const flatten = (value: any, path = '', output: Record<string, string> = {}) => {
      if (value === null || typeof value === 'undefined') {
        if (path) output[path] = '-';
        return output;
      }

      if (Array.isArray(value)) {
        if (path) output[path] = value.map((entry) => String(entry)).join(', ');
        return output;
      }

      if (typeof value !== 'object') {
        if (path) output[path] = String(value);
        return output;
      }

      Object.entries(value).forEach(([key, nested]) => {
        const nextPath = path ? `${path}.${key}` : key;
        flatten(nested, nextPath, output);
      });
      return output;
    };

    const ignored = ['password', 'authentication', '__v', 'updatedAt', 'createdAt', '_id', 'tokens', 'session'];
    const isIgnored = (key: string) => ignored.some((candidate) => key === candidate || key.startsWith(`${candidate}.`));

    const before = flatten(beforeObj || {});
    const after = flatten(afterObj || {});
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    return keys
      .filter((key) => !isIgnored(key))
      .filter((key) => (before[key] || '-') !== (after[key] || '-'))
      .map((key) => `${beautifyKey(key)}: ${before[key] || '-'} -> ${after[key] || '-'}`);
  };

  const beautifyKey = (key: string) => {
    return key
      .split('.')
      .map((part) => part.replace(/_/g, ' '))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' > ');
  };

  const visibleLogs = useMemo(() => logs, [logs]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/super-admin/audit-logs/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        const raw = await err.response.data.text();
        try {
          const parsed = JSON.parse(raw);
          setError(parsed?.message || 'Failed to export audit logs');
          return;
        } catch {
          // Continue to generic message
        }
      }
      setError(err.response?.data?.message || 'Failed to export audit logs');
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all system activities and changes</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
          <Download size={20} /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search user or resource..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="PUBLISH">Publish</option>
          <option value="APPROVE">Approve</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Resource</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Changes</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{log.userId?.name}</p>
                      <p className="text-sm text-gray-600">{log.userId?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{log.resource_type}</p>
                      <p className="text-sm text-gray-600">{log.resource_id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-700 whitespace-pre-line max-w-[24rem]">
                    {renderChangeDetails(log)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <span className="text-xs text-red-600 mt-1">{log.error_message}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No audit logs found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 text-sm">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
