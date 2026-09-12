import mongoose, { Schema, Document } from 'mongoose';

/**
 * An OAuth 2.1 client (an AI assistant / connector). Created via Dynamic Client
 * Registration (RFC 7591) or seeded manually. Public clients (PKCE, no secret)
 * are the norm for MCP; confidential clients store a hashed secret.
 */
export interface IOAuthClient extends Document {
  client_id: string;
  client_secret_hash?: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method: 'none' | 'client_secret_basic' | 'client_secret_post';
  createdAt: Date;
}

const OAuthClientSchema: Schema = new Schema(
  {
    client_id: { type: String, required: true, unique: true, index: true },
    client_secret_hash: { type: String },
    client_name: { type: String, default: 'MCP Client' },
    redirect_uris: { type: [String], default: [] },
    grant_types: { type: [String], default: ['authorization_code', 'refresh_token'] },
    response_types: { type: [String], default: ['code'] },
    scope: { type: String, default: '' },
    token_endpoint_auth_method: {
      type: String,
      enum: ['none', 'client_secret_basic', 'client_secret_post'],
      default: 'none',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IOAuthClient>('OAuthClient', OAuthClientSchema);
