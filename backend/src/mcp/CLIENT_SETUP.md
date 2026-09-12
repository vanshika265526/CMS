# Connecting MCP clients to the CMS server

Your server speaks **Streamable HTTP** at:

- Production: `https://cms-backend-i6r4.onrender.com/mcp`
- Local: `http://localhost:5005/mcp`

There are **two ways** to authenticate:

### A. OAuth 2.1 — one-click "Connect" (recommended in production)

When the server runs with `MCP_AUTH_MODE=oauth` (the production default), just
add the server **URL** to your client — **no token needed**. The client
discovers the OAuth server, registers itself, opens a login + consent page where
the user signs in and chooses scopes, and stores the resulting tokens
automatically. This is how Claude/ChatGPT/Cursor/VS Code "Connect to MCP server"
buttons work. Configs that are just a `url` (no headers) use this path.

### B. Bearer token (works in any mode)

Send a token explicitly — a user JWT (from `auth_login` or REST login), an API
key (`cms_ak_…`), or the `MCP_SECRET` service token. Use this for automation or
clients without an OAuth UI. Replace `YOUR_TOKEN` below.

> For desktop clients that don't support remote URLs or headers, use a bridge
> (see "stdio bridge").

### C. API key in the URL (simplest — least secure)

For clients that only accept a bare URL (no headers, no OAuth), append the key
as a query parameter (`apiKey`, `api_key`, or `key` all work):

```
https://cms-backend-i6r4.onrender.com/mcp?apiKey=YOUR_KEY
```

⚠️ A key in the URL can leak into server/proxy access logs and browser history.
Use a **scoped API key** here (create one with the `apikey_create` tool — e.g.
read-only scopes), **not** your master `MCP_SECRET`. Revoke it any time with
`apikey_revoke`. Prefer option A or B when your client supports them.

---

## Claude (Desktop / claude.ai connectors)

Claude's **Custom Connectors / remote MCP** support a URL directly. Add a
connector with:

- **URL:** `https://cms-backend-i6r4.onrender.com/mcp`
- **Auth header:** `Authorization: Bearer YOUR_TOKEN`

For **Claude Desktop config** that supports remote HTTP servers with headers:

```json
{
  "mcpServers": {
    "cms": {
      "type": "http",
      "url": "https://cms-backend-i6r4.onrender.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

---

## Cursor

`~/.cursor/mcp.json` (or **Settings → MCP → Add**):

```json
{
  "mcpServers": {
    "cms": {
      "url": "https://cms-backend-i6r4.onrender.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

---

## VS Code (GitHub Copilot / Agent MCP)

`.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "cms": {
      "type": "http",
      "url": "https://cms-backend-i6r4.onrender.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

---

## Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "cms": {
      "serverUrl": "https://cms-backend-i6r4.onrender.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

---

## ChatGPT (MCP-compatible clients / Developer Mode connectors)

Add a connector / MCP server pointing at the URL with a Bearer token:

- **Server URL:** `https://cms-backend-i6r4.onrender.com/mcp`
- **Authentication:** Bearer token → `YOUR_TOKEN`

---

## Gemini (where supported — e.g. Gemini CLI / MCP-enabled clients)

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "cms": {
      "httpUrl": "https://cms-backend-i6r4.onrender.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

---

## stdio bridge (for clients that only launch a local command)

Some older desktop clients only support launching a local process (stdio). Use
[`mcp-remote`](https://www.npmjs.com/package/mcp-remote) to bridge to the HTTP
endpoint:

```json
{
  "mcpServers": {
    "cms": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://cms-backend-i6r4.onrender.com/mcp",
        "--header", "Authorization: Bearer YOUR_TOKEN"
      ]
    }
  }
}
```

Alternatively, run the **bundled stdio server** locally (full-trust, uses
`MONGO_URI` directly):

```json
{
  "mcpServers": {
    "cms-local": {
      "command": "node",
      "args": ["E:/CMS/backend/dist/backend/src/mcp/index.js"],
      "env": { "MONGO_URI": "your-mongo-uri", "MCP_LOG_LEVEL": "info" }
    }
  }
}
```

---

## Getting a user token

```bash
curl -X POST https://cms-backend-i6r4.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"auth_login",
        "arguments":{"identifier":"you@college.edu","password":"yourpassword"}}}'
```

The response contains a `token` — use it as `Authorization: Bearer <token>`.
Tools then execute with that user's role and college scope.
