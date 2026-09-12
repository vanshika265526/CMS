# MCP Production Deployment to Render

Complete step-by-step guide for deploying the MCP-integrated backend to Render.

## Prerequisites

- ✅ GitHub repository with backend code pushed
- ✅ Render account (render.com)
- ✅ MongoDB Atlas database (or any MongoDB cloud service)
- ✅ All dependencies in `package.json`

## Deployment Steps

### Step 1: Create Web Service in Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Select your GitHub repository
4. Configure:
   - **Name**: `cms-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Start with Free tier (upgrade later if needed)

5. Click **"Create Web Service"**

Render will:

- Clone your repository
- Install dependencies
- Compile TypeScript
- Start the Express server
- Assign a URL like `https://cms-backend.onrender.com`

### Step 2: Add Environment Variables

Once the service is created:

1. Go to your service → **Settings** → **Environment**
2. Add these variables:

```env
# ════════════════════════════════════════════════════════
# CORE SERVER CONFIGURATION
# ════════════════════════════════════════════════════════
NODE_ENV=production
PORT=5005

# ════════════════════════════════════════════════════════
# DATABASE
# ════════════════════════════════════════════════════════
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cms?appName=cms

# ════════════════════════════════════════════════════════
# AUTHENTICATION & SECURITY
# ════════════════════════════════════════════════════════
JWT_SECRET=<generate-strong-random-string>

# ════════════════════════════════════════════════════════
# MCP SERVER CONFIGURATION
# ════════════════════════════════════════════════════════
MCP_TRANSPORT=sse
MCP_PORT=5000
MCP_SECRET=<generate-strong-random-string>
BASE_URL=https://cms-backend.onrender.com

# ════════════════════════════════════════════════════════
# CLOUDINARY (File Upload)
# ════════════════════════════════════════════════════════
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# ════════════════════════════════════════════════════════
# OPTIONAL: CORS & ORIGINS
# ════════════════════════════════════════════════════════
ALLOWED_ORIGINS=https://your-frontend.onrender.com,https://your-domain.com

# ════════════════════════════════════════════════════════
# OPTIONAL: PAYMENT GATEWAY (Razorpay)
# ════════════════════════════════════════════════════════
RAZORPAY_KEY_ID=<your-key-id>
RAZORPAY_KEY_SECRET=<your-key-secret>

# ════════════════════════════════════════════════════════
# OPTIONAL: LOGGING
# ════════════════════════════════════════════════════════
LOG_LEVEL=info
```

**Critical Variables for MCP:**

- ✅ `NODE_ENV=production` — Enables production mode
- ✅ `BASE_URL=https://cms-backend.onrender.com` — Must match your Render URL
- ✅ `MCP_SECRET` — Generate with: `openssl rand -base64 32`
- ✅ `MCP_TRANSPORT=sse` — Required for HTTP/HTTPS

### Step 3: Generate Secure Secrets

#### Generate JWT_SECRET

```bash
# On your local machine
openssl rand -base64 32
# Example output: Xf7kL9mN2qR4sT6uV8wX0yZ1aB3cD5eF7gH9iJ+kL=

# Copy this value and paste into RENDER
```

#### Generate MCP_SECRET

```bash
# On your local machine
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Example output: aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/=

# Copy this value and paste into RENDER
```

### Step 4: Deploy

1. Push any pending changes to GitHub
2. Render automatically redeploys
3. Watch the deployment log in Render Dashboard
4. When complete, your service will be live at:
   - **REST API**: `https://cms-backend.onrender.com`
   - **MCP Dashboard**: `https://cms-backend.onrender.com/mcp`
   - **MCP SSE**: `https://cms-backend.onrender.com/mcp/sse`

### Step 5: Verify Deployment

```bash
# Test REST API endpoint
curl https://cms-backend.onrender.com/health

# Test MCP Dashboard
curl https://cms-backend.onrender.com/mcp

# Test MCP tools API
curl https://cms-backend.onrender.com/mcp/api/tools

# Test MCP SSE with Bearer token
curl -H "Authorization: Bearer $MCP_SECRET" \
     https://cms-backend.onrender.com/mcp/sse
```

