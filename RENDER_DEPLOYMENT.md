# Deploying to Render.com - Complete Guide

## Overview

Your project architecture:
- **Backend**: Node.js/Express API
- **Frontend**: React app (built and served by backend in production)
- **Database**: SQLite (file-based)
- **Deployment**: Single service (frontend + backend together)

**Important**: You only need to deploy ONE service on Render. The backend serves the built React frontend automatically.

---

## Prerequisites

1. **GitHub Account** (free)
2. **Render Account** (free tier available)
   - Sign up at: https://render.com
3. **Code pushed to GitHub**

---

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

If you haven't already, push your code to GitHub:

```powershell
# Navigate to project directory
cd C:\Users\aweso\Downloads\Prasanna\Proj2\Job-Scheduler

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Render deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**Note**: Make sure `.gitignore` excludes:
- `node_modules/`
- `data/` (database file - will be recreated on Render)
- `logs/`
- `.env`

---

### Step 2: Sign Up / Log In to Render

1. Go to https://render.com
2. Click **"Get Started for Free"** or **"Sign In"**
3. Sign up with GitHub (recommended) for easy repository access

---

### Step 3: Create New Web Service

1. In Render dashboard, click **"New +"** button
2. Select **"Web Service"**

---

### Step 4: Connect Your Repository

1. **Connect Repository**:
   - If you signed up with GitHub, your repositories will appear automatically
   - Select your repository: `YOUR_USERNAME/YOUR_REPO_NAME`
   - Click **"Connect"**

2. **If repository doesn't appear**:
   - Click **"Configure account"** to grant Render access
   - Or use **"Public Git repository"** and paste your GitHub repo URL

---

### Step 5: Configure Service Settings

Fill in the following details:

#### Basic Settings

- **Name**: `job-scheduler` (or any name you prefer)
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave empty (or `Job-Scheduler` if your repo root is different)

#### Build & Deploy Settings

- **Runtime**: `Docker` (Render will auto-detect your Dockerfile)
- **Dockerfile Path**: Leave empty (defaults to `./Dockerfile`)
- **Docker Context**: Leave empty

**OR** if Docker doesn't work, use:

- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && cd frontend && npm install && npm run build && cd ..
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

#### Environment Variables

Click **"Add Environment Variable"** and add these:

| Key | Value | Required |
|-----|-------|----------|
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `10000` | ✅ Yes (Render sets this, but include as fallback) |
| `DB_PATH` | `/opt/render/project/src/data/jobs.db` | ✅ Yes |
| `MAX_CONCURRENT_JOBS` | `1000` | No (has default) |
| `JOB_TIMEOUT` | `30000` | No (has default) |
| `RETRY_ATTEMPTS` | `3` | No (has default) |
| `RETRY_DELAY` | `1000` | No (has default) |
| `LOG_LEVEL` | `info` | No (has default) |
| `ALERT_WEBHOOK` | `https://your-webhook-url.com` | No (optional) |

