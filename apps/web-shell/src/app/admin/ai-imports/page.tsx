"use client";
import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, XCircle, Eye, Search, AlertTriangle, ShieldCheck, PlayCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function AIImportsPage() {
  const [imports, setImports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobSummary, setJobSummary] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, activeSources: 0 });
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedImport, setSelectedImport] = useState<any>(null);
  
  const [statusFilter, setStatusFilter] = useState('pending');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchImports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/imports', {
        params: { reviewStatus: statusFilter, limit: 50 }
      });
      setImports(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      const res = await api.get('/imports/jobs', {
        params: { limit: 100 }
      });
      setJobs(res.data.data || []);
      setJobSummary(res.data.summary || { pending: 0, processing: 0, completed: 0, failed: 0, activeSources: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
    fetchJobs();
  }, [statusFilter]);

  const handleTriggerScraper = async () => {
    try {
      setTriggering(true);
      const res = await api.post('/imports/trigger-scraper', {});
      const message = res.data?.message || 'Scraper triggered successfully!';
      showToast(message, 'success');
      fetchJobs();
      fetchImports();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to trigger scraper', 'error');
    } finally {
      setTriggering(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this import and publish it to students?')) return;
    setApproving(true);
    try {
      await api.patch(`/imports/${id}/approve`, {});
      setSelectedImport(null);
      fetchImports();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to approve', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setRejecting(true);
    try {
      await api.patch(`/imports/${id}/reject`, { reason });
      setSelectedImport(null);
      fetchImports();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getJobBadge = (status: string) => {
    if (status === 'completed') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'processing') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'failed') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
              <Bot className="mr-3 text-indigo-600" size={32} /> AI Placements Review
            </h1>
            <p className="text-gray-500 mt-1">Review, approve, and manage placement drives extracted by AI.</p>
          </div>
          <button 
            onClick={handleTriggerScraper}
            disabled={triggering}
            className="flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-medium shadow-sm disabled:opacity-50"
          >
            {triggering ? <Loader2 className="animate-spin mr-2" size={18} /> : <PlayCircle size={18} className="mr-2" />} 
            Run Scraper Now
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-2 mb-4">
          {['pending', 'approved', 'rejected'].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                statusFilter === status 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Active Sources</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{jobSummary.activeSources}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Pending Jobs</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{jobSummary.pending}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Processing</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{jobSummary.processing}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{jobSummary.completed}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Failed</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{jobSummary.failed}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Scraper Jobs</h2>
              <p className="text-sm text-gray-500">Shows the queue created from active trusted sources.</p>
            </div>
            {jobSummary.activeSources === 0 && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                No active sources configured
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-medium text-gray-500">
                  <th className="p-4">Source</th>
                  <th className="p-4">URL</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Retries</th>
                  <th className="p-4">Last Error</th>
                  <th className="p-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobsLoading ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500">Loading jobs...</td></tr>
                ) : jobs.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-500">No scraper jobs found yet.</td></tr>
                ) : (
                  jobs.map((job: any) => (
                    <tr key={job._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{job.sourceId?.name || 'Unknown Source'}</p>
                        <p className="text-xs text-gray-500">{job.sourceId?.priority ? `Priority ${job.sourceId.priority}` : 'No priority'}</p>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-[320px] truncate">
                        {job.url}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getJobBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{job.retryCount || 0}</td>
                      <td className="p-4 text-sm text-gray-500 max-w-[220px] truncate">{job.lastError || '—'}</td>
                      <td className="p-4 text-sm text-gray-500">{job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-medium text-gray-500">
                <th className="p-4">Company & Role</th>
                <th className="p-4">Quality Score</th>
                <th className="p-4">Duplicates</th>
                <th className="p-4">Extracted On</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">Loading imports...</td></tr>
              ) : imports.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">No {statusFilter} AI imports found.</td></tr>
              ) : (
                imports.map((p: any) => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{p.companyName}</p>
                      <p className="text-sm text-gray-500">{p.role}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getQualityColor(p.overallQualityScore)}`}>
                        {p.overallQualityScore}%
                      </span>
                    </td>
                    <td className="p-4">
                      {p.duplicateScore > 0 ? (
                        <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                          <AlertTriangle size={14} className="mr-1" /> {p.duplicateScore}% Similar
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None detected</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(p.scrapedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedImport(p)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors font-medium text-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    Review: {selectedImport.companyName}
                  </h2>
                  <p className="text-sm text-gray-500">Source: <a href={selectedImport.sourceUrl} target="_blank" className="text-indigo-600 hover:underline">{selectedImport.sourceUrl}</a></p>
                </div>
                <button onClick={() => setSelectedImport(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg"><XCircle size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 flex gap-6">
                
                {/* Left Panel: Final Preview */}
                <div className="flex-1 space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Student Card Preview</h3>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{selectedImport.role}</h4>
                    <p className="text-gray-500 font-medium mb-4">{selectedImport.companyName}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><span className="font-medium text-gray-900">Package:</span> {selectedImport.package ? `${selectedImport.package} LPA` : 'Not Disclosed'}</div>
                      <div><span className="font-medium text-gray-900">Deadline:</span> {selectedImport.deadline ? new Date(selectedImport.deadline).toLocaleDateString() : 'N/A'}</div>
                      <div><span className="font-medium text-gray-900">Eligibility:</span> {selectedImport.eligibility || 'N/A'}</div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Quality Assessment</h3>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">AI Confidence:</span>
                      <span className="font-bold text-gray-900">{selectedImport.aiConfidence}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Validation Score:</span>
                      <span className="font-bold text-gray-900">{selectedImport.validationScore}%</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600 bg-red-50 p-2 rounded">
                      <span className="font-medium">Duplicate Risk:</span>
                      <span className="font-bold">{selectedImport.duplicateScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Raw Data */}
                <div className="flex-1 space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Extracted Raw Text</h3>
                  <div className="bg-gray-900 text-gray-300 p-4 rounded-xl text-xs font-mono h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedImport.rawContent || 'No raw content saved.'}
                  </div>

                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Output JSON</h3>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedImport.aiJsonOutput ? JSON.stringify(JSON.parse(selectedImport.aiJsonOutput), null, 2) : 'No JSON output saved.'}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                {selectedImport.reviewStatus === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleReject(selectedImport._id)} 
                      disabled={approving || rejecting}
                      className="px-6 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors flex items-center disabled:opacity-50"
                    >
                      {rejecting && <Loader2 className="animate-spin mr-2" size={18} />}
                      {rejecting ? 'Rejecting...' : 'Reject Import'}
                    </button>
                    <button 
                      onClick={() => handleApprove(selectedImport._id)} 
                      disabled={approving || rejecting}
                      className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors flex items-center shadow-sm disabled:opacity-50"
                    >
                      {approving ? <Loader2 className="animate-spin mr-2" size={18} /> : <ShieldCheck size={18} className="mr-2"/>} 
                      {approving ? 'Publishing...' : 'Approve & Publish'}
                    </button>
                  </>
                )}
                {selectedImport.reviewStatus !== 'pending' && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium uppercase tracking-wide text-sm flex items-center">
                    This import is {selectedImport.reviewStatus}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl shadow-lg border ${
              toast.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="mr-2" size={20} /> : <AlertTriangle className="mr-2" size={20} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
