'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle,
  Activity,
  Eye,
  Download,
  Upload
} from 'lucide-react';

interface College {
  _id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  is_verified: boolean;
  subscription: {
    plan: string;
    status: string;
  };
  adminId?: {
    name: string;
    email: string;
  };
}

export default function CollegeManagement() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPayload, setImportPayload] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [viewCollege, setViewCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    location: { city: '', state: '', pin_code: '', address: '', country: 'India' },
    affiliation: ''
  });
  const [editFormData, setEditFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended'
  });

  useEffect(() => {
    fetchColleges();
  }, [searchTerm, statusFilter, page]);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', '10');

      const response = await api.get(`/super-admin/colleges?${params}`);
      setColleges(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch colleges');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        location: {
          address: formData.location.address.trim(),
          city: formData.location.city.trim(),
          state: formData.location.state.trim(),
          pin_code: formData.location.pin_code.trim(),
          country: formData.location.country?.trim() || 'India',
        },
      };
      await api.post('/super-admin/colleges', payload);
      setShowCreateModal(false);
      setFormData({
        code: '',
        name: '',
        email: '',
        phone: '',
        location: { city: '', state: '', pin_code: '', address: '', country: 'India' },
        affiliation: ''
      });
      setError(null);
      fetchColleges();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create college');
    }
  };

  const handleDeleteCollege = async (collegeId: string) => {
    if (window.confirm('Are you sure you want to delete this college?')) {
      try {
        await api.delete(`/super-admin/colleges/${collegeId}`);
        fetchColleges();
      } catch (err) {
        console.error('Error deleting college:', err);
      }
    }
  };

  const handleViewCollege = async (collegeId: string) => {
    try {
      const response = await api.get(`/super-admin/colleges/${collegeId}`);
      setViewCollege(response.data.data);
      setShowViewModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch college details');
    }
  };

  const handleExportColleges = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/super-admin/colleges/export/csv?${params}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `colleges-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export colleges');
    }
  };

  const handleBulkImportColleges = async () => {
    try {
      setImporting(true);
      const parsed = JSON.parse(importPayload);
      if (!Array.isArray(parsed)) {
        throw new Error('Import payload must be a JSON array');
      }

      const response = await api.post('/super-admin/colleges/bulk-import', { colleges: parsed });
      const summary = response.data?.data;
      window.alert(`Import complete: ${summary.created} created, ${summary.skipped} skipped`);
      setShowImportModal(false);
      setImportPayload('');
      fetchColleges();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to import colleges');
    } finally {
      setImporting(false);
    }
  };

  const openEditModal = (college: College) => {
    const normalizedStatus: 'active' | 'inactive' | 'suspended' =
      college?.status === 'inactive' || college?.status === 'suspended' ? college.status : 'active';

    setSelectedCollegeId(college._id);
    setEditFormData({
      code: String(college?.code || ''),
      name: String(college?.name || ''),
      email: String(college?.email || ''),
      phone: String(college?.phone || ''),
      status: normalizedStatus
    });
    setShowEditModal(true);
  };

  const handleUpdateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeId) return;

    try {
      await api.put(`/super-admin/colleges/${selectedCollegeId}`, editFormData);
      setShowEditModal(false);
      setSelectedCollegeId(null);
      fetchColleges();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update college');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return badges[status as keyof typeof badges] || '';
  };

  if (loading && colleges.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">College Management</h1>
          <p className="text-gray-600 mt-1">Manage all colleges in the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportColleges}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Download size={18} /> Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Upload size={18} /> Bulk Import
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus size={20} /> Add College
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Colleges Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">College Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Plan</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {colleges.map((college) => (
                <tr key={college._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{college.name}</p>
                    <p className="text-sm text-gray-600">{college.adminId?.name || 'No admin assigned'}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{college.code}</td>
                  <td className="px-6 py-4 text-gray-700">{college.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                      {college.subscription?.plan || 'basic'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(college.status)}`}>
                      {college.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => handleViewCollege(college._id)}
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                      title="View"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => openEditModal(college)}
                      className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteCollege(college._id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {colleges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No colleges found. Create one to get started.</p>
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

      {/* Create College Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New College</h2>
            <form onSubmit={handleCreateCollege} className="space-y-4">
              <input
                type="text"
                placeholder="College Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="College Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.location.address}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, address: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.location.city}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, city: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="State"
                value={formData.location.state}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, state: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="PIN Code"
                value={formData.location.pin_code}
                onChange={(e) => setFormData({
                  ...formData,
                  location: { ...formData.location, pin_code: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit College Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit College</h2>
            <form onSubmit={handleUpdateCollege} className="space-y-4">
              <input
                type="text"
                placeholder="College Code"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="College Name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCollegeId(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View College Modal */}
      {showViewModal && viewCollege && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">College Details</h2>
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Code:</span> {viewCollege.code}</p>
              <p><span className="font-semibold">Name:</span> {viewCollege.name}</p>
              <p><span className="font-semibold">Email:</span> {viewCollege.email}</p>
              <p><span className="font-semibold">Phone:</span> {viewCollege.phone}</p>
              <p><span className="font-semibold">Plan:</span> {viewCollege.subscription?.plan || 'basic'}</p>
              <p><span className="font-semibold">Status:</span> {viewCollege.status}</p>
              <p><span className="font-semibold">Verified:</span> {viewCollege.is_verified ? 'Yes' : 'No'}</p>
              <p><span className="font-semibold">Admin:</span> {viewCollege.adminId?.name || 'Not assigned'}</p>
            </div>
            <div className="pt-6">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewCollege(null);
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Import Colleges (JSON)</h2>
            <p className="text-sm text-gray-600 mb-3">Paste a JSON array. Required fields per item: code, name, email, phone.</p>
            <textarea
              rows={12}
              value={importPayload}
              onChange={(e) => setImportPayload(e.target.value)}
              placeholder='[{"code":"COL001","name":"ABC College","email":"admin@abc.edu","phone":"9999999999"}]'
              className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBulkImportColleges}
                disabled={importing}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
