// MCP Server — Security wrapper
//
// One choke point at the protocol layer secures ALL tools with no per-tool
// changes. We wrap the SDK's 'tools/call' and 'tools/list' request handlers:
//
//   tools/call →  authorize (RBAC ∩ OAuth scopes)  [BEFORE arg validation]
//             →  reject Mongo-operator injection
//             →  run original handler under a timeout
//             →  audit (success/failure, timing, request id)
//
//   tools/list →  hide tools the caller isn't permitted to use
//
// Authorizing before the SDK validates arguments ensures an unpermitted caller
// gets a clean "Forbidden" rather than a schema-revealing validation error.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAuthContext, requirePermission, effectivePermissions } from '../context.js';
import { requiredPermissions, permitsAll } from './permissions.js';
import { writeAudit, accessLog } from './audit.js';
import { withTimeout } from '../utils/withTimeout.js';
import { error } from '../types.js';
import { logger } from '../utils/logger.js';

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter = (requestCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `mcp_${Date.now().toString(36)}_${requestCounter.toString(36)}`;
}

/**
 * Reject Mongo operator injection: any object key beginning with '$' is refused.
 * Dotted keys (e.g. "personalInfo.phone") are allowed — legitimate update paths.
 */
function assertNoInjection(value: any, path = 'arguments'): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoInjection(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$')) {
        throw new Error(`Rejected potentially malicious argument key "${k}" at ${path}`);
      }
      assertNoInjection(v, `${path}.${k}`);
    }
  }
}

/** Wrap tools/call and tools/list with authorization, sanitization, audit. */
export function secureServer(server: McpServer): void {
  const handlers = (server.server as any)._requestHandlers as Map<string, any>;

  // ── tools/call ──────────────────────────────────────────────────────────
  const originalCall = handlers.get('tools/call');
  if (originalCall) {
    handlers.set('tools/call', async (request: any, extra: any) => {
      const ctx = getAuthContext();
      if (!ctx.requestId) ctx.requestId = nextRequestId();
      const toolName: string = request?.params?.name || 'unknown';
      const args = request?.params?.arguments || {};
      const start = Date.now();
      const required = requiredPermissions(toolName);

      try {
        // 1) Authorization — before the SDK validates arguments.
        if (required.length > 0) requirePermission(...required);
        // 2) Input safety.
        assertNoInjection(args);
        // 3) Execute the real (validated) handler under a timeout.
        const result = await withTimeout(originalCall(request, extra), toolName);

        const executionMs = Date.now() - start;
        const entry = { ctx, toolName, args, status: 'success' as const, executionMs };
        accessLog(entry);
        void writeAudit(entry);
        return result;
      } catch (err: any) {
        const executionMs = Date.now() - start;
        const message = err?.message || 'Tool execution failed';
        const entry = { ctx, toolName, args, status: 'failure' as const, errorMessage: message, executionMs };
        accessLog(entry);
        void writeAudit(entry);
        // Standardized tool error — never leak stack traces / internals.
        return error(message);
      }
    });
  } else {
    logger.warn('security', 'tools/call handler not found; authorization NOT applied');
  }

  // ── tools/list ──────────────────────────────────────────────────────────
  const originalList = handlers.get('tools/list');
  if (originalList) {
    handlers.set('tools/list', async (request: any, extra: any) => {
      const result = await originalList(request, extra);
      const held = effectivePermissions(getAuthContext());
      if (Array.isArray(result?.tools)) {
        result.tools = result.tools.filter((t: any) => {
          const required = requiredPermissions(t.name);
          if (required.length === 0) return true; // public tools always visible
          return permitsAll(held, required);
        });
      }
      return result;
    });
  }
}
