# MCP Server — Security Architecture

Enterprise-grade security for the embedded MCP server, implemented with **zero
extra npm dependencies** (OAuth/JWT on `jsonwebtoken`, validation on `zod`,
audit on the existing `AuditLog` model, headers/crypto hand-rolled). Works
identically on localhost and Render — only environment variables differ.

---

## 1. Request pipeline

Every `POST /mcp` request passes through:

```
httpsOnly → securityHeaders → CORS → resolveAuth → OAuth 401 gate →
tiered rate-limit → Streamable HTTP transport → secured tools/call
                                                   │
                         authorize (RBAC ∩ scopes) → sanitize → timeout → audit
```

Authorization runs **before** argument validation, so an unpermitted caller gets
a clean `Forbidden` instead of a schema-revealing validation error.

---

## 2. Authentication (4 credential types)

`resolveAuthContext()` ([auth.ts](./auth.ts)) accepts, in priority order:

| Credential | Header | Trust | Permissions |
| ---------- | ------ | ----- | ----------- |
| **Service token** | `Authorization: Bearer <MCP_SECRET>` | full (M2M) | `*` |
| **API key** | `Authorization: Bearer cms_ak_…` or `x-api-key` | explicit | the key's scope list |
| **OAuth 2.1 access token** | `Authorization: Bearer <jwt>` | per-user | role ∩ granted scopes |
| **Legacy login JWT** | `Authorization: Bearer <jwt>` | per-user | full role permissions |

JWTs are verified with `JWT_SECRET`; expired/tampered tokens are rejected. Login
JWTs additionally require an **active `Session`** (mirrors the REST `protect`
middleware). OAuth access tokens are checked against a **revocation list**.

### Auth modes

`MCP_AUTH_MODE` controls anonymous access to `/mcp`:

- **`oauth`** (default in production) — anonymous requests get `401` +
  `WWW-Authenticate: Bearer resource_metadata="…"`, which makes Claude/ChatGPT
  automatically start the OAuth flow.
- **`open`** (default in dev) — anonymous discovery allowed; tools still gated
  individually, and `tools/list` shows only public tools.

---

## 3. OAuth 2.1 Authorization Server

A self-contained AS built on your users ([oauth/](./oauth/)):

| Endpoint | Purpose |
| -------- | ------- |
| `GET /.well-known/oauth-authorization-server` | AS metadata (RFC 8414) |
| `GET /.well-known/oauth-protected-resource` | resource metadata (RFC 9728) |
| `POST /oauth/register` | Dynamic Client Registration (RFC 7591) |
| `GET /oauth/authorize` | login + **consent** screen (user picks scopes) |
| `POST /oauth/token` | code→token (**PKCE S256**) and refresh grants |
| `POST /oauth/revoke` | token revocation (RFC 7009) |

- **Authorization Code + PKCE (S256 mandatory)** — codes are single-use, hashed,
  60-second TTL, bound to the PKCE challenge and redirect_uri.
- **Access tokens** — short-lived JWTs (`OAUTH_ACCESS_TTL`, default 1h) carrying
  `scope` + `client_id` + `jti`; revocable via the jti blocklist.
- **Refresh tokens** — opaque, stored **hashed**, **rotated on every use**;
  reuse of a rotated token is detected and rejected (theft signal).
- **Consent** — the user authenticates on your server and chooses which
  requested scopes to grant. Passwords never reach the AI client.
- **Logout everywhere** — `revokeAllForUser()` invalidates all refresh tokens.

Scopes: `students.*`, `faculty.*`, `courses.*`, `attendance.*`, `exams.*`,
`fees.*`, `library.*`, `users.*`, `dashboard.read`, `audit.read`, `search.read`,
`settings.read`, `profile.*`, `media.upload`.

---

## 4. RBAC — mapped to your real roles

[security/permissions.ts](./security/permissions.ts) maps the CMS's actual roles
to permission sets:

| Role | Tier | Permissions |
| ---- | ---- | ----------- |
| `SUPER_ADMIN`, `COLLEGE_ADMIN` | Admin | `*` (college admins are college-scoped by the tools) |
| `TEACHER` | Editor | read broadly + write attendance/exams |
| `LIBRARIAN` | Manager | full library + read students/dashboard |
| `STUDENT` | Viewer | read own academic data |
| `PARENT` | Viewer | read child's academic data |

