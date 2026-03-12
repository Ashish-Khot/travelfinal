# 🔐 Environment Configuration Template

## Backend Configuration (.env)

Create a `.env` file in the project root directory:

```bash
# ==========================================
# OpenTripMap API Configuration
# ==========================================

# Get your free API key from: https://opentripmap.com/
# Free tier: 10,000 requests per day
OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here

# ==========================================
# Server Configuration
# ==========================================

# Server Port (default 3001)
PORT=3001

# Environment
NODE_ENV=development

# Database (if using MongoDB)
MONGODB_URI=mongodb://localhost:27017/travel-app
DB_NAME=travel_database

# ==========================================
# Frontend Configuration
# ==========================================

# API Base URL (backend endpoint)
VITE_API_URL=http://localhost:3001

# Map Configuration
VITE_MAP_ZOOM=5
VITE_MAP_CENTER_LAT=20.5937
VITE_MAP_CENTER_LNG=78.9629

# ==========================================
# Authentication (Optional)
# ==========================================

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# ==========================================
# Services (Optional)
# ==========================================

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Stripe (for payments)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ==========================================
# Logging & Analytics
# ==========================================

LOG_LEVEL=debug
ANALYTICS_ENABLED=true
```

---

## Frontend Environment (.env in client folder)

Create `.env` file in `client/` directory:

```bash
# ==========================================
# API Configuration
# ==========================================

VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=15000

# ==========================================
# Map Configuration
# ==========================================

# Default map center (latitude, longitude)
VITE_MAP_CENTER_LAT=20.5937
VITE_MAP_CENTER_LNG=78.9629

# Default zoom level
VITE_MAP_ZOOM=5

# Search radius in meters
VITE_SEARCH_RADIUS=15000

# Max search results
VITE_SEARCH_LIMIT=20

# ==========================================
# Feature Flags
# ==========================================

VITE_ENABLE_GEOLOCATION=true
VITE_ENABLE_LAYER_SWITCHER=true
VITE_ENABLE_CLUSTERING=true
VITE_SHOW_LEGEND=true

# ==========================================
# Build Configuration
# ==========================================

VITE_BUILD_TARGET=modules
```

---

## Docker Configuration (Optional)

### Dockerfile

```dockerfile
# Frontend
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci

# Build
RUN npm run build

# Backend
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
      - OPENTRIPMAP_API_KEY=${OPENTRIPMAP_API_KEY}
      - MONGODB_URI=${MONGODB_URI}
    volumes:
      - ./uploads:/app/uploads

  frontend:
    build:
      context: ./client
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

---

## Production Deployment Guide

### 1. Set Environment Variables on Server

```bash
# SSH into your server
ssh user@your-server.com

# Create .env file
nano .env

# Paste production configuration:
OPENTRIPMAP_API_KEY=your_production_key
NODE_ENV=production
PORT=3001
# ... other vars
```

### 2. Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create travel-app

# Add environment variables
heroku config:set OPENTRIPMAP_API_KEY=your_key

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### 3. Deploy to AWS

```bash
# Install AWS CLI
aws configure

# Create S3 bucket for frontend
aws s3 mb s3://travel-app-frontend

# Build frontend
cd client && npm run build

# Deploy to S3
aws s3 sync dist/ s3://travel-app-frontend

# Deploy backend to EC2/Lambda with environment variables
```

### 4. Deploy to DigitalOcean

```bash
# Create droplet with Node.js
# SSH into droplet
ssh root@your-ip

# Clone repository
git clone https://github.com/your-repo.git
cd travel-app

# Install
npm install
cd client && npm install && npm run build && cd ..

# Create .env with production values
# Start with PM2
npm install -g pm2
pm2 start server.js --name "travel-app"
pm2 startup
pm2 save
```

---

## Testing Configuration

### Local Testing

```bash
# Backend
cd C:\Users\Admin\Desktop\Travel
npm start

# Frontend (in another terminal)
cd client
npm run dev

# Test API
curl http://localhost:3001/api/opentripmap/search?query=Delhi

# Test Frontend
Open http://localhost:5173 in browser
```

### Test with Different API Keys

```bash
# Test with demo key
OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here npm start

# Test with your key
OPENTRIPMAP_API_KEY=your_personal_key npm start
```

---

## Securing API Keys

### Best Practices

1. **Never commit .env to Git:**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use environment variables on server:**
   ```bash
   # Heroku
   heroku config:set OPENTRIPMAP_API_KEY=key

   # Container/Docker
   docker run -e OPENTRIPMAP_API_KEY=key

   # Linux Server
   export OPENTRIPMAP_API_KEY="key"
   ```

3. **Key Rotation:**
   - Regenerate keys monthly
   - Delete old unused keys
   - Monitor usage in OpenTripMap dashboard

4. **Rate Limiting:**
   ```javascript
   // In backend routes
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/opentripmap/', limiter);
   ```

---

## Monitoring API Usage

### Check Daily Quota

```bash
# OpenTripMap provides usage stats at:
# https://opentripmap.com/account

# Or check via API:
curl http://localhost:3001/api/opentripmap/health
```

### Implement Usage Logging

```javascript
// logs/api-usage.log
// Date | Endpoint | Query | Status | Response Time
2024-02-22 10:30:45 | /search | "Delhi" | 200 | 245ms
2024-02-22 10:31:02 | /search | "Mumbai" | 200 | 198ms
```

---

## Backup Configuration

### Auto-backup Environment Variables

```bash
#!/bin/bash
# backup-env.sh

DATE=$(date +%Y%m%d_%H%M%S)
cp .env .env.backup.$DATE

# Keep last 7 backups
find .env.backup.* -mtime +7 -delete

echo "Backup created: .env.backup.$DATE"
```

---

## Support Files

**Files created:**
- ✅ `.env` - Backend configuration
- ✅ `client/.env` - Frontend configuration  
- ✅ `.env.local` - Local overrides
- ✅ `.env.production` - Production values

**Configuration Priority (highest to lowest):**
1. Environment variables (set directly on system)
2. `.env.local` (local overrides)
3. `.env` (default values)
4. Code defaults (fallback)

---

**Version:** 1.0  
**Last Updated:** February 2026
