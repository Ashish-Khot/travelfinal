/**
 * ROUTING SERVICE
 * Handles directions, route optimization, and travel time calculations
 * Uses OpenRouteService API for real routing information
 */

import axios from 'axios';
import { ROUTING_CONFIG, getRouteColor, isRoutingConfigured } from '../config/mapConfig';

// Simple in-memory cache
const routeCache = new Map();

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of routeCache.entries()) {
    if (now > value.expireAt) {
      routeCache.delete(key);
    }
  }
};

/**
 * Generate cache key
 */
const generateCacheKey = (coordinates, profile, avoidPolygons) => {
  return `${coordinates.join(',')}_${profile}_${JSON.stringify(avoidPolygons || {})}`;
};

/**
 * Get route from cache if available
 */
const getCachedRoute = (key) => {
  if (!ROUTING_CONFIG.USE_CACHE) return null;
  clearExpiredCache();
  const cached = routeCache.get(key);
  return cached ? cached.data : null;
};

/**
 * Cache route result
 */
const cacheRoute = (key, data) => {
  if (!ROUTING_CONFIG.USE_CACHE) return;
  routeCache.set(key, {
    data,
    expireAt: Date.now() + ROUTING_CONFIG.CACHE_DURATION,
  });
};

/**
 * Format coordinates for OpenRouteService API
 * Expects array of [lat, lng] and converts to [lng, lat]
 */
const formatCoordinates = (coords) => {
  if (Array.isArray(coords[0])) {
    // Array of coordinates
    return coords.map((c) => [c[1], c[0]]); // [lat, lng] -> [lng, lat]
  }
  // Single coordinate
  return [coords[1], coords[0]];
};

/**
 * Get route between two or more points
 * @param {Array<Array>} waypoints - Array of [lat, lng] coordinates
 * @param {Object} options - Route options
 * @returns {Promise<Object>} Route data with geometry, distance, duration
 */
