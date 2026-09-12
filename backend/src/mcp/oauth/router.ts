// MCP OAuth 2.1 — Authorization Server router
//
// Implements: Dynamic Client Registration (RFC 7591), Authorization Code grant
// with PKCE (RFC 7636), refresh-token grant with rotation, and token revocation
// (RFC 7009). Built on the existing User model + JWT_SECRET — no separate IdP.

import express from 'express';
import User from '../../models/User.js';
import OAuthClient from '../../models/OAuthClient.js';
import { SCOPES } from '../security/permissions.js';
import { renderConsentPage } from './consent.js';
import {
  sha256, randomToken,
  createAuthCode, consumeAuthCode,
  issueAccessToken, issueRefreshToken, rotateRefreshToken,
  revokeRefreshToken,
} from './store.js';
import jwt from 'jsonwebtoken';
import { revokeAccessJti } from './store.js';
import { logger } from '../utils/logger.js';

const urlencoded = express.urlencoded({ extended: true });
const json = express.json();

/** Verify credentials against the User model (email or registrationId). */
async function verifyCredentials(identifier: string, password: string) {
  if (!identifier || !password) return null;
  const id = String(identifier).trim();
  const user: any = await User.findOne({
    $or: [{ email: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, { registrationId: id }],
  });
  if (!user || !user.isActive) return null;
  const ok = await user.matchPassword(password);
  return ok ? user : null;
}

/** Normalize and constrain a requested/granted scope string to the known vocab. */
function cleanScopes(raw: string | string[] | undefined): string[] {
  const arr = Array.isArray(raw) ? raw : String(raw || '').split(/\s+/);
  return arr.filter((s) => (SCOPES as readonly string[]).includes(s));
}

function isValidRedirect(client: any, redirectUri: string): boolean {
  return Array.isArray(client?.redirect_uris) && client.redirect_uris.includes(redirectUri);
}

/** Authenticate the client at the token/revoke endpoint. */
async function authenticateClient(req: express.Request): Promise<any | null> {
  let clientId = req.body.client_id as string | undefined;
  let clientSecret = req.body.client_secret as string | undefined;

  // Support HTTP Basic (client_secret_basic).
  const authz = req.headers.authorization;
  if (authz?.startsWith('Basic ')) {
    const [id, secret] = Buffer.from(authz.slice(6), 'base64').toString().split(':');
    clientId = clientId || id;
    clientSecret = clientSecret || secret;
  }
  if (!clientId) return null;

  const client = await OAuthClient.findOne({ client_id: clientId });
  if (!client) return null;
  if (client.token_endpoint_auth_method === 'none') return client; // public (PKCE)
  if (!clientSecret || !client.client_secret_hash) return null;
  return sha256(clientSecret) === client.client_secret_hash ? client : null;
}

export function oauthRouter(): express.Router {
  const router = express.Router();

  // ── Dynamic Client Registration (RFC 7591) ─────────────────────────────────
  router.post('/oauth/register', json, async (req, res) => {
    try {
      const {
        client_name,
        redirect_uris,
        grant_types,
        response_types,
        scope,
        token_endpoint_auth_method,
      } = req.body || {};

      if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris is required' });
      }

      const client_id = `mcp_${randomToken(16)}`;
      const authMethod = token_endpoint_auth_method === 'client_secret_basic' || token_endpoint_auth_method === 'client_secret_post'
        ? token_endpoint_auth_method
        : 'none';

      let client_secret: string | undefined;
      let client_secret_hash: string | undefined;
      if (authMethod !== 'none') {
        client_secret = randomToken(32);
        client_secret_hash = sha256(client_secret);
      }

      await OAuthClient.create({
        client_id,
        client_secret_hash,
        client_name: client_name || 'MCP Client',
        redirect_uris,
        grant_types: Array.isArray(grant_types) ? grant_types : ['authorization_code', 'refresh_token'],
        response_types: Array.isArray(response_types) ? response_types : ['code'],
        scope: typeof scope === 'string' ? scope : SCOPES.join(' '),
        token_endpoint_auth_method: authMethod,
      });

      logger.info('oauth', `client registered: ${client_id} (${client_name || 'MCP Client'})`);
      return res.status(201).json({
        client_id,
        ...(client_secret ? { client_secret } : {}),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: client_name || 'MCP Client',
        redirect_uris,
        grant_types: Array.isArray(grant_types) ? grant_types : ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: authMethod,
        scope: typeof scope === 'string' ? scope : SCOPES.join(' '),
      });
    } catch (err: any) {
      logger.error('oauth', `register failed: ${err.message}`);
      return res.status(500).json({ error: 'server_error' });
    }
  });

  // ── Authorization endpoint (GET) → render login + consent ───────────────────
  router.get('/oauth/authorize', async (req, res) => {
    try {
      const {
        client_id, redirect_uri, response_type, scope,
        state, code_challenge, code_challenge_method,
      } = req.query as Record<string, string>;

      const client = client_id ? await OAuthClient.findOne({ client_id }) : null;
      if (!client) return res.status(400).send('Unknown client_id');
      if (!redirect_uri || !isValidRedirect(client, redirect_uri)) {
        return res.status(400).send('Invalid redirect_uri (not registered for this client)');
      }
      // From here, errors are returned to the client via redirect.
      const fail = (error: string, desc?: string) => {
        const u = new URL(redirect_uri);
        u.searchParams.set('error', error);
        if (desc) u.searchParams.set('error_description', desc);
        if (state) u.searchParams.set('state', state);
        return res.redirect(u.toString());
      };

      if (response_type !== 'code') return fail('unsupported_response_type');
      if (!code_challenge) return fail('invalid_request', 'PKCE code_challenge is required');
      if (code_challenge_method && code_challenge_method !== 'S256') {
        return fail('invalid_request', 'only S256 PKCE is supported');
      }

      return res.status(200).type('html').send(
        renderConsentPage({
          clientName: client.client_name,
          clientId: client.client_id,
          redirectUri: redirect_uri,
          scope: scope || client.scope,
          state: state || '',
          codeChallenge: code_challenge,
          codeChallengeMethod: 'S256',
          responseType: 'code',
        })
      );
    } catch (err: any) {
      logger.error('oauth', `authorize failed: ${err.message}`);
      return res.status(500).send('Authorization error');
    }
  });

  // ── Consent decision (POST) → issue code or deny ────────────────────────────
  router.post('/oauth/authorize/decision', urlencoded, async (req, res) => {
    try {
      const {
        identifier, password, decision,
        client_id, redirect_uri, scope, state,
        code_challenge, code_challenge_method, response_type,
        granted_scopes,
      } = req.body || {};

      const client = client_id ? await OAuthClient.findOne({ client_id }) : null;
      if (!client || !isValidRedirect(client, redirect_uri)) {
        return res.status(400).send('Invalid client or redirect_uri');
      }

      const redirectWith = (params: Record<string, string>) => {
        const u = new URL(redirect_uri);
        Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
        if (state) u.searchParams.set('state', state);
        return res.redirect(u.toString());
      };

      if (decision !== 'allow') {
        return redirectWith({ error: 'access_denied', error_description: 'User denied the request' });
      }

      const user = await verifyCredentials(identifier, password);
      if (!user) {
        // Re-render consent with an error (credentials never leave the server).
        return res.status(401).type('html').send(
          renderConsentPage({
            clientName: client.client_name,
            clientId: client.client_id,
            redirectUri: redirect_uri,
            scope: scope || client.scope,
            state: state || '',
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method || 'S256',
            responseType: response_type || 'code',
            error: 'Invalid credentials. Please try again.',
          })
        );
      }

      // Granted = what the user checked, constrained to what was requested.
      const requested = cleanScopes(scope);
      let granted = cleanScopes(granted_scopes);
      if (requested.length) granted = granted.filter((s) => requested.includes(s));
      if (granted.length === 0) granted = ['profile.read'];

      const code = await createAuthCode({
        clientId: client.client_id,
        userId: String(user._id),
        redirectUri: redirect_uri,
        scope: granted.join(' '),
        codeChallenge: code_challenge,
      });

      logger.info('oauth', `code issued for user ${user._id} client ${client.client_id} scopes [${granted.join(' ')}]`);
      return redirectWith({ code });
    } catch (err: any) {
      logger.error('oauth', `decision failed: ${err.message}`);
      return res.status(500).send('Authorization error');
    }
  });

  // ── Token endpoint (POST) ───────────────────────────────────────────────────
  router.post('/oauth/token', urlencoded, json, async (req, res) => {
    try {
      const grantType = req.body.grant_type;
      const client = await authenticateClient(req);
      if (!client) {
        return res.status(401).json({ error: 'invalid_client' });
      }

      if (grantType === 'authorization_code') {
        const { code, redirect_uri, code_verifier } = req.body;
        if (!code || !redirect_uri || !code_verifier) {
          return res.status(400).json({ error: 'invalid_request', error_description: 'code, redirect_uri, code_verifier required' });
        }
        const consumed = await consumeAuthCode(code, client.client_id, redirect_uri, code_verifier);
        const user: any = await User.findById(consumed.userId).select('role').lean();
        const role = String(user?.role || '').toUpperCase();

        const access = issueAccessToken(consumed.userId, role, consumed.scope, client.client_id);
        const refresh = await issueRefreshToken(consumed.userId, client.client_id, consumed.scope);

        return res.json({
          access_token: access.token,
          token_type: 'Bearer',
          expires_in: access.expiresIn,
          refresh_token: refresh,
          scope: consumed.scope,
        });
      }

      if (grantType === 'refresh_token') {
        const { refresh_token } = req.body;
        if (!refresh_token) return res.status(400).json({ error: 'invalid_request' });
        const { ctx, newRefreshToken } = await rotateRefreshToken(refresh_token, client.client_id);
        const user: any = await User.findById(ctx.userId).select('role').lean();
        const role = String(user?.role || '').toUpperCase();

        const access = issueAccessToken(ctx.userId, role, ctx.scope, client.client_id);
        return res.json({
          access_token: access.token,
          token_type: 'Bearer',
          expires_in: access.expiresIn,
          refresh_token: newRefreshToken,
          scope: ctx.scope,
        });
      }

      return res.status(400).json({ error: 'unsupported_grant_type' });
    } catch (err: any) {
      // Map invalid_grant style errors to 400 per RFC 6749.
      const msg = err?.message || 'server_error';
      const code = msg.startsWith('invalid_grant') ? 'invalid_grant' : 'invalid_request';
      logger.warn('oauth', `token error: ${msg}`);
      return res.status(400).json({ error: code, error_description: msg });
    }
  });

  // ── Revocation endpoint (RFC 7009) ──────────────────────────────────────────
  router.post('/oauth/revoke', urlencoded, json, async (req, res) => {
    try {
      const token = req.body.token as string;
      if (token) {
        // Revoke as refresh token (no-op if not one)…
        await revokeRefreshToken(token);
        // …and if it's an access JWT, blocklist its jti until expiry.
        try {
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
          if (decoded?.type === 'mcp_access' && decoded.jti && decoded.exp) {
            await revokeAccessJti(decoded.jti, decoded.exp);
          }
        } catch { /* not a JWT — ignore */ }
      }
      // RFC 7009: always 200, even for unknown tokens.
      return res.status(200).json({});
    } catch (err: any) {
      logger.error('oauth', `revoke failed: ${err.message}`);
      return res.status(200).json({});
    }
  });

  return router;
}
