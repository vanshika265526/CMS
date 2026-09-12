# CMS MCP Server (embedded in Express)

A production-ready **Model Context Protocol** server built directly into the
existing CMS Express backend. No separate project, no separate deployment — the
same process that serves your REST API also serves MCP at **`/mcp`**.

- **Local:** `http://localhost:<PORT>/mcp`  (your `PORT` is `5005`)
- **Production:** `https://cms-backend-i6r4.onrender.com/mcp`

Any MCP-compatible client (Claude, Cursor, VS Code, Windsurf, ChatGPT MCP
connectors, Gemini-based clients) can connect, discover tools, authenticate with
a JWT, and invoke your live business logic.

---

## What transport does this use?

The **current, non-deprecated** MCP transport: **Streamable HTTP** at a single
endpoint (`POST /mcp`). The older SSE transport is kept at `/mcp/sse` only for
backward compatibility with legacy clients.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/mcp` | **Primary** Streamable HTTP MCP endpoint (initialize, tools/list, tools/call) |
| `GET` | `/mcp` | Browser → redirects to dashboard; client → `405` (stateless, no standing stream) |
| `DELETE` | `/mcp` | Session teardown (no-op in stateless mode) |
| `GET` | `/mcp/dashboard` | Built-in web UI to browse & run tools |
| `GET` | `/mcp/health` | Liveness + capability probe |
| `GET` | `/mcp/api/tools` | Dashboard: list tools as JSON |
| `POST` | `/mcp/api/run` | Dashboard: run a tool as JSON |
| `GET`/`POST` | `/mcp/sse`, `/mcp/messages` | **Deprecated** legacy SSE transport |

It runs in **stateless** mode — a fresh MCP server + transport per request — so
it scales cleanly on Render without sticky sessions.

---

## Architecture

```
Express app (one process, one port)
├── REST API            /api/auth, /api/students, /api/courses, ...
└── MCP (embedded)      POST /mcp  ← Streamable HTTP
                        │
                        ├── server.ts        createMCPServer() — registers all tools
                        ├── auth.ts          resolves Bearer JWT → user (reuses REST rules)
                        ├── context.ts       AsyncLocalStorage carries the caller into tools
                        ├── controllerAdapter.ts  lets tools call existing Express controllers
                        └── tools/*.ts       direct Mongoose model access (the data layer)
```

Tools **reuse your business logic directly** — no HTTP calls back to your own
API. Domain tools query Mongoose models; cross-cutting tools (login, dashboard
stats) invoke your existing controllers in-process via the controller adapter.

---

## Tools (66 total)

| Module | Tools |
| ------ | ----- |
| **Auth/Users** | `auth_login`, `auth_profile`, `auth_change_password`, `user_list`, `user_get`, `user_create`, `user_update`, `user_delete` |
| **System** | `dashboard_stats`, `recent_activity`, `search_global`, `categories_get`, `settings_get` |
| **Students** | `student_list`, `student_get`, `student_create`, `student_update`, `student_delete`, `admission_list`, `admission_update_status` |
| **Faculty** | `faculty_*` |
| **Courses** | `course_*` |
| **Attendance** | `attendance_*` |
| **Exams** | `exam_*` |
| **Fees** | `fee_*` |
| **Library** | `library_*` |

Browse the full live list (with JSON Schemas) at `/mcp/dashboard` or
`GET /mcp/api/tools`.

---

## Authentication

The MCP endpoint accepts a **Bearer token** (or `x-api-key` header). The token
can be either:

1. **A user JWT** — obtained from `auth_login` (or your normal REST login). The
   token is verified with `JWT_SECRET` and checked against an **active Session**,
   exactly like the REST `protect` middleware. Tools then run **with that user's
   role and college scope**.
2. **The service token** (`MCP_SECRET`) — full-trust machine-to-machine access,
   bypasses role checks. Use for admin tooling / automation.

**Discovery is open** (initialize, tools/list) so clients can list tools without
credentials. **Execution is gated**: protected tools call `requireAuth()` /
`requireRole()` and return an error if the caller isn't authorized. Public tools
(`auth_login`) need no token.

Typical flow for a per-user session:

```
1. tools/call auth_login { identifier, password }   → returns { token }
2. Reconnect with header: Authorization: Bearer <token>
3. tools/call any protected tool → runs as that user
```

---

## Environment variables

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `MONGO_URI` | ✅ | MongoDB connection (shared with REST) |
| `JWT_SECRET` | ✅ | Verifies user JWTs (shared with REST) |
| `MCP_SECRET` | ✅ | Shared service token for M2M access |
| `MCP_LOG_LEVEL` | — | `debug`/`info`/`warn`/`error` (default `info`) |
| `MCP_RATE_LIMIT` | — | Requests per window per client (default `120`) |
| `MCP_RATE_WINDOW_MS` | — | Rate-limit window (default `60000`) |
| `MCP_TOOL_TIMEOUT_MS` | — | Per-tool timeout (default `30000`) |
| `MCP_TRANSPORT`, `MCP_PORT` | — | Only for the standalone `npm run mcp` process |

No URLs are hard-coded. Local vs production differ **only** by environment — the
endpoint is always `<host>/mcp`.

---

## Local testing

```bash
npm run dev          # builds + starts Express (REST + MCP) on PORT

# Health
curl http://localhost:5005/mcp/health

# Initialize (Streamable HTTP requires this Accept header)
curl -X POST http://localhost:5005/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

# List tools
curl -X POST http://localhost:5005/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Run a protected tool with the service token
curl -X POST http://localhost:5005/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $MCP_SECRET" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"user_list","arguments":{"limit":5}}}'
```

Or just open **`http://localhost:5005/mcp/dashboard`** in a browser.

---

## Production deployment (Render)

No code changes between local and production — only env vars differ.

1. In the Render dashboard → your service → **Environment**, set:
   - `MONGO_URI`, `JWT_SECRET` (already set for REST)
   - `MCP_SECRET` = a strong random value (e.g. `openssl rand -base64 32`)
   - optionally `MCP_LOG_LEVEL`, `MCP_RATE_LIMIT`, etc.
2. Push to GitHub → Render builds (`npm run build`) and starts (`npm start`).
3. Verify:
   ```bash
   curl https://cms-backend-i6r4.onrender.com/mcp/health
   ```

The MCP endpoint is live at `https://cms-backend-i6r4.onrender.com/mcp`.

> **Note:** Render free-tier instances sleep when idle; the first request after
> idle may take a few seconds to wake the service.

---

## Security

Enterprise-grade security is documented in [`SECURITY.md`](./SECURITY.md):
OAuth 2.1 (Auth Code + PKCE, refresh rotation, revocation, consent), RBAC mapped
to your real roles, per-tool authorization, tiered rate limiting, audit logging,
security headers, HTTPS enforcement, and API keys — all with **no extra npm
dependencies**. In production (`MCP_AUTH_MODE=oauth`) anonymous requests are
challenged with `401 + WWW-Authenticate`, so MCP clients start the OAuth flow
automatically.

## Client configuration

See [`CLIENT_SETUP.md`](./CLIENT_SETUP.md) for ready-to-paste configs for Claude,
Cursor, VS Code, Windsurf, ChatGPT, and Gemini-based clients (OAuth one-click and
Bearer-token paths).
