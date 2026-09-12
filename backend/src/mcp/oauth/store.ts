// MCP OAuth 2.1 — token & code store
//
// Access tokens are stateless JWTs (signed with JWT_SECRET, carrying scopes +
// client_id + a jti). Refresh tokens are opaque, stored hashed, rotated on use,
// and revocable. Authorization codes are opaque, stored hashed, single-use, and
// PKCE-bound (S256). All high-entropy secrets are stored as sha256 hashes.

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import OAuthAuthCode from '../../models/OAuthAuthCode.js';
import OAuthToken from '../../models/OAuthToken.js';

const ACCESS_TTL = process.env.OAUTH_ACCESS_TTL || '1h';
const REFRESH_TTL_MS = Number(process.env.OAUTH_REFRESH_TTL_DAYS || 30) * 86_400_000;
const CODE_TTL_MS = 60_000;

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Verify a PKCE code_verifier against a stored S256 challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = createHash('sha256').update(verifier).digest('base64url');
  return timingSafeEqualStr(computed, challenge);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Authorization codes ───────────────────────────────────────────────────────

export interface IssueCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
}

export async function createAuthCode(input: IssueCodeInput): Promise<string> {
  const code = randomToken(32);
  await OAuthAuthCode.create({
    code_hash: sha256(code),
    client_id: input.clientId,
    userId: input.userId,
    redirect_uri: input.redirectUri,
    scope: input.scope,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
    used: false,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

export interface ConsumedCode {
  userId: string;
  clientId: string;
  scope: string;
  redirectUri: string;
}

/**
 * Atomically consume an authorization code: validates client, redirect_uri,
 * expiry, single-use, and the PKCE verifier. Throws on any mismatch.
 */
export async function consumeAuthCode(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string
): Promise<ConsumedCode> {
  // findOneAndUpdate with used:false guard → single-use even under races.
  const doc = await OAuthAuthCode.findOneAndUpdate(
    { code_hash: sha256(code), used: false },
    { $set: { used: true } },
    { new: true }
  );
  if (!doc) throw new Error('invalid_grant: authorization code is invalid or already used');
  if (doc.expiresAt.getTime() < Date.now()) throw new Error('invalid_grant: authorization code expired');
  if (doc.client_id !== clientId) throw new Error('invalid_grant: client mismatch');
  if (doc.redirect_uri !== redirectUri) throw new Error('invalid_grant: redirect_uri mismatch');
  if (!codeVerifier || !verifyPkceS256(codeVerifier, doc.code_challenge)) {
    throw new Error('invalid_grant: PKCE verification failed');
  }
  return {
    userId: String(doc.userId),
    clientId: doc.client_id,
    scope: doc.scope,
    redirectUri: doc.redirect_uri,
  };
}

// ── Access tokens (stateless JWT) ─────────────────────────────────────────────

export interface AccessTokenClaims {
  id: string;
  role: string;
  scope: string;
  client_id: string;
  type: 'mcp_access';
  jti: string;
}

export function issueAccessToken(userId: string, role: string, scope: string, clientId: string): {
  token: string;
  expiresIn: number;
} {
  const jti = randomToken(12);
  const token = jwt.sign(
    { id: userId, role, scope, client_id: clientId, type: 'mcp_access', jti } as AccessTokenClaims,
    process.env.JWT_SECRET || 'secret',
    { expiresIn: ACCESS_TTL as any }
  );
  const decoded: any = jwt.decode(token);
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
  return { token, expiresIn };
}

/** Mark an access token's jti as revoked until its natural expiry. */
export async function revokeAccessJti(jti: string, expSeconds: number): Promise<void> {
  await OAuthToken.create({
    kind: 'access_revoked',
    token_hash: sha256(jti),
    expiresAt: new Date(expSeconds * 1000),
    revoked: true,
  });
}

export async function isAccessRevoked(jti: string): Promise<boolean> {
  const found = await OAuthToken.findOne({ kind: 'access_revoked', token_hash: sha256(jti) }).lean();
  return !!found;
}

// ── Refresh tokens (stored, rotated, revocable) ───────────────────────────────

export async function issueRefreshToken(userId: string, clientId: string, scope: string): Promise<string> {
  const token = randomToken(32);
  await OAuthToken.create({
    kind: 'refresh',
    token_hash: sha256(token),
    client_id: clientId,
    userId,
    scope,
    revoked: false,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

export interface RefreshResult {
  userId: string;
  clientId: string;
  scope: string;
}

/**
 * Validate a refresh token and ROTATE it (revoke the old, issue a successor).
 * Returns the grant context plus the new refresh token. Detects reuse of an
 * already-rotated token (a theft signal) and rejects it.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  clientId: string
): Promise<{ ctx: RefreshResult; newRefreshToken: string }> {
  const hash = sha256(refreshToken);
  const doc = await OAuthToken.findOne({ kind: 'refresh', token_hash: hash });
  if (!doc) throw new Error('invalid_grant: unknown refresh token');
  if (doc.revoked) throw new Error('invalid_grant: refresh token has been revoked or already used');
  if (doc.client_id !== clientId) throw new Error('invalid_grant: client mismatch');
  if (doc.expiresAt.getTime() < Date.now()) throw new Error('invalid_grant: refresh token expired');

  const newToken = randomToken(32);
  const newHash = sha256(newToken);
  await OAuthToken.create({
    kind: 'refresh',
    token_hash: newHash,
    client_id: doc.client_id,
    userId: doc.userId,
    scope: doc.scope,
    revoked: false,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  doc.revoked = true;
  doc.rotated_to = newHash;
  await doc.save();

  return {
    ctx: { userId: String(doc.userId), clientId: doc.client_id, scope: doc.scope },
    newRefreshToken: newToken,
  };
}

/** Revoke a refresh token (or no-op if it's an access token / unknown). */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await OAuthToken.updateMany(
    { kind: 'refresh', token_hash: sha256(refreshToken) },
    { $set: { revoked: true } }
  );
}

/** Revoke ALL refresh tokens for a user (logout from all devices). */
export async function revokeAllForUser(userId: string): Promise<number> {
  const res = await OAuthToken.updateMany(
    { kind: 'refresh', userId, revoked: false },
    { $set: { revoked: true } }
  );
  return res.modifiedCount || 0;
}
