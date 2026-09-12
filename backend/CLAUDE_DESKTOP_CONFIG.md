# Claude Desktop Configuration

Complete guide for integrating your CMS backend MCP server with Claude Desktop.

## What You'll Get

✅ Access to 53 CMS tools from Claude Desktop  
✅ Natural language queries to your database  
✅ Integrated academic management in Claude  
✅ Works in both development and production

## Setup Instructions

### Step 1: Start Your Backend

**Local Development:**

```bash
cd backend
npm run dev
```

Server should be running at: `http://localhost:5005`

**Production (Render):**

- URL: `https://cms-backend.onrender.com`
- See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

### Step 2: Create Claude Desktop Config

#### On Windows

1. **Open File Explorer**
   - Press `Win + R`
   - Type: `%APPDATA%`
   - Press Enter

2. **Create directory structure**
   - Right-click → New Folder
   - Name it: `Claude`
   - Open the `Claude` folder

3. **Create config file**
   - Right-click → New → Text Document
   - Name it: `claude_desktop_config.json`

4. **Edit the file**
   - Right-click → Open with → Notepad (or VS Code)
   - Paste the configuration below
   - Save

#### On macOS

1. **Open Terminal**

   ```bash
   mkdir -p ~/.anthropic-userclient
   nano ~/.anthropic-userclient/claude_desktop_config.json
   ```

2. **Paste configuration** (see below)

3. **Save:** `Ctrl + X`, then `Y`, then `Enter`

#### On Linux

1. **Open Terminal**

   ```bash
   mkdir -p ~/.anthropic-userclient
   nano ~/.anthropic-userclient/claude_desktop_config.json
   ```

2. **Paste configuration** (see below)

3. **Save:** `Ctrl + X`, then `Y`, then `Enter`

### Step 3: Configuration Files

#### For Local Development

```json
{
  "mcpServers": {
    "cms": {
      "url": "http://localhost:5005/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "dev-any-string"
      }
    }
  }
}
```

**Key points:**

- `url`: Must match your local backend port (default: 5005)
- `token`: Must match `MCP_SECRET` from `.env`
- `http://` (not https) for localhost

#### For Production (Render)

```json
{
  "mcpServers": {
    "cms-prod": {
      "url": "https://cms-backend.onrender.com/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_SECRET_FROM_RENDER"
      }
    }
  }
}
```

**Key points:**

- `url`: Your Render service URL
- `token`: Exact value from Render environment variables
- `https://` required for production

#### For Both Development and Production

```json
{
  "mcpServers": {
    "cms-dev": {
      "url": "http://localhost:5005/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "dev-any-string"
      }
    },
    "cms-prod": {
      "url": "https://cms-backend.onrender.com/mcp/sse",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_SECRET_FROM_RENDER"
      }
    }
  }
}
```

**Benefit:** Switch between dev and prod without config changes

### Step 4: Restart Claude Desktop

1. **Close Claude Desktop completely**
   - Close all Claude windows
   - Make sure it's not running in background

2. **Reopen Claude Desktop**
   - Launch Claude Desktop again
   - Wait for it to fully load

3. **Verify Connection**
   - Look for "🔗 MCP" or similar indicator in the UI
   - Should show your configured servers

## Testing Your Setup

### Quick Test

1. **Open Claude Desktop**

2. **Type a query:**

   ```
   List all students in the system
   ```

3. **Claude should:**
   - Recognize your MCP server
   - Call the `student_list` tool
   - Return results from your database

### Example Queries

```
"Get student information for STU001"
"List all faculty members"
"Show courses in Computer Science department"
"What's the attendance for batch 2023-2027?"
"Get exam schedule for the current semester"
"Calculate fees for all students in batch 2022-26"
"Show library inventory"
```

### Tool Categories Available

| Ask Claude...           | Tools Used                |
| ----------------------- | ------------------------- |
| List/search students    | student_list, student_get |
| Show faculty            | faculty_list, faculty_get |
| View courses & syllabus | course_list, course_get   |
| Check attendance        | attendance_list, analyze  |
| View exam schedule      | exam_list, exam_get       |
| Calculate fees          | fee_list, fee_calculate   |
| Library transactions    | library_list, checkout    |

## Configuration File Locations

**Windows:**

```
C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json
```

**macOS:**

```
~/.anthropic-userclient/claude_desktop_config.json
```

**Linux:**

```
~/.anthropic-userclient/claude_desktop_config.json
```

## Troubleshooting

### Issue: MCP Server Not Found / Offline

**Symptoms:**

- Claude shows "offline" or red indicator
- MCP tools not available

**Solutions:**

1. **Check backend is running:**

   ```bash
   curl http://localhost:5005/mcp/api/tools
   ```

   Should return JSON with tool list.

2. **Verify config file path:**

   ```bash
   # Windows (PowerShell)
   Test-Path "$env:APPDATA\Claude\claude_desktop_config.json"

   # macOS/Linux
   test -f ~/.anthropic-userclient/claude_desktop_config.json && echo "exists"
   ```

3. **Check config format:**
   - Make sure it's valid JSON (use [jsonlint.com](https://jsonlint.com))
   - No trailing commas
   - All quotes properly closed

