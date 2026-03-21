/**
 * Itinerary Generator - Dynamic day-by-day plan using free data sources
 */

const API_CONFIG = require('../config/apiConfig');

const TIME_BLOCKS = [
  {
    key: 'morning',
    label: 'Morning',
    slots: [
      { start: '06:30', end: '08:30' },
      { start: '09:30', end: '11:30' },
    ],
    categories: ['culture', 'nature', 'sightseeing'],
  },
  {
    key: 'lunch',
    label: 'Lunch',
    slots: [
      { start: '12:30', end: '13:30' },
    ],
    categories: ['food'],
  },
  {
    key: 'afternoon',
    label: 'Afternoon',
    slots: [
      { start: '14:30', end: '16:00' },
      { start: '16:30', end: '18:00' },
    ],
    categories: ['culture', 'shopping', 'entertainment', 'nature'],
  },
  {
    key: 'evening',
    label: 'Evening',
    slots: [
      { start: '18:30', end: '19:30' },
      { start: '20:00', end: '21:00' },
    ],
    categories: ['relaxation', 'food', 'entertainment', 'sightseeing'],
  },
];

const BLOCK_LABELS = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const KIND_QUERIES = {
  culture: 'historic,archaeology,museums,monuments,temples,churches,castles,palaces',
  nature: 'natural,parks,gardens,beaches,viewpoints,waterfalls,lakes',
  shopping: 'shops,markets,malls',
  entertainment: 'entertainment,cinemas,theatres,amusement_parks',
  relaxation: 'spas,swimming_pools',
  food: 'restaurants,cafes,food,fast_food,bars',
};

const DEFAULT_CATEGORY_COSTS = {
  food: 20,
  culture: 10,
  sightseeing: 10,
  nature: 5,
  entertainment: 15,
  shopping: 25,
  relaxation: 20,
  adventure: 15,
  accommodation: 80,
};

const FALLBACK_TITLES = {
  morning: [
    'Heritage Walk',
    'Old City Stroll',
    'Temple Trail',
    'Sunrise Promenade',
    'Lakeside Walk',
  ],
  lunch: [
    'Local Thali Lunch',
    'Street Food Crawl',
    'Riverside Lunch',
    'Cafe Break',
    'Market Bites',
  ],
  afternoon: [
    'Museum & Palace Visit',
    'Market Exploration',
    'City Highlights',
    'Crafts & Culture',
    'Garden Escape',
  ],
  evening: [
    'Sunset Viewpoint',
    'Food Street Evening',
    'Cultural Show',
    'Riverside Sunset',
    'Night Market',
  ],
  night: [
    'Night Bites',
    'Dessert Stop',
    'Evening Tea',
  ],
};

const LOCAL_FOODS = {
  kolhapur: ['Misal Pav', 'Tambada Rassa', 'Pandhara Rassa', 'Kolhapuri Thali', 'Solkadhi'],
  pune: ['Misal', 'Vada Pav', 'Bhel', 'Pithla Bhakri', 'Mastani'],
  raigad: ['Konkani Seafood Thali', 'Solkadhi', 'Ukadiche Modak', 'Fish Curry Thali', 'Kokum Sharbat'],
  rajgad: ['Bhakri Meal', 'Pithla', 'Thecha', 'Zunka Bhakri'],
};

