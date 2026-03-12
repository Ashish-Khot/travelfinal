# 🌍 Explore Destination Module - Setup & Usage Guide

## ✅ What's Working Now

### 1. **Enhanced API with Multiple Fallbacks**
- ✨ OpenTripMap API (primary) - Real-time destination data
- 🔄 Wikipedia API (fallback) - City descriptions and images
- 📍 Popular destinations endpoint - Pre-loaded sample data

### 2. **Smart Search Features**
- Search by city name (e.g., "Pune", "Mumbai", "Delhi")
- Automatic coordinate lookup
- 12 destinations per search (customizable)
- Distance-based filtering with user geolocation

### 3. **Interactive Leaflet Map**
- Beautiful custom markers with gradients
- Real-time marker popups with destination info
- Auto-fit bounds to show all results
- Smooth animations and transitions

---

## 🔑 **Using Your Own OpenTripMap API Key**

### Step 1: Get Your Free API Key
1. Visit: https://opentreetrav.org/dev/signup
2. Create a free account
3. Get your personal API key
4. Copy the key

### Step 2: Configure the API Key

#### **Option A: Using Environment Variables (Recommended for Production)**

Create a `.env` file in your backend root directory:

```bash
# Travel/.env or Travel/server/.env
OPENTRIPMAP_API_KEY=your_api_key_here_5ae2e3f221c3...
NODE_ENV=development
PORT=3001
MONGODB_URI=your_mongodb_uri
```

Then restart the server:
```bash
cd Travel
node app.js
```

#### **Option B: Update the Code Directly (For Testing)**

Edit `Travel/routes/opentripmap.js`:

```javascript
const OPENTRIPMAP_API_KEY = 'your_api_key_here_5ae2e3f221c3...';
```

Then restart the server.

---

## 🧪 **Testing the API**

### Test from Browser Console

```javascript
// Test search endpoint
fetch('http://localhost:3001/api/opentripmap/search?query=Agra&limit=12')
  .then(res => res.json())
  .then(data => console.log('Results:', data))
  .catch(err => console.error('Error:', err));

// Test health check
fetch('http://localhost:3001/api/opentripmap/health')
  .then(res => res.json())
  .then(data => console.log('Health:', data));

// Get popular destinations
fetch('http://localhost:3001/api/opentripmap/popular')
  .then(res => res.json())
  .then(data => console.log('Popular:', data));
```

### Test from Terminal/Command Prompt

```bash
# Test search
curl "http://localhost:3001/api/opentripmap/search?query=Mumbai&limit=10"

# Test health
curl http://localhost:3001/api/opentripmap/health

# Test popular destinations
curl http://localhost:3001/api/opentripmap/popular
```

---

## 🎯 **Cities to Try**

**Major Indian Cities:**
- Delhi
- Mumbai
- Bangalore
- Goa
- Jaipur
- Agra
- Kolkata
- Lucknow
- Hyderabad
- Indore

**Other Cities:**
- Paris
- London
- New York
- Tokyo
- Dubai
- Singapore

---

## 📊 **API Response Format**

### Successful Search Response:
```json
{
  "features": [
    {
      "properties": {
        "name": "Taj Mahal",
        "description": "White marble mausoleum built by Shah Jahan",
        "image": "https://upload.wikimedia.org/...",
        "xid": "N123456",
        "kinds": "Monument,Historic"
      },
      "geometry": {
        "coordinates": [78.0421, 27.1751]
      }
    }
  ],
  "count": 1,
  "query": "Agra",
  "location": {
    "lat": 27.1751,
    "lon": 78.0421
  }
}
```

### Error Response:
```json
{
  "error": "Location \"XYZ\" not found. Try a different city name.",
  "features": [],
  "suggestions": ["Try searching by major city names like: Delhi, Mumbai, Bangalore, Goa, Jaipur, Agra"]
}
```

---

## 🔧 **Troubleshooting**

### Issue: "No destinations found" even after searching

**Solutions:**
1. ✅ Check backend is running: `node app.js` in Travel folder
2. ✅ Verify API key in `routes/opentripmap.js` line 6
3. ✅ Check internet connection
4. ✅ Try searching with major city names (Delhi, Mumbai, Goa)
5. ✅ Check browser console for detailed errors (F12)
6. ✅ Check terminal/server logs for error messages

### Issue: Map is empty but search works

**Solutions:**
1. ✅ Ensure `lat` and `lon` are valid coordinates
2. ✅ Verify Leaflet CSS is loaded (check browser Dev Tools)
3. ✅ Check for JavaScript errors in console (F12 → Console tab)
4. ✅ Try different search results

### Issue: Rate limit errors from OpenTripMap

**Solutions:**
1. ✅ Free tier has ~1000 requests/day limit
2. ✅ Wait a while before retrying
3. ✅ Upgrade to paid plan for more requests
4. ✅ Use Wikipedia fallback instead

---

## 🚀 **Backend Setup Checklist**

```bash
# 1. Start MongoDB
# (MongoDB should be running - check status)

# 2. Install dependencies (if not already done)
cd Travel
npm install

# 3. Create .env file with your API key
echo OPENTRIPMAP_API_KEY=your_key_here > .env

# 4. Start the backend server
node app.js

# Expected output:
# ✅ API is running on port 3001
# ✅ MongoDB connected
# ✅ OpenTripMap API Key loaded: 5ae2e3f221c3...
```

---

## 🎨 **Frontend Features in ExploreDestinations.jsx**

✅ Premium hero banner
✅ Advanced filter section
✅ Grid/List view toggle
✅ Favorite/bookmark destinations
✅ Interactive Leaflet map
✅ Smooth animations
✅ Image gallery in modal
✅ Rich destination details
✅ Share functionality
✅ Responsive design

---

## 📝 **API Endpoints Available**

```
GET  /api/opentripmap/search        - Search destinations by city
GET  /api/opentripmap/place/:xid    - Get detailed info about a place
GET  /api/opentripmap/health        - Check API health status
GET  /api/opentripmap/popular       - Get popular destinations
GET  /api/destination/destinations  - Get all DB destinations
```

---

## 💡 **Performance Tips**

1. **Caching:** Locally cache search results to reduce API calls
2. **Pagination:** Load 12 results initially, then implement pagination
3. **Lazy Loading:** Load images lazily for better performance
4. **Request Timeout:** Set timeouts (5-8 seconds) on API calls
5. **Error Handling:** Always provide fallback UI when API fails

---

## 🔐 **Security Notes**

⚠️ **Never commit API keys to Git!**

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
config/.env
```

---

## 📞 **Support**

If you encounter any issues:

1. Check the server logs in terminal (look for 🔍, ✅, ⚠️, ❌ icons)
2. Open browser DevTools (F12) and check Console tab
3. Test API endpoints directly in terminal with `curl`
4. Verify all services are running (MongoDB, Node.js, Vite)

---

## 🎉 **Next Steps**

1. ✅ Get your OpenTripMap API key
2. ✅ Add it to `.env` file
3. ✅ Restart backend server
4. ✅ Test search functionality
5. ✅ Explore destinations on the interactive map!

Happy exploring! 🌍
