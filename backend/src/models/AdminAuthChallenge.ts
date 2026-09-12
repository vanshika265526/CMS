import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAuthChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  failedAttempts: number;
  status: 'pending' | 'verified' | 'failed';
  createdAt: Date;
  verifiedAt?: Date;
  lockedAt?: Date;
}

const AdminAuthChallengeSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true },
  failedAttempts: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  lockedAt: { type: Date }
});

// TTL index for automatic cleanup of expired challenges after they expire
AdminAuthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAdminAuthChallenge>('AdminAuthChallenge', AdminAuthChallengeSchema);