const DESTINATION_SEEDS = {
  kolhapur: [
    { name: 'Mahalaxmi Temple', category: 'culture', description: 'Shakti Peetha temple known for early morning darshan.' },
    { name: 'Rankala Lake', category: 'nature', description: 'Scenic lake with a popular promenade.' },
    { name: 'New Palace Museum', category: 'culture', description: 'Royal artifacts and historical exhibits.' },
    { name: 'Shahupuri Market', category: 'shopping', description: 'Famous for Kolhapuri chappals and jewelry.' },
    { name: 'Panhala Fort', category: 'culture', description: 'Historic fort with panoramic views.' },
    { name: 'Jyotiba Temple', category: 'culture', description: 'Hilltop temple with scenic surroundings.' },
    { name: 'Rankala Chowpatty', category: 'entertainment', description: 'Sunset point with local snacks.' },
  ],
  pune: [
    { name: 'Shaniwar Wada', category: 'culture', description: 'Historic fortification in the heart of the city.' },
    { name: 'Aga Khan Palace', category: 'culture', description: 'Landmark with Gandhi-era history.' },
    { name: 'Sinhagad Fort', category: 'adventure', description: 'Popular fort with trekking trails and views.' },
    { name: 'Pataleshwar Cave Temple', category: 'culture', description: 'Rock-cut temple dedicated to Lord Shiva.' },
    { name: 'FC Road Market', category: 'shopping', description: 'Bustling shopping and street food strip.' },
    { name: 'Osho Garden', category: 'relaxation', description: 'Tranquil green space for evening walks.' },
  ],
  raigad: [
    { name: 'Raigad Fort', category: 'culture', description: 'Capital fort of Chhatrapati Shivaji Maharaj.' },
    { name: 'Jagadishwar Temple', category: 'culture', description: 'Ancient temple within Raigad complex.' },
    { name: 'Hirakani Buruj', category: 'culture', description: 'Viewpoint with dramatic fort views.' },
    { name: 'Raigad Ropeway', category: 'entertainment', description: 'Scenic ride up to the fort.' },
  ],
  rajgad: [
    { name: 'Rajgad Fort', category: 'adventure', description: 'Legendary fort with hiking routes.' },
    { name: 'Sanja Darwaza', category: 'culture', description: 'Iconic entrance gate of Rajgad.' },
    { name: 'Balekilla', category: 'culture', description: 'Citadel offering panoramic valley views.' },
    { name: 'Padmavati Machi', category: 'adventure', description: 'Trek and viewpoint near the fort.' },
  ],
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const shuffle = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const parseTimeToMinutes = (timeStr) => {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h * 60) + (m || 0);
};

