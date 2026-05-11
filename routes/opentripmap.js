const express = require('express');
const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

const router = express.Router();

const REQUEST_TIMEOUT = Number(API_CONFIG.DEFAULTS?.REQUEST_TIMEOUT || 10000);
const DEFAULT_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg';
const USER_AGENT = 'travel2-platform/1.0 (destination-explorer)';

const OPENTRIPMAP_API_KEY = String(API_CONFIG.OPENTRIPMAP?.API_KEY || '').trim();
const OPENTRIPMAP_BASE_URL = String(
  API_CONFIG.OPENTRIPMAP?.BASE_URL || 'https://api.opentripmap.com/0.1/en/places'
).trim();

const GEOAPIFY_API_KEY = String(API_CONFIG.GEOAPIFY?.API_KEY || '').trim();
const GEOAPIFY_BASE_URL = String(API_CONFIG.GEOAPIFY?.BASE_URL || 'https://api.geoapify.com/v1').trim();

const FOURSQUARE_API_KEY = String(API_CONFIG.FOURSQUARE?.API_KEY || '').trim();
const FOURSQUARE_BASE_URL = String(API_CONFIG.FOURSQUARE?.BASE_URL || 'https://api.foursquare.com/v3').trim();

const UNSPLASH_API_KEY = String(API_CONFIG.UNSPLASH?.API_KEY || '').trim();
const UNSPLASH_BASE_URL = String(API_CONFIG.UNSPLASH?.BASE_URL || 'https://api.unsplash.com').trim();

const GEMINI_API_KEY = String(API_CONFIG.GEMINI?.API_KEY || '').trim();
const GEMINI_BASE_URL = String(
  API_CONFIG.GEMINI?.BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
).trim();
const GEMINI_MODEL = String(API_CONFIG.GEMINI?.MODEL || 'gemini-2.5-flash').trim();

const unsplashCache = new Map();

function hasRealKey(value) {
  const key = String(value || '').trim();
  if (!key) return false;
  return !/^your[-_]/i.test(key) && !/^replace[-_]/i.test(key);
}

function hasOpenTripMapKey() {
  return hasRealKey(OPENTRIPMAP_API_KEY);
}

function hasGeoapifyKey() {
  return hasRealKey(GEOAPIFY_API_KEY);
}

function hasFoursquareKey() {
  return hasRealKey(FOURSQUARE_API_KEY);
}

function hasUnsplashKey() {
  return hasRealKey(UNSPLASH_API_KEY);
}

function hasGeminiKey() {
  return hasRealKey(GEMINI_API_KEY);
}

function toFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text = '', phrase = '') {
  const source = normalizeLower(text);
  const target = normalizeLower(phrase);
  if (!source || !target) return false;
  const regex = new RegExp(`\\b${escapeRegExp(target)}\\b`, 'i');
  return regex.test(source);
}

function hasLocationCoords(location) {
  return Number.isFinite(location?.lat) && Number.isFinite(location?.lon);
}

