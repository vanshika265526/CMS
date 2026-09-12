// MCP Server — Per-request authentication context
//
// Streamable HTTP creates a fresh server+transport per request. We use
// AsyncLocalStorage to make the authenticated caller available to every tool
// handler WITHOUT changing each tool's signature. The HTTP layer resolves the
// caller (JWT user or service token) and runs the request inside this store.

import { AsyncLocalStorage } from 'node:async_hooks';
import { permissionsForRole, permitsAll, ALL } from './security/permissions.js';

export interface AuthContext {
  /** The authenticated Mongoose User document (lean), or null for anonymous/service. */
  user: any | null;
  /** Normalized uppercase role, e.g. "COLLEGE_ADMIN". Empty string when unknown. */
  role: string;
  /** True when authenticated via the shared MCP_SECRET service token (full trust, no user). */
  isService: boolean;
  /** True when authenticated via an API key. */
  isApiKey?: boolean;
  /** OAuth scopes granted to this token (undefined for raw login JWTs / service). */
  scopes?: string[];
  /** OAuth client_id that obtained the token, if any. */
  clientId?: string;
  /** The raw bearer token that was presented (if any). Never logged. */
  token?: string;
  /** Transport that delivered the request: 'http' | 'sse' | 'stdio' | 'dashboard'. */
  source: string;
  /** Client IP (best-effort, via trust proxy). */
  ip?: string;
  /** Client user-agent. */
  userAgent?: string;
  /** Correlation id for this request, propagated to audit logs. */
  requestId?: string;
}

const store = new AsyncLocalStorage<AuthContext>();

const ANONYMOUS: AuthContext = { user: null, role: '', isService: false, source: 'unknown' };

// Fallback context used when no AsyncLocalStorage scope is active. The stdio
// transport drives tool calls from stdin events that fire OUTSIDE any run()
// scope, so it sets this once to a full-trust service context.
let defaultContext: AuthContext = ANONYMOUS;

/** Set the fallback context for callers running outside an explicit run() scope. */
export function setDefaultAuthContext(ctx: AuthContext): void {
  defaultContext = ctx;
}

/** Run `fn` with the given auth context bound for the duration of the async call. */
export function runWithAuth<T>(ctx: AuthContext, fn: () => T): T {
  return store.run(ctx, fn);
}

/** Get the current auth context, falling back to the default (anonymous unless set). */
export function getAuthContext(): AuthContext {
  return store.getStore() || defaultContext;
}

/** The current user document, or null. */
export function getCurrentUser(): any | null {
  return getAuthContext().user;
}

/**
 * Require an authenticated user (JWT) or service token. Throws if anonymous.
 * Tool handlers should call this at the top of protected operations.
 */
export function requireAuth(): AuthContext {
  const ctx = getAuthContext();
  if (!ctx.user && !ctx.isService) {
    throw new Error(
      'Authentication required. Provide a valid Bearer JWT (from auth_login) or the MCP service token.'
    );
  }
  return ctx;
}

/**
 * Require one of the given roles. Service token bypasses role checks (full trust).
 * Throws a descriptive error otherwise.
 */
export function requireRole(...roles: string[]): AuthContext {
  const ctx = requireAuth();
  if (ctx.isService) return ctx;
  const allowed = roles.map((r) => r.trim().toUpperCase());
  if (!allowed.includes(ctx.role)) {
    throw new Error(
      `Forbidden: role "${ctx.role || 'NONE'}" is not permitted. Required: ${allowed.join(', ')}`
    );
  }
  return ctx;
}

/**
 * Effective permission set for the current caller:
 *   service / wildcard role  → ['*']
 *   API key                  → the key's scopes
 *   OAuth token              → role permissions ∩ granted scopes
 *   login JWT (no scopes)    → full role permissions
 */
export function effectivePermissions(ctx: AuthContext = getAuthContext()): Set<string> {
  if (ctx.isService) return new Set([ALL]);
  const rolePerms = permissionsForRole(ctx.role);
  const roleSet = new Set(rolePerms);

  // API keys carry an explicit scope list and are not narrowed by a role.
  if (ctx.isApiKey) return new Set(ctx.scopes || []);

  // OAuth tokens: intersect the role's power with what the user consented to.
  if (Array.isArray(ctx.scopes)) {
    if (roleSet.has(ALL)) return new Set(ctx.scopes);
    return new Set(ctx.scopes.filter((s) => roleSet.has(s)));
  }
  return roleSet;
}

/** Does the current caller hold ALL of the given permissions? */
export function hasPermission(...required: string[]): boolean {
  return permitsAll(effectivePermissions(), required);
}

/**
 * Require specific permissions. Throws a 403-style error if the caller lacks any.
 * Used by the secure-server wrapper before every tool executes.
 */
export function requirePermission(...required: string[]): AuthContext {
  const ctx = requireAuth();
  if (!permitsAll(effectivePermissions(ctx), required)) {
    throw new Error(
      `Forbidden: missing required permission(s): ${required.join(', ')}. ` +
        `Your grant: ${[...effectivePermissions(ctx)].join(', ') || 'none'}`
    );
  }
  return ctx;
}

/** Scope a Mongoose filter to the caller's college when they are not a super-admin/service. */
export function scopeToCollege(filter: Record<string, any> = {}): Record<string, any> {
  const ctx = getAuthContext();
  if (ctx.isService) return filter;
  if (ctx.role === 'SUPER_ADMIN') return filter;
  const collegeId = ctx.user?.collegeId;
  if (collegeId && filter.collegeId === undefined) {
    return { ...filter, collegeId };
  }
  return filter;
}
