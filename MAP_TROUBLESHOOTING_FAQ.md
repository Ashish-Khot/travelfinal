# 🔧 MAP INTEGRATION - TROUBLESHOOTING & FAQ

## Common Issues & Solutions

### 🚨 CRITICAL: Routes Not Working?

**Problem**: Route calculation returns error or shows nothing

**Root Causes & Solutions**:

1. **Missing/Invalid API Key**
   ```
   ❌ REACT_APP_OPENROUTESERVICE_KEY not set
   ❌ Key is invalid or expired
   ❌ .env.local not loaded (restart dev server!)
   ```
   
   **Solution**:
   - Get key from https://openrouteservice.org/
   - Add to `client/.env.local`: `REACT_APP_OPENROUTESERVICE_KEY=your_key`
   - Restart dev server: `npm run dev`
   - Verify in browser console: `console.log(process.env.REACT_APP_OPENROUTESERVICE_KEY)`

2. **Rate Limit Exceeded**
   ```
   ❌ Free tier: 50 requests/day
   ❌ You've used all 50 for the day
   ```
   
   **Solution**:
   - Wait 24 hours, or
   - Upgrade to paid plan at https://openrouteservice.org/

3. **Invalid Coordinates**
   ```
   ❌ Latitude/longitude not numbers
   ❌ Format is [lng, lat] instead of [lat, lng]
   ❌ Coordinates out of Earth bounds
   ```
   
   **Solution**:
   - Check format: `[latitude, longitude]` (NOT longitude first!)
   - Example: `[27.1751, 78.0421]` (Delhi)
   - Verify: -90 to 90 for lat, -180 to 180 for lng

4. **Network/Connectivity**
   ```
   ❌ Internet connection down
   ❌ Firewall blocking API calls
   ❌ Browser CORS settings
   ```
   
   **Solution**:
   - Check internet connection
   - Try in incognito mode
   - Check browser console for CORS errors
   - OpenRouteService CORS is enabled by default

---

### 🗺️ Map Not Showing?

**Problem**: Blank white screen where map should be

**Causes & Solutions**:

1. **Container Has No Height**
   ```jsx
   ❌ <AdvancedMap />  // No height!
   ✅ <AdvancedMap height="600px" />
   ```

2. **Leaflet CSS Not Loaded**
   ```javascript
   ✅ import 'leaflet/dist/leaflet.css' at top of file
   ✅ import 'leaflet-markercluster/dist/MarkerCluster.css'
   ```

3. **Invalid Center Coordinates**
   ```javascript
   ❌ initialCenter="New York"  // String!
   ✅ initialCenter={[40.7128, -74.0060]}  // Numbers!
   ```

4. **JS Error in Console**
   - Open DevTools (F12)
   - Check Console tab for red error messages
   - Fix errors before proceeding

---

### 📍 No Markers Showing?

**Problem**: Map shows but markers are missing

**Troubleshooting**:

1. **Verify Data Format**
   ```javascript
   ❌ destinations={[{name: 'Hotel', location: {x: 27, y: 78}}]}
   ✅ destinations={[{name: 'Hotel', latitude: 27, longitude: 78}]}
   ```

2. **Check Coordinates**
   ```javascript
   // Debug: Log to console
   console.log('Destinations:', destinations);
   
   // Each should have:
   // - id (unique)
   // - name (string)
   // - latitude (number, -90 to 90)
   // - longitude (number, -180 to 180)
   // - type (DESTINATION, HOTEL, etc.)
   ```

3. **Coordinates Out of Bounds**
   ```javascript
   ❌ latitude: 200  // Out of bounds!
   ❌ longitude: 400  // Out of bounds!
   ✅ latitude: 27.1751  // Valid
   ✅ longitude: 78.0421  // Valid
   ```

4. **Too Many Markers?**
   - For 1000+ markers, enable clustering
   - Performance limit ~5000 without clustering
   - Use `showClustering={true}`

---

### 🔍 Search Not Working?

**Problem**: Search input shows no results

**Solutions**:

1. **Minimum Characters**
   - Search requires 2+ characters
   - Type at least 3 for better results