function placeholderImage(name) {
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(name || 'Destination')}`;
}

function titleCase(input) {
  return String(input || '')
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const output = [];

  for (const item of items || []) {
    if (!item) continue;
    const key = keyFn(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

const TAG_RULES = [
  {
    labels: ['Hill Station', 'Mountain', 'Nature'],
    tokens: [
      'hill',
      'mountain',
      'peak',
      'highland',
      'viewpoint',
      'trek',
      'hiking',
      'alpine',
      'snow',
    ],
  },
  {
    labels: ['Beach', 'Island', 'Nature'],
    tokens: ['beach', 'shore', 'coast', 'sea', 'island', 'bay', 'reef', 'lagoon'],
  },
  {
    labels: ['Famous Lake', 'Lake', 'Nature'],
    tokens: ['lake', 'reservoir', 'lagoon'],
  },
  {
    labels: ['Waterfall', 'Nature'],
    tokens: ['waterfall', 'falls', 'cascade'],
  },
  {
    labels: ['Heritage', 'Historic', 'Landmark'],
    tokens: ['heritage', 'historic', 'monument', 'museum', 'palace', 'archaeology'],
  },
  {
    labels: ['Temple', 'Heritage'],
    tokens: ['temple', 'shrine', 'church', 'mosque', 'cathedral', 'synagogue'],
  },
  {
    labels: ['Fort', 'Historic', 'Landmark'],
    tokens: ['fort', 'fortress', 'castle', 'citadel'],
  },
  {
    labels: ['City'],
    tokens: ['city', 'downtown', 'street', 'urban'],
  },
  {
    labels: ['Hotel'],
    tokens: ['hotel', 'resort', 'hostel', 'lodging', 'accommodation'],
  },
  {
    labels: ['Cafe', 'Food'],
    tokens: ['cafe', 'coffee', 'restaurant', 'food', 'dining'],
  },
];

const SEARCH_THEME_CONFIG = [
  {
    label: 'Beach',
    aliases: ['beach', 'beaches', 'coast', 'coastal', 'shore', 'seaside', 'island', 'islands', 'sea'],
    otmKinds: ['beaches', 'islands', 'natural'],
    fsqTerms: ['beach', 'beach resort', 'coastline'],
  },
  {
    label: 'Hill Station',
    aliases: ['hill station', 'hill stations', 'mountain', 'mountains', 'hills', 'trek', 'trekking', 'hiking'],
    otmKinds: ['mountains', 'natural'],
    fsqTerms: ['mountain viewpoint', 'scenic viewpoint', 'nature'],
  },
  {
    label: 'Famous Lake',
    aliases: ['lake', 'lakes', 'famous lake', 'reservoir', 'backwater', 'backwaters'],
    otmKinds: ['lakes', 'natural'],
    fsqTerms: ['lake', 'waterfront'],
  },
  {
    label: 'Waterfall',
    aliases: ['waterfall', 'waterfalls', 'falls', 'cascade'],
    otmKinds: ['waterfalls', 'natural'],
    fsqTerms: ['waterfall', 'nature'],
  },
  {
    label: 'Heritage',
    aliases: ['heritage', 'historic', 'history', 'monument', 'museum', 'palace', 'landmark'],
    otmKinds: ['historic', 'interesting_places'],
    fsqTerms: ['historic site', 'museum', 'landmark'],
  },
  {
    label: 'Temple',
    aliases: ['temple', 'temples', 'shrine', 'church', 'mosque', 'cathedral'],
    otmKinds: ['historic', 'interesting_places'],
    fsqTerms: ['temple', 'religious site'],
  },
  {
    label: 'Fort',
    aliases: ['fort', 'forts', 'fortress', 'castle', 'citadel'],
    otmKinds: ['historic', 'interesting_places'],
    fsqTerms: ['fort', 'castle', 'historic site'],
  },
  {
    label: 'City',
    aliases: ['city', 'cities', 'downtown', 'urban'],
    otmKinds: ['interesting_places'],
    fsqTerms: ['tourist attraction', 'landmark'],
  },
  {
    label: 'Hotel',
    aliases: ['hotel', 'hotels', 'stay', 'resort', 'resorts', 'accommodation', 'accommodations'],
    otmKinds: ['interesting_places'],
    fsqTerms: ['hotel', 'resort'],
  },
  {
    label: 'Cafe',
    aliases: ['cafe', 'cafes', 'coffee', 'restaurant', 'restaurants', 'food', 'dining'],
    otmKinds: ['interesting_places'],
    fsqTerms: ['cafe', 'restaurant', 'coffee shop'],
  },
];

const LOCATION_ALIAS_MAP = {
  maharastra: 'maharashtra',
  maharasthra: 'maharashtra',
  maharashra: 'maharashtra',
  maharshtra: 'maharashtra',
  himanchal: 'himachal',
  uttarakhandd: 'uttarakhand',
  switserland: 'switzerland',
  indonasia: 'indonesia',
  thailend: 'thailand',
};

const SEARCH_CONNECTOR_REGEX = /^(.*?)\s+(?:in|near|around|at|within|from|of)\s+(.+)$/i;
const QUERY_NOISE_WORDS = new Set([
  'best',
  'top',
  'famous',
  'popular',
  'good',
  'great',
  'beautiful',
  'nice',
  'amazing',
  'awesome',
  'tourist',
  'tourism',
  'place',
  'places',
  'spot',
  'spots',
  'destination',
  'destinations',
  'visit',
  'travel',
  'trip',
]);

function normalizeLocationAliases(input = '') {
  const text = normalizeText(input);
  if (!text) return '';

  return text
    .split(/\s+/)
    .map((token) => {
      const lettersOnly = token.toLowerCase().replace(/[^a-z]/g, '');
      const normalized = LOCATION_ALIAS_MAP[lettersOnly];
      if (!normalized) return token;

      const prefixMatch = token.match(/^[^a-zA-Z]*/);
      const suffixMatch = token.match(/[^a-zA-Z]*$/);
      const prefix = prefixMatch ? prefixMatch[0] : '';
      const suffix = suffixMatch ? suffixMatch[0] : '';
      return `${prefix}${normalized}${suffix}`;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectThemesFromQuery(input = '') {
  const source = normalizeLower(input);
  if (!source) return [];

  const labels = new Set();
  for (const config of SEARCH_THEME_CONFIG) {
    const matched = config.aliases.some((alias) => containsPhrase(source, alias));
    if (matched) {
      labels.add(config.label);
    }
  }

  return [...labels];
}

function buildOpenTripMapKindsFromThemes(themes = []) {
  const kinds = new Set();
  for (const theme of themes) {
    const config = SEARCH_THEME_CONFIG.find(
      (entry) => normalizeLower(entry.label) === normalizeLower(theme)
    );
    if (!config) continue;
    for (const kind of config.otmKinds || []) {
      kinds.add(kind);
    }
  }
  return [...kinds].join(',');
}

function getPrimaryThemeKeyword(themes = []) {
  const first = normalizeLower(Array.isArray(themes) ? themes[0] : '');
  if (!first) return '';
  if (first === 'beach') return 'beach';
  if (first === 'famous lake' || first === 'lake') return 'lake';
  if (first === 'hill station' || first === 'mountain') return 'hill';
  if (first === 'waterfall') return 'waterfall';
  if (first === 'temple') return 'temple';
  if (first === 'fort') return 'fort';
  if (first === 'cafe') return 'cafe';
  if (first === 'hotel') return 'hotel';
  if (first === 'heritage') return 'heritage';
  return first.split(' ')[0] || '';
}

function buildFoursquareSearchTerms({ query = '', topicQuery = '', themes = [] } = {}) {
  const terms = [];
  const add = (value) => {
    const text = normalizeText(value);
    if (!text) return;
    terms.push(text);
  };

  add(topicQuery);
  add(query);

  for (const theme of themes) {
    const config = SEARCH_THEME_CONFIG.find(
      (entry) => normalizeLower(entry.label) === normalizeLower(theme)
    );
    if (!config) continue;
    for (const term of config.fsqTerms || []) {
      add(term);
    }
  }

  add('tourist attraction');
  add('hotel');
  add('cafe');

  return dedupeBy(terms, (term) => normalizeLower(term));
}

function buildGeoapifyCategoryCandidates(themes = []) {
  const candidates = [];
  const add = (value) => {
    const category = normalizeText(value);
    if (!category) return;
    candidates.push(category);
  };

  for (const theme of themes) {
    const key = normalizeLower(theme);
    if (key === 'beach') {
      add('beach,natural.water.sea');
      add('natural.water.sea,beach');
      continue;
    }
    if (key === 'famous lake' || key === 'lake') {
      add('natural.water');
      add('natural');
      continue;
    }
    if (key === 'hill station' || key === 'mountain') {
      add('natural.mountain,natural.peak');
      add('natural');
      continue;
    }
    if (key === 'waterfall') {
      add('natural.waterfall,natural');
      add('natural');
      continue;
    }
    if (key === 'cafe') {
      add('catering.cafe,catering.restaurant');
      add('catering.cafe');
      continue;
    }
    if (key === 'hotel') {
      add('accommodation.hotel,accommodation.resort');
      add('accommodation.hotel');
      continue;
    }
    if (key === 'temple') {
      add('religion.place_of_worship,tourism.sights');
      add('tourism.sights');
      continue;
    }
    if (key === 'fort' || key === 'heritage') {
      add('tourism.sights,heritage');
      add('tourism.sights');
      continue;
    }
    if (key === 'city') {
      add('tourism.sights');
    }
  }

  return dedupeBy(candidates, (category) => normalizeLower(category));
}

function inferLocationFromThemeQuery(query = '', matchedThemes = []) {
  if (!normalizeText(query) || !Array.isArray(matchedThemes) || matchedThemes.length === 0) {
    return '';
  }

  let normalized = normalizeLower(query);

  const themeAliases = SEARCH_THEME_CONFIG
    .filter((entry) => matchedThemes.includes(entry.label))
    .flatMap((entry) => entry.aliases)
    .sort((a, b) => b.length - a.length);

  for (const alias of themeAliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    normalized = normalized.replace(regex, ' ');
  }

  normalized = normalized
    .split(/\s+/)
    .filter((token) => token && !QUERY_NOISE_WORDS.has(token))
    .join(' ')
    .trim();

  return normalizeLocationAliases(normalized);
}

function parseSearchIntent(rawQuery = '') {
  const sanitizedQuery = normalizeLocationAliases(normalizeText(rawQuery).replace(/\s+/g, ' '));
  const match = sanitizedQuery.match(SEARCH_CONNECTOR_REGEX);

  let topicQuery = sanitizedQuery;
  let locationQuery = sanitizedQuery;
  let mode = 'direct';

  if (match) {
    topicQuery = normalizeText(match[1]);
    locationQuery = normalizeLocationAliases(match[2]);
    mode = 'topic_in_location';
  }

  const detectedThemes = dedupeBy(
    [
      ...detectThemesFromQuery(topicQuery),
      ...detectThemesFromQuery(sanitizedQuery),
    ],
    (theme) => normalizeLower(theme)
  );

  if (mode === 'direct' && detectedThemes.length > 0) {
    const inferredLocation = inferLocationFromThemeQuery(sanitizedQuery, detectedThemes);
    if (inferredLocation && inferredLocation.length >= 2) {
      locationQuery = inferredLocation;
      topicQuery = detectedThemes.join(' ');
      mode = 'theme_with_inferred_location';
    }
  }

  return {
    originalQuery: normalizeText(rawQuery),
    normalizedQuery: sanitizedQuery,
    topicQuery: normalizeText(topicQuery),
    locationQuery: normalizeText(locationQuery),
    themes: detectedThemes,
    mode,
  };
}

function buildSearchCenters(location, expand = false) {
  const lat = toFiniteNumber(location?.lat, null);
  const lon = toFiniteNumber(location?.lon, null);
  if (lat == null || lon == null) return [];

  const centers = [{ lat, lon }];
  if (!expand) return centers;

  const bbox = location?.bbox || null;
  if (
    bbox &&
    toFiniteNumber(bbox.minLat, null) != null &&
    toFiniteNumber(bbox.maxLat, null) != null &&
    toFiniteNumber(bbox.minLon, null) != null &&
    toFiniteNumber(bbox.maxLon, null) != null
  ) {
    const minLat = toFiniteNumber(bbox.minLat, null);
    const maxLat = toFiniteNumber(bbox.maxLat, null);
    const minLon = toFiniteNumber(bbox.minLon, null);
    const maxLon = toFiniteNumber(bbox.maxLon, null);

    const midLat = (minLat + maxLat) / 2;
    const midLon = (minLon + maxLon) / 2;
    const bboxCenters = [
      { lat: minLat, lon: minLon },
      { lat: minLat, lon: maxLon },
      { lat: maxLat, lon: minLon },
      { lat: maxLat, lon: maxLon },
      { lat: minLat, lon: midLon },
      { lat: maxLat, lon: midLon },
      { lat: midLat, lon: minLon },
      { lat: midLat, lon: maxLon },
    ];

    for (const point of bboxCenters) {
      if (point.lat > 85 || point.lat < -85) continue;
      if (point.lon > 180 || point.lon < -180) continue;
      centers.push(point);
    }
  }

  const isWideRegion = !normalizeText(location?.city);
  const primaryOffset = isWideRegion ? 4.5 : 1.6;
  const diagonalOffset = isWideRegion ? 3.2 : 1.2;
  const offsets = [
    [primaryOffset, 0],
    [-primaryOffset, 0],
    [0, primaryOffset],
    [0, -primaryOffset],
    [diagonalOffset, diagonalOffset],
    [diagonalOffset, -diagonalOffset],
    [-diagonalOffset, diagonalOffset],
    [-diagonalOffset, -diagonalOffset],
  ];

  for (const [latDelta, lonDelta] of offsets) {
    const nextLat = lat + latDelta;
    const nextLon = lon + lonDelta;
    if (nextLat > 85 || nextLat < -85) continue;
    if (nextLon > 180 || nextLon < -180) continue;
    centers.push({ lat: nextLat, lon: nextLon });
  }

  return dedupeBy(centers, (point) => `${point.lat.toFixed(3)}:${point.lon.toFixed(3)}`);
}

function inferTagsFromText(...texts) {
  const source = texts.map((text) => normalizeLower(text)).join(' ');
  const labels = new Set();

  for (const rule of TAG_RULES) {
    const hasMatch = rule.tokens.some((token) => containsPhrase(source, token));
    if (!hasMatch) continue;
    for (const label of rule.labels) {
      labels.add(label);
    }
  }

  return [...labels];
}

function mergeKinds(...values) {
  const kinds = new Set();

  for (const value of values) {
    if (!value) continue;
    const parts = Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);

    for (const part of parts) {
      kinds.add(titleCase(part.replace(/_/g, ' ')));
    }
  }

  return [...kinds];
}

function buildKinds({ name = '', rawKinds = '', query = '', extraTags = [] } = {}) {
  const inferred = inferTagsFromText(name, rawKinds);
  const allKinds = mergeKinds(rawKinds, inferred, extraTags);
  return allKinds.length > 0 ? allKinds.join(',') : 'Popular';
}

function makeFeature({
  name,
  lat,
  lon,
  xid = null,
  fsqId = null,
  kinds = '',
  description = '',
  image = '',
  city = '',
  state = '',
  country = '',
  source = 'unknown',
  rating = 0,
} = {}) {
  const safeName = normalizeText(name);
  if (!safeName) return null;

  const latNum = toFiniteNumber(lat, null);
  const lonNum = toFiniteNumber(lon, null);
  if (latNum == null || lonNum == null) return null;

  return {
    type: 'Feature',
    properties: {
      name: safeName,
      xid: xid || null,
      fsq_id: fsqId || null,
      kinds: kinds || 'Popular',
      description: normalizeText(description),
      image: normalizeText(image) || DEFAULT_IMAGE,
      city: normalizeText(city),
      state: normalizeText(state),
      country: normalizeText(country),
      source,
      rating: toFiniteNumber(rating, 0),
    },
    geometry: {
      type: 'Point',
      coordinates: [lonNum, latNum],
    },
  };
}

function featureKey(feature) {
  const name = normalizeLower(feature?.properties?.name);
  const xid = normalizeText(feature?.properties?.xid);
  const fsqId = normalizeText(feature?.properties?.fsq_id);
  const lat = toFiniteNumber(feature?.geometry?.coordinates?.[1], null);
  const lon = toFiniteNumber(feature?.geometry?.coordinates?.[0], null);
  const coordKey =
    lat != null && lon != null ? `${lat.toFixed(5)}:${lon.toFixed(5)}` : 'no-coords';
  return xid || fsqId || `${name}:${coordKey}`;
}

function computeFeatureScore(feature, query = '', intentThemes = [], searchIntent = null) {
  const name = normalizeLower(feature?.properties?.name);
  const kinds = normalizeLower(feature?.properties?.kinds);
  const source = normalizeLower(feature?.properties?.source);
  const city = normalizeLower(feature?.properties?.city);
  const state = normalizeLower(feature?.properties?.state);
  const country = normalizeLower(feature?.properties?.country);
  const description = normalizeLower(feature?.properties?.description);
  const hasImage = normalizeText(feature?.properties?.image) !== '';
  const q = normalizeLower(query);

  let score = 0;

  if (q && name.includes(q)) score += 8;
  if (q && kinds.includes(q)) score += 4;
  if (source === 'opentripmap') score += 3;
  if (source === 'foursquare') score += 2;
  if (source === 'wikipedia') score += 1;
  if (hasImage) score += 2;

  for (const theme of intentThemes) {
    const normalizedTheme = normalizeLower(theme);
    if (normalizedTheme && (kinds.includes(normalizedTheme) || name.includes(normalizedTheme))) {
      score += 2;
    }
  }

  const topicQuery = normalizeLower(searchIntent?.topicQuery || '');
  if (topicQuery && (kinds.includes(topicQuery) || name.includes(topicQuery))) {
    score += 5;
  }

  const locationQuery = normalizeLower(searchIntent?.locationQuery || '');
  if (
    locationQuery &&
    (
      city.includes(locationQuery) ||
      state.includes(locationQuery) ||
      country.includes(locationQuery) ||
      description.includes(locationQuery)
    )
  ) {
    score += 4;
  }

  return score;
}

function getPopularDestinations() {
  return [
    {
      name: 'Manali',
      city: 'Manali',
      country: 'India',
      lat: 32.2432,
      lon: 77.1892,
      rating: 4.7,
      description: 'A famous Himalayan hill station known for valleys, snow peaks, and adventure spots.',
      category: 'Hill Station,Mountain,Nature',
    },
    {
      name: 'Goa Beach',
      city: 'Goa',
      country: 'India',
      lat: 15.2993,
      lon: 74.124,
      rating: 4.5,
      description: 'Popular beach destination with scenic coastline, cafes, and nightlife.',
      category: 'Beach,Island,Nature',
    },
    {
      name: 'Dal Lake',
      city: 'Srinagar',
      country: 'India',
      lat: 34.1127,
      lon: 74.8656,
      rating: 4.6,
      description: 'Iconic lake destination known for houseboats and mountain scenery.',
      category: 'Famous Lake,Lake,Nature',
    },
    {
      name: 'Mysore Palace',
      city: 'Mysuru',
      country: 'India',
      lat: 12.3051,
      lon: 76.6551,
      rating: 4.5,
      description: 'A historic palace and one of India\'s top heritage attractions.',
      category: 'Heritage,Historic,Landmark',
    },
    {
      name: 'Mehrangarh Fort',
      city: 'Jodhpur',
      country: 'India',
      lat: 26.2978,
      lon: 73.0181,
      rating: 4.7,
      description: 'A massive hilltop fort with panoramic city views and royal history.',
      category: 'Fort,Historic,Landmark',
    },
  ];
}

function popularFeaturesForQuery(query) {
  const q = normalizeLower(query);
  const popular = getPopularDestinations();
  const matches = popular.filter(
    (place) =>
      normalizeLower(place.name).includes(q) ||
      normalizeLower(place.city).includes(q) ||
      normalizeLower(place.country).includes(q)
  );

  const chosen = matches.length > 0 ? matches : popular;
  return chosen
    .slice(0, 8)
    .map((place) =>
      makeFeature({
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        kinds: buildKinds({ name: place.name, rawKinds: place.category, query }),
        description: place.description,
        image: placeholderImage(place.name),
        city: place.city,
        country: place.country,
        source: 'offline-fallback',
        rating: place.rating,
      })
    )
    .filter(Boolean);
}

function parseFirstJsonObject(rawText = '') {
  const text = String(rawText || '').trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function inferIntentThemesWithGemini(query) {
  if (!hasGeminiKey() || !normalizeText(query)) {
    return [];
  }

  try {
    const prompt = `
