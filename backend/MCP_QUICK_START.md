# 🚀 MCP Integration - Quick Start Guide

Get your MCP-integrated CMS backend running locally in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ MongoDB (local or Atlas)
- ✅ npm or yarn
- ✅ Git

## Step 1: Setup Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values
# Minimum required:
#   - MONGO_URI (MongoDB connection string)
#   - JWT_SECRET (any string for local dev)
#   - MCP_SECRET (any string for local dev)
#   - CLOUDINARY_* (optional, can skip for testing)
```

**Quick values for local development:**

```env
PORT=5005
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/cms
JWT_SECRET=dev-secret-change-in-production
MCP_TRANSPORT=sse
MCP_PORT=5000
MCP_SECRET=dev-any-string
```

## Step 2: Install Dependencies

```bash
cd backend
npm install
```

## Step 3: Build TypeScript

```bash
npm run build
```

Or watch mode:

```bash
npm run dev
```

## Step 4: Access MCP Endpoints

Once the server is running (`npm run dev`):

### 📊 Dashboard UI

Open in browser: **http://localhost:5005/mcp**

You'll see:

- All 53 available tools
- Tool descriptions and parameters
- A test runner to invoke tools

### 🔧 REST API Endpoints

**List all tools:**

```bash
curl http://localhost:5005/mcp/api/tools
```

**Run a tool via HTTP:**

```bash
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "student_list",
    "args": { "limit": 5 }
  }'
```

**Expected response:**

```json
{
  "result": {
    "success": true,
    "data": [
      {
        "uniqueStudentId": "STU001",
        "enrollmentId": "2023-001",
        "personalInfo": { "firstName": "John", "lastName": "Doe" },
        ...
      }
    ],
    "pagination": { "page": 1, "limit": 5, "total": 150 }
  }
}
```

### 📡 SSE Endpoint (for Claude Desktop)

**Establish connection:**

```bash
curl -H "Authorization: Bearer dev-any-string" \
     http://localhost:5005/mcp/sse \
     -N
```

Should stream SSE events. Press `Ctrl+C` to disconnect.

## Step 5: Configure Claude Desktop (Optional)

To use MCP tools in Claude Desktop:

1. **Create config file:**

   **On Windows:**

   ```powershell
   # Create directory if not exists
   mkdir $env:APPDATA\Claude\

   # Create config file
   notepad $env:APPDATA\Claude\claude_desktop_config.json
   ```

   **On macOS/Linux:**

   ```bash
   mkdir -p ~/.anthropic-userclient
   nano ~/.anthropic-userclient/claude_desktop_config.json
   ```

2. **Add this configuration:**

   ```json
   {
     "mcpServers": {
       "cms-local": {
         "url": "http://localhost:5005/mcp/sse",
         "auth": {
           "type": "bearer",
           "token": "dev-any-string"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

4. **In Claude, you should see:**
   - MCP menu appears in the UI
   - "cms-local" server listed
   - All 53 tools available to use

## Step 6: Test a Tool

### Via Dashboard UI

1. Open http://localhost:5005/mcp
2. Click on a tool, e.g., "student_list"
3. Fill in parameters (leave empty for defaults)
4. Click "Run"
5. See result in right panel

### Via Claude Desktop

1. Open Claude
2. Click MCP menu (if visible)
3. Use any tool in conversation:
   - "List all students"
   - "Get student by ID"
   - "Show courses"
   - etc.

### Via curl

```bash
# Get list of students
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{"toolName": "student_list", "args": {"limit": 10}}'

# Get specific student (replace ID with real ID)
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{"toolName": "student_get", "args": {"uniqueStudentId": "STU001"}}'

# List faculty
curl -X POST http://localhost:5005/mcp/api/run \
  -H "Content-Type: application/json" \
  -d '{"toolName": "faculty_list", "args": {"limit": 5}}'
```

## 📋 Available Tool Categories

| Module     | Example Tools          | Count  |
| ---------- | ---------------------- | ------ |
| Students   | list, get, create      | 8      |
| Faculty    | list, get, assign      | 6      |
| Courses    | list, get, create      | 7      |
| Attendance | list, record, analyze  | 8      |
| Exams      | list, get, schedule    | 8      |
| Fees       | list, calculate        | 8      |
| Library    | list, checkout, return | 8      |
| **TOTAL**  |                        | **53** |

## 🔍 Troubleshooting

### Issue: "Cannot find module" when running

**Solution:**

```bash
npm run build
npm run dev
```

### Issue: MongoDB connection failed

**Solution:**

1. Check `MONGO_URI` in `.env`
2. Test connection locally: `mongosh "mongodb+srv://..."`
3. In MongoDB Atlas: Network Access → Add Render IPs

### Issue: "401 Unauthorized" with SSE

**Solution:**

```bash
# Use correct bearer token
curl -H "Authorization: Bearer $MCP_SECRET" \
     http://localhost:5005/mcp/sse

# Check MCP_SECRET in .env
cat .env | grep MCP_SECRET
```

### Issue: Port 5005 already in use

**Solution:**

```bash
# Change PORT in .env or use:
PORT=5006 npm run dev
```

### Issue: Claude Desktop shows no tools

**Solution:**

1. Check Claude config file exists: `~/.anthropic-userclient/claude_desktop_config.json`
2. URL should be: `http://localhost:5005/mcp/sse` (not `/mcp` alone)
3. Bearer token must match `MCP_SECRET` in `.env`
4. Restart Claude Desktop after config changes

## 📊 Next Steps

1. **Explore Tools**: Open dashboard and try different tools
2. **Deploy**: See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
3. **Integrate with Claude**: Use in conversations and workflows
4. **Create Custom Tools**: Add your own tools in `src/mcp/tools/`
5. **Monitor**: Check logs in Render Dashboard when deployed

## 📚 Documentation

- **[MCP_INTEGRATION_GUIDE.md](./src/mcp/MCP_INTEGRATION_GUIDE.md)** — Complete integration details
- **[RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)** — Production deployment
- **[CLAUDE_DESKTOP_CONFIG.md](./CLAUDE_DESKTOP_CONFIG.md)** — Claude Desktop setup

## 🆘 Need Help?

1. Check logs: `npm run dev` (watch terminal output)
2. Read full guides in this directory
3. Test endpoints with curl
4. Check Render dashboard if deployed

---

**Ready to go!** Your MCP server is now integrated and ready for AI interactions.
