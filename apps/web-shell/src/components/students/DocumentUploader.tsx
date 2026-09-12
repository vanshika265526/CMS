// FILE: apps/web-shell/src/components/students/DocumentUploader.tsx
"use client";

import React, { useState } from "react";
import { Upload, X, FileText, CheckCircle, Loader2 } from "lucide-react";

interface DocumentUploaderProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
}

export default function DocumentUploader({ onUpload, maxFiles = 5 }: DocumentUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (files: File[]) => {
    const total = [...selectedFiles, ...files].slice(0, maxFiles);
    setSelectedFiles(total);
    onUpload(total);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onUpload(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group ${
          isDragging 
          ? "border-black bg-black/5 shadow-inner" 
          : "border-outline-variant hover:border-black/40 hover:bg-surface-container-low"
        }`}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
        />
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          isDragging ? "bg-black text-white" : "bg-surface-container text-on-surface/20 group-hover:bg-black/10 group-hover:text-black"
        }`}>
          <Upload size={24} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-on-surface">Click to upload or drag and drop</p>
          <p className="text-[11px] font-bold text-on-surface/30 uppercase mt-1">PDF, JPG, PNG (Max {maxFiles} files)</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedFiles.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-surface-container- lowest rounded-xl border border-outline-variant/30 group animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-black/10 text-black rounded-lg">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate pr-4">{file.name}</p>
                  <p className="text-[9px] font-bold text-on-surface/30 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="p-1.5 hover:bg-black/10 text-on-surface/20 hover:text-black rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