---

## Environment Variables Explained

### Server Configuration

| Variable   | Value        | Purpose                                |
| ---------- | ------------ | -------------------------------------- |
| `NODE_ENV` | `production` | Enables production optimizations       |
| `PORT`     | `5005`       | Express server port (Render uses this) |

### Database

| Variable    | Example                                           | Purpose                   |
| ----------- | ------------------------------------------------- | ------------------------- |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/cms` | MongoDB connection string |

### Authentication

| Variable     | Generation                | Purpose                      |
| ------------ | ------------------------- | ---------------------------- |
| `JWT_SECRET` | `openssl rand -base64 32` | Signing JWT tokens           |
| `MCP_SECRET` | `openssl rand -base64 32` | Protecting MCP SSE endpoints |

### MCP Configuration

| Variable        | Value                              | Purpose                              |
| --------------- | ---------------------------------- | ------------------------------------ |
| `MCP_TRANSPORT` | `sse`                              | Transport type (always SSE for HTTP) |
| `MCP_PORT`      | `5000`                             | Internal port (can be any value)     |
| `BASE_URL`      | `https://cms-backend.onrender.com` | Absolute URL for redirects           |

### Optional: Cloudinary

| Variable                | Source               | Purpose            |
| ----------------------- | -------------------- | ------------------ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard | Media uploads      |
| `CLOUDINARY_API_KEY`    | Cloudinary Dashboard | API authentication |
| `CLOUDINARY_API_SECRET` | Cloudinary Dashboard | API authentication |

### Optional: Payment

| Variable              | Source             | Purpose         |
| --------------------- | ------------------ | --------------- |
| `RAZORPAY_KEY_ID`     | Razorpay Dashboard | Payment gateway |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard | Payment gateway |

---

## Troubleshooting Render Deployment

### Issue: Build fails with "command not found: tsc"

**Cause:** Dependencies not installed

**Solution:**

```bash
# Ensure tsconfig.json and package.json are committed
git add tsconfig.json package.json package-lock.json
git commit -m "Add build config"
git push origin main

# Trigger redeploy in Render Dashboard
```

### Issue: "Cannot find module" error in logs

**Cause:** Missing dependency or import path error

**Solution:**

1. Check logs in Render Dashboard
2. Verify all imports are correct
3. Ensure all dependencies are in `package.json`
4. Run locally: `npm run build` to catch errors early

### Issue: "MONGO_URI connection refused"

**Cause:** Database not accessible from Render

**Solution:**

1. Verify MongoDB Atlas firewall allows Render IPs
2. In MongoDB Atlas → Network Access → add `0.0.0.0/0` (or specific Render IP)
3. Test connection string locally: `mongosh "mongodb+srv://..."`

### Issue: MCP endpoints return 404

**Cause:** MCP routes not integrated into Express

**Solution:**
Check `server.ts` has:

```typescript
import { integrateMCPWithExpress } from "./mcp/express.js";

const app = express();
integrateMCPWithExpress(app); // Must be called!
```

### Issue: "Authorization: Bearer" returns 401

**Cause:** Incorrect or missing `MCP_SECRET`

**Solution:**

```bash
# Get the secret from Render Dashboard
# Use in Claude Desktop config:
{
  "auth": {
    "type": "bearer",
    "token": "<exact-secret-from-render>"
  }
}

# Or test with curl:
curl -H "Authorization: Bearer <SECRET>" \
     https://cms-backend.onrender.com/mcp/sse
```

### Issue: Service crashes with "Out of Memory"

**Cause:** Free tier has limited memory (512 MB)

**Solution:**

1. Upgrade to Standard tier (2 GB RAM)
2. Or optimize memory usage:
   - Reduce pagination limits
   - Implement query timeouts
   - Use lean() for MongoDB queries

### Issue: Slow startup time (5+ minutes)

