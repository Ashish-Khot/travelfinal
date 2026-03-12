# 🔐 WHERE TO ADD APIs - Complete Guide

## Summary: Where to Configure All APIs

### 1. OpenTripMap API Key (Required)

**File:** `.env` (create in project root)

```bash
OPENTRIPMAP_API_KEY=your_personal_key_here
```

**Or:** `routes/opentripmap.js` (Line 7) - Backend configuration

```javascript
const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY || 'fallback_key';
```

**Get From:** https://opentripmap.com/
**Free Tier:** 10,000 requests/day
**Setup Time:** 5 minutes

---

### 2. OpenStreetMap Tiles (Included)

**Status:** ✅ Already configured in `mapService.js`

**No configuration needed!** Uses free OpenStreetMap tiles.

**File:** `services/mapService.js` (Lines 267-287)

```javascript
export const TILE_LAYERS = {
  cartodb: { url: 'https://{s}.basemaps.cartocdn.com/...' },
  osm: { url: 'https://{s}.tile.openstreetmap.org/...' },
  satellite: { url: 'https://server.arcgisonline.com/...' },
  terrain: { url: 'https://{s}.tile.opentopomap.org/...' }
};
```

---

### 3. Backend API Endpoints (Already Configured)

**File:** `routes/opentripmap.js` (4 endpoints)

```javascript
// ✅ Already set up - No changes needed!

GET /api/opentripmap/search          // Search destinations
GET /api/opentripmap/place/:xid      // Get place details
GET /api/opentripmap/popular         // Get popular places
GET /api/opentripmap/health          // Check API status
```

**Setup:** Already done ✅

---

### 4. Wikipedia API (Fallback)

**Status:** ✅ Automatically integrated

**Purpose:** Fallback for images and descriptions when OpenTripMap data is incomplete

**File:** `routes/opentripmap.js` (Auto-used in search function)

**No configuration needed!**

---

### 5. Geolocation API (Browser)

**Status:** ✅ Built into browser

**Purpose:** Get user's current location

**File:** `services/mapService.js` → `getCurrentLocation()`

```javascript
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(...);
    }
  });
};
```

**Setup:** Automatically handled by browser

---

## 📋 Complete Configuration Checklist

### Required (Must Do)

- [x] Get OpenTripMap API key from https://opentripmap.com/
- [x] Add to `.env`: `OPENTRIPMAP_API_KEY=key`
- [x] Restart application
- [ ] Backend routes are auto-configured ✅

### Optional (Already Done)

- [x] OpenStreetMap tiles configured
- [x] Wikipedia fallback integrated
- [x] Browser geolocation ready
- [x] CartoDB tiles included
- [x] Satellite tiles included
- [x] Terrain tiles included

### Verification

```bash
# Check OpenTripMap health
curl http://localhost:3001/api/opentripmap/health

# Expected response:
# { "status": "ok", "apiKeyConfigured": true }

# Test search
curl "http://localhost:3001/api/opentripmap/search?query=Delhi&limit=5"

# Expected: List of destinations found
```

---

## 🔗 API Integration Points

### 1. Search Destinations

**Endpoint:** `GET /api/opentripmap/search`  
**Called By:** `mapService.searchDestinations()`  
**Location Used:** `services/mapService.js` Line 38-65  

```javascript
const response = await api.get('/api/opentripmap/search', { params });
```

### 2. Get Place Details

**Endpoint:** `GET /api/opentripmap/place/:xid`  
**Called By:** `mapService.getPlaceDetails()`  
**Location Used:** `services/mapService.js` Line 69-83

```javascript
const response = await api.get(`/api/opentripmap/place/${xid}`);
```

### 3. Get Popular Destinations

**Endpoint:** `GET /api/opentripmap/popular`  
**Called By:** `mapService.getPopularDestinations()`  
**Location Used:** `services/mapService.js` Line 87-98

```javascript
const response = await api.get('/api/opentripmap/popular');
```

### 4. Health Check

**Endpoint:** `GET /api/opentripmap/health`  
**Purpose:** Verify API key is configured  
**Called By:** Manual testing  

```bash
curl http://localhost:3001/api/opentripmap/health
```

---

## 🔑 API Keys Needed

| Service | API Key | Where | Status |
|---------|---------|-------|--------|
| OpenTripMap | ✅ YES | `.env` | **REQUIRED** |
| OpenStreetMap | ❌ NO | - | - |
| Wikipedia | ❌ NO | - | - |
| CartoDB | ❌ NO | - | - |
| Geolocation | ❌ NO | Browser | Built-in |

