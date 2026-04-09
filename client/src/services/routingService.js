/**
 * ROUTING SERVICE
 * Handles directions, route optimization, and travel time calculations
 * Uses OpenRouteService with OSRM fallback for real routing information
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
const generateCacheKey = (coordinates, profile, avoidPolygons, provider = 'auto') => {
  return `${coordinates.join(',')}_${profile}_${provider}_${JSON.stringify(avoidPolygons || {})}`;
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
 * Parse route instructions from OpenRouteService segments
 */
const parseRouteInstructions = (feature) => {
  const segments = feature?.properties?.segments || [];
  const geometryCoords = feature?.geometry?.coordinates || [];
  const latLngCoords = geometryCoords.map((coord) => [coord[1], coord[0]]);
  const instructions = [];
  let stepNumber = 1;

  segments.forEach((segment, segmentIndex) => {
    (segment?.steps || []).forEach((step, stepIndex) => {
      const wayPoints = Array.isArray(step?.way_points) ? step.way_points : [];
      const fromIndex = Number.isInteger(wayPoints[0]) ? wayPoints[0] : 0;
      const toIndex = Number.isInteger(wayPoints[1]) ? wayPoints[1] : fromIndex;

      instructions.push({
        id: `${segmentIndex}-${stepIndex}`,
        stepNumber,
        text: step?.instruction || 'Continue',
        name: step?.name || '',
        type: step?.type ?? null,
        distance: step?.distance || 0,
        distanceText: formatDistance(step?.distance || 0),
        duration: step?.duration || 0,
        durationText: formatDuration(step?.duration || 0),
        fromIndex,
        toIndex,
        fromCoord: latLngCoords[fromIndex] || null,
        toCoord: latLngCoords[toIndex] || latLngCoords[fromIndex] || null,
      });

      stepNumber += 1;
    });
  });

  return instructions;
};

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

const getProfileForOSRM = (profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  if (String(profile).includes('cycling')) return 'cycling';
  if (String(profile).includes('foot')) return 'walking';
  return 'driving';
};

const getAverageSpeedKmh = (profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  const normalized = String(profile || '').toLowerCase();
  if (normalized.includes('foot') || normalized.includes('walk')) return 5;
  if (normalized.includes('cycling') || normalized.includes('bike')) return 16;
  return 42;
};

const estimateDurationByProfile = (distanceMeters, profile) => {
  const speedKmh = getAverageSpeedKmh(profile);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
  const speedMetersPerSecond = (speedKmh * 1000) / 3600;
  return distanceMeters / speedMetersPerSecond;
};

const buildInstructionTextFromOSRM = (step) => {
  const maneuver = step?.maneuver || {};
  const type = maneuver?.type || '';
  const modifier = maneuver?.modifier || '';
  const road = step?.name ? ` onto ${step.name}` : '';

  if (type === 'depart') return `Head ${modifier || 'forward'}${road}`;
  if (type === 'arrive') return 'You have arrived at your destination';
  if (type === 'roundabout') return `Enter roundabout and take exit${road}`;
  if (type === 'merge') return `Merge ${modifier || ''}${road}`.trim();
  if (type === 'fork') return `Keep ${modifier || 'forward'}${road}`;
  if (type === 'end of road') return `Turn ${modifier || 'ahead'}${road}`;
  if (type === 'on ramp') return `Take ramp ${modifier || ''}${road}`.trim();
  if (type === 'off ramp') return `Take exit ${modifier || ''}${road}`.trim();
  if (modifier) return `Turn ${modifier}${road}`;
  if (step?.name) return `Continue on ${step.name}`;
  return 'Continue straight';
};

const parseOSRMInstructions = (route, profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  const shouldEstimateByProfile = getProfileForOSRM(profile) !== 'driving';
  const instructions = [];
  const legs = route?.legs || [];
  let stepNumber = 1;

  legs.forEach((leg, legIndex) => {
    (leg?.steps || []).forEach((step, stepIndex) => {
      const geometry = step?.geometry?.coordinates || [];
      const firstCoord = geometry[0];
      const lastCoord = geometry[geometry.length - 1] || firstCoord;
      const maneuver = step?.maneuver || {};

      const distance = step?.distance || 0;
      const duration = shouldEstimateByProfile
        ? estimateDurationByProfile(distance, profile)
        : (step?.duration || 0);

      instructions.push({
        id: `${legIndex}-${stepIndex}`,
        stepNumber,
        text: buildInstructionTextFromOSRM(step),
        name: step?.name || '',
        type: maneuver?.type || null,
        modifier: maneuver?.modifier || null,
        distance,
        distanceText: formatDistance(distance),
        duration,
        durationText: formatDuration(duration),
        fromIndex: null,
        toIndex: null,
        fromCoord: firstCoord ? [firstCoord[1], firstCoord[0]] : null,
        toCoord: lastCoord ? [lastCoord[1], lastCoord[0]] : null,
      });

      stepNumber += 1;
    });
  });

  return instructions;
};

