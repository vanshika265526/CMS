// MCP Server — Express integration
//
// Mounts the Model Context Protocol + its OAuth 2.1 authorization server into
// the existing Express app. Primary transport is Streamable HTTP at POST /mcp;
// deprecated SSE is kept at /mcp/sse for legacy clients.
//
// Security pipeline on every MCP request:
//   httpsOnly → securityHeaders → CORS → resolve auth → (OAuth 401 gate) →
//   tiered rate limit → Streamable HTTP transport → secured tools.
//
// OAuth endpoints:
//   /.well-known/oauth-authorization-server     AS metadata (RFC 8414)
//   /.well-known/oauth-protected-resource       resource metadata (RFC 9728)
//   /oauth/register | /authorize | /token | /revoke

import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createMCPServer } from './server.js';
import { serveDashboard } from './dashboard.js';
import { resolveAuthContext, createAuthMiddleware } from './auth.js';
import { runWithAuth, type AuthContext } from './context.js';
import { logger } from './utils/logger.js';
import { checkRateLimit } from './utils/rateLimit.js';
import { securityHeaders, httpsOnly, mcpCors, tierLimit } from './security/httpSecurity.js';
import { oauthRouter } from './oauth/router.js';
import { authorizationServerMetadata, protectedResourceMetadata, baseUrl } from './oauth/metadata.js';

const mcpJson = express.json({ limit: '4mb' });

/** Are anonymous MCP requests rejected with a 401 OAuth challenge? */
function authMode(): 'oauth' | 'open' {
  const m = process.env.MCP_AUTH_MODE;
  if (m === 'oauth' || m === 'open') return m;
  return process.env.NODE_ENV === 'production' ? 'oauth' : 'open';
}

function isAnonymous(ctx: AuthContext): boolean {
  return !ctx.user && !ctx.isService && !ctx.isApiKey;
}

