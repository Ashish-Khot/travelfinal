# 🗺️ NEW MAP INTEGRATION - USAGE EXAMPLES

## Where to Add/Use the Advanced Map

### Option 1: Replace Existing Map in ExploreDestinations

**File:** `client/src/dashboards/components/ExploreDestinations.jsx`

**Current Code (Find & Replace):**

```jsx
// FIND THIS:
import PremiumDestinationMap from './PremiumDestinationMap';

// Current usage:
<PremiumDestinationMap
  destinations={filtered}
  center={{ lat: 36.3932, lng: 25.4615 }}
  zoom={2}
  onMarkerClick={dest => {
    setSelected(dest);
  }}
/>

// REPLACE WITH THIS:
import AdvancedDestinationMap from './AdvancedDestinationMap';

// New usage:
<AdvancedDestinationMap
  initialDestinations={filtered}
  center={{ lat: 36.3932, lng: 25.4615 }}
  zoom={2}
  searchable={true}
  showLegend={true}
  showLayerSwitcher={true}
  enableGeolocation={true}
  onMarkerClick={dest => {
    setSelected(dest);
  }}
/>
```

---

### Option 2: Create New Dedicated Map Page

**File:** `client/src/pages/ExploreMap.jsx` (NEW FILE)

```jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Chip } from '@mui/material';
import AdvancedDestinationMap from '../dashboards/components/AdvancedDestinationMap';
import mapService from '../services/mapService';

export default function ExploreMap() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial popular destinations
  useEffect(() => {
    loadPopularDestinations();
  }, []);

  const loadPopularDestinations = async () => {
    setLoading(true);
    try {
      const popular = await mapService.getPopularDestinations();
      setDestinations(popular);
    } catch (error) {
      console.error('Failed to load popular destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e.key !== 'Enter') return;
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await mapService.searchDestinations(searchQuery);
      setDestinations(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          🗺️ Explore Destinations
        </Typography>
        <Typography variant="body1" sx={{ color: '#6B7280', mb: 3 }}>
          Discover amazing places around the world with an interactive map
        </Typography>

        {/* Search */}
        <Paper elevation={2} sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            placeholder="Search destinations (e.g., 'Paris', 'Taj Mahal', 'Beaches')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearch}
            fullWidth
            size="small"
          />
          <Button
            variant="contained"
            onClick={() => handleSearch({ key: 'Enter' })}
            disabled={loading}
          >
            Search
          </Button>
        </Paper>
      </Box>

      {/* Map Container */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <AdvancedDestinationMap
          initialDestinations={destinations}
          center={{ lat: 20.5937, lng: 78.9629 }}
          zoom={5}
          searchable={true}
          showLegend={true}
          showLayerSwitcher={true}
          enableGeolocation={true}
          onMarkerClick={(marker) => {
            console.log('Selected:', marker);
            // Open detail modal, navigate to details page, etc.
          }}
        />
      </Paper>

      {/* Results Info */}
      <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f9fafb' }}>
        <Typography variant="body2" sx={{ color: '#6B7280' }}>
          📍 Found {destinations.length} destinations
          {searchQuery && ` for "${searchQuery}"`}
        </Typography>
      </Paper>
    </Box>
  );
}
```

---

### Option 3: Embed in Dashboard

**File:** `client/src/dashboards/TouristDashboard.jsx`

```jsx
// Add import
import AdvancedDestinationMap from './components/AdvancedDestinationMap';
import mapService from '../services/mapService';

// Inside component:
const [nearbyDestinations, setNearbyDestinations] = useState([]);

useEffect(() => {
  loadNearbyDestinations();
}, []);

const loadNearbyDestinations = async () => {
  try {
    const location = await mapService.getCurrentLocation();
    const nearby = await mapService.searchNearbyPOI(
      location.lat,
      location.lon,
      null,           // all categories
      10000,          // 10km radius
      15              // 15 results
    );
    setNearbyDestinations(nearby);
  } catch (error) {
    console.error('Failed to load nearby destinations:', error);
  }
};

// In JSX:
<Box sx={{ mt: 4 }}>
  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
    🌍 Nearby Places
  </Typography>
  <AdvancedDestinationMap
    initialDestinations={nearbyDestinations}
    center={{ lat: 20.5937, lng: 78.9629 }}
    zoom={13}
    searchable={true}
    enableGeolocation={true}
    showLegend={true}
  />
</Box>
```

---

## Service Layer Usage Examples

### Example 1: Basic Search

```jsx
import { searchDestinations } from '../services/mapService';

const handleSearch = async (query) => {
  try {
    const results = await searchDestinations(query, null, 15000, 20);
    setDestinations(results);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

### Example 2: Search with Filters

```jsx
import mapService from '../services/mapService';

