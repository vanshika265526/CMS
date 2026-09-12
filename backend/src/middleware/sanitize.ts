import { Request, Response, NextFunction } from 'express';

/**
 * Global input sanitization to prevent script / HTML (XSS) injection.
 *
 * Runs on every request and recursively cleans strings in req.body, req.query
 * and req.params before they reach any controller. This is the security boundary:
 * even if the frontend is bypassed, no executable markup can be stored or echoed.
 *
 * Credential fields are intentionally left untouched so passwords/tokens that
 * legitimately contain special characters are never altered.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'oldpassword',
  'token',
  'jwt_token',
  'otp',
]);

const sanitizeString = (value: string): string =>
  value
    // 1. Drop executable / dangerous tag blocks together with their content.
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ''
    )
    // 2. Drop any orphan / self-closing dangerous tags.
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)[^>]*\/?\s*>/gi, '')
    // 3. Strip inline event handlers, e.g. onerror= / onclick= / onload=.
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // 4. Neutralize dangerous URI schemes.
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    // 5. Encode any remaining angle brackets so no tag can ever be reconstructed.
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const sanitizeValue = (value: any, key?: string): any => {
  if (typeof value === 'string') {
    if (key && SENSITIVE_KEYS.has(key.toLowerCase())) return value;
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  if (value && typeof value === 'object') {
    // Mutate in place so getter-backed objects (req.query/req.params) are cleaned too.
    for (const k of Object.keys(value)) {
      value[k] = sanitizeValue(value[k], k);
    }
    return value;
  }
  return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
    if (req.query && typeof req.query === 'object') sanitizeValue(req.query);
    if (req.params && typeof req.params === 'object') sanitizeValue(req.params);
  } catch {
    // Never block a request because sanitization threw; fall through.
  }
  next();
};

export default sanitizeInput;