export function integrateMCPWithExpress(app: express.Express) {
  // ── OAuth discovery metadata (must be at the domain root) ──────────────────
  app.get('/.well-known/oauth-authorization-server', securityHeaders, (req, res) => {
    res.json(authorizationServerMetadata(req));
  });
  app.get('/.well-known/oauth-protected-resource', securityHeaders, (req, res) => {
    res.json(protectedResourceMetadata(req));
  });
  // Some clients probe a resource-suffixed variant.
  app.get('/.well-known/oauth-protected-resource/mcp', securityHeaders, (req, res) => {
    res.json(protectedResourceMetadata(req));
  });

  // ── OAuth 2.1 Authorization Server ─────────────────────────────────────────
  app.use(securityHeaders, httpsOnly, oauthRouter());

  // ─────────────────────────────────────────────────────────────────
  // PRIMARY: Streamable HTTP transport (stateless) at /mcp
  // ─────────────────────────────────────────────────────────────────
  app.options('/mcp', mcpCors);

  app.post('/mcp', httpsOnly, securityHeaders, mcpCors, mcpJson, async (req, res) => {
    let server: McpServer | null = null;
    let transport: StreamableHTTPServerTransport | null = null;
    try {
      const authCtx = await resolveAuthContext(req, 'http');

      // OAuth challenge: reject anonymous callers so clients begin the flow.
      if (authMode() === 'oauth' && isAnonymous(authCtx)) {
        const rm = `${baseUrl(req)}/.well-known/oauth-protected-resource`;
        res.setHeader('WWW-Authenticate', `Bearer realm="cms-mcp", resource_metadata="${rm}"`);
        return res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Authentication required. Authorize via OAuth or present a Bearer token.' },
          id: null,
        });
      }

      // Tiered rate limit (authenticated callers get a higher budget).
      const ipKey = `${authCtx.ip}:${String(req.headers.authorization || req.headers['x-api-key'] || '').slice(0, 16)}`;
      const rl = checkRateLimit(ipKey, tierLimit(!isAnonymous(authCtx)));
      res.setHeader('X-RateLimit-Limit', String(rl.limit));
      res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
      if (!rl.allowed) {
        res.setHeader('Retry-After', String(Math.ceil(rl.resetInMs / 1000)));
        return res.status(429).json({
          jsonrpc: '2.0',
          error: { code: -32029, message: 'Rate limit exceeded. Slow down and retry.' },
          id: null,
        });
      }

      server = createMCPServer();
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        transport?.close();
        server?.close();
      });

      await runWithAuth(authCtx, async () => {
        await server!.connect(transport!);
        await transport!.handleRequest(req, res, req.body);
      });
    } catch (err: any) {
      logger.error('http', `POST /mcp failed: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
      transport?.close();
      server?.close();
    }
  });

  app.get('/mcp', httpsOnly, securityHeaders, mcpCors, (req, res) => {
    const accept = String(req.headers.accept || '');
    if (accept.includes('text/html') && !accept.includes('text/event-stream')) {
      return res.redirect('/mcp/dashboard');
    }
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method Not Allowed: use POST /mcp (stateless Streamable HTTP).' },
      id: null,
    });
  });

  app.delete('/mcp', mcpCors, (_req, res) => res.status(204).end());

  // ── Health ──────────────────────────────────────────────────────────────
  app.get('/mcp/health', securityHeaders, (req, res) => {
    res.json({
      status: 'ok',
      server: 'cms-mcp',
      transport: 'streamable-http',
      endpoint: '/mcp',
      authMode: authMode(),
      authModes: ['oauth2.1-pkce', 'bearer-jwt', 'service-token', 'api-key'],
      oauth: {
        metadata: `${baseUrl(req)}/.well-known/oauth-authorization-server`,
        resource: `${baseUrl(req)}/.well-known/oauth-protected-resource`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // ── Dashboard UI + JSON API ───────────────────────────────────────────────
  app.get('/mcp/dashboard', securityHeaders, serveDashboard);

  app.get('/mcp/api/tools', securityHeaders, async (req, res) => {
    try {
      const authCtx = await resolveAuthContext(req, 'dashboard');
      const server = createMCPServer();
      const handler = (server.server as any)._requestHandlers.get('tools/list');
      const result = await runWithAuth(authCtx, () => handler({ method: 'tools/list' }));
      res.json(result);
    } catch (err: any) {
      logger.error('dashboard', `/mcp/api/tools error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/mcp/api/run', securityHeaders, mcpJson, async (req, res) => {
    try {
      const { toolName, args } = req.body || {};
      if (!toolName) return res.status(400).json({ error: 'toolName is required' });
      const authCtx = await resolveAuthContext(req, 'dashboard');
      const server = createMCPServer();
      const handler = (server.server as any)._requestHandlers.get('tools/call');
      const result = await runWithAuth(authCtx, () =>
        handler({ method: 'tools/call', params: { name: toolName, arguments: args || {} } })
      );
      res.json({ result });
    } catch (err: any) {
      logger.error('dashboard', `/mcp/api/run error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // ── DEPRECATED legacy SSE transport ───────────────────────────────────────
  const sseSessions = new Map<string, { server: McpServer; transport: SSEServerTransport }>();
  const legacyAuth = createAuthMiddleware();

  app.get('/mcp/sse', httpsOnly, legacyAuth, async (req, res) => {
    try {
      const authCtx = await resolveAuthContext(req, 'sse');
      const server = createMCPServer();
      const transport = new SSEServerTransport('/mcp/messages', res);
      sseSessions.set(transport.sessionId, { server, transport });
      res.on('close', () => {
        sseSessions.delete(transport.sessionId);
        server.close();
      });
      await runWithAuth(authCtx, () => server.connect(transport));
      logger.info('sse', `client connected: ${transport.sessionId}`);
    } catch (err: any) {
      logger.error('sse', `connect failed: ${err.message}`);
      if (!res.headersSent) res.status(500).end();
    }
  });

  app.post('/mcp/messages', httpsOnly, legacyAuth, mcpJson, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const session = sseSessions.get(sessionId);
    if (!session) return res.status(400).json({ error: 'Invalid or expired SSE session. Reconnect to /mcp/sse.' });
    const authCtx = await resolveAuthContext(req, 'sse');
    await runWithAuth(authCtx, () => session.transport.handlePostMessage(req, res, req.body));
  });

  logger.info(
    'init',
    `MCP mounted: POST /mcp (Streamable HTTP, authMode=${authMode()}) · OAuth /oauth/* · /mcp/dashboard · /mcp/health · /mcp/sse (legacy)`
  );
}
