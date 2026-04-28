
/**
 * Itinerary Generator
 * Creates destination-aware, weather-aware, and budget-aware day plans.
 */

const BudgetIntelligenceService = require('./budgetIntelligenceService');

const BLOCK_LABELS = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const KIND_QUERIES = {
  culture: 'historic',
  nature: 'natural',
  shopping: 'markets',
  entertainment: 'nightclubs,bars,adult,cinemas,theatres,amusements',
  relaxation: 'spas,gardens,parks,beaches,view_points',
  food: 'restaurants,cafes,fast_food,food_courts',
  adventure: 'hiking',
};

const LOCAL_FOODS = {
  kolhapur: ['Misal Pav', 'Tambada Rassa', 'Pandhara Rassa', 'Kolhapuri Thali', 'Solkadhi'],
  pune: ['Misal', 'Vada Pav', 'Bhel', 'Pithla Bhakri', 'Mastani'],
  raigad: ['Konkani Seafood Thali', 'Solkadhi', 'Ukadiche Modak', 'Fish Curry Thali'],
  rajgad: ['Bhakri Meal', 'Pithla', 'Thecha', 'Zunka Bhakri'],
  mumbai: ['Bombay Sandwich', 'Vada Pav', 'Pav Bhaji', 'Seafood Thali'],
  delhi: ['Chole Bhature', 'Butter Chicken', 'Paratha Platter', 'Delhi Chaat Trail'],
  dubai: ['Emirati Breakfast', 'Arabic Mezze', 'Shawarma Platter', 'Seafood Grill'],
  paris: ['French Bistro Meal', 'Croissant & Coffee', 'Cheese Tasting', 'Seine-side Dinner'],
  tokyo: ['Sushi Set', 'Ramen Bowl', 'Izakaya Evening', 'Kaiseki Experience'],
};

const DESTINATION_SEEDS = {
  kolhapur: [
    { name: 'Mahalaxmi Temple', category: 'culture', description: 'Shakti Peetha temple known for early morning darshan.' },
    { name: 'Rankala Lake', category: 'nature', description: 'Scenic lake with a popular promenade.' },
    { name: 'New Palace Museum', category: 'culture', description: 'Royal artifacts and historical exhibits.' },
    { name: 'Shahupuri Market', category: 'shopping', description: 'Famous for Kolhapuri chappals and jewelry.' },
    { name: 'Panhala Fort', category: 'culture', description: 'Historic fort with panoramic views.' },
  ],
  pune: [
    { name: 'Shaniwar Wada', category: 'culture', description: 'Historic fortification in the heart of the city.' },
    { name: 'Aga Khan Palace', category: 'culture', description: 'Landmark with Gandhi-era history.' },
    { name: 'Sinhagad Fort', category: 'adventure', description: 'Popular fort with trekking trails and views.' },
    { name: 'FC Road Market', category: 'shopping', description: 'Bustling shopping and street food strip.' },
  ],
  dubai: [
    { name: 'Burj Khalifa', category: 'sightseeing', description: 'Iconic skyline tower with observation decks.' },
    { name: 'Dubai Mall', category: 'shopping', description: 'Mega mall with aquarium, food halls, and entertainment.' },
    { name: 'Dubai Marina Walk', category: 'relaxation', description: 'Waterfront promenade ideal for evening strolls.' },
    { name: 'Al Fahidi Historical District', category: 'culture', description: 'Restored heritage quarter and museums.' },
  ],
  paris: [
    { name: 'Eiffel Tower', category: 'sightseeing', description: 'Landmark with panoramic city views.' },
    { name: 'Louvre Museum', category: 'culture', description: 'World-famous art museum with vast collections.' },
    { name: 'Montmartre', category: 'culture', description: 'Historic artistic district with basilica viewpoints.' },
    { name: 'Seine River Walk', category: 'relaxation', description: 'Scenic riverside stroll across central Paris.' },
  ],
};

const GENERIC_FALLBACK_TITLES = {
  morning: ['Signature Landmark Circuit', 'Historic Quarter Walk', 'City Icons Exploration', 'Heritage Highlights'],
  lunch: ['Regional Food Break', 'Local Cuisine Session', 'Chef Recommended Lunch', 'Street Food Sampler'],
  afternoon: ['Neighborhood Discovery Trail', 'Cultural Immersion Stop', 'Market and Museum Mix', 'Scenic Detour'],
  evening: ['Sunset and City Lights', 'Waterfront Leisure Hour', 'Cultural Evening Session', 'Night Market Energy'],
  night: ['Late Evening Cafe Stop', 'Nightlife Experience', 'Dinner and Stroll', 'Local Music and Dining'],
};

const CATEGORY_DURATION_RANGES = {
  food: [60, 95],
  culture: [110, 210],
  sightseeing: [90, 180],
  nature: [90, 170],
  shopping: [90, 200],
  entertainment: [100, 190],
  relaxation: [75, 150],
  adventure: [150, 300],
};

const DURATION_HINTS = [
  { pattern: /(theme park|amusement|water park|universal|disney|safari|desert)/i, min: 210, max: 360 },
  { pattern: /(mall|outlet|bazaar|souq|market)/i, min: 130, max: 260 },
  { pattern: /(museum|gallery|fort|palace|castle|heritage|old town)/i, min: 140, max: 260 },
  { pattern: /(lake|beach|garden|park|viewpoint|marina|riverwalk|promenade)/i, min: 90, max: 180 },
  { pattern: /(temple|church|mosque|shrine|cathedral)/i, min: 60, max: 130 },
  { pattern: /(trek|hike|trail|climb|mountain)/i, min: 180, max: 330 },
];

