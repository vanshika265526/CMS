import mongoose, { Schema, Document } from 'mongoose';

/**
 * A short-lived OAuth authorization code (RFC 6749 §4.1) bound to a PKCE
 * challenge (RFC 7636). Stored hashed; single-use; auto-expires via TTL index.
 */
export interface IOAuthAuthCode extends Document {
  code_hash: string;
  client_id: string;
  userId: mongoose.Types.ObjectId;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  used: boolean;
  expiresAt: Date;
}

const OAuthAuthCodeSchema: Schema = new Schema({
  code_hash: { type: String, required: true, unique: true, index: true },
  client_id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  redirect_uri: { type: String, required: true },
  scope: { type: String, default: '' },
  code_challenge: { type: String, required: true },
  code_challenge_method: { type: String, enum: ['S256'], default: 'S256' },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
});

// TTL: Mongo removes the document once expiresAt passes.
OAuthAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOAuthAuthCode>('OAuthAuthCode', OAuthAuthCodeSchema);
