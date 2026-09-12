// MCP OAuth 2.1 — discovery metadata
//
// Resolves the public base URL with NO hard-coding: env override first, then
// Render's injected RENDER_EXTERNAL_URL, then the forwarded request host. This
// makes discovery correct on both localhost and production automatically.

import type { Request } from 'express';
import { SCOPES } from '../security/permissions.js';

export function baseUrl(req: Request): string {
  const explicit = process.env.OAUTH_ISSUER || process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

/** RFC 8414 — OAuth 2.0 Authorization Server Metadata. */
export function authorizationServerMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    revocation_endpoint: `${base}/oauth/revoke`,
    scopes_supported: [...SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
  };
}

/** RFC 9728 — OAuth 2.0 Protected Resource Metadata (for the MCP resource). */
export function protectedResourceMetadata(req: Request) {
  const base = baseUrl(req);
  return {
    resource: `${base}/mcp`,
    authorization_servers: [base],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/mcp/dashboard`,
  };
}
