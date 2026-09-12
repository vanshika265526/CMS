"use client";
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Save, Eye, LayoutTemplate, Smartphone, Monitor, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlacementForm({ initialData = null, placementId = null }: { initialData?: any, placementId?: string | null }) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData || {
    companyName: '',
    role: '',
    package: 0,
    deadline: '',
    description: '',
    applicationLink: '',
    location: '',
    companyLogo: '',
    salaryType: 'LPA',
    employmentType: 'Full Time',
    workflowStatus: 'draft'
  });
  
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const formRef = useRef(formData);
  const isInitialMount = useRef(true);

  // Debounced Autosave
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only autosave if it's already created and we are in draft/pending mode (not published)
    if (!placementId || formData.workflowStatus === 'published' || formData.workflowStatus === 'archived') return;

    const timer = setTimeout(async () => {
      // Check if data actually changed to avoid unnecessary requests
      if (JSON.stringify(formRef.current) === JSON.stringify(formData)) return;
      
      try {
        setAutosaveStatus('saving');
        await api.patch(`/placements/${placementId}`, { ...formData, isAutosave: true });
        setAutosaveStatus('saved');
        formRef.current = formData;
      } catch (error) {
        setAutosaveStatus('error');
      }
    }, 10000); // 10 seconds debounce

    return () => clearTimeout(timer);
  }, [formData, placementId]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: name === 'package' ? Number(value) : value }));
  };

  const handleSave = async (publish = false) => {
    try {
      setSaving(true);
      const dataToSave = { ...formData, workflowStatus: publish ? 'published' : formData.workflowStatus };
      
      if (placementId) {
        await api.patch(`/placements/${placementId}`, dataToSave);
      } else {
        await api.post('/placements', dataToSave);
      }
      
      router.push('/admin/placement');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save placement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Main Form Area */}
        <div className={`flex-1 transition-all ${showPreview ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{placementId ? 'Edit Placement' : 'Create Placement'}</h2>
              
              <div className="flex items-center gap-4">
                {placementId && (
                  <div className="text-sm flex items-center text-gray-500">
                    {autosaveStatus === 'saving' && <span className="flex items-center"><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div> Autosaving...</span>}
                    {autosaveStatus === 'saved' && <span className="flex items-center text-green-600"><CheckCircle size={14} className="mr-1" /> Saved</span>}
                    {autosaveStatus === 'error' && <span className="flex items-center text-red-500"><AlertCircle size={14} className="mr-1" /> Save failed</span>}
                  </div>
                )}
                <button 
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center"
                >
                  <Eye size={16} className="mr-2" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <input type="text" name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                  <input type="number" name="package" value={formData.package} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                  <select name="salaryType" value={formData.salaryType} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                    <option value="LPA">LPA</option>
                    <option value="Stipend/Month">Stipend/Month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                    <option value="Full Time">Full Time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                  <input type="date" name="deadline" value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="workflowStatus" value={formData.workflowStatus} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Link (HTTPS preferred)</label>
                  <input type="url" name="applicationLink" value={formData.applicationLink} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={6} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y" required></textarea>
              </div>
              
              <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => router.push('/admin/placement')} className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">Cancel</button>
                <button onClick={() => handleSave(false)} disabled={saving} className="px-6 py-2.5 text-white bg-gray-800 hover:bg-gray-900 rounded-xl font-medium transition-colors flex items-center disabled:opacity-70">
                  <Save size={18} className="mr-2" /> Save Changes
                </button>
                {formData.workflowStatus !== 'published' && (
                  <button onClick={() => handleSave(true)} disabled={saving} className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70">
                    Publish Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Sidebar */}
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 lg:max-w-[400px] xl:max-w-[500px]"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-800 flex items-center"><LayoutTemplate size={16} className="mr-2 text-indigo-600"/> Student Preview</h3>
                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                  <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><Smartphone size={16} /></button>
                  <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><Monitor size={16} /></button>
                </div>
              </div>
              
              <div className="p-6 bg-gray-50 flex justify-center items-start min-h-[500px] overflow-y-auto">
                {/* Simulated Student Card Preview */}
                <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-[320px]' : 'max-w-full'}`}>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                         <span className="font-bold text-gray-400 text-lg">{formData.companyName?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100/50">New</span>
                    </div>
                    
                    <h4 className="text-xl font-bold text-gray-900 mb-1">{formData.role || 'Job Role'}</h4>
                    <p className="text-gray-500 font-medium mb-4">{formData.companyName || 'Company Name'}</p>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-6">
                      <div className="flex items-center"><Monitor size={14} className="mr-2 text-gray-400"/> {formData.employmentType}</div>
                      <div className="flex items-center"><span className="font-medium mr-1 text-gray-900">₹</span> {formData.package > 0 ? `${formData.package} ${formData.salaryType}` : 'Not Disclosed'}</div>
                      <div className="flex items-center"><Clock size={14} className="mr-2 text-gray-400"/> {formData.deadline ? new Date(formData.deadline).toLocaleDateString() : 'No Deadline'}</div>
                    </div>
                    
                    <button className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">Apply Now</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
