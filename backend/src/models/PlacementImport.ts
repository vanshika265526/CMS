import mongoose, { Schema, Document } from 'mongoose';

export interface IPlacementImport extends Document {
  companyName: string;
  role: string;
  location?: string;
  package?: number;
  deadline?: Date;
  applicationLink?: string;
  description?: string;
  eligibility?: string;
  skills?: string[];
  employmentType?: string;
  driveType?: string;
  
  sourceType: 'ai';
  sourceUrl?: string;
  sourceWebsite?: string;
  scrapedAt: Date;
  screenshotUrl?: string;
  
  aiConfidence: number;
  validationScore: number;
  duplicateScore: number;
  overallQualityScore: number;
  similarityPercentage?: number;
  
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  
  rawContent?: string;
  aiJsonOutput?: string;
  
  duplicatePlacementId?: mongoose.Types.ObjectId;
  fingerprintHash?: string;
  importBatchId?: string;
  
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  collegeId: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const PlacementImportSchema: Schema = new Schema({
  companyName: { type: String, required: true },
  role: { type: String, required: true },
  location: { type: String },
  package: { type: Number },
  deadline: { type: Date },
  applicationLink: { type: String },
  description: { type: String },
  eligibility: { type: String },
  skills: { type: [String], default: [] },
  employmentType: { type: String },
  driveType: { type: String },
  
  sourceType: { type: String, enum: ['ai'], default: 'ai' },
  sourceUrl: { type: String },
  sourceWebsite: { type: String },
  scrapedAt: { type: Date, default: Date.now },
  screenshotUrl: { type: String },
  
  aiConfidence: { type: Number, default: 0 },
  validationScore: { type: Number, default: 0 },
  duplicateScore: { type: Number, default: 0 },
  overallQualityScore: { type: Number, default: 0 },
  similarityPercentage: { type: Number },
  
  reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  
  rawContent: { type: String },
  aiJsonOutput: { type: String },
  
  duplicatePlacementId: { type: Schema.Types.ObjectId, ref: 'Placement' },
  fingerprintHash: { type: String },
  importBatchId: { type: String },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

PlacementImportSchema.index({ reviewStatus: 1, overallQualityScore: -1 });
PlacementImportSchema.index({ fingerprintHash: 1 }, { unique: true, sparse: true });

export default mongoose.model<IPlacementImport>('PlacementImport', PlacementImportSchema);