const OUTDOOR_CATEGORIES = new Set(['nature', 'adventure', 'sightseeing']);
const INDOOR_FALLBACK_BY_CATEGORY = {
  nature: 'culture',
  adventure: 'entertainment',
  sightseeing: 'culture',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRating = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric, 0, 5);
};

const shuffle = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const hashString = (value) => {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickVariant = (list, seed) => {
  if (!Array.isArray(list) || list.length === 0) return '';
  const idx = hashString(seed) % list.length;
  return list[idx];
};

const normalizePlaceName = (value) => String(value || '').trim().toLowerCase();
const splitPlacesText = (value) =>
  String(value || '')
    .split(/[,\n;|]/g)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const parseTimeToMinutes = (timeStr) => {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h * 60) + (m || 0);
};

const minutesToTime = (minutes) => {
  const total = clamp(Math.round(minutes), 0, 23 * 60 + 59);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const roundToNearest = (value, step = 15) => Math.round(value / step) * step;

const haversineDistanceKm = (a, b) => {
  if (!a || !b) return null;
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return r * y;
};

const resolveActivityCoordinates = (placeCoords, fallbackCoordinates) => {
  const latitude = Number(placeCoords?.latitude);
  const longitude = Number(placeCoords?.longitude);
  const fallbackLatitude = Number(fallbackCoordinates?.latitude);
  const fallbackLongitude = Number(fallbackCoordinates?.longitude);

  const hasPlaceCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasFallbackCoordinates =
    Number.isFinite(fallbackLatitude) && Number.isFinite(fallbackLongitude);
  const isNullIsland =
    hasPlaceCoordinates && Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001;

  if (hasPlaceCoordinates && !isNullIsland) {
    return { latitude, longitude };
  }

  if (hasFallbackCoordinates) {
    return {
      latitude: fallbackLatitude,
      longitude: fallbackLongitude,
    };
  }

  if (hasPlaceCoordinates) {
    return { latitude, longitude };
  }

  return { latitude: 0, longitude: 0 };
};

const inferTimeBlock = (startMinutes) => {
  if (startMinutes < 720) return 'morning';
  if (startMinutes < 840) return 'lunch';
  if (startMinutes < 1050) return 'afternoon';
  if (startMinutes < 1260) return 'evening';
  return 'night';
};

const ensureUniqueName = (name, usedNames, suffix) => {
  const normalized = normalizePlaceName(name);
  if (!normalized) return name;
  if (!usedNames.has(normalized)) {
    usedNames.add(normalized);
    return name;
  }

  const fallback = suffix ? `${name} ${suffix}` : `${name} (Alternate)`;
  const fallbackNormalized = normalizePlaceName(fallback);
  if (!usedNames.has(fallbackNormalized)) {
    usedNames.add(fallbackNormalized);
    return fallback;
  }

  let counter = 2;
  let candidate = `${name} (${counter})`;
  while (usedNames.has(normalizePlaceName(candidate))) {
    counter += 1;
    candidate = `${name} (${counter})`;
  }
  usedNames.add(normalizePlaceName(candidate));
  return candidate;
};

class ItineraryGenerator {
  constructor({
    aiService,
    placesService,
    hotelsService,
    weatherService,
    wikipediaService,
  }) {
    this.aiService = aiService;
    this.placesService = placesService;
    this.hotelsService = hotelsService;
    this.weatherService = weatherService;
    this.wikipediaService = wikipediaService;
    this.budgetService = new BudgetIntelligenceService();
  }

  normalizePlace(place) {
    if (!place) return null;
    return {
      id: place.id || place.externalPlaceId || place.xid || place.name,
      name: place.name || 'Local attraction',
      description: place.description || '',
      category: place.category || 'sightseeing',
      location: place.location || null,
      rating: normalizeRating(place.rating, 0),
      imageUrl: place.imageUrl || null,
      estimatedCost: place.estimatedCost,
      kinds: place.kinds || place.tags || '',
      openingHours: place.openingHours || place.open_hours || null,
    };
  }

  normalizeInterest(interest) {
    const value = String(interest || '').trim().toLowerCase();
    const map = {
      history: 'culture',
      nightlife: 'entertainment',
      photography: 'sightseeing',
    };
    return map[value] || value;
  }

  getRequestedCategories(interests = []) {
    const allowed = new Set([
      'culture',
      'nature',
      'shopping',
      'entertainment',
      'relaxation',
      'food',
      'adventure',
      'sightseeing',
    ]);
    const normalized = (interests || [])
      .map((item) => this.normalizeInterest(item))
      .filter((item) => allowed.has(item));
    return [...new Set(normalized)];
  }

  extractPreferredPlaces(params = {}) {
    const explicitList = Array.isArray(params.placesToVisit)
      ? params.placesToVisit
      : [];
    const notes = String(params.aiNotes || '');
    const noteMatches = [];
    const patterns = [
      /(?:places?\s*(?:to\s*visit)?|must\s*visit|include|cover)\s*[:\-]\s*([^\n]+)/gi,
    ];

    patterns.forEach((pattern) => {
      let match = pattern.exec(notes);
      while (match) {
        noteMatches.push(match[1]);
        match = pattern.exec(notes);
      }
    });

    const normalized = [...explicitList, ...noteMatches]
      .flatMap((item) => splitPlacesText(item))
      .map((item) => item.replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean);

    const deduped = [];
    const seen = new Set();
    normalized.forEach((item) => {
      const key = normalizePlaceName(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    return deduped.slice(0, 12);
  }

  pickNextPlace(pool, usedIds, usedNames) {
    while (pool.length > 0) {
      const candidate = pool.shift();
      const id = candidate?.id || candidate?.externalPlaceId || candidate?.name;
      const nameKey = normalizePlaceName(candidate?.name);
      if (!id || usedIds.has(id)) continue;
      if (nameKey && usedNames.has(nameKey)) continue;
      usedIds.add(id);
      if (nameKey) usedNames.add(nameKey);
      return candidate;
    }
    return null;
  }

  buildWeatherNote(weatherDay, category) {
    if (!weatherDay || typeof weatherDay !== 'object') return '';
    const rain = Number(weatherDay.rainProbability) || 0;
    const maxTemp = Number(weatherDay.maxTemp);

    if (rain >= 60 && OUTDOOR_CATEGORIES.has(category)) {
      return 'High rain probability expected. Carry rain gear and keep an indoor backup.';
    }
    if (Number.isFinite(maxTemp) && maxTemp >= 34 && OUTDOOR_CATEGORIES.has(category)) {
      return 'Plan hydration breaks due to high daytime heat.';
    }
    return '';
  }

  parseOpeningWindow(openingHours) {
    if (!openingHours) return null;
    const raw = typeof openingHours === 'string'
      ? openingHours
      : openingHours?.value || openingHours?.hours || '';
    if (!raw) return null;

    const match = raw.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!match) return null;

    const openMinutes = parseTimeToMinutes(match[1]);
    let closeMinutes = parseTimeToMinutes(match[2]);
    if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) return null;
    if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

    return {
      openMinutes,
      closeMinutes,
      raw,
    };
  }

  getPoolSizes(pools = {}) {
    return Object.entries(pools).reduce((acc, [key, list]) => {
      acc[key] = Array.isArray(list) ? list.length : 0;
      return acc;
    }, {});
  }

  pickAnyPlace(pools, usedIds, usedNames) {
    const fallbackCategories = [
      'sightseeing',
      'culture',
      'nature',
      'shopping',
      'entertainment',
      'relaxation',
      'adventure',
      'food',
    ];

    for (const category of fallbackCategories) {
      const place = this.pickNextPlace(pools[category] || [], usedIds, usedNames);
      if (place) return place;
    }
    return null;
  }

  pickPlaceForCategory(category, pools, usedIds, usedNames) {
    if (!category) return this.pickAnyPlace(pools, usedIds, usedNames);

    const primary = this.pickNextPlace(pools[category] || [], usedIds, usedNames);
    if (primary) return primary;

    if (category === 'food') return null;

    const fallbackByCategory = {
      culture: ['sightseeing', 'entertainment'],
      sightseeing: ['culture', 'nature'],
      nature: ['sightseeing', 'relaxation'],
      shopping: ['culture', 'entertainment'],
      entertainment: ['shopping', 'culture'],
      relaxation: ['nature', 'culture'],
      adventure: ['nature', 'sightseeing'],
    };

    const fallbackList = fallbackByCategory[category] || ['sightseeing'];
    for (const fallbackCategory of fallbackList) {
      const place = this.pickNextPlace(pools[fallbackCategory] || [], usedIds, usedNames);
      if (place) return place;
    }

    return this.pickNextPlace(pools.sightseeing || [], usedIds, usedNames);
  }

  async enrichPlaceDetails(place, detailsCache = new Map(), detailsBudget = null) {
    const normalized = this.normalizePlace(place);
    if (!normalized) return null;

    const placeId = String(normalized.id || '').trim();
    if (
      !placeId ||
      placeId.startsWith('wiki:') ||
      placeId.startsWith('seed:') ||
      !this.placesService?.getPlaceDetails
    ) {
      return normalized;
    }

    if (detailsCache.has(placeId)) {
      return detailsCache.get(placeId);
    }

    if (detailsBudget && Number(detailsBudget.remaining) <= 0) {
      return normalized;
    }

    let enriched = normalized;
    try {
      if (detailsBudget) {
        detailsBudget.remaining = Math.max(0, Number(detailsBudget.remaining || 0) - 1);
      }
      const details = await this.placesService.getPlaceDetails(placeId);
      if (details) {
        const mergedLocation = {
          ...(normalized.location || {}),
          ...(details.location || {}),
          coordinates: {
            ...(normalized.location?.coordinates || {}),
            ...(details.location?.coordinates || {}),
          },
        };

        enriched = {
          ...normalized,
          name: details.name || normalized.name,
          description: details.description || normalized.description,
          category: details.category || normalized.category,
          location: mergedLocation,
          rating: normalizeRating(details.rating, normalizeRating(normalized.rating, 0)),
          imageUrl: details.imageUrl || normalized.imageUrl || null,
          kinds: details.kinds || details.tags || normalized.kinds || '',
          openingHours: details.openingHours || normalized.openingHours || null,
        };
      }
    } catch (error) {
      // Keep normalized place if details lookup fails.
    }

    detailsCache.set(placeId, enriched);
    return enriched;
  }

  estimateVisitDuration({
    place,
    category,
    travelStyle,
    weatherDay,
    seed,
  }) {
    const safeCategory = String(category || 'sightseeing').toLowerCase();
    const baseRange = CATEGORY_DURATION_RANGES[safeCategory] || [90, 170];
    let minDuration = baseRange[0];
    let maxDuration = baseRange[1];
    const kindsText = Array.isArray(place?.kinds)
      ? place.kinds.join(' ')
      : String(place?.kinds || '');
    const text = `${place?.name || ''} ${place?.description || ''} ${kindsText}`.toLowerCase();

    DURATION_HINTS.forEach((hint) => {
      if (hint.pattern.test(text)) {
        minDuration = Math.max(minDuration, hint.min);
        maxDuration = Math.max(maxDuration, hint.max);
      }
    });

    if ((Number(weatherDay?.rainProbability) || 0) >= 60 && OUTDOOR_CATEGORIES.has(safeCategory)) {
      minDuration = Math.max(60, Math.round(minDuration * 0.82));
      maxDuration = Math.max(minDuration + 30, Math.round(maxDuration * 0.82));
    }

    const styleKey = String(travelStyle || 'solo').toLowerCase();
    const styleMultiplier = {
      adventure: 1.15,
      relaxation: 1.1,
      family: 1.08,
      couple: 1.04,
      group: 0.95,
      budget: 0.9,
      solo: 1,
    }[styleKey] || 1;

    minDuration = Math.round(minDuration * styleMultiplier);
    maxDuration = Math.round(maxDuration * styleMultiplier);

    if (Number(place?.rating) >= 4.5) {
      minDuration = Math.round(minDuration * 1.08);
      maxDuration = Math.round(maxDuration * 1.08);
    }

    const span = Math.max(15, maxDuration - minDuration);
    const variation = hashString(seed) % (span + 1);
    const duration = minDuration + variation;
    return clamp(roundToNearest(duration, 15), 45, 420);
  }

  estimateTravelImpact(previousCoords, nextCoords, destinationProfile) {
    if (!previousCoords || !nextCoords) {
      return { travelMinutes: 0, distanceKm: 0 };
    }

    const distanceKm = haversineDistanceKm(previousCoords, nextCoords);
    if (!Number.isFinite(distanceKm)) {
      return { travelMinutes: 25, distanceKm: 0 };
    }

    const speedKmh = destinationProfile?.destinationType?.includes('metro') ? 22 : 28;
    const minutes = clamp(
      roundToNearest((distanceKm / speedKmh) * 60 + 12, 5),
      15,
      110
    );
    return {
      travelMinutes: minutes,
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
  }
  buildActivityFromPlace({
    place,
    destination,
    dayNumber,
    startMinutes,
    durationMinutes,
    categoryOverride,
    importance,
    fallbackCoordinates,
    travelMinutes,
    distanceKm,
    weatherDay,
    budgetInsights,
    travelStyle,
    numberOfTravelers,
    currency,
    usedNames,
  }) {
    const normalized = this.normalizePlace(place) || {};
    const coords = normalized.location?.coordinates || {};
    const resolvedCoords = resolveActivityCoordinates(coords, fallbackCoordinates);
    const latitude = resolvedCoords.latitude;
    const longitude = resolvedCoords.longitude;
    const category = categoryOverride || normalized.category || 'sightseeing';
    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(startMinutes + durationMinutes);
    const weatherNote = this.buildWeatherNote(weatherDay, category);
    const routeNote =
      Number(travelMinutes) > 0
        ? `Transit from previous stop: ~${Math.round(travelMinutes)} min (${distanceKm || 0} km).`
        : '';

    const notes = [routeNote, weatherNote].filter(Boolean).join(' ');

    return {
      name: ensureUniqueName(
        normalized.name || `${destination} Local Experience`,
        usedNames,
        `(${BLOCK_LABELS[inferTimeBlock(startMinutes)] || 'Stop'})`
      ),
      description:
        normalized.description ||
        `Visit ${normalized.name || 'this place'} in ${destination} and explore what it is known for locally.`,
      category,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: normalized.location?.address || destination,
        city: normalized.location?.city || destination,
      },
      dayNumber,
      timeBlock: inferTimeBlock(startMinutes),
      startTime,
      endTime,
      duration: durationMinutes,
      estimatedCost: this.budgetService.estimateActivityCost({
        category,
        durationMinutes,
        travelers: numberOfTravelers,
        travelStyle,
        budgetStatus: budgetInsights?.budgetStatus,
        destinationProfile: budgetInsights?.destinationProfile,
        currency,
      }),
      importance: importance || 'recommended',
      externalPlaceId: normalized.id || null,
      imageUrl: normalized.imageUrl || null,
      rating: normalizeRating(normalized.rating, 0),
      notes,
      distanceFromPrevious: Number(distanceKm) || 0,
      estimatedTravelTime: Number(travelMinutes) || 0,
      currency,
    };
  }

  buildFallbackActivity({
    destination,
    dayNumber,
    startMinutes,
    category,
    durationMinutes,
    fallbackCoordinates,
    seed,
    weatherDay,
    budgetInsights,
    travelStyle,
    numberOfTravelers,
    currency,
    usedNames,
  }) {
    const block = inferTimeBlock(startMinutes);
    const titlePool = GENERIC_FALLBACK_TITLES[block] || ['Local Experience'];
    const name = `${destination} ${pickVariant(titlePool, seed)}`;
    const weatherNote = this.buildWeatherNote(weatherDay, category);

    return {
      name: ensureUniqueName(name, usedNames, `(Day ${dayNumber})`),
      description: `A curated ${category} experience in ${destination} based on your trip profile.`,
      category,
      location: {
        type: 'Point',
        coordinates: [
          Number(fallbackCoordinates?.longitude) || 0,
          Number(fallbackCoordinates?.latitude) || 0,
        ],
        address: destination,
        city: destination,
      },
      dayNumber,
      timeBlock: block,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(startMinutes + durationMinutes),
      duration: durationMinutes,
      estimatedCost: this.budgetService.estimateActivityCost({
        category,
        durationMinutes,
        travelers: numberOfTravelers,
        travelStyle,
        budgetStatus: budgetInsights?.budgetStatus,
        destinationProfile: budgetInsights?.destinationProfile,
        currency,
      }),
      importance: block === 'morning' ? 'must-do' : 'recommended',
      externalPlaceId: null,
      imageUrl: null,
      rating: 0,
      notes: weatherNote,
      distanceFromPrevious: 0,
      estimatedTravelTime: 0,
      currency,
    };
  }

  buildMealActivity({
    destination,
    dayNumber,
    startMinutes,
    budgetInsights,
    travelStyle,
    numberOfTravelers,
    currency,
    usedNames,
    fallbackCoordinates,
  }) {
    const normalizedDestination = String(destination || '').trim().toLowerCase();
    const localFoods = LOCAL_FOODS[normalizedDestination] || [
      'Regional tasting menu',
      'Local family-style meal',
      'Chef special platter',
      'Street-food sampler',
    ];
    const mealName = pickVariant(
      localFoods,
      `${destination}-food-${dayNumber}-${startMinutes}`
    );
    const durationMinutes = clamp(roundToNearest(65 + (hashString(mealName) % 35), 5), 55, 105);

    return {
      name: ensureUniqueName(`${mealName} in ${destination}`, usedNames, '(Food Stop)'),
      description: `Taste local cuisine and recharge before the next experiences.`,
      category: 'food',
      location: {
        type: 'Point',
        coordinates: [
          Number(fallbackCoordinates?.longitude) || 0,
          Number(fallbackCoordinates?.latitude) || 0,
        ],
        address: destination,
        city: destination,
      },
      dayNumber,
      timeBlock: inferTimeBlock(startMinutes),
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(startMinutes + durationMinutes),
      duration: durationMinutes,
      estimatedCost: this.budgetService.estimateActivityCost({
        category: 'food',
        durationMinutes,
        travelers: numberOfTravelers,
        travelStyle,
        budgetStatus: budgetInsights?.budgetStatus,
        destinationProfile: budgetInsights?.destinationProfile,
        currency,
      }),
      importance: 'recommended',
      externalPlaceId: null,
      imageUrl: null,
      rating: 0,
      notes: '',
      distanceFromPrevious: 0,
      estimatedTravelTime: 0,
      currency,
    };
  }

  getDayPlanCategories(dayNumber, interests, weatherDay, travelStyle, poolSizes = {}) {
    const interestPool = this.getRequestedCategories(interests);
    const fallbackOrder = [
      'culture',
      'nature',
      'sightseeing',
      'shopping',
      'entertainment',
      'relaxation',
      'adventure',
    ];

    const merged = interestPool.length > 0
      ? [...interestPool]
      : [...new Set([...interestPool, ...fallbackOrder])];
    const offset = (dayNumber - 1) % merged.length;
    const rotated = [...merged.slice(offset), ...merged.slice(0, offset)];

    const rainyDay = (Number(weatherDay?.rainProbability) || 0) >= 60;
    const adaptCategory = (category) => {
      if (!rainyDay || !OUTDOOR_CATEGORIES.has(category)) return category;
      return INDOOR_FALLBACK_BY_CATEGORY[category] || 'culture';
    };

    const morningCategory = adaptCategory(rotated[0] || 'culture');
    const afternoonCategory = adaptCategory(rotated[1] || 'sightseeing');
    const eveningCategory = adaptCategory(
      rotated[2] || (String(travelStyle || '').toLowerCase() === 'relaxation' ? 'relaxation' : 'entertainment')
    );

    const styleKey = String(travelStyle || '').toLowerCase();
    const styleWindow = {
      relaxation: [3, 4],
      family: [3, 4],
      group: [4, 5],
      couple: [4, 5],
      adventure: [4, 6],
      solo: [4, 5],
    }[styleKey] || [4, 5];

    const minSlots = styleWindow[0];
    const maxSlots = styleWindow[1];
    const slotCount = clamp(
      minSlots + (hashString(`${dayNumber}-${styleKey}-slots`) % (maxSlots - minSlots + 1)),
      3,
      6
    );

    const categories = [morningCategory, afternoonCategory, eveningCategory];
    let rotateIdx = 3;
    while (categories.length < slotCount) {
      categories.push(
        adaptCategory(
          rotated[rotateIdx % rotated.length] ||
            (interestPool.length > 0 ? rotated[0] : 'sightseeing')
        )
      );
      rotateIdx += 1;
    }

    const hasFoodPool = Number(poolSizes.food || 0) > 0;
    if (hasFoodPool) {
      const mealSlots = slotCount >= 5 ? 2 : 1;
      for (let i = 0; i < mealSlots; i += 1) {
        const insertAt = i === 0
          ? Math.min(1, categories.length)
          : Math.min(categories.length, Math.floor((categories.length * 2) / 3));
        categories.splice(insertAt, 0, 'food');
      }
    }

    // Keep at most two food stops per day to avoid overloading meal-only plans.
    const nonFoodFallback = interestPool.length > 0
      ? interestPool.filter((item) => item !== 'food')
      : [
      'culture',
      'sightseeing',
      'nature',
      'shopping',
      'entertainment',
      'relaxation',
      'adventure',
    ];
    let foodCount = 0;
    for (let i = 0; i < categories.length; i += 1) {
      if (categories[i] !== 'food') continue;
      foodCount += 1;
      if (foodCount <= 2) continue;
      if (nonFoodFallback.length > 0) {
        categories[i] = adaptCategory(
          nonFoodFallback[(i + dayNumber) % nonFoodFallback.length]
        );
      }
    }

    const dayStartByStyle = {
      relaxation: 570, // 09:30
      family: 555, // 09:15
      group: 525, // 08:45
      couple: 540, // 09:00
      adventure: 495, // 08:15
      solo: 525, // 08:45
    };
    const dayStart = dayStartByStyle[styleKey] || 525;

    return categories.map((category, index) => ({
      role: category === 'food' ? 'food-stop' : 'explore',
      category,
      preferredStart:
        dayStart + (index * 160) + (hashString(`${dayNumber}-${index}-${category}`) % 30),
      importance:
        index === 0
          ? 'must-do'
          : index < 3
            ? 'recommended'
            : 'optional',
    }));
  }
  async buildPlacePools(destination, coordinates) {
    const coord = coordinates || {};
    const hasCoords = Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude);

    const baseAttractions = await this.placesService.getPopularAttractions(destination, 48);
    const pools = {
      sightseeing: shuffle(baseAttractions),
      culture: [],
      nature: [],
      shopping: [],
      entertainment: [],
      relaxation: [],
      food: [],
      adventure: [],
    };

    if (hasCoords) {
      const queryPlan = [
        ['culture', KIND_QUERIES.culture, 15000, 20],
        ['nature', KIND_QUERIES.nature, 15000, 20],
        ['shopping', KIND_QUERIES.shopping, 12000, 16],
        ['entertainment', KIND_QUERIES.entertainment, 15000, 16],
        ['relaxation', KIND_QUERIES.relaxation, 12000, 14],
        ['food', KIND_QUERIES.food, 9000, 20],
        ['adventure', KIND_QUERIES.adventure, 25000, 14],
      ];

      for (const [poolKey, kinds, radius, limit] of queryPlan) {
        let places = await this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          kinds,
          radius,
          limit
        );
        if ((places || []).length < Math.max(4, Math.floor(limit / 3))) {
          const expanded = await this.placesService.getAttractionsByKinds(
            coord.latitude,
            coord.longitude,
            kinds,
            Math.max(radius, 35000),
            limit
          );
          places = this.dedupeAndShufflePool([...(places || []), ...(expanded || [])]);
        }
        pools[poolKey] = shuffle(places);
      }
    }

    baseAttractions.forEach((place) => {
      const category = place.category || 'sightseeing';
      if (pools[category] && pools[category].length < 16) {
        pools[category].push(place);
      }
    });

    if (this.wikipediaService) {
      if (hasCoords && pools.sightseeing.length < 10) {
        const wikiPlaces = await this.wikipediaService.getNearbyPlaces(coord.latitude, coord.longitude, 14);
        wikiPlaces.forEach((place) => {
          const category = place.category || 'sightseeing';
          pools.sightseeing.push(place);
          if (pools[category] && pools[category].length < 16) {
            pools[category].push(place);
          }
        });
      }

      if (pools.sightseeing.length < 10) {
        const wikiByTitle = await this.wikipediaService.getPlacesByTitle(
          `${destination} attractions`,
          14
        );
        wikiByTitle.forEach((place) => {
          const category = place.category || 'sightseeing';
          pools.sightseeing.push(place);
          if (pools[category] && pools[category].length < 16) {
            pools[category].push(place);
          }
        });
      }
    }

    Object.keys(pools).forEach((category) => {
      pools[category] = this.dedupeAndShufflePool(pools[category]);
    });

    return pools;
  }

  async buildPreferredPlacePool(destination, coordinates, preferredPlaces = []) {
    if (!Array.isArray(preferredPlaces) || preferredPlaces.length === 0) return [];
    const coord = coordinates || {};
    const hasCoords = Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude);
    if (!hasCoords) return [];

    const matches = [];
    for (const name of preferredPlaces) {
      const results = await this.placesService.searchPlacesByName(
        name,
        coord.latitude,
        coord.longitude,
        22000,
        20
      );

      const scored = (results || [])
        .map((place) => {
          const normalizedName = normalizePlaceName(place?.name);
          const queryKey = normalizePlaceName(name);
          const score = normalizedName === queryKey
            ? 3
            : normalizedName.includes(queryKey) || queryKey.includes(normalizedName)
              ? 2
              : 1;
          return { place, score };
        })
        .sort((a, b) => b.score - a.score)
        .map((item) => item.place)
        .slice(0, 3);

      matches.push(...scored);
    }

    return this.dedupeAndShufflePool(matches).slice(0, 20);
  }

  dedupeAndShufflePool(pool = []) {
    const seen = new Set();
    const unique = [];
    (pool || []).forEach((place) => {
      const id = String(place?.id || place?.externalPlaceId || '').trim();
      const name = normalizePlaceName(place?.name);
      const lat = Number(place?.location?.coordinates?.latitude);
      const lon = Number(place?.location?.coordinates?.longitude);
      const key = id || `${name}:${lat}:${lon}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(place);
    });
    return shuffle(unique);
  }

  async createDayActivities({
    dayNumber,
    destination,
    dayWeather,
    coordinates,
    pools,
    usedIds,
    usedNames,
    interests,
    travelStyle,
    budgetInsights,
    numberOfTravelers,
    currency,
    detailsCache,
    detailsBudget,
    forcedPlacesQueue = [],
  }) {
    const activities = [];
    const poolSizes = this.getPoolSizes(pools);
    const plan = this.getDayPlanCategories(
      dayNumber,
      interests,
      dayWeather,
      travelStyle,
      poolSizes
    );

    if (plan.length === 0) return activities;

    const dayEnd = 22 * 60 + 30;
    let previousCoords = null;
    let cursorMinutes = plan[0]?.preferredStart || 525;

    for (let index = 0; index < plan.length; index += 1) {
      const slot = plan[index];
      const desiredStart = Math.max(cursorMinutes, slot.preferredStart);
      const forcedPlaceCandidate =
        slot.role !== 'food-stop' && forcedPlacesQueue.length > 0
          ? this.pickNextPlace(forcedPlacesQueue, usedIds, usedNames)
          : null;
      const rawPlace =
        forcedPlaceCandidate ||
        this.pickPlaceForCategory(slot.category, pools, usedIds, usedNames);
      if (!rawPlace) continue;

      const place = await this.enrichPlaceDetails(rawPlace, detailsCache, detailsBudget);
      if (!place) continue;

      const nextCoords = resolveActivityCoordinates(
        place?.location?.coordinates || null,
        coordinates
      );
      const travelImpact = this.estimateTravelImpact(
        previousCoords,
        nextCoords,
        budgetInsights?.destinationProfile
      );

      let startMinutes = desiredStart + (travelImpact.travelMinutes || 0);
      let durationMinutes = this.estimateVisitDuration({
        place,
        category: place.category || slot.category,
        travelStyle,
        weatherDay: dayWeather,
        seed: `${destination}-${dayNumber}-${slot.role}-${place?.name || slot.category}`,
      });

      const openingWindow = this.parseOpeningWindow(place?.openingHours);
      if (openingWindow) {
        if (startMinutes < openingWindow.openMinutes) {
          startMinutes = openingWindow.openMinutes;
        }

        const closingCutoff = openingWindow.closeMinutes - 10;
        if (startMinutes >= closingCutoff) {
          continue;
        }
        if (startMinutes + durationMinutes > closingCutoff) {
          durationMinutes = clamp(closingCutoff - startMinutes, 45, durationMinutes);
        }
      }

      if (startMinutes + durationMinutes > dayEnd) {
        const remainingMinutes = dayEnd - startMinutes - 15;
        if (remainingMinutes < 45) continue;
        durationMinutes = clamp(remainingMinutes, 45, durationMinutes);
      }
      if (durationMinutes < 45) continue;

      const placeCategory = String(place.category || '').toLowerCase();
      if (slot.category === 'food' && placeCategory !== 'food') {
        continue;
      }

      const resolvedCategory = placeCategory || slot.category || 'sightseeing';
      const activity = this.buildActivityFromPlace({
        place,
        destination,
        dayNumber,
        startMinutes,
        durationMinutes,
        categoryOverride: resolvedCategory,
        importance: forcedPlaceCandidate ? 'must-do' : slot.importance,
        fallbackCoordinates: coordinates,
        travelMinutes: travelImpact.travelMinutes,
        distanceKm: travelImpact.distanceKm,
        weatherDay: dayWeather,
        budgetInsights,
        travelStyle,
        numberOfTravelers,
        currency,
        usedNames,
      });

      if (openingWindow?.raw) {
        const openingNote = `Typical opening window: ${openingWindow.raw}.`;
        activity.notes = [activity.notes, openingNote].filter(Boolean).join(' ');
      }

      activities.push(activity);
      cursorMinutes =
        parseTimeToMinutes(activity.endTime) + (resolvedCategory === 'food' ? 35 : 25);
      previousCoords = {
        latitude: activity.location.coordinates[1],
        longitude: activity.location.coordinates[0],
      };
    }

    return activities;
  }

  async generate(params) {
    const destination = String(params.destination || '').trim();
    const days = clamp(Number(params.days) || 1, 1, 14);
    const interests = Array.isArray(params.interests) ? params.interests : [];
    const requestedCategories = this.getRequestedCategories(interests);
    const travelStyle = String(params.travelStyle || 'solo').toLowerCase();
    const numberOfTravelers = clamp(Number(params.numberOfTravelers) || 1, 1, 20);
    const currency = String(params.currency || 'INR').toUpperCase();
    const requestedBudget = Number(params.budget) || 0;
    const preferredPlaces = this.extractPreferredPlaces(params);

    const coords = await this.placesService.getCoordinatesForDestination(destination);
    let coordinates = coords ? { latitude: coords.lat, longitude: coords.lon } : null;

    if (!coordinates && this.wikipediaService) {
      const cityOverview = await this.wikipediaService.getCityOverview(destination);
      if (
        cityOverview?.location?.coordinates?.latitude &&
        cityOverview?.location?.coordinates?.longitude
      ) {
        coordinates = {
          latitude: cityOverview.location.coordinates.latitude,
          longitude: cityOverview.location.coordinates.longitude,
        };
      }
    }

    if (!coordinates) {
      throw new Error(
        `Unable to resolve coordinates for destination "${destination}". Please use a specific city or region name.`
      );
    }

    const budgetInsights = this.budgetService.calculateBudgetGuidance({
      destination,
      coordinates,
      days,
      travelers: numberOfTravelers,
      inputBudget: requestedBudget,
      currency,
      travelStyle,
    });

    const [weatherForecast, hotels, pools, preferredPool] = await Promise.all([
      this.weatherService.getDailyForecast(
        coordinates.latitude,
        coordinates.longitude,
        days
      ),
      this.hotelsService.searchHotels(
        coordinates.latitude,
        coordinates.longitude,
        6
      ),
      this.buildPlacePools(destination, coordinates),
      this.buildPreferredPlacePool(destination, coordinates, preferredPlaces),
    ]);

    if (preferredPool.length > 0) {
      pools.sightseeing = this.dedupeAndShufflePool([
        ...preferredPool,
        ...pools.sightseeing,
      ]);
      preferredPool.forEach((place) => {
        const category = String(place?.category || 'sightseeing').toLowerCase();
        if (Array.isArray(pools[category])) {
          pools[category] = this.dedupeAndShufflePool([place, ...pools[category]]);
        }
      });
    }

    const usedIds = new Set();
    const usedNames = new Set();
    const detailsCache = new Map();
    const detailsBudget = { remaining: 8 };
    const activities = [];

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const dayNumber = dayIndex + 1;
      const dayWeather = weatherForecast[dayIndex] || null;
      const dayActivities = await this.createDayActivities({
        dayNumber,
        destination,
        dayWeather,
        coordinates,
        pools,
        usedIds,
        usedNames,
        interests,
        travelStyle,
        budgetInsights,
        numberOfTravelers,
        currency,
        detailsCache,
        detailsBudget,
        forcedPlacesQueue: preferredPool,
      });
      activities.push(...dayActivities);
    }

    const minimumDynamicActivities = Math.max(days * 2, 3);
    if (activities.length < minimumDynamicActivities) {
      throw new Error(
        `Could not build enough live, location-based activities for "${destination}". Please try again or use a more specific city name.`
      );
    }

    const highlights = activities
      .filter((activity) => activity.importance === 'must-do')
      .slice(0, 10)
      .map((activity) => activity.name);

    const aiPlan = await this.aiService.generateItineraryEnhancement({
      destination,
      days,
      budget: budgetInsights.adjustedBudget,
      currency,
      interests,
      placesToVisit: preferredPlaces,
      travelStyle,
      travelers: numberOfTravelers,
      startDate: params.startDate,
      aiNotes: params.aiNotes,
      imageData: params.imageData,
      imageMimeType: params.imageMimeType,
    });

    const narrativeText = await this.aiService.generateItineraryNarrative({
      destination,
      days,
      budget: budgetInsights.adjustedBudget,
      currency,
      interests,
      travelStyle,
      travelers: numberOfTravelers,
      startDate: params.startDate,
      placesToVisit: preferredPlaces,
      activities,
    });

    const totalTravelMinutes = activities.reduce(
      (sum, activity) => sum + (activity.estimatedTravelTime || 0),
      0
    );
    const avgDuration = activities.length
      ? Math.round(
          activities.reduce((sum, activity) => sum + (activity.duration || 0), 0) /
            activities.length
        )
      : 0;
    const livePlaceActivities = activities.filter(
      (activity) =>
        activity.externalPlaceId &&
        !String(activity.externalPlaceId).startsWith('seed:')
    ).length;

    return {
      activities,
      coordinates,
      weatherForecast,
      hotels,
      highlights,
      aiPlan,
      narrativeText,
      budgetInsights,
      metadata: {
        totalActivities: activities.length,
        hasWeather: weatherForecast.length > 0,
        hasHotels: hotels.length > 0,
        usedWikipedia: activities.some((a) =>
          String(a.externalPlaceId || '').startsWith('wiki:')
        ),
        livePlaceActivityCount: livePlaceActivities,
        livePlaceCoverageRatio: activities.length
          ? Math.round((livePlaceActivities / activities.length) * 100) / 100
          : 0,
        averageActivityDurationMinutes: avgDuration,
        totalEstimatedTravelMinutes: totalTravelMinutes,
      },
    };
  }
}

module.exports = ItineraryGenerator;
