# 🗺️ Advanced Map Integration Guide

## Overview
This guide explains the professional map integration using **Leaflet + OpenStreetMap + OpenTripMap** and where to configure APIs.

---

## 📋 Architecture

### Components Structure
```
AdvancedDestinationMap.jsx        ← Main map component (production-ready)
├── MapLegend.jsx                 ← Legend & category filters
└── mapService.js                 ← All map-related API calls & utilities
```

### API Flow
```
Frontend (React)
    ↓
MapService.js (API Abstraction)
    ↓
Backend Routes (Node.js/Express)
    ↓
External APIs
    ├── OpenTripMap (Destinations & POIs)
    ├── OpenStreetMap (Tiles)
    ├── CartoDB (Alternative tiles)
    └── Wikipedia (Fallback info & images)
```

---

## 🔧 API Configuration Guide

### 1. OpenTripMap API Key

**📍 Location:** `routes/opentripmap.js` (Line 7)

```javascript
// Current Configuration (PRODUCTION KEY - SHARED)
const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY || 'your_opentripmap_api_key_here';
```

**⚠️ IMPORTANT - Security Considerations:**

1. **Get Your Own Free API Key:**
   - Visit: https://opentripmap.com/
   - Sign up for free account
   - Get your API key from dashboard
   - Supports 10,000 requests/day on free tier

2. **Environment Variable Setup:**
   ```bash
   # Create .env file in project root
   OPENTRIPMAP_API_KEY=your_personal_api_key_here
   ```

3. **Backend Configuration:**
   ```javascript
   // routes/opentripmap.js - Line 7
   const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY || 'fallback_key';
   ```

### 2. OpenTripMap Backend API Endpoints

**File:** `routes/opentripmap.js`

Available endpoints already configured:

#### **Search Destinations**
```
GET /api/opentripmap/search?query=delhi&limit=20
Response: Features with properties (name, lat, lon, image, rating, etc.)
```

**Usage in Frontend:**
```javascript
import { searchDestinations } from '../services/mapService';

const results = await searchDestinations('Delhi', null, 15000, 20);
```

#### **Get Place Details**
```
GET /api/opentripmap/place/:xid
Response: Detailed place information
```

**Usage:**
```javascript
import { getPlaceDetails } from '../services/mapService';

const details = await getPlaceDetails('xid_123');
```

#### **Popular Destinations**
```
GET /api/opentripmap/popular
Response: List of popular destinations
```

**Usage:**
```javascript
import { getPopularDestinations } from '../services/mapService';

const popular = await getPopularDestinations();
```

### 3. Tile Layer Providers

**File:** `services/mapService.js` - Lines 267-287

#### Available Tile Layers:

```javascript
export const TILE_LAYERS = {
  cartodb: {
    url: 'https://{s}.basemaps.cartocdn.com/positron/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CartoDB',
    name: 'CartoDB'
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'OpenStreetMap'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    name: 'Satellite'
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap',
    name: 'Terrain'
  }
};
```

**To Add Custom Tile Layer:**
```javascript
// In mapService.js
export const TILE_LAYERS = {
  // ... existing layers
  custom: {
    url: 'https://your-tile-provider.com/{z}/{x}/{y}.png',
    attribution: 'Your Attribution',
    name: 'Custom Layer'
  }
};
```

### 4. POI Categories

**File:** `services/mapService.js` - Lines 12-36

Currently configured categories with colors and icons:
```javascript
const POI_CATEGORIES = {
  monument: { color: '#8B4513', icon: '🏛️', label: 'Monument' },
  historic: { color: '#D2691E', icon: '🏰', label: 'Historic Site' },
  museum: { color: '#4169E1', icon: '🎨', label: 'Museum' },
  nature: { color: '#228B22', icon: '🌿', label: 'Nature' },
  beach: { color: '#1E90FF', icon: '🏖️', label: 'Beach' },
  park: { color: '#32CD32', icon: '🌳', label: 'Park' },
  temple: { color: '#FF6347', icon: '🙏', label: 'Temple' },
  // ... more categories
};
```

**To Add Custom POI Category:**
```javascript
const POI_CATEGORIES = {
  // ... existing categories
  winery: { color: '#722F37', icon: '🍷', label: 'Winery' }
};
```

---

## 📝 How to Use the Map Component

### Basic Usage

```jsx
import AdvancedDestinationMap from './components/AdvancedDestinationMap';

function MyPage() {
  const destinations = [
    {
      xid: '123',
      name: 'Taj Mahal',
      lat: 27.1751,
      lon: 78.0421,
      image: 'https://...',
      rating: 4.8,
      description: 'Beautiful monument...',
      kinds: 'monument,historic'
    }
  ];

  return (
    <AdvancedDestinationMap
      initialDestinations={destinations}
      center={{ lat: 20.5937, lng: 78.9629 }}
      zoom={5}
      searchable={true}
      showLegend={true}
      showLayerSwitcher={true}
      enableGeolocation={true}
      onMarkerClick={(marker) => console.log('Clicked:', marker)}
    />
  );
}
```

### With Search

```jsx
const [destinations, setDestinations] = useState([]);

const handleSearch = async (query) => {
  const results = await searchDestinations(query);
  setDestinations(results);
};
```

### With Geolocation