const normalizeOpenRouteServiceData = (response, options, profile, waypoints) => {
  return {
    success: true,
    provider: 'openrouteservice',
    routes: response.data.features.map((feature, index) => ({
      id: index,
      type: 'route',
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
      duration: feature.properties.summary.duration,
      ascent: feature.properties.summary.ascent || 0,
      descent: feature.properties.summary.descent || 0,
      distanceKM: (feature.properties.summary.distance / 1000).toFixed(2),
      durationHM: formatDuration(feature.properties.summary.duration),
      color: options.color || getRouteColor(profile),
      isAlternative: index > 0,
      segments: feature.properties.segments || [],
      instructions: parseRouteInstructions(feature),
      waypoints: feature.geometry.coordinates.map((coord) => [coord[1], coord[0]]),
    })),
    waypoints,
    profile,
    timestamp: Date.now(),
  };
};

const normalizeOSRMData = (response, options, profile, waypoints) => {
  const routes = response?.data?.routes || [];
  const shouldEstimateByProfile = getProfileForOSRM(profile) !== 'driving';
  return {
    success: true,
    provider: 'osrm',
    routes: routes.map((route, index) => ({
      distance: route.distance || 0,
      duration: shouldEstimateByProfile
        ? estimateDurationByProfile(route.distance || 0, profile)
        : (route.duration || 0),
      id: index,
      type: 'route',
      geometry: route.geometry,
      ascent: 0,
      descent: 0,
      distanceKM: (((route.distance || 0)) / 1000).toFixed(2),
      durationHM: formatDuration(
        shouldEstimateByProfile
          ? estimateDurationByProfile(route.distance || 0, profile)
          : (route.duration || 0)
      ),
      color: options.color || getRouteColor(profile),
      isAlternative: index > 0,
      segments: route.legs || [],
      instructions: parseOSRMInstructions(route, profile),
      waypoints: (route.geometry?.coordinates || []).map((coord) => [coord[1], coord[0]]),
    })),
    waypoints,
    profile,
    timestamp: Date.now(),
  };
};

const getRouteFromOpenRouteService = async (coordinates, waypoints, profile, options) => {
  const requestBody = {
    coordinates,
    profile,
    format: 'geojson',
    locale: 'en',
    elevation: options.elevation || false,
    instructions: options.instructions !== false,
    ...options.routeOptions,
  };

  if (ROUTING_CONFIG.ALTERNATIVE_ROUTES.enabled && !options.noAlternatives) {
    requestBody.alternative_routes = {
      share_factor: ROUTING_CONFIG.ALTERNATIVE_ROUTES.shareFactor,
      target_count: ROUTING_CONFIG.ALTERNATIVE_ROUTES.count,
    };
  }

  const response = await axios.post(
    `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.DIRECTIONS_ENDPOINT}/${profile}`,
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${ROUTING_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
    }
  );

  return normalizeOpenRouteServiceData(response, options, profile, waypoints);
};

const getRouteFromOSRM = async (coordinates, waypoints, profile, options) => {
  const osrmProfile = getProfileForOSRM(profile);
  const coordinateParam = coordinates.map((coord) => `${coord[0]},${coord[1]}`).join(';');
  const alternatives = options.noAlternatives ? 'false' : 'true';

  const response = await axios.get(`${OSRM_BASE_URL}/${osrmProfile}/${coordinateParam}`, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      steps: options.instructions !== false,
      alternatives,
      annotations: false,
    },
    timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
  });

  if (!Array.isArray(response?.data?.routes) || response.data.routes.length === 0) {
    throw new Error('OSRM did not return a route');
  }

  return normalizeOSRMData(response, options, profile, waypoints);
};

/**
 * Get route between two or more points
 * @param {Array<Array>} waypoints - Array of [lat, lng] coordinates
 * @param {Object} options - Route options
 * @returns {Promise<Object>} Route data with geometry, distance, duration
 */
export const getRoute = async (waypoints, options = {}) => {
  try {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
    const provider = options.provider || 'auto';
    const cacheKey = generateCacheKey(waypoints, profile, options.avoidPolygons, provider);

    const cachedRoute = getCachedRoute(cacheKey);
    if (cachedRoute) return cachedRoute;

    const coordinates = formatCoordinates(waypoints);
    let routeData = null;
    let lastError = null;

    if ((provider === 'auto' || provider === 'openrouteservice') && isRoutingConfigured()) {
      try {
        routeData = await getRouteFromOpenRouteService(coordinates, waypoints, profile, options);
      } catch (error) {
        lastError = error;
      }
    }

    if (!routeData && (provider === 'auto' || provider === 'osrm')) {
      routeData = await getRouteFromOSRM(coordinates, waypoints, profile, options);
    }

    if (!routeData) {
      if (lastError?.message) throw lastError;
      throw new Error('No routing provider available');
    }

    cacheRoute(cacheKey, routeData);

    return routeData;
  } catch (error) {
    const message = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Routing failed';
    console.error('Routing Error:', message);
    throw {
      success: false,
      error: message,
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
    console.error('âŒ Isochrone Error:', error.message);
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
    console.error('âŒ Travel Matrix Error:', error.message);
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
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  if (seconds < 60) return '<1m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${Math.max(1, minutes)}m`;
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
    console.error('âŒ Route Optimization Error:', error.message);
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
  console.log('âœ“ Route cache cleared');
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