2. **Nominatim Rate Limiting**
   - Max ~3600 requests/hour
   - Built-in 500ms debounce (already done)
   - No API key needed (it's free!)

3. **Check Network Tab**
   - Open DevTools → Network tab
   - Search for location
   - Look for requests to `nominatim.openstreetmap.org`
   - Check if responses are valid JSON

4. **Try Different Search Terms**
   - Instead of: "Street Name"
   - Try: "City, Country"
   - Nominatim works better with complete locations

---

## ❓ Frequently Asked Questions

### Q: Do I need API keys?
**A**: Only for routing (OpenRouteService). Search (Nominatim) and tiles (OpenStreetMap) are FREE with no keys!

### Q: How many API calls per day?
**A**: 
- **Routing**: 50/day (free tier)
- **Search**: 3600/hour (free, no limit/day)
- **Tiles**: Unlimited
- Upgrade routing if you exceed 50/day

### Q: Why is search slow?
**A**: 
- First search: ~1 second (API call)
- Subsequent searches: ~50ms (cached)
- This is normal and expected

### Q: How do I show directions turn-by-turn?
**A**: Route data includes `instructions` property:
```javascript
const route = await getRoute(waypoints);
const instructions = route.routes[0].instructions;
// [
//   {text: "Head north", distance: 150},
//   {text: "Turn right", distance: 200},
// ]
```

### Q: Can I use offline maps?
**A**: Current setup requires internet. For offline:
1. Use offline tile layers (requires setup)
2. Cache tiles locally (advanced)
Free version uses online-only tiles

### Q: How do I change marker colors?
**A**: Edit `src/config/mapConfig.js`:
```javascript
MARKER_CONFIG.TYPES.HOTEL = {
  color: '#Your_Hex_Color',  // e.g., '#FF6B6B'
  icon: '🏨',
  // ...
}
```

### Q: Can I show multiple routes?
**A**: Yes! Alternative routes are calculated automatically:
```javascript
const route = await getRoute(waypoints);
console.log(route.routes); // Array of routes
route.routes[0]; // Best route
route.routes[1]; // Alternative 1
route.routes[2]; // Alternative 2
```

### Q: How do I optimize route order?
**A**: Use the routing service:
```javascript
import { optimizeRoute } from '@/services/routingService';

const optimized = await optimizeRoute(waypoints);
// Returns best order to visit all points
```

### Q: What's the difference between maps?
**A**: All use same underlying data, different styles:
- **OSM** (OpenStreetMap): Detailed, traditional
- **CartoDB Light**: Clean, minimal
- **CartoDB Dark**: Dark theme
- **Satellite**: Aerial view
- **Topo**: Topographic with elevation

---

## 🔍 Debugging Checklist

Copy-paste this into your browser console:

```javascript
// 1. Check if Leaflet is loaded
console.log('Leaflet version:', L ? L.version : 'NOT LOADED');

// 2. Check if OpenRouteService API key is set
console.log('ORS Key:', process.env.REACT_APP_OPENROUTESERVICE_KEY || 'NOT SET');

// 3. Check if service is configured
import { isRoutingConfigured } from '@/services/routingService';
console.log('Routing configured:', isRoutingConfigured());

// 4. Test API connection
fetch('https://nominatim.openstreetmap.org/search?q=Delhi&format=json')
  .then(r => r.json())
  .then(d => console.log('Nominatim works:', d.length > 0))
  .catch(e => console.error('Nominatim error:', e));

// 5. Check cache stats
import { getCacheStats } from '@/services/routingService';
console.log('Cached routes:', getCacheStats());
```

---

## 📊 Performance Optimization

### If Map is Slow:

1. **Reduce marker count**
   - Use `showClustering={true}` (automatic)
   - Filter markers by viewport

2. **Clear cache**
   ```javascript
   import { clearRouteCache, clearGeocodeCache } from '@/services';
   clearRouteCache();
   clearGeocodeCache();
   ```

3. **Disable unused features**
   ```javascript
   // In mapConfig.js
   FEATURES_CONFIG.ENABLE_GEOLOCATION = false;
   FEATURES_CONFIG.ENABLE_HEATMAP = false;
   ```

4. **Monitor in DevTools**
   - Performance tab → Record
   - Do map action
   - Look for long yellow bars (slow operations)

---

## 🔐 Security Notes

### API Key Safety
- ✅ OpenRouteService key is fine in `.env.local` (client-side)
- ✅ Rate limiting protects from abuse (50 requests/day)
- ❌ Never commit `.env.local` to Git
- ❌ In production, log and validate requests server-side

### Data Privacy
- ✅ User clicks are not tracked
- ✅ Location data stays in browser (not sent anywhere unless route is calculated)
- ✅ Nominatim respects privacy (no location logging)
- ✅ All API calls use HTTPS

---

## 📱 Mobile Issues

### Touch Controls Not Working?
```javascript
// Leaflet handles touch automatically
// But make sure touch events aren't blocked:
// ❌ pointer-events: none on map container
```

### Performance on Mobile?
```javascript
// Use clustering on mobile
<AdvancedMap showClustering={true} showSearch={false} />
// Disable search bar if data is large
```

### Screen Too Small?
```css
/* AdvancedMap.module.css handles this */
/* Buttons stack vertically on <480px */
```

---

## 🆘 Emergency Fixes

### Quick Reset
```bash
# Clear everything
rm -rf node_modules/
npm install
npm run dev
```

### Reset React
```bash
# Clear React cache
rm -rf .next/  # if using Next.js
rm -rf dist/   # if using Vite
npm run build
```

### Hard Restart Browser
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## 📞 Getting Help

### Before Asking for Help:
1. Check browser Developer Console (F12)
2. Copy exact error message
3. Check all environment variables are set
4. Try the debugging checklist above
5. Review the full guide: `MAP_INTEGRATION_COMPLETE_GUIDE.md`

### Error Message Template:
```
1. What do you see?
2. What error in console?
3. What are you trying to do?
4. Steps to reproduce?
5. Code sample?
```

---

## 🎯 Common Setup Mistakes

| ❌ Mistake | ✅ Fix |
|-----------|--------|
| Forgot .env.local | Create it in `client/` folder |
| Wrong env var name | Key spelling: `REACT_APP_` prefix required |
| Dev server not restarted | Restart: `npm run dev` |
| Coordinates as strings | Use numbers: `[27, 78]` not `["27", "78"]` |
| No container height | Add: `height="600px"` |
| Wrong import path | Use: `@/components/AdvancedMap` |
| Forgot to install deps | Run: `npm install` |

---

## ✨ Quick Test

Copy this to test everything works:

```jsx
import { AdvancedMap } from '@/components/AdvancedMap';

export function QuickTest() {
  return (
    <AdvancedMap
      destinations={[
        {
          id: 1,
          name: 'Test Location',
          latitude: 27.1751,
          longitude: 78.0421,
          type: 'DESTINATION',
        },
      ]}
      initialCenter={[27.1751, 78.0421]}
      initialZoom={13}
      height="500px"
    />
  );
}
```

If this works, the basic setup is correct!

---

**Still stuck?** Review `MAP_INTEGRATION_COMPLETE_GUIDE.md` for detailed info!
