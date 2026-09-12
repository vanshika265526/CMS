import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import ApiKey from '../../models/ApiKey.js';
import { success, error } from '../types.js';
import { requireRole, getCurrentUser } from '../context.js';
import { SCOPES } from '../security/permissions.js';
import { sha256, randomToken } from '../oauth/store.js';
import { toObjectId } from '../helpers.js';

const ADMIN = ['SUPER_ADMIN', 'COLLEGE_ADMIN'];

export function registerApiKeyTools(server: McpServer) {

  // ─── apikey_create ──────────────────────────────────────────────
  server.tool(
    'apikey_create',
    'Create a server-to-server API key with an explicit scope allow-list. The raw key is returned ONCE — store it securely; only its hash is persisted. Admin only.',
    {
      name: z.string().describe('A label to identify this key (e.g. "n8n-integration")'),
      scopes: z.array(z.enum(SCOPES as unknown as [string, ...string[]])).describe('Allowed scopes for this key'),
      expiresInDays: z.number().optional().describe('Optional expiry in days (omit for non-expiring)'),
    },
    async (params) => {
      try {
        const ctx = requireRole(...ADMIN);
        const raw = `cms_ak_${randomToken(24)}`;
        const me = getCurrentUser();
        const key = await ApiKey.create({
          name: params.name,
          key_hash: sha256(raw),
          key_prefix: raw.slice(0, 14),
          scopes: params.scopes,
          userId: me?._id,
          collegeId: !ctx.isService ? me?.collegeId : undefined,
          active: true,
          expiresAt: params.expiresInDays ? new Date(Date.now() + params.expiresInDays * 86_400_000) : null,
        });
        return success({
          message: '✅ API key created. Copy it now — it will not be shown again.',
          apiKey: raw,
          id: key._id,
          name: key.name,
          scopes: key.scopes,
          expiresAt: key.expiresAt,
          usage: 'Send as header "Authorization: Bearer <key>" or "x-api-key: <key>".',
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── apikey_list ────────────────────────────────────────────────
  server.tool(
    'apikey_list',
    'List API keys (metadata only — raw keys are never retrievable). Admin only.',
    {
      activeOnly: z.boolean().optional().describe('Only show active keys (default: all)'),
    },
    async (params) => {
      try {
        const ctx = requireRole(...ADMIN);
        const filter: any = {};
        if (params.activeOnly) filter.active = true;
        if (!ctx.isService && ctx.role !== 'SUPER_ADMIN' && ctx.user?.collegeId) {
          filter.collegeId = ctx.user.collegeId;
        }
        const keys = await ApiKey.find(filter)
          .select('name key_prefix scopes active last_used_at expiresAt createdAt')
          .sort({ createdAt: -1 })
          .lean();
        return success({ count: keys.length, keys });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── apikey_revoke ──────────────────────────────────────────────
  server.tool(
    'apikey_revoke',
    'Revoke (deactivate) an API key by its _id. Admin only.',
    {
      id: z.string().describe('API key _id'),
    },
    async (params) => {
      try {
        requireRole(...ADMIN);
        const updated = await ApiKey.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: { active: false } },
          { new: true }
        ).select('name active');
        if (!updated) return error('API key not found');
        return success({ message: `✅ API key "${updated.name}" revoked` });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