**Total Keys Needed: 1 (OpenTripMap only)**

---

## 👉 Action Items

### Right Now (5 minutes)
1. Go to https://opentripmap.com/
2. Sign up (free)
3. Get API key
4. Create `.env` file in project root
5. Add line: `OPENTRIPMAP_API_KEY=your_key_here`
6. Save file
7. Restart: `npm start`

### That's All!
Everything else is already configured.

---

## ✨ Optional APIs (Advanced)

If you want to add these later:

### Google Maps (Optional)
```javascript
// In services/mapService.js
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Usage: Directions, Street View, etc.
```

### Mapbox (Optional)
```javascript
// In services/mapService.js
export const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

// Usage: Advanced styling, traffic layer, etc.
```

### Weather API (Optional)
```javascript
// In services/mapService.js
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Usage: Show weather on map
```

### Stripe (Optional - For Payments)
```javascript
// In .env
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

// Usage: Handle bookings/payments
```

---

## 🔒 Security Best Practices

### 1. Never Commit .env
```bash
# .gitignore
.env
.env.local
*.env
```

### 2. Use Environment Variables
```bash
# ✅ Good
const key = process.env.OPENTRIPMAP_API_KEY;

# ❌ Bad
const key = 'your_opentripmap_api_key_here';
```

### 3. Rotate Keys Monthly
```bash
# Delete old key from OpenTripMap dashboard
# Generate new key
# Update .env
# Restart server
```

### 4. Monitor Usage
```bash
# Check daily quota in OpenTripMap dashboard
# Set alerts for high usage
# Example: Alert at 80% usage
```

---

## 📊 API Usage Guide

### Typical Daily Usage

```
1 User:           10-20 API calls/day
100 Users:        1,000-2,000 calls/day
1000 Users:       10,000-20,000 calls/day
```

**Free Tier:** 10,000 calls/day (covers up to 1,000 active users)

### Rate Limits

- **Search:** No limit (handled by OpenTripMap)
- **Place Details:** No limit
- **Popular:** No limit
- **Total:** 10,000 requests/day

---

## ✅ Verification Steps

### Step 1: Check .env File
```bash
cat .env
# Should show:
# OPENTRIPMAP_API_KEY=your_key_here
```

### Step 2: Check Backend
```bash
curl http://localhost:3001/api/opentripmap/health

# Response should be:
# {"status":"ok","apiKeyConfigured":true}
```

### Step 3: Test Search
```bash
curl "http://localhost:3001/api/opentripmap/search?query=delhi&limit=5"

# Response: Array of destination objects
```

### Step 4: Test in Browser
```
Open http://localhost:5173
Navigate to map page
Click search bar
Type "Delhi"
Press Enter

Expected: Map shows Delhi destinations ✅
```

---

## 🚀 Deploy to Production

### 1. Set Environment Variable on Server

```bash
# SSH into server
ssh user@your-server.com

# Set variable
export OPENTRIPMAP_API_KEY="your_production_key"

# Or use platform-specific method
# Heroku: heroku config:set OPENTRIPMAP_API_KEY=key
# AWS: Add to environment variables
# Docker: Add to docker-compose.yml
```

### 2. Verify on Server
```bash
curl https://your-domain.com/api/opentripmap/health
```

### 3. Monitor Usage
```bash
# Check OpenTripMap dashboard daily
# https://opentripmap.com/account
```

---

## 📞 Troubleshooting

### "API key not configured"
**Solution:** Check .env has `OPENTRIPMAP_API_KEY=` with your actual key

### "Search returns empty"
**Solution:** Try major city names: "Delhi", "Mumbai", "Goa"

### "Rate limit exceeded"
**Solution:** Upgrade to paid tier or wait until next day

### "CORS error from OpenTripMap"
**Solution:** Proxy through backend (already done in routes/opentripmap.js)

---

## 🎯 Summary

| Item | Status | What to Do |
|------|--------|-----------|
| OpenTripMap API | ⚠️ TODO | Get key & add to .env |
| Backend Routes | ✅ DONE | Nothing - already set up |
| Tiles | ✅ DONE | Nothing - already set up |
| Wikipedia | ✅ DONE | Nothing - already set up |
| Geolocation | ✅ DONE | Nothing - already set up |

---

**Total Setup Time: 5-10 minutes**

Just add the API key and you're good to go! 🚀

---

**Last Updated:** February 22, 2026