export const getRoute = async (waypoints, options = {}) => {
  try {
    if (!isRoutingConfigured()) {
      throw new Error('OpenRouteService API key not configured');
    }

    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
    const cacheKey = generateCacheKey(waypoints, profile, options.avoidPolygons);

    // Check cache
    const cachedRoute = getCachedRoute(cacheKey);
    if (cachedRoute) {
      console.log('📦 Using cached route');
      return cachedRoute;
    }

    const coordinates = formatCoordinates(waypoints);

    // Build request body
    const requestBody = {
      coordinates,
      profile,
      format: 'geojson',
      locale: 'en',
      elevation: options.elevation || false,
      instructions: options.instructions !== false,
      ...options.routeOptions,
    };

    // Add alternative routes if enabled
    if (ROUTING_CONFIG.ALTERNATIVE_ROUTES.enabled && !options.noAlternatives) {
      requestBody.alternative_routes = {
        share_factor: ROUTING_CONFIG.ALTERNATIVE_ROUTES.shareFactor,
        target_count: ROUTING_CONFIG.ALTERNATIVE_ROUTES.count,
      };
    }

    // Make API request
    const response = await axios.post(
      `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.DIRECTIONS_ENDPOINT}/${profile}`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${ROUTING_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    // Process response
    const routeData = {
      success: true,
      routes: response.data.features.map((feature, index) => ({
        id: index,
        type: 'route',
        geometry: feature.geometry,
        distance: feature.properties.summary.distance, // meters
        duration: feature.properties.summary.duration, // seconds
        ascent: feature.properties.summary.ascent || 0,
        descent: feature.properties.summary.descent || 0,
        distanceKM: (feature.properties.summary.distance / 1000).toFixed(2),
        durationHM: formatDuration(feature.properties.summary.duration),
        color: options.color || getRouteColor(profile),
        isAlternative: index > 0,
        waypoints: feature.geometry.coordinates.map((c) => [c[1], c[0]]), // [lng, lat] -> [lat, lng]
      })),
      waypoints,
      profile,
      timestamp: Date.now(),
    };

    // Cache the result
    cacheRoute(cacheKey, routeData);

    return routeData;
  } catch (error) {
    console.error('❌ Routing Error:', error.message);
    throw {
      success: false,
      error: error.message,
      code: error.response?.status || 'UNKNOWN_ERROR',
    };
  }
};

/**
 * Get isochrone (reachable area) from a point
 * Shows area reachable within specified time/distance
 */
export const getIsochrone = async (center, options = {}) => {
  try {
    if (!isRoutingConfigured()) {
      throw new Error('OpenRouteService API key not configured');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
    const type = options.type || 'time'; // 'time' or 'distance'
    const value = options.value || 300; // seconds or meters
    const intervals = options.intervals || [value];

    const [lng, lat] = formatCoordinates(center);

    const response = await axios.get(
      `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.ISOCHRONE_ENDPOINT}/${profile}`,
      {
        params: {
          locations: `${lng},${lat}`,
          range_type: type,
          range: intervals.join(','),
          interval: value,
          format: 'geojson',
        },
        headers: {
          'Authorization': `Bearer ${ROUTING_CONFIG.API_KEY}`,
          'Accept': 'application/json',
        },
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    return {
      success: true,
      center: [lat, lng],
      type,
      value,
      features: response.data.features,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Isochrone Error:', error.message);
    throw {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get travel matrix (distances/times between multiple points)
 * Useful for calculating travel times from one point to many destinations
 */
export const getTravelMatrix = async (sources, destinations, options = {}) => {
  try {
    if (!isRoutingConfigured()) {
      throw new Error('OpenRouteService API key not configured');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;

    const sourceCoords = formatCoordinates(sources);
    const destCoords = formatCoordinates(destinations);

    const response = await axios.post(
      `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.MATRIX_ENDPOINT}/${profile}`,
      {
        sources: 'all',
        destinations: 'all',
        locations: [...sourceCoords, ...destCoords],
      },
      {
        headers: {
          'Authorization': `Bearer ${ROUTING_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    return {
      success: true,
      distances: response.data.distances, // meters
      durations: response.data.durations, // seconds
      sources: sources,
      destinations: destinations,
      profile,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Travel Matrix Error:', error.message);
    throw {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate total distance and duration for multiple waypoints
 */
export const calculateRouteStats = (route) => {
  if (!route || !route.routes || route.routes.length === 0) {
    return { distance: 0, duration: 0, distanceKM: '0', durationHM: '0h 0m' };
  }

  const mainRoute = route.routes[0];
  return {
    distance: mainRoute.distance,
    duration: mainRoute.duration,
    distanceKM: mainRoute.distanceKM,
    durationHM: mainRoute.durationHM,
  };
};

/**
 * Format seconds to human readable format (e.g., "1h 30m")
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

/**
 * Format meters to human readable format
 */
export const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

/**
 * Optimize route order for visiting multiple destinations
 * Returns waypoints in optimized order
 */
export const optimizeRoute = async (waypoints, options = {}) => {
  try {
    const startPoint = waypoints[0];
    const endPoint = waypoints[waypoints.length - 1];
    const middlePoints = waypoints.slice(1, -1);

    if (middlePoints.length === 0) {
      return { success: true, waypoints, optimized: false };
    }

    // Use matrix to find best order (simple greedy approach)
    const response = await getTravelMatrix(
      [startPoint],
      waypoints.slice(1),
      options
    );

    if (!response.success) throw new Error('Matrix calculation failed');

    // Greedy: always go to nearest unvisited point
    const optimized = [startPoint];
    const visited = new Set([0]);
    let current = startPoint;

    while (visited.size < waypoints.length) {
      let nearest = -1;
      let minDistance = Infinity;

      const currIndex = waypoints.indexOf(current);
      const row = response.durations[0];

      for (let i = 0; i < waypoints.length; i++) {
        if (!visited.has(i) && row[i] < minDistance) {
          minDistance = row[i];
          nearest = i;
        }
      }

      if (nearest === -1) break;
      visited.add(nearest);
      current = waypoints[nearest];
      optimized.push(current);
    }

    return {
      success: true,
      waypoints: optimized,
      optimized: true,
    };
  } catch (error) {
    console.error('❌ Route Optimization Error:', error.message);
    return {
      success: false,
      error: error.message,
      waypoints,
    };
  }
};

/**
 * Clear all cached routes
 */
export const clearRouteCache = () => {
  routeCache.clear();
  console.log('✓ Route cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    totalCachedRoutes: routeCache.size,
    cacheSize: Array.from(routeCache.values()).reduce((sum, item) => sum + JSON.stringify(item).length, 0),
  };
};

export default {
  getRoute,
  getIsochrone,
  getTravelMatrix,
  calculateRouteStats,
  formatDuration,
  formatDistance,
  optimizeRoute,
  clearRouteCache,
  getCacheStats,
};