You classify travel search intent.
User query: "${query}"
Return JSON only in this shape:
{"themes":["Hill Station","Beach","Famous Lake","Heritage","Temple","Fort","City","Nature","Hotel","Cafe"]}
Rules:
- Use only themes from the allowed list.
- Return up to 4 themes, most relevant first.
- If unclear, return ["City","Nature"].
`.trim();

    const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${GEMINI_API_KEY}`;

    const { data } = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
        },
      },
      { timeout: REQUEST_TIMEOUT }
    );

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || '')
        .join('\n') || '';
    const parsed = parseFirstJsonObject(text);
    const themes = Array.isArray(parsed?.themes) ? parsed.themes : [];

    return dedupeBy(
      themes
        .map((theme) => normalizeText(theme))
        .filter(Boolean)
        .slice(0, 4),
      (theme) => normalizeLower(theme)
    );
  } catch {
    return [];
  }
}

async function wikipediaFeature(query, coords = {}) {
  const queryText = normalizeText(query);
  if (!queryText) return null;

  const lat = toFiniteNumber(coords.lat, null);
  const lon = toFiniteNumber(coords.lon, null);
  if (lat == null || lon == null) return null;

  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      queryText
    )}`;
    const wikiRes = await axios.get(wikiUrl, { timeout: REQUEST_TIMEOUT });
    const data = wikiRes.data;

    if (!data || !data.title || !data.extract) {
      return null;
    }

    return makeFeature({
      name: data.title,
      lat,
      lon,
      xid: null,
      kinds: buildKinds({ name: data.title, rawKinds: 'Wikipedia', query: queryText }),
      description: data.extract,
      image: data.thumbnail?.source || data.originalimage?.source || DEFAULT_IMAGE,
      source: 'wikipedia',
    });
  } catch {
    return null;
  }
}

function extractGeoapifyBBox(feature) {
  const bbox = feature?.properties?.bbox;
  if (!bbox) return null;

  if (Array.isArray(bbox) && bbox.length >= 4) {
    const minLon = toFiniteNumber(bbox[0], null);
    const minLat = toFiniteNumber(bbox[1], null);
    const maxLon = toFiniteNumber(bbox[2], null);
    const maxLat = toFiniteNumber(bbox[3], null);
    if ([minLon, minLat, maxLon, maxLat].every(Number.isFinite)) {
      return { minLat, maxLat, minLon, maxLon };
    }
  }

  const minLon = toFiniteNumber(bbox?.lon1 ?? bbox?.min_lon ?? bbox?.minLon, null);
  const minLat = toFiniteNumber(bbox?.lat1 ?? bbox?.min_lat ?? bbox?.minLat, null);
  const maxLon = toFiniteNumber(bbox?.lon2 ?? bbox?.max_lon ?? bbox?.maxLon, null);
  const maxLat = toFiniteNumber(bbox?.lat2 ?? bbox?.max_lat ?? bbox?.maxLat, null);

  if ([minLon, minLat, maxLon, maxLat].every(Number.isFinite)) {
    return { minLat, maxLat, minLon, maxLon };
  }

  return null;
}

async function geoapifyGeocode(query) {
  if (!hasGeoapifyKey() || !normalizeText(query)) return null;

  try {
    const { data } = await axios.get(`${GEOAPIFY_BASE_URL}/geocode/search`, {
      params: {
        text: query,
        lang: 'en',
        limit: 1,
        apiKey: GEOAPIFY_API_KEY,
      },
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    if (!feature) return null;

    const lat = toFiniteNumber(feature?.properties?.lat ?? feature?.geometry?.coordinates?.[1], null);
    const lon = toFiniteNumber(feature?.properties?.lon ?? feature?.geometry?.coordinates?.[0], null);
    if (lat == null || lon == null) return null;

    return {
      lat,
      lon,
      city: normalizeText(feature?.properties?.city || feature?.properties?.name || ''),
      state: normalizeText(feature?.properties?.state || feature?.properties?.state_code || ''),
      country: normalizeText(feature?.properties?.country || ''),
      bbox: extractGeoapifyBBox(feature),
      provider: 'geoapify',
    };
  } catch {
    return null;
  }
}

async function openTripMapGeocode(query) {
  if (!hasOpenTripMapKey() || !normalizeText(query)) return null;

  try {
    const { data } = await axios.get(`${OPENTRIPMAP_BASE_URL}/geoname`, {
      params: {
        name: query,
        apikey: OPENTRIPMAP_API_KEY,
      },
      timeout: REQUEST_TIMEOUT,
    });

    const lat = toFiniteNumber(data?.lat, null);
    const lon = toFiniteNumber(data?.lon, null);
    if (lat == null || lon == null) return null;

    return {
      lat,
      lon,
      city: normalizeText(data?.name || ''),
      state: '',
      country: normalizeText(data?.country || ''),
      bbox: null,
      provider: 'opentripmap-geoname',
    };
  } catch {
    return null;
  }
}

async function nominatimGeocode(query) {
  if (!normalizeText(query)) return null;

  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1,
      },
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const match = Array.isArray(data) ? data[0] : null;
    if (!match) return null;

    const lat = toFiniteNumber(match?.lat, null);
    const lon = toFiniteNumber(match?.lon, null);
    if (lat == null || lon == null) return null;

    return {
      lat,
      lon,
      city: normalizeText(match?.display_name?.split(',')?.[0] || ''),
      state: normalizeText(match?.display_name?.split(',')?.slice(-2, -1)?.[0] || ''),
      country: normalizeText(match?.display_name?.split(',')?.slice(-1)?.[0] || ''),
      bbox: null,
      provider: 'nominatim',
    };
  } catch {
    return null;
  }
}

async function searchNominatimPlaces(query, limit = 10) {
  const q = normalizeText(query);
  if (!q) return [];

  try {
    const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        format: 'json',
        limit: Math.min(Math.max(Number(limit) || 10, 1), 20),
      },
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row) => {
        const lat = toFiniteNumber(row?.lat, null);
        const lon = toFiniteNumber(row?.lon, null);
        const displayName = normalizeText(row?.display_name || '');
        const name = normalizeText(displayName.split(',')[0] || row?.name || '');
        const addressParts = displayName.split(',').map((part) => normalizeText(part)).filter(Boolean);
        const city = addressParts[1] || '';
        const country = addressParts[addressParts.length - 1] || '';
        const rowKinds = mergeKinds(row?.class, row?.type).join(',');

        return makeFeature({
          name: name || row?.name || displayName,
          lat,
          lon,
          kinds: buildKinds({ name, rawKinds: rowKinds, query: q }),
          description: displayName,
          image: '',
          city,
          country,
          source: 'nominatim-search',
          rating: 0,
        });
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveSearchLocation({ query, lat, lon, fallbackQueries = [] }) {
  const fromRequestLat = toFiniteNumber(lat, null);
  const fromRequestLon = toFiniteNumber(lon, null);

  if (fromRequestLat != null && fromRequestLon != null) {
    return {
      lat: fromRequestLat,
      lon: fromRequestLon,
      city: '',
      state: '',
      country: '',
      bbox: null,
      provider: 'request',
    };
  }

  const candidateQueries = dedupeBy(
    [query, ...(Array.isArray(fallbackQueries) ? fallbackQueries : [])]
      .map((entry) => normalizeLocationAliases(entry))
      .filter(Boolean),
    (entry) => normalizeLower(entry)
  );

  for (const candidate of candidateQueries) {
    const geoapify = await geoapifyGeocode(candidate);
    if (geoapify) return geoapify;
  }

  for (const candidate of candidateQueries) {
    const openTripMap = await openTripMapGeocode(candidate);
    if (openTripMap) return openTripMap;
  }

  for (const candidate of candidateQueries) {
    const nominatim = await nominatimGeocode(candidate);
    if (nominatim) return nominatim;
  }

  return {
    lat: null,
    lon: null,
    city: '',
    state: '',
    country: '',
    bbox: null,
    provider: 'unresolved',
  };
}

async function fetchOpenTripMapDetails(xid) {
  if (!hasOpenTripMapKey() || !normalizeText(xid)) return null;

  try {
    const { data } = await axios.get(`${OPENTRIPMAP_BASE_URL}/xid/${encodeURIComponent(xid)}`, {
      params: {
        apikey: OPENTRIPMAP_API_KEY,
      },
      timeout: REQUEST_TIMEOUT,
    });
    return data || null;
  } catch {
    return null;
  }
}

async function fetchOpenTripMapAutosuggest({ keyword, location, limit = 20 }) {
  if (!hasOpenTripMapKey() || !hasLocationCoords(location)) return [];
  const text = normalizeText(keyword);
  if (!text) return [];

  try {
    const { data } = await axios.get(`${OPENTRIPMAP_BASE_URL}/autosuggest`, {
      params: {
        name: text,
        lat: location.lat,
        lon: location.lon,
        radius: 300000,
        limit: Math.min(Math.max(Number(limit) || 20, 5), 50),
        apikey: OPENTRIPMAP_API_KEY,
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.features)) return data.features;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

async function fetchGeoapifyThemeFeatures({
  location,
  limit,
  radius,
  searchIntent = null,
  intentThemes = [],
} = {}) {
  if (!hasGeoapifyKey() || !hasLocationCoords(location)) return [];
  if (!Array.isArray(intentThemes) || intentThemes.length === 0) return [];

  const categoryCandidates = buildGeoapifyCategoryCandidates(intentThemes);
  if (categoryCandidates.length === 0) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 4), 30);
  const safeRadius = Math.min(Math.max(Number(radius) || 10000, 1000), 300000);
  const expanded = Boolean(searchIntent?.locationQuery) && !normalizeText(location?.city);
  const centers = buildSearchCenters(location, expanded).slice(0, expanded ? 10 : 3);
  const radiusPerCenter = expanded
    ? Math.min(Math.max(Math.round(safeRadius * 0.8), 50000), 140000)
    : Math.min(Math.max(safeRadius, 15000), 80000);

  const allFeatures = [];

  for (const categories of categoryCandidates) {
    for (const center of centers) {
      try {
        const { data } = await axios.get(`${GEOAPIFY_BASE_URL}/places`, {
          params: {
            categories,
            filter: `circle:${center.lon},${center.lat},${radiusPerCenter}`,
            limit: Math.min(safeLimit * 3, 60),
            lang: 'en',
            apiKey: GEOAPIFY_API_KEY,
          },
          timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': USER_AGENT,
          },
        });

        const features = Array.isArray(data?.features) ? data.features : [];
        for (const feature of features) {
          const props = feature?.properties || {};
          const lat = toFiniteNumber(feature?.geometry?.coordinates?.[1], null);
          const lon = toFiniteNumber(feature?.geometry?.coordinates?.[0], null);
          const name = normalizeText(props?.name || props?.address_line1 || '');
          if (!name || lat == null || lon == null) continue;

          const rawKinds = mergeKinds(props?.categories || [], props?.category || '').join(',');
          allFeatures.push(
            makeFeature({
              name,
              lat,
              lon,
              kinds: buildKinds({
                name,
                rawKinds,
                query: searchIntent?.topicQuery || '',
              }),
              description: normalizeText(props?.formatted || props?.address_line2 || ''),
              image: '',
              city: normalizeText(props?.city || props?.county || location?.city || ''),
              state: normalizeText(props?.state || location?.state || ''),
              country: normalizeText(props?.country || location?.country || ''),
              source: 'geoapify-places',
              rating: 0,
            })
          );
        }
      } catch {
        // Ignore category-level failures and continue other category candidates.
      }
    }
  }

  return dedupeBy(allFeatures.filter(Boolean), featureKey);
}

async function fetchOpenTripMapFeatures({ query, location, radius, limit, searchIntent = null, intentThemes = [] }) {
  if (!hasOpenTripMapKey() || !hasLocationCoords(location)) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 4), 30);
  const safeRadius = Math.min(Math.max(Number(radius) || 10000, 1000), 300000);
  const resolvedThemes = dedupeBy(
    [
      ...(Array.isArray(intentThemes) ? intentThemes : []),
      ...(Array.isArray(searchIntent?.themes) ? searchIntent.themes : []),
    ],
    (theme) => normalizeLower(theme)
  );
  const focusedKinds = buildOpenTripMapKindsFromThemes(resolvedThemes);
  const expandSampling = Boolean(searchIntent?.locationQuery) && !normalizeText(location?.city);
  const searchCenters = buildSearchCenters(location, expandSampling);
  const radiusPerCenter = expandSampling
    ? Math.min(Math.max(Math.round(safeRadius * 0.9), 80000), 160000)
    : safeRadius;
  const internalLimit = expandSampling || focusedKinds
    ? Math.min(Math.max(safeLimit * 8, 60), 120)
    : Math.min(safeLimit * 4, 60);

  const baseParams = {
    radius: radiusPerCenter,
    limit: internalLimit,
    format: 'geojson',
    apikey: OPENTRIPMAP_API_KEY,
  };

  const requests = [];
  for (let index = 0; index < searchCenters.length; index += 1) {
    const center = searchCenters[index];
    const centerParams = {
      ...baseParams,
      lon: center.lon,
      lat: center.lat,
    };

    if (focusedKinds) {
      requests.push(
        axios.get(`${OPENTRIPMAP_BASE_URL}/radius`, {
          params: {
            ...centerParams,
            kinds: focusedKinds,
            limit: internalLimit,
          },
          timeout: REQUEST_TIMEOUT,
        })
      );
    }

    requests.push(
      axios.get(`${OPENTRIPMAP_BASE_URL}/radius`, {
        params: {
          ...centerParams,
          kinds: 'interesting_places,natural,beaches,islands,lakes,mountains,waterfalls,historic',
        },
        timeout: REQUEST_TIMEOUT,
      })
    );

    if (index === 0) {
      requests.push(
        axios.get(`${OPENTRIPMAP_BASE_URL}/radius`, {
          params: centerParams,
          timeout: REQUEST_TIMEOUT,
        })
      );
    }
  }

  const settled = await Promise.allSettled(requests);
  const autosuggestKeyword = getPrimaryThemeKeyword(resolvedThemes);
  const autosuggestRows = autosuggestKeyword
    ? await fetchOpenTripMapAutosuggest({
        keyword: autosuggestKeyword,
        location,
        limit: internalLimit,
      })
    : [];
  const autosuggestFeatures = autosuggestRows
    .map((row) => {
      if (row?.geometry?.coordinates && row?.properties) return row;

      const lat = toFiniteNumber(row?.point?.lat ?? row?.lat ?? row?.geometry?.lat, null);
      const lon = toFiniteNumber(row?.point?.lon ?? row?.lon ?? row?.geometry?.lon, null);
      if (lat == null || lon == null) return null;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          xid: normalizeText(row?.xid || row?.id || ''),
          name: normalizeText(row?.name || row?.properties?.name || ''),
          kinds: normalizeText(row?.kinds || row?.properties?.kinds || ''),
        },
      };
    })
    .filter(Boolean);

  const rawFeatures = settled
    .filter((item) => item.status === 'fulfilled')
    .flatMap((item) =>
      Array.isArray(item.value?.data?.features) ? item.value.data.features : []
    )
    .concat(autosuggestFeatures);

  const dedupedRaw = dedupeBy(rawFeatures, (feature) => {
    const xid = normalizeText(feature?.properties?.xid);
    const name = normalizeLower(feature?.properties?.name);
    const lat = toFiniteNumber(feature?.geometry?.coordinates?.[1], null);
    const lon = toFiniteNumber(feature?.geometry?.coordinates?.[0], null);
    const coordKey =
      lat != null && lon != null ? `${lat.toFixed(5)}:${lon.toFixed(5)}` : 'no-coords';
    return xid || `${name}:${coordKey}`;
  });

  const detailsLimit = Math.min(dedupedRaw.length, 18);
  const detailsMap = new Map();

  await Promise.all(
    dedupedRaw.slice(0, detailsLimit).map(async (feature) => {
      const xid = normalizeText(feature?.properties?.xid);
      if (!xid) return;
      const detail = await fetchOpenTripMapDetails(xid);
      if (detail) {
        detailsMap.set(xid, detail);
      }
    })
  );

  return dedupedRaw
    .map((feature) => {
      const props = feature?.properties || {};
      const xid = normalizeText(props.xid || '');
      const details = detailsMap.get(xid) || null;
      const name = props.name || details?.name || '';
      const lat = toFiniteNumber(feature?.geometry?.coordinates?.[1], null);
      const lon = toFiniteNumber(feature?.geometry?.coordinates?.[0], null);
      const rawKinds = props.kinds || details?.kinds || '';

      return makeFeature({
        name,
        lat,
        lon,
        xid: xid || null,
        kinds: buildKinds({ name, rawKinds, query: searchIntent?.topicQuery || query }),
        description:
          details?.wikipedia_extracts?.text ||
          details?.wikipedia_extract ||
          details?.info?.descr ||
          props.wikipedia_extracts?.text ||
          '',
        image:
          details?.preview?.source ||
          details?.image ||
          props.image ||
          placeholderImage(name),
        city: details?.address?.city || location.city || '',
        state: details?.address?.state || location.state || '',
        country: details?.address?.country || location.country || '',
        source: 'opentripmap',
        rating: toFiniteNumber(details?.rate ?? props?.rate, 0),
      });
    })
    .filter(Boolean);
}

function mapFoursquareCategoryNames(categories = []) {
  return categories
    .map((cat) => normalizeText(cat?.name || cat?.short_name || ''))
    .filter(Boolean);
}

async function fetchFoursquareFeatures({
  query,
  location,
  radius,
  limit,
  searchIntent = null,
  intentThemes = [],
  preferNearText = false,
}) {
  if (!hasFoursquareKey()) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 4), 30);
  const safeRadius = Math.min(Math.max(Number(radius) || 10000, 1000), 300000);
  const resolvedThemes = dedupeBy(
    [
      ...(Array.isArray(intentThemes) ? intentThemes : []),
      ...(Array.isArray(searchIntent?.themes) ? searchIntent.themes : []),
    ],
    (theme) => normalizeLower(theme)
  );
  const searchTerms = buildFoursquareSearchTerms({
    query: searchIntent?.normalizedQuery || query,
    topicQuery: searchIntent?.topicQuery || '',
    themes: resolvedThemes,
  });

  const perTermLimit = Math.max(4, Math.ceil((safeLimit * 2) / searchTerms.length));
  const results = [];

  for (const term of searchTerms) {
    try {
      const params = {
        query: term,
        limit: Math.min(perTermLimit, 30),
        radius: safeRadius,
      };

      if (hasLocationCoords(location) && !preferNearText) {
        params.ll = `${location.lat},${location.lon}`;
      } else {
        params.near = normalizeText(searchIntent?.locationQuery || query);
      }

      const { data } = await axios.get(`${FOURSQUARE_BASE_URL}/places/search`, {
        params,
        timeout: REQUEST_TIMEOUT,
        headers: {
          Accept: 'application/json',
          Authorization: FOURSQUARE_API_KEY,
        },
      });

      const places = Array.isArray(data?.results) ? data.results : [];
      for (const place of places) {
        const lat = toFiniteNumber(place?.geocodes?.main?.latitude, null);
        const lon = toFiniteNumber(place?.geocodes?.main?.longitude, null);
        const name = normalizeText(place?.name);
        if (!name) continue;

        const categoryNames = mapFoursquareCategoryNames(place?.categories || []);
        const rawKinds = mergeKinds(categoryNames).join(',');
        const formattedLocation = place?.location || {};

        results.push(
          makeFeature({
            name,
            lat,
            lon,
            fsqId: place?.fsq_id || null,
            kinds: buildKinds({
              name,
              rawKinds,
              query: searchIntent?.topicQuery || query,
            }),
            description:
              normalizeText(formattedLocation?.formatted_address) ||
              normalizeText(place?.distance != null ? `Approx. ${place.distance}m from center` : ''),
            image: '',
            city: normalizeText(formattedLocation?.locality || location?.city || ''),
            state: normalizeText(formattedLocation?.region || location?.state || ''),
            country: normalizeText(formattedLocation?.country || location?.country || ''),
            source: 'foursquare',
            rating: 0,
          })
        );
      }
    } catch {
      // keep graceful fallback
    }
  }

  return dedupeBy(results.filter(Boolean), featureKey);
}

async function fetchUnsplashImageForQuery(query) {
  const q = normalizeLower(query);
  if (!hasUnsplashKey() || !q || q.length < 3) return '';

  const cached = unsplashCache.get(q);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const { data } = await axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
      params: {
        query: q,
        page: 1,
        per_page: 1,
        orientation: 'landscape',
        content_filter: 'high',
        order_by: 'relevant',
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_API_KEY}`,
      },
      timeout: REQUEST_TIMEOUT,
    });

    const photo = Array.isArray(data?.results) ? data.results[0] : null;
    const imageUrl = photo?.urls?.regular || photo?.urls?.small || photo?.urls?.full || '';

    unsplashCache.set(q, {
      url: imageUrl || '',
      expiresAt: Date.now() + 1000 * 60 * 30,
    });

    return imageUrl || '';
  } catch {
    return '';
  }
}