**Effective permission = role permissions ∩ granted OAuth scopes.** A token may
never exceed what the user's role allows, regardless of what scopes were granted.

---

## 5. Tool-level authorization

Each tool's required permission is derived from its name
(`<resource>_<verb>` → `<family>.<read|write|delete>`) with explicit overrides.
Examples:

| Tool | Required permission |
| ---- | ------------------- |
| `student_list` | `students.read` |
| `student_create` | `students.write` |
| `user_delete` | `users.delete` |
| `dashboard_stats` | `dashboard.read` |
| `auth_login` | _public_ |

Before any tool executes: **authenticate → check effective permission → 403 if
denied**. `tools/list` is filtered to only the tools the caller may use, so
unauthorized tools aren't even discoverable.

---

## 6–9. Validation, rate limiting, audit, headers

- **Validation & sanitization** — Zod schemas validate every tool's arguments;
  the wrapper additionally rejects any `$`-prefixed key (Mongo operator
  injection). All DB access goes through Mongoose models — no raw queries are
  ever exposed.
- **Rate limiting** — tiered, per IP+credential: `MCP_RATE_LIMIT_ANON` (default
  20/min) vs `MCP_RATE_LIMIT_AUTH` (default 200/min) → `429` with `Retry-After`.
- **Audit logging** — one `AuditLog` row per tool call: userId, tool, action,
  timestamp, IP, user-agent, request/correlation id, execution time, success/
  failure, error. Secrets/tokens/passwords are redacted, never stored.
- **Security headers** — CSP, HSTS (prod), `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, COOP.
- **HTTPS only** — in production, non-HTTPS requests are redirected (GET) or
  rejected (`403`). Express `trust proxy` is enabled for Render.
- **CORS** — set `MCP_ALLOWED_ORIGINS` to restrict browser origins; native
  clients (no Origin) are always allowed.
- **Error handling** — standardized responses; stack traces never exposed.

---

## 10. Secrets / environment variables

All secrets come from the environment — nothing hard-coded:

| Variable | Purpose |
| -------- | ------- |
| `JWT_SECRET` | signs/verifies JWTs and OAuth access tokens |
| `MCP_SECRET` | service (M2M) token |
| `MONGO_URI` | database |
| `OAUTH_ISSUER` | optional pinned issuer (else auto-detected) |
| `MCP_AUTH_MODE`, `MCP_ALLOWED_ORIGINS`, `MCP_RATE_LIMIT_*`, `OAUTH_ACCESS_TTL`, `OAUTH_REFRESH_TTL_DAYS` | tuning |

> ⚠️ Your current `JWT_SECRET=yoursecretkey_replacethis` and the static
> `MCP_SECRET` are weak. **Rotate both to strong random values in the Render
> dashboard before production** (`openssl rand -base64 48`).

---

## Production deployment (Render)

1. Set env vars in Render → Environment:
   - `NODE_ENV=production` (enables HSTS, HTTPS-only, `oauth` auth mode)
   - strong `JWT_SECRET` and `MCP_SECRET`
   - `MCP_ALLOWED_ORIGINS=https://your-frontend` (if any browser clients)
   - optionally `OAUTH_ISSUER=https://cms-backend-i6r4.onrender.com`
2. Push → Render runs `npm run build` then `npm start`.
3. Verify:
   ```bash
   curl https://cms-backend-i6r4.onrender.com/mcp/health
   curl https://cms-backend-i6r4.onrender.com/.well-known/oauth-authorization-server
   ```

AI clients then point at `https://cms-backend-i6r4.onrender.com/mcp` and
authenticate via OAuth automatically — see [CLIENT_SETUP.md](./CLIENT_SETUP.md).

---

## Verified behaviors (end-to-end tested)

- ✅ Full Authorization Code + PKCE flow → access + refresh tokens
- ✅ RBAC ∩ scopes: a STUDENT granted `users.read` is still **denied** (role lacks it)
- ✅ Authorization runs before validation (clean `Forbidden`, not a schema leak)
- ✅ `tools/list` filtered by permission; anonymous sees only public tools
- ✅ Refresh rotation; reuse of a rotated refresh token rejected
- ✅ Access-token revocation enforced on the next request
- ✅ Mongo operator injection (`$where`) rejected
- ✅ Audit rows written with timing + status; secrets redacted
- ✅ `oauth` mode returns `401` + `WWW-Authenticate` to trigger client OAuth
- ✅ Security headers + tiered rate-limit headers present