```jsx
const handleNearbyPlaces = async () => {
  const location = await getCurrentLocation();
  const nearby = await searchNearbyPOI(
    location.lat,
    location.lon,
    'restaurant',
    5000,
    15
  );
  setDestinations(nearby);
};
```

---

## 🔑 API Keys Summary

| API | Key Location | Free Tier | Setup |
|-----|-------------|-----------|-------|
| OpenTripMap | `OPENTRIPMAP_API_KEY` env var | 10k/day | https://opentripmap.com |
| OpenStreetMap | None needed | ✓ Unlimited | Built-in |
| CartoDB Tiles | None needed | ✓ Unlimited | Built-in |
| Wikipedia | None needed | ✓ Unlimited | Built-in (fallback) |

---

## 🌐 Backend API Endpoints Summary

```javascript
// Search destinations
await mapService.searchDestinations('Delhi', null, 15000, 20);
// Calls: GET /api/opentripmap/search?query=Delhi&limit=20

// Get place details
await mapService.getPlaceDetails('xid_123');
// Calls: GET /api/opentripmap/place/xid_123

// Get popular destinations
await mapService.getPopularDestinations();
// Calls: GET /api/opentripmap/popular

// Search by coordinates
await mapService.searchNearbyPOI(lat, lon, 'restaurant', 5000, 15);
// Calls: GET /api/opentripmap/search?lat=...&lon=...&limit=15

// Get user location
await mapService.getCurrentLocation();
// Uses browser Geolocation API

// Filter destinations
const filtered = mapService.filterDestinations(destinations, {
  rating: 4.0,
  categories: ['monument', 'museum'],
  distance: 10,
  search: 'taj'
});
```

---

## 🚀 Performance & Optimization

### Implemented Features

1. **Marker Clustering** - Auto-groups nearby markers
2. **Lazy Loading** - Images load on demand
3. **Caching** - Results cached in component state
4. **Debouncing** - Search requests debounced
5. **Error Handling** - Graceful fallbacks
6. **Image Optimization** - Placeholder images for missing images

### To Optimize Further

```javascript
// Implement Redis caching for API responses
// Add request throttling to prevent API abuse
// Use Web Workers for heavy calculations
// Implement virtual scrolling for large lists
// Add pagination to search results
```

---

## 🔍 Testing the Integration

### Test Endpoints

```bash
# Check OpenTripMap health
curl http://localhost:3001/api/opentripmap/health

# Search destinations
curl "http://localhost:3001/api/opentripmap/search?query=Agra&limit=5"

# Get popular destinations
curl http://localhost:3001/api/opentripmap/popular

# Get place details
curl "http://localhost:3001/api/opentripmap/place/xid_O2dDZEZlBzwDKhY"
```

### In Browser Console

```javascript
// Import map service
import mapService from './services/mapService';

// Search
const results = await mapService.searchDestinations('Mumbai');
console.log(results);

// Get current location
const loc = await mapService.getCurrentLocation();
console.log(loc);

// Filter
const filtered = mapService.filterDestinations(results, { rating: 4.5 });
console.log(filtered);
```

---

## 📚 File Locations Reference

| File | Purpose | Key Functions |
|------|---------|----------------|
| `services/mapService.js` | Map API service layer | searchDestinations, getPlaceDetails, filterDestinations |
| `components/AdvancedDestinationMap.jsx` | Main map component | Map rendering, markers, interactions |
| `components/MapLegend.jsx` | Legend & filters | Category filtering, legend UI |
| `routes/opentripmap.js` | Backend routes | API endpoints, data transformation |

---

## 🛠️ Adding Custom Features

### Example: Add Heatmap Layer

```javascript
// In AdvancedDestinationMap.jsx
import L from 'leaflet-heatmap'; // Install: npm install leaflet-heatmap

const addHeatmap = (markers) => {
  const heatData = markers.map(m => [m.lat, m.lon, m.rating || 1]);
  L.heatLayer(heatData, { radius: 25 }).addTo(map.current);
};
```

### Example: Add Route/Drawing Tools

```javascript
// Install: npm install leaflet-draw @types/leaflet-draw

import L from 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

L.drawControl = new L.Control.Draw().addTo(map.current);
```

### Example: Add Weather Overlay

```javascript
// Add weather tiles from OpenWeatherMap
const weatherLayer = L.tileLayer(
  'https://maps.openweathermap.org/maps/2.0/weather?...',
  { opacity: 0.5 }
).addTo(map.current);
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **Markers not showing:**
   - Check lat/lon values are valid numbers
   - Verify coordinates are [lat, lon] not [lon, lat]

2. **Search not working:**
   - Check OPENTRIPMAP_API_KEY is set
   - Verify backend is running (port 3001)
   - Check browser console for errors

3. **Images not loading:**
   - Check image URLs are valid
   - Images use HTTPS (not HTTP)
   - Check CORS headers if external images

4. **Map not rendering:**
   - Ensure container has height/width
   - Check Leaflet CSS is imported
   - Verify map ref is correctly assigned

---

## 🎯 Next Steps

1. ✅ Replace shared OpenTripMap key with your own
2. ✅ Integrate map into destination search pages
3. ✅ Add user reviews/ratings integration
4. ✅ Implement booking functionality with maps
5. ✅ Add offline map support (Service Workers)
6. ✅ Implement real-time location tracking
7. ✅ Add social sharing features
8. ✅ Analytics tracking for popular destinations

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Status:** Production Ready ✅