4. **Restart Claude Desktop:**
   - Close completely (check task manager)
   - Reopen

### Issue: "401 Unauthorized" Error

**Symptoms:**

- Tools fail with 401 error
- "Invalid or missing token"

**Solutions:**

1. **Verify MCP_SECRET matches:**

   ```bash
   # Check .env file
   cat .env | grep MCP_SECRET

   # Compare with config file
   ```

2. **For production, get secret from Render:**
   - Go to Render Dashboard
   - Select your service
   - Settings → Environment
   - Copy exact value of `MCP_SECRET`
   - Update config file
   - Restart Claude Desktop

### Issue: "Connection Refused"

**Symptoms:**

- Tools fail immediately
- "Cannot connect to server"

**Solutions:**

1. **Check backend running:**

   ```bash
   # Local dev
   npm run dev

   # Watch for "[MCP] Mounted MCP routes" message
   ```

2. **Verify correct URL:**
   - Development: `http://localhost:5005/mcp/sse`
   - Production: `https://cms-backend.onrender.com/mcp/sse`

3. **Check port not in use:**

   ```bash
   # Windows
   netstat -ano | findstr :5005

   # macOS/Linux
   lsof -i :5005
   ```

4. **Firewall issues:**
   - Allow `localhost:5005` in Windows Defender / firewall
   - For production, no firewall needed (Render handles it)

### Issue: "Invalid URL" or "Cannot parse config"

**Symptoms:**

- Config file not loading
- Tools unavailable immediately after saving

**Solutions:**

1. **Validate JSON:**
   - Use [jsonlint.com](https://jsonlint.com)
   - Copy entire config file content
   - Should show "Valid JSON"

2. **Common mistakes:**
   - ❌ Trailing comma: `"token": "value",}`
   - ❌ Missing quotes: `url: http://...`
   - ❌ Wrong slash: `\\\\` instead of `/`
   - ❌ Newlines in strings

3. **Correct format:**
   ```json
   {
     "mcpServers": {
       "cms": {
         "url": "http://localhost:5005/mcp/sse",
         "auth": {
           "type": "bearer",
           "token": "your-secret"
         }
       }
     }
   }
   ```

### Issue: Tools Fail or Return Empty Results

**Symptoms:**

- Claude connects but tools error
- Returns "null" or empty data

**Solutions:**

1. **Check backend logs:**

   ```bash
   npm run dev
   # Look for error messages
   ```

2. **Test tool via HTTP:**

   ```bash
   curl -X POST http://localhost:5005/mcp/api/run \
     -H "Content-Type: application/json" \
     -d '{"toolName": "student_list", "args": {"limit": 1}}'
   ```

3. **Verify database connection:**
   - Check `MONGO_URI` in `.env`
   - Ensure MongoDB is running
   - Test connection: `mongosh "mongodb+srv://..."`

4. **Check tool availability:**
   ```bash
   curl http://localhost:5005/mcp/api/tools
   ```
   Should list all 53 tools.

### Issue: Works on Dev But Not Production

**Symptoms:**

- Local works fine
- Production fails after deploying to Render

**Solutions:**

1. **Verify environment variables in Render:**
   - Dashboard → Service → Settings → Environment
   - Check: `MCP_SECRET`, `MONGO_URI`, `JWT_SECRET`
   - All must match production values

2. **Update config with production URL:**
   - Change `http://localhost:5005` to `https://cms-backend.onrender.com`
   - Restart Claude Desktop

3. **Check Render logs:**

   ```bash
   # In Render Dashboard
   Service → Logs
   # Look for [MCP] errors
   ```

4. **Test production endpoint:**
   ```bash
   curl https://cms-backend.onrender.com/mcp/api/tools \
     -H "Authorization: Bearer YOUR_MCP_SECRET"
   ```

## Best Practices

1. **Use different secrets for dev and prod**

   ```json
   {
     "mcpServers": {
       "cms-dev": { "auth": { "token": "dev-secret" } },
       "cms-prod": { "auth": { "token": "prod-secret" } }
     }
   }
   ```

2. **Never commit secrets to git**
   - Keep `.env` in `.gitignore`
   - Store secrets in Render environment variables

3. **Rotate secrets quarterly**
   - Update `MCP_SECRET` in Render
   - Update config file
   - Restart Claude

4. **Monitor usage in production**
   - Check Render logs for unusual activity
   - Set up alerts in Render dashboard

## Next Steps

1. ✅ Create config file with correct values
2. ✅ Restart Claude Desktop
3. ✅ Test with a simple query
4. ✅ Explore available tools
5. ✅ Integrate into workflows

## More Help

- **Backend Guide**: [MCP_INTEGRATION_GUIDE.md](./src/mcp/MCP_INTEGRATION_GUIDE.md)
- **Deployment**: [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)
- **Quick Start**: [MCP_QUICK_START.md](./MCP_QUICK_START.md)
- **MCP Docs**: https://modelcontextprotocol.io
- **Claude Help**: https://support.anthropic.com

---

**Last Updated:** June 27, 2026  
**Status:** ✅ Production Ready
