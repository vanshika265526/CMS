import mongoose, { Schema, Document } from 'mongoose';

/**
 * A server-to-server API key for trusted integrations. The raw key is shown
 * exactly once at creation; only its sha256 hash is stored. Scopes are an
 * explicit allow-list (not derived from a role).
 */
export interface IApiKey extends Document {
  name: string;
  key_hash: string;
  key_prefix: string; // first chars, for identification in listings
  scopes: string[];
  userId?: mongoose.Types.ObjectId; // optional owner (acts on their behalf)
  collegeId?: mongoose.Types.ObjectId;
  active: boolean;
  last_used_at?: Date;
  expiresAt?: Date | null;
  createdAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    key_hash: { type: String, required: true, unique: true, index: true },
    key_prefix: { type: String, required: true },
    scopes: { type: [String], default: [] },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
    active: { type: Boolean, default: true },
    last_used_at: { type: Date },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
