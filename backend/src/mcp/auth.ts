// MCP Server — Authentication resolution
//
// Resolves an incoming request to an AuthContext, supporting four credential
// kinds (in priority order):
//   1. MCP_SECRET service token   → full-trust machine access
//   2. API key (cms_ak_…)         → explicit scope grant, optional owner
//   3. OAuth 2.1 access token      → JWT with scopes + client_id (revocable)
//   4. Legacy login JWT            → verified + active-Session checked (REST rules)
//
// Resolution is best-effort and never throws: discovery must work for
// unauthenticated clients. Tools enforce auth via requireAuth()/requirePermission().

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import ApiKey from '../models/ApiKey.js';
import type { AuthContext } from './context.js';
import { logger } from './utils/logger.js';
import { sha256, isAccessRevoked } from './oauth/store.js';

const ADMIN_ROLES = new Set(['COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN']);

/**
 * Extract a credential from a request. Preference order (most → least secure):
 *   1. Authorization: Bearer <token>   (header — preferred)
 *   2. x-api-key: <key>                (header)
 *   3. ?apiKey= / ?api_key= / ?key=    (query string — convenient single-link
 *      UX for clients that only accept a URL, but the value can leak into access
 *      logs/history, so use a scoped API key here, not the master MCP_SECRET).
 */
export function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();

  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) return apiKeyHeader.trim();

  const q = req.query || {};
  const queryKey = q.apiKey ?? q.api_key ?? q.key;
  if (typeof queryKey === 'string' && queryKey.trim()) return queryKey.trim();

  return undefined;
}

function requestMeta(req: Request) {
  return {
    ip: req.ip || req.socket?.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    requestId:
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      undefined,
  };
}

/**
 * Resolve the caller of an MCP request to an AuthContext.
 */
export async function resolveAuthContext(req: Request, source: string): Promise<AuthContext> {
  const meta = requestMeta(req);
  const anonymous: AuthContext = { user: null, role: '', isService: false, source, ...meta };

  const token = extractToken(req);
  if (!token) return anonymous;

  // 1) Shared service token.
  const serviceSecret = process.env.MCP_SECRET;
  if (serviceSecret && token === serviceSecret) {
    return { user: null, role: 'SERVICE', isService: true, token, source, ...meta };
  }

  // 2) API key.
  if (token.startsWith('cms_ak_')) {
    try {
      const key: any = await ApiKey.findOne({ key_hash: sha256(token), active: true });
      if (!key) return anonymous;
      if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return anonymous;
      ApiKey.updateOne({ _id: key._id }, { $set: { last_used_at: new Date() } }).catch(() => {});
      const user = key.userId ? await User.findById(key.userId).select('-password').lean() : null;
      return {
        user,
        role: String((user as any)?.role || 'SERVICE').toUpperCase(),
        isService: false,
        isApiKey: true,
        scopes: key.scopes || [],
        source,
        ...meta,
      };
    } catch (err: any) {
      logger.warn('auth', `API key lookup failed: ${err.message}`);
      return anonymous;
    }
  }

  // 3 & 4) JWT — either an OAuth access token or a legacy login token.
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // 3) OAuth 2.1 access token.
    if (decoded?.type === 'mcp_access') {
      if (decoded.jti && (await isAccessRevoked(decoded.jti))) {
        logger.warn('auth', 'OAuth access token has been revoked');
        return anonymous;
      }
      const user = await User.findById(decoded.id).select('-password').lean();
      if (!user) return anonymous;
      return {
        user,
        role: String((user as any).role || '').toUpperCase(),
        isService: false,
        scopes: String(decoded.scope || '').split(/\s+/).filter(Boolean),
        clientId: decoded.client_id,
        token,
        source,
        ...meta,
      };
    }

    // 4) Legacy login JWT — mirror src/middleware/auth.ts (active Session required).
    const normalizedRole = String(decoded.role || '').toUpperCase();
    const isPersistentAdminSession = ADMIN_ROLES.has(normalizedRole);
    const sessionQuery: any = { jwt_token: token, is_active: true };
    if (!isPersistentAdminSession) sessionQuery.expires_at = { $gt: new Date() };

    const activeSession = await Session.findOne(sessionQuery);
    if (!activeSession) {
      logger.warn('auth', 'JWT valid but no active session — treating as anonymous');
      return anonymous;
    }
    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user) return anonymous;

    Session.updateOne({ _id: activeSession._id }, { $set: { last_activity: new Date() } }).catch(() => {});
    return {
      user,
      role: String((user as any).role || '').toUpperCase(),
      isService: false,
      token,
      source,
      ...meta,
    };
  } catch (err: any) {
    logger.warn('auth', `Token verification failed: ${err.message}`);
    return anonymous;
  }
}

/**
 * Legacy Express middleware that hard-gates the deprecated SSE endpoints with
 * the shared MCP_SECRET (or any valid JWT). If MCP_SECRET is unset, allows all.
 */
export function createAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.MCP_SECRET;
    if (!expected) return next();
    const token = extractToken(req);
    if (token === expected) return next();
    if (token) {
      try {
        jwt.verify(token, process.env.JWT_SECRET || 'secret');
        return next();
      } catch { /* fall through */ }
    }
    return res.status(401).json({ error: 'Unauthorized: invalid or missing credentials' });
  };
}
