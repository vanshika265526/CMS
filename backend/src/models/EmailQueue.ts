import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailQueue extends Document {
  placementId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  recipientEmail: string;
  recipientName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  runAt: Date;
  startedAt?: Date;
  lastAttemptAt?: Date;
  processedAt?: Date;
  lastError?: string;
  providerMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailQueueSchema: Schema = new Schema({
  placementId: { type: Schema.Types.ObjectId, ref: 'Placement', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  recipientEmail: { type: String, required: true },
  recipientName: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending',
    required: true
  },
  attempts: { type: Number, default: 0, required: true },
  runAt: { type: Date, default: Date.now, required: true },
  startedAt: { type: Date },
  lastAttemptAt: { type: Date },
  processedAt: { type: Date },
  lastError: { type: String },
  providerMessageId: { type: String }
}, { 
  timestamps: true 
});

// Unique index to prevent duplicate emails for a placement/student pair
EmailQueueSchema.index({ placementId: 1, studentId: 1 }, { unique: true });

// Index for efficient worker queries
EmailQueueSchema.index({ status: 1, runAt: 1 });

export default mongoose.model<IEmailQueue>('EmailQueue', EmailQueueSchema);
