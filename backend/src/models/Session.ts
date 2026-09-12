import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  jwt_token: string;
  refresh_token?: string;
  ip_address: string;
  user_agent: string;
  device_info?: string;
  login_timestamp: Date;
  last_activity: Date;
  expires_at?: Date | null;
  is_active: boolean;
}

const SessionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jwt_token: { type: String, required: true },
  refresh_token: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
  device_info: { type: String },
  login_timestamp: { type: Date, default: Date.now },
  last_activity: { type: Date, default: Date.now },
  expires_at: { type: Date, default: null },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

SessionSchema.index({ userId: 1, is_active: 1 });
SessionSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expires_at: { $type: 'date' } } }
);

export default mongoose.model<ISession>('Session', SessionSchema);
