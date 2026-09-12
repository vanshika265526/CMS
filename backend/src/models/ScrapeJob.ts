import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapeJob extends Document {
  url: string;
  sourceId?: mongoose.Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScrapeJobSchema: Schema = new Schema({
  url: { type: String, required: true },
  sourceId: { type: Schema.Types.ObjectId, ref: 'TrustedSource' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  lastError: { type: String },
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

ScrapeJobSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model<IScrapeJob>('ScrapeJob', ScrapeJobSchema);
