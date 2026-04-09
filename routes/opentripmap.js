const express = require('express');
const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

const router = express.Router();
const OPENTRIPMAP_API_KEY = API_CONFIG.OPENTRIPMAP.API_KEY;

function hasOpenTripMapKey() {
  return Boolean(OPENTRIPMAP_API_KEY && !OPENTRIPMAP_API_KEY.startsWith('your-'));
}

function placeholderImage(name) {
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(name || 'Destination')}`;
}

function getPopularDestinations() {
  return [
    {
      name: 'Taj Mahal',
      city: 'Agra',
      country: 'India',
      lat: 27.1751,
      lon: 78.0421,
      rating: 4.8,
      description: 'One of the Seven Wonders of the World, built by Mughal emperor Shah Jahan',
      category: 'Monument,Historic',
    },
    {
      name: 'Gateway of India',
      city: 'Mumbai',
      country: 'India',
      lat: 18.922,
      lon: 72.8347,
      rating: 4.5,
      description: 'Iconic arch monument and principal landmark of Mumbai',
      category: 'Monument,Landmark',
    },
    {
      name: 'Goa Beach',
      city: 'Goa',
      country: 'India',
      lat: 15.3333,
      lon: 73.8333,
      rating: 4.4,
      description: 'Beautiful tropical beaches with white sand and crystal clear waters',
      category: 'Beach,Nature',
    },
    {
      name: 'Jaipur City Palace',
      city: 'Jaipur',
      country: 'India',
      lat: 26.9243,
      lon: 75.823,
      rating: 4.3,
      description: 'Royal residence with Mughal and Western architecture blend',
      category: 'Monument,Heritage',
    },
    {
      name: 'Hawa Mahal',
      city: 'Jaipur',
      country: 'India',
      lat: 26.9239,
      lon: 75.8273,
      rating: 4.6,
      description: 'Pink sandstone structure famous for 953 small windows',
      category: 'Monument,Historic',
    },
  ];
}

function popularFeaturesForQuery(query) {
  const q = (query || '').toLowerCase();
  const popular = getPopularDestinations();
  const matches = popular.filter(
    (d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
  );
  const chosen = matches.length > 0 ? matches : popular;

  return chosen.slice(0, 5).map((d) => ({
    properties: {
      name: d.name,
      description: d.description,
      image: placeholderImage(d.name),
      xid: null,
      kinds: d.category,
    },
    geometry: { coordinates: [d.lon, d.lat] },
  }));
}

async function wikipediaFeature(query, coords = {}) {
  const { lat = null, lon = null } = coords;
  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  const wikiRes = await axios.get(wikiUrl, { timeout: 5000 });
  const data = wikiRes.data;

  if (!data || !data.title || !data.extract) {
    return null;
  }

  return {
    properties: {
      name: data.title,
      description: data.extract,
      image:
        data.thumbnail?.source ||
        data.originalimage?.source ||
        'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
      xid: null,
      kinds: 'Wikipedia',
    },
    geometry: { coordinates: [lon, lat] },
  };
}

router.get('/search', async (req, res) => {
  const { query = '', lat, lon, radius = 10000, limit = 12 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required', features: [] });
  }

  let searchLat = lat ? Number(lat) : null;
  let searchLon = lon ? Number(lon) : null;

  // If API key is not configured, return a reliable fallback response.
  if (!hasOpenTripMapKey()) {
    try {
      const fallback = await wikipediaFeature(query);
      if (fallback) {
        return res.json({
          features: [fallback],
          count: 1,
          query,
          provider: 'wikipedia-fallback',
          location: { lat: null, lon: null },
        });
      }
    } catch {
      // Ignore and continue to static fallback.
    }

    const features = popularFeaturesForQuery(query);
    return res.json({
      features,
      count: features.length,
      query,
      provider: 'offline-fallback',
      location: { lat: null, lon: null },
    });
  }

  try {
    // Resolve coordinates if not provided.
    if (searchLat == null || searchLon == null) {
      try {
        const geoUrl = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(query)}&apikey=${OPENTRIPMAP_API_KEY}`;
        const geoRes = await axios.get(geoUrl, { timeout: 5000 });

        if (geoRes.data && geoRes.data.lat != null && geoRes.data.lon != null) {
          searchLat = Number(geoRes.data.lat);
          searchLon = Number(geoRes.data.lon);
        } else {
          throw new Error('City not found in OpenTripMap geoname');
        }
      } catch {
        const fallback = await wikipediaFeature(query);
        if (fallback) {
          return res.json({
            features: [fallback],
            count: 1,
            query,
            provider: 'wikipedia-fallback',
            location: { lat: null, lon: null },
          });
        }

        const features = popularFeaturesForQuery(query);
        return res.json({
          features,
          count: features.length,
          query,
          provider: 'offline-fallback',
          location: { lat: null, lon: null },
        });
      }
    }

    let features = [];

    try {
      const radiusUrl = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${searchLon}&lat=${searchLat}&limit=${limit}&format=geojson&apikey=${OPENTRIPMAP_API_KEY}`;
      const { data } = await axios.get(radiusUrl, { timeout: 8000 });
      features = data.features || [];

      // Enrich features with image data from OpenTripMap details or Wikipedia.
      features = await Promise.all(
        features.map(async (feature) => {
          const placeName = feature.properties?.name || 'Destination';

          if (feature.properties?.xid) {
            try {
              const detailUrl = `https://api.opentripmap.com/0.1/en/places/xid/${feature.properties.xid}?apikey=${OPENTRIPMAP_API_KEY}`;
              const detailRes = await axios.get(detailUrl, { timeout: 3000 });
              if (detailRes.data?.preview?.source) {
                feature.properties.image = detailRes.data.preview.source;
                return feature;
              }
            } catch {
              // Continue to Wikipedia fallback.
            }
          }

          try {
            const wiki = await wikipediaFeature(placeName, { lat: searchLat, lon: searchLon });
            if (wiki?.properties?.image) {
              feature.properties.image = wiki.properties.image;
            }
          } catch {
            // Ignore fallback errors for individual features.
          }

          if (!feature.properties.image) {
            feature.properties.image = placeholderImage(placeName);
          }

          return feature;
        })
      );
    } catch {
      const fallback = await wikipediaFeature(query, { lat: searchLat, lon: searchLon });
      if (fallback) {
        features = [fallback];
      } else {
        features = popularFeaturesForQuery(query);
      }
    }

    return res.json({
      features,
      count: features.length,
      query,
      location: { lat: searchLat, lon: searchLon },
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to search destinations',
      details: err.message,
      features: [],
    });
  }
});

router.get('/place/:xid', async (req, res) => {
  const { xid } = req.params;

  if (!hasOpenTripMapKey()) {
    return res.status(503).json({ error: 'OpenTripMap API key is not configured.' });
  }

  try {
    const url = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OPENTRIPMAP_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch place details',
      details: err.message,
    });
  }
});

router.get('/health', (req, res) => {
  const configured = hasOpenTripMapKey();
  return res.json({
    status: 'ok',
    apiKeyConfigured: configured,
    apiKeyPreview: configured ? `${OPENTRIPMAP_API_KEY.substring(0, 6)}...` : 'missing',
  });
});

router.get('/popular', (_req, res) => {
  return res.json(getPopularDestinations());
});

module.exports = router;
