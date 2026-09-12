// MCP Server — HTTP security middleware (Helmet-equivalent, no dependency)
//
// Provides: security headers (CSP/HSTS/frameguard/nosniff/referrer-policy),
// HTTPS enforcement in production, and configurable CORS. Hand-rolled so the
// deployment needs zero extra npm packages.

import type { Request, Response, NextFunction } from 'express';

const isProd = () => process.env.NODE_ENV === 'production';

// CSP tuned for the bundled HTML (dashboard + OAuth consent): self + inline
// styles/scripts + Google Fonts. JSON endpoints are unaffected by these
// directives in practice.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // 'self' + https: so the OAuth consent form can post here AND be redirected
  // to the client's external https callback (e.g. Claude). http:/data: targets
  // stay blocked. The only HTML form we serve is the OAuth consent page.
  "form-action 'self' https:",
].join('; ');

/** Helmet-equivalent security headers. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0'); // legacy header off; CSP is the real defense
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP);
  if (isProd()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

/** Reject (or redirect) insecure HTTP in production. */
export function httpsOnly(req: Request, res: Response, next: NextFunction) {
  if (!isProd()) return next();
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || (req.secure ? 'https' : 'http');
  if (proto === 'https' || req.secure) return next();
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
  }
  return res.status(403).json({ error: 'https_required', message: 'HTTPS is required in production.' });
}

function allowedOrigins(): string[] {
  const raw = process.env.MCP_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * CORS for MCP/OAuth routes.
 *  - Requests with no Origin (native/desktop clients) are always allowed.
 *  - If MCP_ALLOWED_ORIGINS is set, only those browser origins are allowed.
 *  - If unset, the origin is reflected (dev-friendly). Configure the allow-list
 *    in production to "reject unknown origins".
 */
export function mcpCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const allow = allowedOrigins();

  let permit = true;
  if (origin) {
    if (allow.length === 0) {
      res.setHeader('Access-Control-Allow-Origin', origin); // permissive default
    } else if (allow.includes('*') || allow.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      permit = false; // unknown origin → no ACAO header (browser will block)
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, mcp-session-id, mcp-protocol-version, last-event-id, x-request-id'
  );
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version, x-request-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(permit ? 204 : 403);
  }
  next();
}

/** Tiered rate limit ceiling: authenticated callers get a higher budget. */
export function tierLimit(authenticated: boolean): number {
  return authenticated
    ? Number(process.env.MCP_RATE_LIMIT_AUTH || 200)
    : Number(process.env.MCP_RATE_LIMIT_ANON || 20);
}
