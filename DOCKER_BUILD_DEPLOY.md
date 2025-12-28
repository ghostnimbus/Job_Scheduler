# Docker Build & Deployment Guide

## Quick Start

### Build and Run Both Services

```powershell
# Navigate to project directory
cd C:\Users\aweso\Downloads\Prasanna\Proj2\Job-Scheduler

# Build and start both services (backend + frontend)
docker-compose up -d --build
```

This will:
- Build backend image (port 3000)
- Build frontend image (port 3001)
- Start both containers
- Run in background (`-d` flag)

---

## Detailed Build Instructions

### Option 1: Using Docker Compose (Recommended)

#### Build Both Services
```powershell
docker-compose build
```

#### Build Specific Service
```powershell
# Build only backend
docker-compose build backend

# Build only frontend
docker-compose build frontend
```

#### Start Services
```powershell
# Start both services
docker-compose up -d

# Start specific service
docker-compose up -d backend
docker-compose up -d frontend
```

#### Build and Start Together
```powershell
docker-compose up -d --build
```

---

### Option 2: Build Dockerfiles Manually

#### Build Backend
```powershell
docker build -f Dockerfile.backend -t job-scheduler-backend:latest .
```

#### Build Frontend
```powershell
docker build -f Dockerfile.frontend -t job-scheduler-frontend:latest .
```

#### Run Backend Container
```powershell
docker run -d `
  --name job-scheduler-backend `
  -p 3000:3000 `
  -v ${PWD}/data:/app/data `
  -v ${PWD}/logs:/app/logs `
  -e NODE_ENV=production `
  -e PORT=3000 `
  -e FRONTEND_URL=http://localhost:3001 `
  job-scheduler-backend:latest
```

#### Run Frontend Container
```powershell
docker run -d `
  --name job-scheduler-frontend `
  -p 3001:3001 `
  -e REACT_APP_API_URL=http://localhost:3000/api `
  job-scheduler-frontend:latest
```

---

## Docker Compose Commands

### View Running Services
```powershell
docker-compose ps
```

### View Logs
```powershell
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Stop Services
```powershell
docker-compose down
```

### Stop and Remove Volumes
```powershell
docker-compose down -v
```

### Restart Services
```powershell
docker-compose restart
```

### Rebuild After Code Changes
```powershell
docker-compose up -d --build
```

### View Service Status
```powershell
docker-compose ps
```

---

## Access Your Application

After building and starting:

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

---

## Deployment Options

### 1. Local Deployment (Docker Compose)

**Prerequisites:**
- Docker Desktop installed and running

**Steps:**
```powershell
# 1. Navigate to project
cd Job-Scheduler

# 2. Build and start
docker-compose up -d --build

# 3. Verify
docker-compose ps

# 4. Access
# Frontend: http://localhost:3001
# Backend: http://localhost:3000/api
```

---

### 2. Deploy to Render.com

#### Option A: Deploy Both Services Separately

**Backend Service:**
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Settings:
   - **Name**: `job-scheduler-backend`
   - **Root Directory**: Leave empty
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Port**: `3000`
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   DB_PATH=./data/jobs.db
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
5. Deploy

**Frontend Service:**
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Settings:
   - **Name**: `job-scheduler-frontend`
   - **Root Directory**: Leave empty
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile.frontend`
   - **Port**: `3001`
4. Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   ```
5. Deploy

**Important:** Update `FRONTEND_URL` in backend with your frontend URL, and `REACT_APP_API_URL` in frontend with your backend URL.

#### Option B: Use Render Docker Compose (if supported)

Some platforms support docker-compose.yml directly.

---

### 3. Deploy to Railway.app

**Backend:**
1. New Project → Deploy from GitHub
2. Select repository
3. Settings:
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Port**: `3000`
4. Add environment variables
5. Deploy

**Frontend:**
1. New Service → Deploy from GitHub
2. Select repository
3. Settings:
   - **Dockerfile Path**: `Dockerfile.frontend`
   - **Port**: `3001`
4. Add environment variable: `REACT_APP_API_URL`
5. Deploy

---

### 4. Deploy to VPS/Cloud Server

**Prerequisites:**
- Ubuntu/Debian server
- Docker and Docker Compose installed

**Steps:**
```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Clone repository
git clone YOUR_GITHUB_REPO_URL
cd Job-Scheduler

# 3. Build and start
docker-compose up -d --build

# 4. Configure firewall
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 3001/tcp  # Frontend

# 5. Access
# Frontend: http://your-server-ip:3001
# Backend: http://your-server-ip:3000/api
```

---

### 5. Deploy with Custom Domain

**Using Nginx as Reverse Proxy:**

```nginx
# /etc/nginx/sites-available/job-scheduler

# Frontend (Port 3001)
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (Port 3000)
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then update:
- Frontend `REACT_APP_API_URL` to `https://api.yourdomain.com/api`
- Backend `FRONTEND_URL` to `https://yourdomain.com`

---

## Environment Variables

### Backend Environment Variables

```env
NODE_ENV=production
PORT=3000
DB_PATH=./data/jobs.db
MAX_CONCURRENT_JOBS=1000
JOB_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
LOG_LEVEL=info
FRONTEND_URL=http://localhost:3001
```

### Frontend Environment Variables

```env
REACT_APP_API_URL=http://localhost:3000/api
```

**For Production:**
- Backend: `FRONTEND_URL=https://your-frontend-domain.com`
- Frontend: `REACT_APP_API_URL=https://your-backend-domain.com/api`

---

## Troubleshooting

### Build Fails

**Error**: `npm ci` fails
```powershell
# Solution: Clean build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Error**: Port already in use
```powershell
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process or change ports in docker-compose.yml
```

### Services Won't Start

**Check logs:**
```powershell
docker-compose logs backend
docker-compose logs frontend
```

**Check status:**
```powershell
docker-compose ps
```

### Frontend Can't Connect to Backend

**Issue**: CORS errors or connection refused

**Solution:**
1. Verify backend is running: `docker-compose ps`
2. Check backend logs: `docker-compose logs backend`
3. Verify `FRONTEND_URL` in backend matches frontend URL
4. Verify `REACT_APP_API_URL` in frontend matches backend URL
5. For production, use HTTPS URLs

### Database Issues

**Issue**: Database not persisting

**Solution:**
- Check volume mounts in docker-compose.yml
- Verify `./data` directory exists and has permissions
- Check `DB_PATH` environment variable

---

## Production Checklist

- [ ] Both services built successfully
- [ ] Backend accessible on port 3000
- [ ] Frontend accessible on port 3001
- [ ] Frontend can connect to backend API
- [ ] CORS configured correctly
- [ ] Environment variables set for production
- [ ] Database persistence working
- [ ] Logs accessible
- [ ] Health checks working
- [ ] Firewall configured (if on VPS)
- [ ] SSL/HTTPS configured (if using custom domain)

---

## Quick Reference

```powershell
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build --force-recreate

# Remove everything
docker-compose down -v
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose                   │
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │  │
│  │   :3001      │───▶│   :3000      │  │
│  │   (React)    │    │   (Express)  │  │
│  └──────────────┘    └──────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

Both services run independently and communicate via HTTP.

