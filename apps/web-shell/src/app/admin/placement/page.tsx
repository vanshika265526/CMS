"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Archive, CheckCircle, Clock, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PlacementAdminPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const fetchPlacements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/placements', {
        params: { search, workflowStatus: statusFilter, page, limit: 10 }
      });
      setPlacements(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, [search, statusFilter, page]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} placements?`)) return;
    try {
      await api.post(`/placements/bulk/${action}`, { ids: selectedIds });
      setSelectedIds([]);
      fetchPlacements();
    } catch (error) {
      alert(`Bulk ${action} failed.`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Published</span>;
      case 'draft': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Draft</span>;
      case 'pending_review': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending Review</span>;
      case 'archived': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Archived</span>;
      case 'expired': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">Expired</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Placements CMS</h1>
            <p className="text-gray-500 mt-1">Manage placement drives, internships, and job postings.</p>
          </div>
          <button 
            onClick={() => router.push('/admin/placement/create')}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-sm hover:shadow active:scale-95"
          >
            <Plus size={18} className="mr-2" /> New Placement
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search company, role..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="pending_review">Pending Review</option>
              <option value="archived">Archived</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium px-2">{selectedIds.length} selected</span>
                <button onClick={() => handleBulkAction('publish')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors tooltip" title="Publish Selected"><CheckCircle size={18}/></button>
                <button onClick={() => handleBulkAction('archive')} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip" title="Archive Selected"><Archive size={18}/></button>
                <button onClick={() => handleBulkAction('delete')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Delete Selected"><Trash2 size={18}/></button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-medium text-gray-500">
                  <th className="p-4 w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      checked={placements.length > 0 && selectedIds.length === placements.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(placements.map((p: any) => p._id));
                        else setSelectedIds([]);
                      }}
                    />
                  </th>
                  <th className="p-4 font-semibold">Company & Role</th>
                  <th className="p-4 font-semibold">Package</th>
                  <th className="p-4 font-semibold">Deadline</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="w-4 h-4 bg-gray-200 rounded"></div></td>
                      <td className="p-4"><div className="w-32 h-4 bg-gray-200 rounded"></div></td>
                      <td className="p-4"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                      <td className="p-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                      <td className="p-4"><div className="w-20 h-6 bg-gray-200 rounded-full"></div></td>
                      <td className="p-4 text-right"><div className="w-8 h-8 bg-gray-200 rounded-lg inline-block"></div></td>
                    </tr>
                  ))
                ) : placements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium text-gray-900">No placements found</p>
                        <p className="text-sm">Try adjusting your filters or create a new placement.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  placements.map((p: any) => (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(p._id)}
                          onChange={() => toggleSelection(p._id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {p.companyLogo ? (
                              <img src={p.companyLogo} alt={p.companyName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-gray-500">{p.companyName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.companyName}</p>
                            <p className="text-sm text-gray-500">{p.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-700">
                        {p.package > 0 ? `${p.package} ${p.salaryType || 'LPA'}` : 'Not Disclosed'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock size={14} className="mr-1.5 text-gray-400" />
                          {new Date(p.deadline).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(p.workflowStatus)}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => router.push(`/admin/placement/${p._id}`)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1} 
                  onClick={() => setPage(page - 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  disabled={page === totalPages} 
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