**Important Notes**:
- Render automatically sets `PORT` environment variable (usually `10000`)
- Your code already reads `process.env.PORT || 3000`, so it will work
- Database path should be in a persistent location (Render's filesystem is ephemeral, see notes below)

#### Advanced Settings (Optional)

- **Auto-Deploy**: `Yes` (deploys on every push to main branch)
- **Health Check Path**: `/api/health`

---

### Step 6: Select Plan

- **Free Plan**: 
  - ✅ Free forever
  - ⚠️ Spins down after 15 minutes of inactivity
  - ⚠️ Limited resources
  - ⚠️ Ephemeral filesystem (data may be lost on restart)

- **Starter Plan** ($7/month):
  - Always on
  - Persistent disk (data survives restarts)
  - Better performance

**For testing**: Start with Free plan
**For production**: Use Starter plan or higher

---

### Step 7: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Build the Docker image (or run build commands)
   - Start the service
3. Watch the build logs in real-time
4. Wait for deployment to complete (5-10 minutes first time)

---

### Step 8: Access Your Application

Once deployed, you'll get a URL like:
```
https://job-scheduler-xxxx.onrender.com
```

- **Web UI**: `https://job-scheduler-xxxx.onrender.com`
- **API**: `https://job-scheduler-xxxx.onrender.com/api`
- **Health Check**: `https://job-scheduler-xxxx.onrender.com/api/health`

---

## Frontend Deployment

### ❌ You DON'T Need Separate Frontend Deployment

Your architecture already handles this:
- The Dockerfile builds the React frontend (`npm run build` in frontend/)
- The backend serves the built frontend in production mode
- When `NODE_ENV=production`, Express serves files from `frontend/build/`

**Everything is deployed as ONE service!**

---

## Environment Variables for Render

### Required Variables

```env
NODE_ENV=production
PORT=10000
DB_PATH=/opt/render/project/src/data/jobs.db
```

### Optional Variables (with defaults)

```env
MAX_CONCURRENT_JOBS=1000
JOB_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
LOG_LEVEL=info
ALERT_WEBHOOK=https://your-webhook-url.com/alerts
```

### How to Set Environment Variables in Render

1. Go to your service dashboard
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Enter Key and Value
5. Click **"Save Changes"**
6. Service will automatically redeploy

---

## Important Considerations

### 1. Database Persistence (SQLite)

**⚠️ CRITICAL**: Render's free tier has **ephemeral filesystem**:
- Data in `./data/jobs.db` will be **lost** when service restarts
- Free tier services spin down after 15 minutes of inactivity
- On restart, database is recreated (empty)

**Solutions**:

**Option A: Use Render PostgreSQL (Recommended)**
1. Create a PostgreSQL database in Render
2. Update your code to use PostgreSQL instead of SQLite
3. Database persists across restarts

**Option B: Use Render Disk (Starter Plan)**
- Upgrade to Starter plan ($7/month)
- Includes persistent disk
- Data survives restarts

**Option C: Accept Data Loss (Free Tier)**
- Fine for testing/demos
- Not suitable for production

### 2. Port Configuration

Render automatically sets the `PORT` environment variable. Your code already handles this:
```javascript
port: process.env.PORT || 3000
```

So it will work automatically! But you can set `PORT=10000` in environment variables as a fallback.

### 3. Build Time

First build takes 5-10 minutes because:
- Installing all dependencies
- Building React frontend
- Creating Docker image

Subsequent builds are faster (cached layers).

### 4. Cold Starts (Free Tier)

- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- Subsequent requests are fast

### 5. Custom Domain (Optional)

1. Go to service settings
2. Click **"Custom Domains"**
3. Add your domain
4. Update DNS records as instructed
5. Render provides free SSL certificate

---

## Troubleshooting

### Build Fails

**Error**: `npm ci` fails
- **Solution**: Already fixed in Dockerfile (using `npm install` for frontend)

**Error**: Frontend build fails
- **Check**: Build logs for specific error
- **Solution**: Ensure all dependencies are in `package.json`

### Service Won't Start

**Error**: Port already in use
- **Solution**: Remove `PORT` from environment variables (Render sets it automatically)

**Error**: Database path not found
- **Solution**: Use absolute path: `/opt/render/project/src/data/jobs.db`
- **Or**: Create directory in startup script

### Frontend Not Loading

**Symptom**: API works but frontend shows blank page
- **Check**: `NODE_ENV=production` is set
- **Check**: `frontend/build` directory exists after build
- **Solution**: Check build logs to ensure frontend built successfully

### Database Issues

**Symptom**: Data lost on restart
- **Cause**: Ephemeral filesystem on free tier
- **Solution**: Use PostgreSQL or upgrade to Starter plan

---

## Monitoring & Logs

### View Logs

1. Go to your service dashboard
2. Click **"Logs"** tab
3. View real-time logs
4. Download logs if needed

### Health Checks

Render automatically checks: `https://your-app.onrender.com/api/health`

If health check fails, Render will restart the service.

---

## Updating Your Deployment

### Automatic Updates (Recommended)

1. Push changes to GitHub
2. Render automatically detects changes
3. Triggers new build and deployment
4. Zero-downtime deployment (if configured)

### Manual Updates

1. Go to service dashboard
2. Click **"Manual Deploy"**
3. Select branch/commit
4. Click **"Deploy"**

---

## Cost Estimation

### Free Tier
- **Cost**: $0/month
- **Limitations**: 
  - Spins down after inactivity
  - Ephemeral storage
  - Limited resources

### Starter Plan
- **Cost**: $7/month
- **Benefits**:
  - Always on
  - Persistent disk
  - Better performance
  - 512 MB RAM, 0.5 CPU

### Standard Plan
- **Cost**: $25/month
- **Benefits**:
  - 2 GB RAM, 1 CPU
  - Better for production

---

## Quick Reference Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] New Web Service created
- [ ] Repository connected
- [ ] Environment variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000` (optional, Render sets it)
  - [ ] `DB_PATH=/opt/render/project/src/data/jobs.db`
- [ ] Service deployed successfully
- [ ] Tested Web UI: `https://your-app.onrender.com`
- [ ] Tested API: `https://your-app.onrender.com/api/health`
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Upgraded to Starter plan for persistence

---

## Example Render Configuration Summary

```
Service Name: job-scheduler
Runtime: Docker
Branch: main
Auto-Deploy: Yes

Environment Variables:
  NODE_ENV=production
  PORT=10000
  DB_PATH=/opt/render/project/src/data/jobs.db
  MAX_CONCURRENT_JOBS=1000
  LOG_LEVEL=info

Health Check: /api/health
```

---

## Next Steps After Deployment

1. **Test the deployment**:
   - Visit your Render URL
   - Create a test job
   - Check API endpoints

2. **Set up monitoring** (optional):
   - Add `ALERT_WEBHOOK` for failure notifications
   - Monitor logs regularly

3. **Consider database upgrade**:
   - For production, migrate to PostgreSQL
   - Or upgrade to Starter plan for persistent disk

4. **Custom domain** (optional):
   - Add your domain
   - Configure DNS

5. **Backup strategy**:
   - If using SQLite, regularly export data
   - Or use PostgreSQL with automated backups

---

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Your Project Logs**: Check service dashboard → Logs tab

---

**You're all set!** Your application will be publicly accessible at your Render URL. 🚀