**Cause:** Large dependency installation or compilation

**Solution:**

1. Render builds on every push (faster on subsequent deploys)
2. Check if TypeScript compilation is taking too long
3. Consider using pre-compiled Docker image (advanced)

### Issue: "ALLOWED_ORIGINS: origin not allowed"

**Cause:** Frontend URL not in `ALLOWED_ORIGINS`

**Solution:**
Add your frontend URL to `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://cms-frontend.onrender.com,https://myapp.com
```

---

## Monitoring & Maintenance

### View Logs

**Render Dashboard:**

1. Select your service
2. Click **"Logs"**
3. Stream live or download logs

**Filter logs:**

```
[MCP] — Show MCP server logs
[DB] — Show database logs
error — Show errors only
```

### Monitor Performance

**Render Metrics:**

1. Go to **Settings** → **Metrics**
2. Watch:
   - CPU usage
   - Memory usage
   - Network I/O
   - Request count

### Auto-Redeploy from GitHub

**Recommended Setup:**

1. In Render → Service → Settings → Auto-Deploy
2. Enable "Auto-Deploy"
3. Select branch (usually `main`)
4. Now every push to GitHub auto-redeploys

### Scheduled Backup

Consider MongoDB Atlas automatic backups:

1. MongoDB Atlas → Clusters → Backup
2. Enable daily backups
3. Set 7-day retention

---

## Security Checklist for Production

- [ ] ✅ Set `NODE_ENV=production`
- [ ] ✅ Use strong `JWT_SECRET` (openssl generated)
- [ ] ✅ Use strong `MCP_SECRET` (openssl generated)
- [ ] ✅ Set `BASE_URL` to Render URL
- [ ] ✅ Enable MongoDB Atlas IP allowlist
- [ ] ✅ Use `HTTPS://` (Render provides auto SSL)
- [ ] ✅ Rotate secrets quarterly
- [ ] ✅ Enable Render auto-deploy from GitHub
- [ ] ✅ Monitor logs regularly
- [ ] ✅ Keep dependencies updated (`npm audit`)
- [ ] ✅ Enable database backups
- [ ] ✅ Use strong passwords for MongoDB

---

## Cost Estimation

### Free Tier (0.50 per hour if active)

- 512 MB RAM
- Shared CPU
- ~$15/month if always running
- Best for: Testing, dev environment

### Standard Plan ($7/month base + usage)

- 2 GB RAM
- Dedicated CPU
- Predictable monthly cost
- Best for: Production

### Pro Plan ($12/month base + usage)

- 8 GB RAM
- Priority support
- Best for: High traffic

---

## Updating Your App

### Deploy a New Version

```bash
# Make changes locally
git add .
git commit -m "Add new MCP tool"

# Push to GitHub
git push origin main

# Render auto-redeploys
# Watch logs in Render Dashboard
```

### Rollback to Previous Version

```bash
# In Render Dashboard
# Go to Service → Deployments
# Click "Deploy" on previous version
```

---

## Next Steps After Deployment

1. **Configure Claude Desktop:**

   ```json
   {
     "mcpServers": {
       "cms-prod": {
         "url": "https://cms-backend.onrender.com/mcp/sse",
         "auth": {
           "type": "bearer",
           "token": "<MCP_SECRET from Render>"
         }
       }
     }
   }
   ```

2. **Test in Claude:**
   - Open Claude Desktop
   - Use MCP tools through the MCP menu
   - All tools should work without code changes

3. **Update Frontend CORS:**
   - Add Render backend URL to frontend `ALLOWED_ORIGINS`
   - Or set `ALLOWED_ORIGINS=*` (less secure)

4. **Set Up Monitoring:**
   - Render Alerts for errors
   - Log aggregation (LogRocket, Sentry, etc.)

---

## Support

- **Render Docs**: https://render.com/docs
- **MongoDB Docs**: https://docs.mongodb.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Node.js**: https://nodejs.org/docs

---

**Last Updated:** June 27, 2026  
**Status:** ✅ Production Ready
