import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustedSource extends Document {
  name: string;
  url: string;
  enabled: boolean;
  priority: number;
  scrapeFrequency: number; // in hours
  lastScrapedAt?: Date;
  isActive: boolean;
  collegeId: mongoose.Types.ObjectId;
  lastScrapeStatus?: 'success' | 'failed';
  lastScrapeError?: string;
  recentFailures?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrustedSourceSchema: Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 1 }, // Higher number = higher priority
  scrapeFrequency: { type: Number, default: 24 },
  lastScrapedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
  lastScrapeStatus: { type: String, enum: ['success', 'failed'] },
  lastScrapeError: { type: String },
  recentFailures: { type: Number, default: 0 },
}, { timestamps: true });

TrustedSourceSchema.index({ enabled: 1, lastScrapedAt: 1 });

export default mongoose.model<ITrustedSource>('TrustedSource', TrustedSourceSchema);