async function enrichImagesWithUnsplash(features = []) {
  const MAX_UNSPLASH_LOOKUPS = 10;
  let lookupsUsed = 0;

  return Promise.all(
    features.map(async (feature) => {
      const currentImage = normalizeText(feature?.properties?.image);
      const needsImage =
        !currentImage || currentImage === DEFAULT_IMAGE || currentImage.includes('placeholder.com');

      if (!needsImage || lookupsUsed >= MAX_UNSPLASH_LOOKUPS) {
        return feature;
      }

      lookupsUsed += 1;
      const placeName = normalizeText(feature?.properties?.name || '');
      const city = normalizeText(feature?.properties?.city || '');
      const query = [placeName, city].filter(Boolean).join(' ');
      const imageUrl = await fetchUnsplashImageForQuery(query || placeName);

      if (!imageUrl) return feature;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          image: imageUrl,
        },
      };
    })
  );
}

function selectAndSortFeatures(features, query, limit, themes = [], searchIntent = null) {
  const scored = features.map((feature) => ({
    feature,
    score: computeFeatureScore(feature, query, themes, searchIntent),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.feature);
}

function featureMatchesThemes(feature, themes = []) {
  if (!Array.isArray(themes) || themes.length === 0) return true;

  const text = normalizeLower(
    [
      feature?.properties?.name || '',
      feature?.properties?.kinds || '',
      feature?.properties?.description || '',
    ].join(' ')
  );

  for (const theme of themes) {
    const config = SEARCH_THEME_CONFIG.find(
      (entry) => normalizeLower(entry.label) === normalizeLower(theme)
    );
    if (!config) continue;
    if (config.aliases.some((alias) => containsPhrase(text, alias))) {
      return true;
    }
  }

  return false;
}

router.get('/search', async (req, res) => {
  const query = normalizeText(req.query.query || '');
  const lat = req.query.lat;
  const lon = req.query.lon;
  const radius = Number(req.query.radius || 10000);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 30);

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required', features: [] });
  }

  const searchIntent = parseSearchIntent(query);
  const location = await resolveSearchLocation({
    query: searchIntent.locationQuery || searchIntent.normalizedQuery || query,
    lat,
    lon,
    fallbackQueries: [searchIntent.normalizedQuery, query],
  });
  const geminiThemes = await inferIntentThemesWithGemini(searchIntent.normalizedQuery || query);
  const intentThemes = dedupeBy(
    [
      ...(Array.isArray(searchIntent.themes) ? searchIntent.themes : []),
      ...(Array.isArray(geminiThemes) ? geminiThemes : []),
    ],
    (theme) => normalizeLower(theme)
  );
  const normalizedLocationQuery = normalizeLower(searchIntent.locationQuery || '');
  const isCountryLevelMatch =
    Boolean(normalizedLocationQuery) &&
    !normalizeText(location?.city) &&
    normalizeLower(location?.country || '') === normalizedLocationQuery;
  const isBroadLocationQuery =
    Boolean(normalizedLocationQuery) &&
    (searchIntent.mode !== 'direct' || !normalizeText(location?.city) || isCountryLevelMatch);
  const effectiveRadius = isCountryLevelMatch
    ? Math.max(radius, 250000)
    : isBroadLocationQuery
      ? Math.max(radius, 120000)
      : radius;
  const preferNearText = isBroadLocationQuery && !isCountryLevelMatch;

  try {
    const [otmFeatures, fsqFeatures, geoapifyThemeFeatures, wikiFeature] = await Promise.all([
      fetchOpenTripMapFeatures({
        query,
        location,
        radius: effectiveRadius,
        limit,
        searchIntent,
        intentThemes,
      }),
      fetchFoursquareFeatures({
        query,
        location,
        radius: effectiveRadius,
        limit,
        searchIntent,
        intentThemes,
        preferNearText,
      }),
      fetchGeoapifyThemeFeatures({
        location,
        radius: effectiveRadius,
        limit,
        searchIntent,
        intentThemes,
      }),
      wikipediaFeature(searchIntent.locationQuery || query, location),
    ]);

    let merged = dedupeBy(
      [
        ...otmFeatures,
        ...fsqFeatures,
        ...geoapifyThemeFeatures,
        ...(wikiFeature ? [wikiFeature] : []),
      ].filter(Boolean),
      featureKey
    );

    if (intentThemes.length > 0) {
      const themedMatches = merged.filter((feature) => featureMatchesThemes(feature, intentThemes));
      if (themedMatches.length > 0 && searchIntent.mode !== 'direct') {
        merged = themedMatches;
      } else if (themedMatches.length === 0 && searchIntent.mode !== 'direct') {
        const nominatimQuery = [searchIntent.topicQuery, searchIntent.locationQuery]
          .filter(Boolean)
          .join(' in ')
          .trim();
        const nominatimCandidates = await searchNominatimPlaces(
          nominatimQuery || searchIntent.normalizedQuery || query,
          Math.max(limit, 8)
        );
        const nominatimThemeMatches = nominatimCandidates.filter((feature) =>
          featureMatchesThemes(feature, intentThemes)
        );
        if (nominatimThemeMatches.length > 0) {
          merged = dedupeBy([...nominatimThemeMatches, ...merged], featureKey);
        } else if (merged.length === 0) {
          const themedFallback = popularFeaturesForQuery(searchIntent.topicQuery || query).filter((feature) =>
            featureMatchesThemes(feature, intentThemes)
          );
          if (themedFallback.length > 0) {
            merged = themedFallback;
          }
        }
      }
    }

    if (merged.length === 0) {
      merged = popularFeaturesForQuery(query);
    }

    merged = await enrichImagesWithUnsplash(merged);
    const features = selectAndSortFeatures(merged, query, limit, intentThemes, searchIntent);

    return res.json({
      features,
      count: features.length,
      query,
      parsedQuery: searchIntent,
      provider: 'multi-source',
      providersUsed: {
        opentripmap: hasOpenTripMapKey(),
        geoapify: hasGeoapifyKey(),
        foursquare: hasFoursquareKey(),
        unsplash: hasUnsplashKey(),
        gemini: hasGeminiKey(),
      },
      inferredThemes: intentThemes,
      location: {
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        state: location.state,
        country: location.country,
        bbox: location.bbox || null,
        provider: location.provider,
      },
    });
  } catch (err) {
    const fallback = popularFeaturesForQuery(query).slice(0, limit);
    return res.status(200).json({
      features: fallback,
      count: fallback.length,
      query,
      provider: 'offline-fallback',
      location: {
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        state: location.state,
        country: location.country,
        bbox: location.bbox || null,
      },
      error: 'Multi-source fetch failed, fallback data returned.',
      details: err.message,
    });
  }
});

router.get('/place/:xid', async (req, res) => {
  const { xid } = req.params;

  if (!hasOpenTripMapKey()) {
    return res.status(503).json({ error: 'OpenTripMap API key is not configured.' });
  }

  try {
    const { data } = await axios.get(
      `${OPENTRIPMAP_BASE_URL}/xid/${encodeURIComponent(xid)}`,
      {
        params: { apikey: OPENTRIPMAP_API_KEY },
        timeout: REQUEST_TIMEOUT,
      }
    );
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch place details',
      details: err.message,
    });
  }
});

router.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    configured: {
      opentripmap: hasOpenTripMapKey(),
      geoapify: hasGeoapifyKey(),
      foursquare: hasFoursquareKey(),
      unsplash: hasUnsplashKey(),
      gemini: hasGeminiKey(),
    },
    apiKeyPreview: hasOpenTripMapKey() ? `${OPENTRIPMAP_API_KEY.substring(0, 6)}...` : 'missing',
  });
});

router.get('/popular', (_req, res) => {
  const popular = getPopularDestinations().map((place) => ({
    ...place,
    image: placeholderImage(place.name),
  }));
  return res.json(popular);
});

module.exports = router;
