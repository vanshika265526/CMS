import mongoose, { Schema, Document } from 'mongoose';

export interface IPlacement extends Document {
  companyName: string;
  role: string;
  package: number; // LPA
  deadline: Date;
  eligibilityGPA: number;
  eligibilityBacklogs: number;
  collegeId: mongoose.Types.ObjectId;
  description: string;
  status: 'open' | 'closed'; // Legacy status
  
  // New CMS & Workflow fields
  workflowStatus: 'draft' | 'pending_review' | 'published' | 'archived' | 'expired';
  sourceType: 'manual' | 'ai';
  reviewStatus: 'approved' | 'pending' | 'rejected';
  sourceUrl?: string;
  sourceWebsite?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  
  // Job Details
  applicationLink?: string;
  location?: string;
  companyLogo?: string;
  driveType?: 'on-campus' | 'off-campus' | 'pool' | string;
  branchesEligible?: string[];
  yearEligible?: string[];
  skillsRequired?: string[];
  salaryType?: string;
  employmentType?: 'Internship' | 'Full Time' | string;
  
  // Deduplication
  fingerprintHash?: string;
  
  // Version key for optimistic concurrency
  version: number;
}

const PlacementSchema: Schema = new Schema({
  companyName: { type: String, required: true },
  role: { type: String, required: true },
  package: { type: Number, required: true },
  deadline: { type: Date, required: true },
  eligibilityGPA: { type: Number, default: 0 },
  eligibilityBacklogs: { type: Number, default: 0 },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  
  workflowStatus: { 
    type: String, 
    enum: ['draft', 'pending_review', 'published', 'archived', 'expired'], 
    default: 'draft' 
  },
  sourceType: { type: String, enum: ['manual', 'ai'], default: 'manual' },
  reviewStatus: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
  sourceUrl: { type: String },
  sourceWebsite: { type: String },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  applicationLink: { type: String },
  location: { type: String },
  companyLogo: { type: String },
  driveType: { type: String },
  branchesEligible: { type: [String], default: [] },
  yearEligible: { type: [String], default: [] },
  skillsRequired: { type: [String], default: [] },
  salaryType: { type: String },
  employmentType: { type: String },
  
  fingerprintHash: { type: String },
}, { 
  timestamps: true,
  optimisticConcurrency: true,
  versionKey: 'version' 
});

// Indexes
PlacementSchema.index(
  { companyName: 'text', role: 'text', skillsRequired: 'text', location: 'text' },
  { name: 'PlacementTextIndex' }
);
PlacementSchema.index({ deadline: 1 });
PlacementSchema.index({ workflowStatus: 1 });
PlacementSchema.index({ createdBy: 1 });
PlacementSchema.index({ fingerprintHash: 1 }, { unique: true, sparse: true });

export default mongoose.model<IPlacement>('Placement', PlacementSchema);
