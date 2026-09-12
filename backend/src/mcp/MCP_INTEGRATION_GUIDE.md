# MCP Server Integration Guide

> ⚠️ **UPDATED (v2):** The server now uses the **current Streamable HTTP**
> transport at **`POST /mcp`** — not the deprecated SSE transport. The MCP
> protocol endpoint is `/mcp`; the web dashboard moved to **`/mcp/dashboard`**.
> Authentication now supports **per-user JWTs** (tools run with that user's
> permissions) in addition to the shared service token.
>
> **For current, accurate docs see [`README.md`](./README.md) and
> [`CLIENT_SETUP.md`](./CLIENT_SETUP.md).** The sections below that reference
> `/mcp/sse` describe the legacy transport, which is retained only for older
> clients.

Your CMS backend now has a fully integrated Model Context Protocol (MCP) server embedded within Express. This guide explains the architecture, how it works, and how to use it.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works](#how-it-works)
3. [Available Tools](#available-tools)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
6. [Endpoint Reference](#endpoint-reference)
7. [Authentication](#authentication)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Integration Model

The MCP server is **fully integrated** into your Express application:

```
┌─────────────────────────────────────────┐
│      Express Application (Port 5005)    │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  REST API Routes                   │ │
│  │  /auth, /students, /courses, etc.  │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  MCP Server (Embedded)             │ │
│  │  Routes: /mcp, /mcp/sse, /mcp/... │ │
│  │  - SSE Transport                   │ │
│  │  - Dashboard UI                    │ │
│  │  - Tool Registration               │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  Shared Resources                  │ │
│  │  - MongoDB Connection              │ │
│  │  - Models & Services               │ │
│  │  - Authentication                  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Key Features

✅ **Single Process**: No separate MCP server deployment needed  
✅ **Shared Architecture**: Reuses controllers, services, and models  
✅ **Automatic Environment Detection**: Works seamlessly in dev & production  
✅ **Bearer Token Auth**: Protects SSE endpoints  
✅ **Dashboard UI**: Built-in web interface at `/mcp`  
✅ **53 Tools**: Across 7 modules (students, faculty, courses, attendance, exams, fees, library)

---

## How It Works

### 1. **Initialization** (server.ts)

```typescript
import { integrateMCPWithExpress } from "./mcp/express.js";

const app = express();
integrateMCPWithExpress(app); // Mount MCP routes into Express
```

### 2. **SSE Transport Flow**

```
┌─────────────────────┐
│   Claude Desktop    │
│   (AI Client)       │
└──────────┬──────────┘
           │ HTTP Upgrade
           │ (with Bearer token)
           ▼
┌─────────────────────────────────────┐
│  GET /mcp/sse                       │
│  Headers: Authorization: Bearer ... │
└──────────┬──────────────────────────┘
           │ SSE Connection Established
           ▼
┌─────────────────────────────────────┐
│  MCP Server (in-process)            │
│  - Processes tool calls             │
│  - Accesses MongoDB                 │
│  - Returns results                  │
└──────────┬──────────────────────────┘
           │ POST /mcp/messages
           │ (with sessionId)
           ▼
┌─────────────────────┐
│   Claude Desktop    │
│   (receives result) │
└─────────────────────┘
```

### 3. **Tool Execution**

Tools call your existing services directly:

```typescript
// Instead of:
const response = await fetch("/api/students"); // ❌ HTTP request

// Tools do this:
const students = await Student.find(filter); // ✅ Direct DB access
```

---

## Available Tools

### 7 Module Categories

| Module         | Tools                                  | Purpose                 |
| -------------- | -------------------------------------- | ----------------------- |
| **Students**   | list, get, create, update, status      | Manage student profiles |
| **Faculty**    | list, get, assign, schedule            | Faculty management      |
| **Courses**    | list, get, create, update, syllabus    | Course management       |
| **Attendance** | list, record, analyze, summary         | Attendance tracking     |
| **Exams**      | list, get, schedule, results           | Exam management         |
| **Fees**       | list, calculate, receipts, adjustments | Fee management          |
| **Library**    | list, checkout, return, fine           | Library operations      |

**Full tool list:** See dashboard at `http://localhost:5000/mcp`

### Tool Invocation Pattern

All tools follow this pattern:

```typescript
server.tool(
  "tool_name", // Name
  "Description", // Description
  {
    // Input schema (Zod)
    param1: z.string().describe("..."),
    param2: z.number().optional(),
  },
  async (params) => {
    // Handler
    try {
      // Your logic here
      return success(result);
    } catch (err) {
      return error(err.message);
    }
  },
);
```

---

## Local Development

### 1. **Setup**

```bash
# Navigate to backend
cd backend

# Install dependencies (if not already done)
npm install

# Ensure .env has MCP configuration
cat .env | grep MCP
```

### 2. **Configuration (.env)**

```env
# Server
PORT=5005
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://...

# MCP Configuration
MCP_TRANSPORT=sse
MCP_PORT=5000
MCP_SECRET=dev-secret-for-local-testing

# Optional: Override base URL (usually auto-detected)
# BASE_URL=http://localhost:5005
```

### 3. **Start the Server**

```bash
npm run dev
```

Output:

```
[MCP] Configuration loaded: {
  environment: 'development',
  transport: 'sse',
  baseUrl: 'http://localhost:5005',
  endpoint: 'http://localhost:5005/mcp',
  authEnabled: true
}
[DB] MongoDB connection sequence completed.
```

### 4. **Access MCP**

- **Dashboard UI**: http://localhost:5005/mcp
- **SSE Endpoint**: http://localhost:5005/mcp/sse
- **Tools API**: http://localhost:5005/mcp/api/tools

---

## Production Deployment

### Render Deployment

#### Step 1: Set Environment Variables in Render Dashboard

```env
# App Settings
NODE_ENV=production
PORT=5005  # Render uses this, but keep it for Express

# Database
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>

# MCP Configuration
MCP_TRANSPORT=sse
MCP_PORT=5000           # Can keep same or use 5005
MCP_SECRET=<strong-random-secret-from-env>  # Change in production!
BASE_URL=https://<your-app>.onrender.com    # IMPORTANT

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

#### Step 2: Deployment Process

1. Push code to GitHub
2. Render automatically deploys via GitHub integration
3. MCP endpoints become available at:
   - Dashboard: `https://<your-app>.onrender.com/mcp`
   - SSE: `https://<your-app>.onrender.com/mcp/sse`
   - API: `https://<your-app>.onrender.com/mcp/api/tools`

#### Step 3: Verify Deployment

```bash
# Check status
curl https://<your-app>.onrender.com/mcp

# List available tools
curl https://<your-app>.onrender.com/mcp/api/tools

# Test SSE connection (with Bearer token)
curl -H "Authorization: Bearer $MCP_SECRET" \
     https://<your-app>.onrender.com/mcp/sse
```

### Environment Variable Reference

| Variable        | Dev              | Prod                      | Required       | Notes                   |
| --------------- | ---------------- | ------------------------- | -------------- | ----------------------- |
| `NODE_ENV`      | `development`    | `production`              | ✅             | Controls auto-detection |
| `PORT`          | `5005`           | `5005`                    | ✅             | Express port            |
| `MCP_TRANSPORT` | `sse`            | `sse`                     | ✅             | Always `sse` for HTTP   |
| `MCP_SECRET`    | `dev-...`        | Strong random             | ✅             | Bearer token auth       |
| `BASE_URL`      | Auto (localhost) | `https://...onrender.com` | ⚠️ Recommended | For absolute URLs       |
| `MONGO_URI`     | Local or Atlas   | Atlas                     | ✅             | Database connection     |
| `JWT_SECRET`    | Dev secret       | Strong secret             | ✅             | JWT signing             |

---

## Endpoint Reference

### REST Endpoints

#### Dashboard UI

```
GET /mcp
→ Returns HTML dashboard with tool browser & runner
```

#### List All Tools (JSON)

```
GET /mcp/api/tools
→ Returns: { tools: [...] }
```

Example:

```bash
curl http://localhost:5005/mcp/api/tools | jq '.tools[0]'
```

#### Run Tool via HTTP

```
POST /mcp/api/run
Content-Type: application/json

{
  "toolName": "student_list",
  "args": {
    "batchId": "507f1f77bcf86cd799439011",
    "limit": 10
  }
}

→ Returns: { result: {...} }
```

Example:

```bash
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "student_list",
    "args": { "limit": 5 }
  }' | jq
```

### SSE Endpoints (for Claude Desktop)

#### Establish SSE Connection

```
GET /mcp/sse
Headers: Authorization: Bearer <MCP_SECRET>

→ Establishes Server-Sent Events stream
→ Returns sessionId cookie for message handling
```

#### Send Tool Call

```
POST /mcp/messages?sessionId=<sessionId>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "student_list",
    "arguments": { "limit": 5 }
  }
}

→ Processes tool call
→ Streams result back via SSE
```

---

## Authentication

### Bearer Token Authentication

The MCP SSE endpoints use Bearer token authentication:

```bash
# ✅ Correct
curl -H "Authorization: Bearer cms_mcp_secret_bearer_token_2026" \
     http://localhost:5005/mcp/sse

# ❌ Wrong
curl http://localhost:5005/mcp/sse
# → 401 Unauthorized

# ❌ Wrong
curl -H "Authorization: Bearer wrong-secret" \
     http://localhost:5005/mcp/sse
# → 401 Unauthorized
```

### Setting MCP_SECRET

**Local Development:**

```env
MCP_SECRET=dev-secret-or-anything
```

**Production:**

```env
# Generate a strong secret
MCP_SECRET=$(openssl rand -base64 32)
# Set in Render dashboard
```

### Disable Auth (Development Only)

```env
# Don't set MCP_SECRET to allow unauthenticated access
# Warning: Only for development!
```

---

## Testing

### 1. **Test Dashboard UI**

```bash
# Start server
npm run dev

# Open in browser
# http://localhost:5005/mcp
```

You should see:

- Tool browser on the left
- Tool runner on the right
- List of 53 tools across 7 modules

### 2. **Test REST API**

```bash
# List tools
curl http://localhost:5005/mcp/api/tools

# Run a tool
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{"toolName": "student_list", "args": {"limit": 3}}'
```

### 3. **Test SSE Connection**

```bash
# With auth
curl -H "Authorization: Bearer dev-secret-or-anything" \
     http://localhost:5005/mcp/sse \
     -N

# Should stream SSE events without disconnecting
# Press Ctrl+C to stop
```

### 4. **Configure Claude Desktop**

Create `~/.anthropic-userclient/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cms": {
      "url": "http://localhost:5005/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "dev-secret-or-anything"
      }
    }
  }
}
```

Or for production:

```json
{
  "mcpServers": {
    "cms-prod": {
      "url": "https://<your-app>.onrender.com/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "<MCP_SECRET from Render>"
      }
    }
  }
}
```

Restart Claude Desktop and test!

---

## Troubleshooting

### Issue: "401 Unauthorized" when connecting to SSE

**Cause:** Missing or incorrect Bearer token

**Solution:**

```bash
# Check MCP_SECRET in .env
echo $MCP_SECRET

# Try with correct token
curl -H "Authorization: Bearer $MCP_SECRET" \
     http://localhost:5005/mcp/sse
```

### Issue: "BASE_URL not configured" warning in production

**Cause:** `BASE_URL` or `RENDER_EXTERNAL_URL` not set in Render

**Solution:**

1. Go to Render Dashboard → Settings
2. Add `BASE_URL=https://<your-app>.onrender.com`
3. Redeploy

### Issue: Tools return "Cannot find module" errors

**Cause:** TypeScript not compiled to JavaScript

**Solution:**

```bash
npm run build
```

### Issue: MongoDB connection errors in MCP tools

**Cause:** `MONGO_URI` not set or invalid

**Solution:**

1. Check `.env` has valid `MONGO_URI`
2. In Render, add `MONGO_URI` to environment variables
3. Restart server

### Issue: MCP tools are slow

**Cause:** Database queries not optimized

**Solution:**

- Check tool implementation in `/mcp/tools/*.ts`
- Add indexes to frequently queried fields
- Use `.select()` to limit fields returned
- Use pagination for large datasets

### Issue: Session timeout or SSE disconnect

**Cause:** Render free tier has connection limits

**Solution:**

- Upgrade to Render Pro if high traffic
- Implement reconnection logic in client
- Monitor logs in Render Dashboard

---

## Performance Considerations

### 1. **Database Connection Pooling**

Handled by Mongoose automatically. Adjust in production if needed:

```env
MONGO_POOL_SIZE=10
```

### 2. **Response Caching**

Tools don't cache by default. Add caching for read-heavy tools:

```typescript
// In tool handler
const cacheKey = `students:${params.batchId}`;
let data = await cache.get(cacheKey);
if (!data) {
  data = await Student.find(...);
  await cache.set(cacheKey, data, 60); // 60 sec TTL
}
return success(data);
```

### 3. **Request Timeouts**

Set appropriate timeouts for long-running queries:

```typescript
server.tool(
  'expensive_query',
  '...',
  { ... },
  async (params) => {
    // Timeout after 30s
    const result = await Promise.race([
      Student.find(...),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      )
    ]);
    return success(result);
  }
);
```

---

## Security Best Practices

1. ✅ **Rotate `MCP_SECRET` regularly** in production
2. ✅ **Use HTTPS in production** (Render provides this)
3. ✅ **Validate all input** using Zod schemas
4. ✅ **Never log sensitive data** (tokens, passwords)
5. ✅ **Monitor access logs** for unusual activity
6. ✅ **Keep dependencies updated**: `npm audit fix`
7. ✅ **Use strong JWT_SECRET** in production
8. ✅ **Enable rate limiting** for public endpoints (if any)

---

## Next Steps

1. **Configure Claude Desktop** (see Testing section)
2. **Deploy to Render** (see Production Deployment)
3. **Monitor in production** (Render Dashboard → Logs)
4. **Add custom tools** as needed (see tool examples)
5. **Set up alerts** for errors in Render

---

## File Structure

```
backend/src/mcp/
├── index.ts                 # Standalone MCP server (for reference)
├── express.ts              # Express integration (main integration)
├── auth.ts                 # Bearer token middleware
├── config.ts               # Configuration & environment detection
├── types.ts                # TypeScript type definitions
├── db.ts                   # MongoDB connection wrapper
├── dashboard.ts            # Dashboard UI HTML
├── helpers.ts              # Utility functions (pagination, etc)
├── MCP_INTEGRATION_GUIDE.md # This file
├── tools/
│   ├── student.tools.ts    # Student module tools
│   ├── faculty.tools.ts    # Faculty module tools
│   ├── course.tools.ts     # Course module tools
│   ├── attendance.tools.ts # Attendance module tools
│   ├── exam.tools.ts       # Exam module tools
│   ├── fee.tools.ts        # Fee module tools
│   └── library.tools.ts    # Library module tools
├── resources/              # MCP resources (if any)
├── prompts/                # MCP prompts (if any)
└── utils/                  # Utilities (logging, etc)
```

---

## Support & Updates

- **MCP SDK Documentation**: https://modelcontextprotocol.io
- **Express Documentation**: https://expressjs.com
- **Render Documentation**: https://render.com/docs
- **Your CMS Backend**: `/backend/README.md`

---

**Last Updated:** June 27, 2026  
**MCP SDK Version:** 1.29.0  
**Node Environment:** TypeScript + Express
