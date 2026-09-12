import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tracks OAuth tokens for rotation & revocation. Two kinds:
 *   - kind 'refresh': a stored, hashed, rotatable refresh token.
 *   - kind 'access_revoked': a tombstone for a revoked access-token jti
 *     (access tokens are otherwise stateless JWTs; this enables revocation
 *     before their natural expiry).
 * Both auto-expire via the TTL index on expiresAt.
 */
export interface IOAuthToken extends Document {
  kind: 'refresh' | 'access_revoked';
  token_hash: string; // sha256 of the refresh token, or of the access jti
  client_id: string;
  userId: mongoose.Types.ObjectId;
  scope: string;
  revoked: boolean;
  rotated_to?: string; // token_hash of the successor (refresh rotation chain)
  expiresAt: Date;
  createdAt: Date;
}

const OAuthTokenSchema: Schema = new Schema(
  {
    kind: { type: String, enum: ['refresh', 'access_revoked'], required: true },
    token_hash: { type: String, required: true, index: true },
    client_id: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    scope: { type: String, default: '' },
    revoked: { type: Boolean, default: false },
    rotated_to: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOAuthToken>('OAuthToken', OAuthTokenSchema);