const normalizePlaceName = (value) => String(value || '').trim().toLowerCase();

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

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const calcDuration = (startTime, endTime) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  return Math.max(30, end - start);
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
  }

  normalizePlace(place) {
    if (!place) return null;
    return {
      id: place.id || place.externalPlaceId || place.xid || place.name,
      name: place.name || 'Local attraction',
      description: place.description || '',
      category: place.category || 'sightseeing',
      location: place.location || null,
      rating: place.rating || 0,
      imageUrl: place.imageUrl || null,
      estimatedCost: place.estimatedCost,
    };
  }

  estimateCostForCategory(category) {
    return DEFAULT_CATEGORY_COSTS[category] || 10;
  }

  buildActivityFromPlace({
    place,
    dayNumber,
    timeBlock,
    startTime,
    endTime,
    fallbackCoordinates,
    importance = 'recommended',
    categoryOverride,
    notes,
  }) {
    const normalized = this.normalizePlace(place) || {};
    const coords = normalized.location?.coordinates || {};
    const latitude = coords.latitude ?? fallbackCoordinates?.latitude ?? 0;
    const longitude = coords.longitude ?? fallbackCoordinates?.longitude ?? 0;
    const category = categoryOverride || normalized.category || 'sightseeing';
    const duration = calcDuration(startTime, endTime);

    return {
      name: normalized.name || 'Local attraction',
      description: normalized.description || notes || 'Explore this local highlight.',
      category,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address: normalized.location?.address || '',
        city: normalized.location?.city || '',
      },
      dayNumber,
      timeBlock,
      startTime,
      endTime,
      duration,
      estimatedCost: Math.round(
        Number.isFinite(normalized.estimatedCost)
          ? normalized.estimatedCost
          : this.estimateCostForCategory(category)
      ),
      importance,
      externalPlaceId: normalized.id || null,
      imageUrl: normalized.imageUrl || null,
      rating: normalized.rating || 0,
      notes: notes || '',
    };
  }

  buildGenericActivity({
    destination,
    dayNumber,
    timeBlock,
    startTime,
    endTime,
    category,
    fallbackCoordinates,
    name,
    description,
  }) {
    const blockNames = FALLBACK_TITLES[timeBlock] || ['Local Experience'];
    const fallbackName = `${destination} ${pickVariant(blockNames, `${destination}-${timeBlock}-${dayNumber}`)}`;

    return {
      name: name || fallbackName,
      description:
        description || `Discover local highlights and hidden gems in ${destination}.`,
      category,
      location: {
        type: 'Point',
        coordinates: [
          fallbackCoordinates?.longitude || 0,
          fallbackCoordinates?.latitude || 0,
        ],
        address: destination,
        city: destination,
      },
      dayNumber,
      timeBlock,
      startTime,
      endTime,
      duration: calcDuration(startTime, endTime),
      estimatedCost: this.estimateCostForCategory(category),
      importance: 'recommended',
      notes: '',
    };
  }

  pickNextPlace(pool, usedIds, usedNames) {
    while (pool.length > 0) {
      const candidate = pool.shift();
      const id = candidate?.id || candidate?.externalPlaceId || candidate?.name;
      const nameKey = normalizePlaceName(candidate?.name);
      if (!id || usedIds.has(id)) continue;
      if (nameKey && usedNames?.has(nameKey)) continue;
      usedIds.add(id);
      if (nameKey && usedNames) usedNames.add(nameKey);
      return candidate;
    }
    return null;
  }

  async buildPlacePools(destination, coordinates) {
    const coord = coordinates || {};
    const hasCoords = Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude);
    const normalizedDestination = String(destination || '').trim().toLowerCase();

    const baseAttractions = await this.placesService.getPopularAttractions(destination, 40);
    const pools = {
      sightseeing: shuffle(baseAttractions),
      culture: [],
      nature: [],
      shopping: [],
      entertainment: [],
      relaxation: [],
      food: [],
    };

    if (hasCoords) {
      const [
        culture,
        nature,
        shopping,
        entertainment,
        relaxation,
        food,
      ] = await Promise.all([
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.culture,
          12000,
          18
        ),
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.nature,
          12000,
          18
        ),
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.shopping,
          12000,
          14
        ),
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.entertainment,
          12000,
          14
        ),
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.relaxation,
          12000,
          14
        ),
        this.placesService.getAttractionsByKinds(
          coord.latitude,
          coord.longitude,
          KIND_QUERIES.food,
          8000,
          18
        ),
      ]);

      pools.culture = shuffle(culture);
      pools.nature = shuffle(nature);
      pools.shopping = shuffle(shopping);
      pools.entertainment = shuffle(entertainment);
      pools.relaxation = shuffle(relaxation);
      pools.food = shuffle(food);
    }

    // Backfill pools from base attractions by category
    baseAttractions.forEach((place) => {
      const category = place.category || 'sightseeing';
      if (pools[category] && pools[category].length < 12) {
        pools[category].push(place);
      }
    });

    // Seed local must-see spots for known destinations
    const seedPlaces = DESTINATION_SEEDS[normalizedDestination] || [];
    if (seedPlaces.length > 0) {
      seedPlaces.forEach((seed) => {
        const category = seed.category || 'sightseeing';
        const place = {
          id: `seed:${normalizedDestination}:${seed.name}`,
          name: seed.name,
          description: seed.description,
          category,
          location: {
            coordinates: {
              latitude: coord.latitude || 0,
              longitude: coord.longitude || 0,
            },
            address: destination,
            city: destination,
          },
          rating: 0,
        };
        pools.sightseeing.push(place);
        if (pools[category]) {
          pools[category].push(place);
        }
      });
    }

    // Wikipedia fallback if still sparse
    if (this.wikipediaService) {
      if (hasCoords && pools.sightseeing.length < 6) {
        const wikiPlaces = await this.wikipediaService.getNearbyPlaces(
          coord.latitude,
          coord.longitude,
          12
        );
        wikiPlaces.forEach((place) => {
          const category = place.category || 'sightseeing';
          pools.sightseeing.push(place);
          if (pools[category] && pools[category].length < 12) {
            pools[category].push(place);
          }
        });
      }

      if (pools.sightseeing.length < 6) {
        const wikiByTitle = await this.wikipediaService.getPlacesByTitle(
          `${destination} attractions`,
          12
        );
        wikiByTitle.forEach((place) => {
          const category = place.category || 'sightseeing';
          pools.sightseeing.push(place);
          if (pools[category] && pools[category].length < 12) {
            pools[category].push(place);
          }
        });
      }
    }

    return pools;
  }

  async generate(params) {
    const destination = params.destination;
    const days = clamp(Number(params.days) || 1, 1, 14);
    const budget = Number(params.budget) || 0;
    const interests = Array.isArray(params.interests) ? params.interests : [];

    const coords = await this.placesService.getCoordinatesForDestination(destination);
    let coordinates = coords ? { latitude: coords.lat, longitude: coords.lon } : null;

    if (!coordinates && this.wikipediaService) {
      const cityOverview = await this.wikipediaService.getCityOverview(destination);
      if (cityOverview?.location?.coordinates?.latitude && cityOverview?.location?.coordinates?.longitude) {
        coordinates = {
          latitude: cityOverview.location.coordinates.latitude,
          longitude: cityOverview.location.coordinates.longitude,
        };
      }
    }

    if (!coordinates) {
      coordinates = { latitude: 40, longitude: 0 };
    }

    const [weatherForecast, hotels, pools] = await Promise.all([
      this.weatherService.getDailyForecast(
        coordinates.latitude,
        coordinates.longitude,
        days
      ),
      this.hotelsService.searchHotels(
        coordinates.latitude,
        coordinates.longitude,
        5
      ),
      this.buildPlacePools(destination, coordinates),
    ]);

    const usedIds = new Set();
    const usedNames = new Set();
    const activities = [];
    const shuffledBlocks = TIME_BLOCKS;

    const dinnerFallback = (dayNumber, timeBlock, startTime, endTime) =>
      this.buildGenericActivity({
        destination,
        dayNumber,
        timeBlock,
        startTime,
        endTime,
        category: 'food',
        fallbackCoordinates: coordinates,
        name: null,
        description: `Enjoy authentic local cuisine in ${destination}.`,
      });

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const dayNumber = dayIndex + 1;

      shuffledBlocks.forEach((block) => {
        block.slots.forEach((slot, slotIndex) => {
          const categoryChoices = block.categories;
          const preferredCategory =
            interests.find((interest) => categoryChoices.includes(interest)) ||
            categoryChoices[slotIndex % categoryChoices.length] ||
            'sightseeing';

          const pool = pools[preferredCategory] || pools.sightseeing || [];
          const place = this.pickNextPlace(pool, usedIds, usedNames);

          const importance =
            block.key === 'morning' && slotIndex === 0 ? 'must-do' : 'recommended';

          if (place) {
            const built = this.buildActivityFromPlace({
              place,
              dayNumber,
              timeBlock: block.key,
              startTime: slot.start,
              endTime: slot.end,
              fallbackCoordinates: coordinates,
              importance,
            });
            if (built?.name) {
              built.name = ensureUniqueName(
                built.name,
                usedNames,
                `(${BLOCK_LABELS[block.key] || 'Slot'})`
              );
            }
            activities.push(built);
          } else {
            const fallbackCategory =
              block.key === 'lunch' || block.key === 'evening'
                ? 'food'
                : preferredCategory;
            const foodList =
              LOCAL_FOODS[String(destination || '').trim().toLowerCase()] ||
              ['Local Thali', 'Street Food Platter', 'Regional Special Meal', 'Cafe Lunch'];
            const foodItem = pickVariant(foodList, `${destination}-${block.key}-${dayNumber}`);
            const fallbackName = fallbackCategory === 'food'
              ? `${foodItem} in ${destination}`
              : null;
            const fallbackActivity = this.buildGenericActivity({
              destination,
              dayNumber,
              timeBlock: block.key,
              startTime: slot.start,
              endTime: slot.end,
              category: fallbackCategory,
              fallbackCoordinates: coordinates,
              name: fallbackName,
            });
            if (fallbackActivity?.name) {
              fallbackActivity.name = ensureUniqueName(
                fallbackActivity.name,
                usedNames,
                `(${BLOCK_LABELS[block.key] || 'Slot'})`
              );
            }
            activities.push(fallbackActivity);
          }
        });

        if (block.key === 'evening') {
          const lastSlot = block.slots[block.slots.length - 1];
          const hasFood = activities.some(
            (activity) =>
              activity.dayNumber === dayNumber &&
              activity.timeBlock === 'evening' &&
              activity.category === 'food'
          );

          if (!hasFood && lastSlot) {
            activities.push(
              dinnerFallback(dayNumber, 'evening', lastSlot.start, lastSlot.end)
            );
          }
        }
      });
    }

    const highlights = activities
      .filter((activity) => activity.importance === 'must-do')
      .slice(0, 8)
      .map((activity) => activity.name);

    const aiPlan = await this.aiService.generateItineraryEnhancement({
      destination,
      days,
      budget,
      interests,
      travelStyle: params.travelStyle,
      travelers: params.numberOfTravelers,
      startDate: params.startDate,
      aiNotes: params.aiNotes,
      imageData: params.imageData,
      imageMimeType: params.imageMimeType,
    });

    return {
      activities,
      coordinates,
      weatherForecast,
      hotels,
      highlights,
      aiPlan,
      metadata: {
        totalActivities: activities.length,
        hasWeather: weatherForecast.length > 0,
        hasHotels: hotels.length > 0,
        usedWikipedia: activities.some((a) => String(a.externalPlaceId || '').startsWith('wiki:')),
      },
    };
  }
}

module.exports = ItineraryGenerator;
