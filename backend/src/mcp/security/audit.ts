// MCP Server — Audit logging
//
// Persists one AuditLog row per tool invocation, reusing the existing
// src/models/AuditLog.ts schema. Never records secrets/tokens/passwords — only
// metadata about who did what, when, and whether it succeeded.

import AuditLog from '../../models/AuditLog.js';
import { logger } from '../utils/logger.js';
import type { AuthContext } from '../context.js';

type Action = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'APPROVE' | 'LOGIN' | 'LOGOUT';

/** Derive an AuditLog action enum value from a tool name. */
function actionFor(toolName: string): Action {
  if (toolName === 'auth_login') return 'LOGIN';
  if (/logout/.test(toolName)) return 'LOGOUT';
  if (/(delete|remove|revoke)/i.test(toolName)) return 'DELETE';
  if (/(create|add|record|issue|enroll|generate|upload|import|register)/i.test(toolName)) return 'CREATE';
  if (/(update|edit|set|change|status|adjust|assign|schedule|approve|reject|return|renew|checkout|pay|submit)/i.test(toolName)) return 'UPDATE';
  return 'READ';
}

/** Keys whose values must never be persisted in change_details. */
const SENSITIVE = /password|token|secret|authorization|jwt|apikey|api_key|code_verifier|client_secret/i;

function redactArgs(args: Record<string, any> | undefined): Record<string, any> {
  if (!args || typeof args !== 'object') return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = SENSITIVE.test(k) ? '***redacted***' : v;
  }
  return out;
}

export interface AuditEntry {
  ctx: AuthContext;
  toolName: string;
  args?: Record<string, any>;
  status: 'success' | 'failure';
  errorMessage?: string;
  executionMs: number;
}

/**
 * Write an audit record. Best-effort: a logging failure must never break a tool
 * call, so DB errors are swallowed (and surfaced to stderr only).
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  const { ctx, toolName, args, status, errorMessage, executionMs } = entry;
  try {
    await AuditLog.create({
      userId: ctx.user?._id,
      action: actionFor(toolName),
      resource_type: `mcp:${toolName}`,
      resource_id: String(args?.id || args?._id || args?.uniqueStudentId || 'n/a'),
      change_details: {
        requestId: ctx.requestId,
        correlationId: ctx.requestId,
        toolName,
        source: ctx.source,
        clientId: ctx.clientId,
        authType: ctx.isService ? 'service' : ctx.isApiKey ? 'api_key' : ctx.scopes ? 'oauth' : ctx.user ? 'jwt' : 'anonymous',
        executionMs,
        args: redactArgs(args),
      },
      ip_address: ctx.ip || 'unknown',
      user_agent: ctx.userAgent || 'unknown',
      status,
      error_message: errorMessage,
      timestamp: new Date(),
    });
  } catch (err: any) {
    logger.warn('audit', `failed to persist audit log: ${err.message}`);
  }
}

/** Structured one-line access log to stderr (always emitted, even if DB write fails). */
export function accessLog(entry: AuditEntry): void {
  const { ctx, toolName, status, executionMs, errorMessage } = entry;
  const who = ctx.isService
    ? 'service'
    : ctx.user
      ? `${ctx.role}:${ctx.user._id}`
      : 'anonymous';
  logger.info(
    'tool',
    `${status === 'success' ? '✓' : '✗'} ${toolName} by ${who} ${executionMs}ms` +
      ` req=${ctx.requestId || '-'}${errorMessage ? ` err="${errorMessage}"` : ''}`
  );
}
