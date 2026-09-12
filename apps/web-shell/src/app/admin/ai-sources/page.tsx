"use client";
import React, { useState, useEffect } from 'react';
import { Bot, Plus, Edit2, Trash2, PlayCircle, ToggleLeft, ToggleRight, Loader2, Globe, ShieldAlert, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import api from '@/lib/api';

export default function AISourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Modal forms state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    enabled: true,
    priority: 1,
    scrapeFrequency: 24,
    collegeId: ''
  });

  // Action pending states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trusted-sources');
      setSources(res.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch sources:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to load trusted sources.');
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.get('/super-admin/colleges');
      setColleges(res.data.colleges || res.data.data || []);
    } catch (error) {
      console.error('Failed to load colleges:', error);
    }
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      if (user.role === 'SUPER_ADMIN') {
        fetchColleges();
      }
    }
    fetchSources();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSource(null);
    setFormData({
      name: '',
      url: '',
      enabled: true,
      priority: 1,
      scrapeFrequency: 24,
      collegeId: ''
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (source: any) => {
    setModalMode('edit');
    setSelectedSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      enabled: source.enabled,
      priority: source.priority,
      scrapeFrequency: source.scrapeFrequency,
      collegeId: source.collegeId || ''
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleChange = () => {
    setFormData(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (modalMode === 'create') {
        await api.post('/trusted-sources', formData);
        setSuccessMsg('Trusted source created successfully.');
      } else {
        await api.patch(`/trusted-sources/${selectedSource._id}`, formData);
        setSuccessMsg('Trusted source updated successfully.');
      }
      setIsModalOpen(false);
      fetchSources();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to save trusted source.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trusted source? Historical placement imports will not be affected.')) return;
    try {
      await api.delete(`/trusted-sources/${id}`);
      setSuccessMsg('Trusted source deleted successfully.');
      fetchSources();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete source.');
    }
  };

  const handleToggleSourceEnabled = async (source: any) => {
    try {
      await api.patch(`/trusted-sources/${source._id}`, {
        enabled: !source.enabled
      });
      fetchSources();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update source status.');
    }
  };

  const handleTestSource = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.post(`/trusted-sources/${id}/test`, {});
      const testData = res.data.data;
      if (testData.success) {
        alert(`Test Connection Succeeded!\nHTTP Status: ${testData.status}\nPage Size: ${testData.size} bytes`);
      } else {
        alert(`Test Connection Failed.\nReason: ${testData.reason}`);
      }
      fetchSources();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Connection test failed.');
    } finally {
      setTestingId(null);
    }
  };

  const handleScrapeNow = async (id: string) => {
    setScrapingId(id);
    try {
      const res = await api.post(`/trusted-sources/${id}/scrape`, {});
      alert(res.data.message || 'Scrape job successfully enqueued in queue.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to enqueue scrape job.');
    } finally {
      setScrapingId(null);
    }
  };

  // Filter sources based on query and enabled filter
  const filteredSources = sources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          source.url.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = activeFilter === 'all' || 
                          (activeFilter === 'enabled' && source.enabled) ||
                          (activeFilter === 'disabled' && !source.enabled);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
              <Globe className="mr-3 text-indigo-600 animate-pulse" size={32} /> AI Trusted Sources
            </h1>
            <p className="text-gray-500 mt-1">Configure external job board crawlers for placement extraction.</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-sm text-sm"
          >
            <Plus size={18} className="mr-2" /> Add Trusted Source
          </button>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium flex items-center">
            <CheckCircle size={18} className="mr-2 text-green-600" /> {successMsg}
          </div>
        )}

        {/* Toolbar: Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex gap-2">
            {(['all', 'enabled', 'disabled'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search source name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 px-4 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <th className="p-4">Source Name</th>
                  <th className="p-4">URL</th>
                  <th className="p-4 text-center">Active</th>
                  <th className="p-4 text-center">Settings</th>
                  <th className="p-4">Last Scrape</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <Loader2 className="animate-spin mr-2 text-indigo-600" size={20} /> Loading trusted sources...
                      </div>
                    </td>
                  </tr>
                ) : filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500">
                      No matching trusted sources found.
                    </td>
                  </tr>
                ) : (
                  filteredSources.map((source) => (
                    <tr key={source._id} className="hover:bg-gray-50/50 transition-colors text-sm">
                      <td className="p-4 font-bold text-gray-900">
                        {source.name}
                        {currentUser?.role === 'SUPER_ADMIN' && source.collegeId && (
                          <span className="block text-[10px] text-indigo-500 font-semibold tracking-wide uppercase mt-1">
                            College ID: {source.collegeId.name || source.collegeId}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 max-w-[280px] truncate">{source.url}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleToggleSourceEnabled(source)} className="text-gray-600 hover:text-indigo-600 transition-colors">
                          {source.enabled ? (
                            <ToggleRight className="text-green-600 mx-auto" size={32} />
                          ) : (
                            <ToggleLeft className="text-gray-400 mx-auto" size={32} />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-center text-gray-600">
                        <div className="inline-block text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded">
                          Priority {source.priority}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">Every {source.scrapeFrequency}h</div>
                      </td>
                      <td className="p-4">
                        {source.lastScrapedAt ? (
                          <div>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock size={12} className="mr-1" /> {new Date(source.lastScrapedAt).toLocaleString()}
                            </div>
                            <div className="mt-1 flex items-center">
                              {source.lastScrapeStatus === 'success' ? (
                                <span className="flex items-center text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 rounded">
                                  <CheckCircle size={10} className="mr-1" /> Success
                                </span>
                              ) : source.lastScrapeStatus === 'failed' ? (
                                <span 
                                  title={source.lastScrapeError || 'Scrape failed'}
                                  className="flex items-center text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 border border-red-200 rounded cursor-help"
                                >
                                  <XCircle size={10} className="mr-1" /> Failed ({source.recentFailures || 1})
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">—</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Never Scraped</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleTestSource(source._id)}
                            disabled={testingId !== null || scrapingId !== null}
                            className="group relative p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                          >
                            {testingId === source._id ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Test Reachability</span>
                          </button>
                          
                          <button
                            onClick={() => handleScrapeNow(source._id)}
                            disabled={testingId !== null || scrapingId !== null || !source.enabled}
                            className="group relative p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50"
                          >
                            {scrapingId === source._id ? <Loader2 className="animate-spin" size={16} /> : <PlayCircle size={16} />}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Run Scraper</span>
                          </button>

                          <button
                            onClick={() => openEditModal(source)}
                            className="group relative p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Edit Source</span>
                          </button>
                          
                          <button
                            onClick={() => handleDelete(source._id)}
                            className="group relative p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-semibold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {modalMode === 'create' ? 'Add Trusted Source' : 'Edit Trusted Source'}
              </h2>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center">
                  <ShieldAlert size={16} className="mr-2 text-red-600" /> {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Source Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. ACM Placement Portal"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Source URL</label>
                  <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/placements"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                    required
                  />
                </div>

                {currentUser?.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">College Scope</label>
                    <select
                      name="collegeId"
                      value={formData.collegeId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm bg-white"
                      required
                    >
                      <option value="">Select College Context</option>
                      {colleges.map((col: any) => (
                        <option key={col._id} value={col._id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Queue Priority (1-100)</label>
                    <input
                      type="number"
                      name="priority"
                      min={1}
                      max={100}
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Scrape Interval (Hours)</label>
                    <input
                      type="number"
                      name="scrapeFrequency"
                      min={1}
                      value={formData.scrapeFrequency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="animate-spin mr-2" size={16} />}
                    {modalMode === 'create' ? 'Create Source' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
