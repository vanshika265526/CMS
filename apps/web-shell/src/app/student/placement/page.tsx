"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, MapPin, Briefcase, IndianRupee, Clock, Building, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentPlacementPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  
  const fetchPlacements = async () => {
    try {
      setLoading(true);
      // Student endpoint handles returning ONLY published, non-deleted placements.
      const res = await api.get('/placements', {
        params: { search, location }
      });
      setPlacements(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (link: string) => {
    if (!link) {
      alert("No application link provided for this placement.");
      return;
    }
    const url = link.startsWith('http://') || link.startsWith('https://') 
      ? link 
      : `https://${link}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPlacements();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, location]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      
      {/* Hero Header */}
      <div className="bg-indigo-600 px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Discover Your Next Big Opportunity</h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-8">Browse curated placement drives and internships from top companies.</p>
          
          <div className="flex flex-col md:flex-row gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={20} />
              <input 
                type="text" 
                placeholder="Job title, skills, or company" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 text-white placeholder:text-white/60 border border-transparent focus:border-white/30 rounded-xl outline-none transition-all focus:bg-white/20"
              />
            </div>
            <div className="relative md:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={20} />
              <input 
                type="text" 
                placeholder="Location (e.g. Pune)" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 text-white placeholder:text-white/60 border border-transparent focus:border-white/30 rounded-xl outline-none transition-all focus:bg-white/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 -mt-8 relative z-20">
        {loading ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-2xl shadow-sm">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : placements.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No opportunities found</h3>
            <p className="text-gray-500">We couldn't find any published placements matching your criteria.</p>
            <button onClick={() => { setSearch(''); setLocation(''); }} className="mt-6 px-6 py-2.5 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors">Clear Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {placements.map((p: any, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={p._id} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        {p.companyLogo ? (
                          <img src={p.companyLogo} alt={p.companyName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-gray-400 text-2xl">{p.companyName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {p.employmentType === 'Internship' ? (
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 tracking-wide uppercase">Internship</span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 tracking-wide uppercase">Full Time</span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{p.role}</h3>
                    <p className="text-gray-500 font-medium mb-6 flex items-center"><Building size={16} className="mr-1.5"/> {p.companyName}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700 bg-gray-50/50 p-2.5 rounded-xl">
                        <IndianRupee size={18} className="mr-3 text-indigo-500 bg-indigo-100 p-1 rounded-md" /> 
                        <span className="font-semibold text-gray-900 mr-1">{p.package > 0 ? p.package : 'Not Disclosed'}</span> {p.package > 0 && <span className="text-sm text-gray-500">{p.salaryType || 'LPA'}</span>}
                      </div>
                      
                      {p.location && (
                        <div className="flex items-center text-gray-700 bg-gray-50/50 p-2.5 rounded-xl">
                          <MapPin size={18} className="mr-3 text-blue-500 bg-blue-100 p-1 rounded-md" />
                          <span className="text-sm font-medium">{p.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-gray-700 bg-gray-50/50 p-2.5 rounded-xl">
                        <Briefcase size={18} className="mr-3 text-orange-500 bg-orange-100 p-1 rounded-md" />
                        <span className="text-sm font-medium">{p.driveType || 'On-Campus'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex items-center text-xs font-medium text-red-500">
                      <Clock size={14} className="mr-1.5"/>
                      Ends: {new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button 
                      onClick={() => handleApply(p.applicationLink || p.sourceUrl)}
                      className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Apply Now <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
