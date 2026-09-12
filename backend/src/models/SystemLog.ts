import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemLog extends Document {
  category: 'SCRAPER_LOG' | 'AI_LOG' | 'IMPORT_LOG';
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const SystemLogSchema: Schema = new Schema({
  category: { type: String, enum: ['SCRAPER_LOG', 'AI_LOG', 'IMPORT_LOG'], required: true },
  level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

SystemLogSchema.index({ category: 1, timestamp: -1 });

export default mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