const handleSearchWithFilters = async (query, minRating, categories) => {
  try {
    const results = await mapService.searchDestinations(query);
    const filtered = mapService.filterDestinations(results, {
      rating: minRating,
      categories: categories,
      search: query
    });
    setDestinations(filtered);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

### Example 3: Geolocation + Nearby Search

```jsx
import mapService from '../services/mapService';

const handleFindNearby = async (poiType = 'restaurant') => {
  try {
    const userLocation = await mapService.getCurrentLocation();
    console.log('User location:', userLocation);

    const nearby = await mapService.searchNearbyPOI(
      userLocation.lat,
      userLocation.lon,
      poiType,
      5000,  // 5km
      20
    );
    setDestinations(nearby);
  } catch (error) {
    console.error('Geolocation failed:', error);
  }
};
```

### Example 4: Get Popular + Details

```jsx
import mapService from '../services/mapService';

const handleGetPopular = async () => {
  try {
    const popular = await mapService.getPopularDestinations();
    setDestinations(popular);
  } catch (error) {
    console.error('Failed to load popular:', error);
  }
};

const handleGetDetails = async (markerXid) => {
  try {
    const details = await mapService.getPlaceDetails(markerXid);
    console.log('Full details:', details);
    // Show in modal/sidebar
  } catch (error) {
    console.error('Failed to get details:', error);
  }
};
```

### Example 5: Distance Calculation

```jsx
import mapService from '../services/mapService';

const handleCalculateDistance = (marker) => {
  const distance = mapService.calculateDistance(
    28.7041,  // user lat
    77.1025,  // user lon
    marker.lat,
    marker.lon
  );
  console.log(`Distance: ${distance.toFixed(2)} km`);
};
```

### Example 6: Advanced Filtering

```jsx
import mapService from '../services/mapService';

const handleAdvancedFilter = (destinations) => {
  const filtered = mapService.filterDestinations(destinations, {
    rating: 4.0,                           // Only 4-star and above
    categories: ['monument', 'museum'],    // Specific types
    distance: 10,                          // Within 10km
    search: 'taj',                         // Text search
    userLat: 28.7041,
    userLon: 77.1025
  });
  return filtered;
};
```

---

## Component Integration Points

### In ExploreDestinations

```jsx
// Before - Line where PremiumDestinationMap is imported
- import PremiumDestinationMap from './PremiumDestinationMap';
+ import AdvancedDestinationMap from './AdvancedDestinationMap';

// Before - Where component is used
- <PremiumDestinationMap
-   destinations={filtered}
-   center={{ lat: 36.3932, lng: 25.4615 }}
-   zoom={2}
-   onMarkerClick={dest => setSelected(dest)}
- />

+ <AdvancedDestinationMap
+   initialDestinations={filtered}
+   center={{ lat: 20.5937, lng: 78.9629 }}
+   zoom={5}
+   searchable={true}
+   showLegend={true}
+   showLayerSwitcher={true}
+   enableGeolocation={true}
+   onMarkerClick={dest => setSelected(dest)}
+ />
```

---

## API Endpoints Summary

All these endpoints are **already working** in your backend:

```javascript
// Search destinations
GET /api/opentripmap/search?query=delhi&limit=20

// Search by coordinates
GET /api/opentripmap/search?lat=28.7&lon=77.1&radius=5000&limit=15

// Get place details
GET /api/opentripmap/place/xid_O2dDZEZlBzwDKhY

// Get popular destinations
GET /api/opentripmap/popular

// Health check
GET /api/opentripmap/health
```

**All handled by mapService.js functions**, so you don't need to call these directly.

---

## Configuration Reference

### Component Props

```javascript
<AdvancedDestinationMap
  // Data
  initialDestinations={array}           // Array of destination objects
  
  // Map settings
  center={{ lat: 20.5937, lng: 78.9629 }}
  zoom={5}
  
  // Features
  searchable={true}                     // Show search bar
  showLegend={true}                    // Show map legend
  showLayerSwitcher={true}             // Show layer switcher
  enableGeolocation={true}             // Show geolocation button
  enableClustering={true}              // Group nearby markers
  
  // Callbacks
  onMarkerClick={(marker) => {}}       // When marker clicked
/>
```

### Destination Object

```javascript
{
  xid: 'O2dDZEZlBzwDKhY',
  name: 'Taj Mahal',
  lat: 27.1751,
  lon: 78.0421,
  image: 'https://...',
  rating: 4.8,
  description: 'Beautiful monument...',
  kinds: 'monument,historic',
  address: 'Agra, India',
  markerColor: '#8B4513',
  icon: '🏛️',
  label: 'Monument'
}
```

---

## Testing Checklist

After integration, verify:

- [ ] Map renders on page
- [ ] Markers display correctly
- [ ] Search works for common queries ("Delhi", "Goa", "Mumbai")
- [ ] Clicking marker shows detail panel
- [ ] Geolocation button works
- [ ] Layer switcher shows 4 different map styles
- [ ] Category legend appears and filters work
- [ ] Save/Favorite button toggles state
- [ ] Share button exists
- [ ] No console errors
- [ ] Works on mobile (responsive)
- [ ] All images load with fallbacks

---

## Troubleshooting Integration

### Issue: "AdvancedDestinationMap is not exported"
**Solution:** Check import path
```jsx
import AdvancedDestinationMap from './AdvancedDestinationMap';
// NOT: './AdvancedDestinationMap.jsx'
```

### Issue: "mapService is not defined"
**Solution:** Make sure mapService.js exists and is properly imported
```jsx
import mapService from './services/mapService';
```

### Issue: Map container shows gray but no tiles
**Solution:** Check height is set on parent, and Leaflet CSS is imported
```jsx
<Box sx={{ height: '600px', width: '100%' }}>
  <AdvancedDestinationMap {...props} />
</Box>
```

### Issue: Search not working
**Solution:** Verify backend is running and API key is set
```bash
# Check backend health
curl http://localhost:3001/api/opentripmap/health

# Check .env file has API key
OPENTRIPMAP_API_KEY=your_key_here
```

---

## Next Steps

1. ✅ Choose integration option (replace, new page, or embed)
2. ✅ Import AdvancedDestinationMap component
3. ✅ Set initialDestinations prop
4. ✅ Configure center and zoom
5. ✅ Enable features you need
6. ✅ Test all functionality
7. ✅ Add onMarkerClick handler if needed
8. ✅ Customize styling (colors, sizes)
9. ✅ Monitor API usage
10. ✅ Gather user feedback

---

**Ready to integrate? Start with Option 1 (Replace in ExploreDestinations)!**

For questions, check: `MAP_INTEGRATION_GUIDE.md`
