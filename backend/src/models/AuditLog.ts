import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'APPROVE' | 'LOGIN' | 'LOGOUT' | 'PLACEMENT_CREATED' | 'PLACEMENT_UPDATED' | 'PLACEMENT_PUBLISHED' | 'PLACEMENT_ARCHIVED' | 'PLACEMENT_DELETED' | 'PLACEMENT_RESTORED' | 'DRAFT_SAVED' | 'VIEWED' | 'PREVIEWED' | string;
  resource_type: string;
  resource_id: string;
  change_details?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure';
  error_message?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  action: { 
    type: String, 
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH', 'APPROVE', 'LOGIN', 'LOGOUT', 'PLACEMENT_CREATED', 'PLACEMENT_UPDATED', 'PLACEMENT_PUBLISHED', 'PLACEMENT_ARCHIVED', 'PLACEMENT_DELETED', 'PLACEMENT_RESTORED', 'DRAFT_SAVED', 'VIEWED', 'PREVIEWED', 'AI_IMPORT_APPROVED', 'AI_IMPORT_REJECTED'],
    required: true 
  },
  resource_type: { type: String, required: true },
  resource_id: { type: String, required: true },
  change_details: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  error_message: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource_type: 1, resource_id: 1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
