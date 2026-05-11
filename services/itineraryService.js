const GeminiService = require('./geminiService');
const PlacesService = require('./placesService');
const WikipediaService = require('./wikipediaService');

const geminiService = new GeminiService({ scope: 'itinerary' });
const placesService = new PlacesService();
const wikipediaService = new WikipediaService();

const BUDGET_MULTIPLIER = {
  low: 0.78,
  mid: 1,
  high: 1.55,
};

const CATEGORY_BASE_COST = {
  food: 1100,
  shopping: 2500,
  nature: 900,
  culture: 1300,
  adventure: 1700,
  entertainment: 1500,
  relaxation: 1400,
  sightseeing: 1200,
};

function normalizeCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  if (!category) return 'sightseeing';
  if (category.includes('food')) return 'food';
  if (category.includes('shop')) return 'shopping';
  if (category.includes('nature')) return 'nature';
  if (category.includes('culture')) return 'culture';
  if (category.includes('adventure')) return 'adventure';
  if (category.includes('entertainment')) return 'entertainment';
  if (category.includes('relax')) return 'relaxation';
  return 'sightseeing';
}

function estimateStopCost(category, budgetLevel = 'mid') {
  const normalizedCategory = normalizeCategory(category);
  const base = CATEGORY_BASE_COST[normalizedCategory] || CATEGORY_BASE_COST.sightseeing;
  const multiplier = BUDGET_MULTIPLIER[String(budgetLevel || '').toLowerCase()] || BUDGET_MULTIPLIER.mid;
  return Math.max(250, Math.round(base * multiplier));
}

function getStopsPerDayForPace(pace = 'balanced') {
  const normalized = String(pace || '').toLowerCase();
  if (normalized === 'fast') return 5;
  if (normalized === 'relaxed') return 3;
  return 4;
}

function hasValidCoordinates(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultCityDayStops({ destination, dayNumber, center, budget, startMinutes }) {
  const lat = Number(center?.lat || 0);
  const lng = Number(center?.lon || 0);
  const delta = 0.012;
  const templates = [
    {
      name: `${destination} Historic District Walk`,
      category: 'culture',
      description: 'Explore iconic streets, architecture, and public squares at a comfortable pace.',
      bestFor: ['Culture', 'Walking'],
      crowdTip: 'Start early to avoid peak footfall.',
    },
    {
      name: `${destination} Local Food Trail`,
      category: 'food',
      description: 'Taste regional specialties and discover neighborhood cafes and markets.',
      bestFor: ['Food', 'Local Experience'],
      crowdTip: 'Reserve lunch slots in advance where possible.',
    },
    {
      name: `${destination} Waterfront & Sunset Point`,
      category: 'nature',
      description: 'Relax with scenic views and light exploration during golden hour.',
      bestFor: ['Photography', 'Relaxation'],
      crowdTip: 'Carry a light jacket for evening breeze.',
    },
  ];

  return templates.map((item, index) => {
    const arrival = startMinutes + index * 140;
    const departure = arrival + 95;
    return {
      name: item.name,
      address: destination,
      description: item.description,
      arrivalTime: minutesToTime(arrival),
      departureTime: minutesToTime(departure),
      durationMinutes: 95,
      category: item.category,
      openingHours: '',
      estimatedCost: estimateStopCost(item.category, budget),
      rating: 4.2,
      image: '',
      bestFor: item.bestFor,
      crowdTip: item.crowdTip,
      location: {
        lat: lat ? Number((lat + delta * Math.cos(index + dayNumber)).toFixed(6)) : 0,
        lng: lng ? Number((lng + delta * Math.sin(index + dayNumber)).toFixed(6)) : 0,
      },
    };
  });
}

function toMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToTime(mins) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, mins));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimateTransit(distanceKm, mode = 'car') {
  const speed = mode === 'walk' ? 4.5 : mode === 'bike' ? 15 : 28;
  const mins = Math.max(8, Math.round((distanceKm / speed) * 60));
  return mins;
}

function resolveRequestedDays(input = {}) {
  const explicit = Number(input.days);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.round(explicit));
  }

  const start = new Date(input.startDate || '');
  const end = new Date(input.endDate || '');
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  }

  return 3;
}

function normalizeStop(stop) {
  const normalizedCategory = normalizeCategory(stop?.category);
  const parsedEstimatedCost = Number(stop?.estimatedCost);
  return {
    name: String(stop?.name || 'Unknown destination').trim(),
    address: String(stop?.address || '').trim(),
    description: String(stop?.description || '').trim(),
    arrivalTime: String(stop?.arrivalTime || '').trim(),
    departureTime: String(stop?.departureTime || '').trim(),
    durationMinutes: Number(stop?.durationMinutes || 90),
    category: normalizedCategory,
    openingHours: String(stop?.openingHours || '').trim(),
    estimatedCost: Number.isFinite(parsedEstimatedCost) ? parsedEstimatedCost : 0,
    rating: Number(stop?.rating || 0),
    image: String(stop?.image || '').trim(),
    bestFor: Array.isArray(stop?.bestFor)
      ? stop.bestFor.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    crowdTip: String(stop?.crowdTip || '').trim(),
    location: {
      lat: Number(stop?.location?.lat || 0),
      lng: Number(stop?.location?.lng || 0),
    },
  };
}

async function enrichStopCoordinates(destination, stop) {
  if (Number.isFinite(stop.location.lat) && Number.isFinite(stop.location.lng) && stop.location.lat && stop.location.lng) {
    return stop;
  }

  const query = stop.address || `${stop.name}, ${destination}`;
  const coords = await placesService.getCoordinatesForDestination(query);
  if (coords) {
    stop.location.lat = Number(coords.lat);
    stop.location.lng = Number(coords.lon);
  }
  return stop;
}

function mapPlaceToDraftStop(place, input, index = 0) {
  const name = String(place?.name || `Attraction ${index + 1}`).trim();
  const description = String(place?.description || '').trim();
  const category = normalizeCategory(place?.category || place?.kinds || 'sightseeing');
  const lat = toSafeNumber(
    place?.location?.coordinates?.latitude ?? place?.location?.lat ?? place?.lat,
    0
  );
  const lng = toSafeNumber(
    place?.location?.coordinates?.longitude ?? place?.location?.lng ?? place?.lon,
    0
  );

  return normalizeStop({
    name,
    address: String(place?.location?.address || input.destination || '').trim(),
    description: description || `Visit ${name} while exploring ${input.destination}.`,
    arrivalTime: '',
    departureTime: '',
    durationMinutes: category === 'food' ? 75 : 90,
    category,
    openingHours: String(place?.openingHours || '').trim(),
    estimatedCost: estimateStopCost(category, input.budget),
    rating: Number(place?.rating || 0),
    image: String(place?.imageUrl || place?.image || '').trim(),
    bestFor: [],
    crowdTip: '',
    location: { lat, lng },
  });
}

async function getSupplementalPlaces(destination, neededCount, excludedNames = new Set()) {
  const candidates = [];
  const seen = new Set(
    [...excludedNames].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
  );

  const pushCandidate = (item) => {
    const name = String(item?.name || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(item);
  };

  const popularPlaces = await placesService.getPopularAttractions(
    destination,
    Math.min(50, Math.max(neededCount * 3, 18))
  );
  popularPlaces.forEach(pushCandidate);

  if (candidates.length < neededCount) {
    const wikiByTitle = await wikipediaService.getPlacesByTitle(
      `${destination} tourist attractions`,
      Math.min(24, Math.max(neededCount * 2, 12))
    );
    wikiByTitle.forEach(pushCandidate);
  }

  if (candidates.length < neededCount) {
    const center = await placesService.getCoordinatesForDestination(destination);
    if (center?.lat && center?.lon) {
      const nearbyWiki = await wikipediaService.getNearbyPlaces(
        Number(center.lat),
        Number(center.lon),
        Math.min(24, Math.max(neededCount * 2, 12))
      );
      nearbyWiki.forEach(pushCandidate);
    }
  }

  return candidates;
}

async function buildSupplementalDayDrafts(rawDays, input, requestedDays) {
  const perDayStops = getStopsPerDayForPace(input.pace);
  const parsedDays = Array.isArray(rawDays) ? rawDays : [];

  const dayMap = new Map();
  parsedDays.forEach((day, index) => {
    const dayNumber = Number(day?.day || index + 1);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > requestedDays) return;
    if (!dayMap.has(dayNumber)) {
      dayMap.set(dayNumber, day);
    }
  });

  const usedNames = new Set();
  dayMap.forEach((day) => {
    const stops = Array.isArray(day?.stops) ? day.stops : [];
    stops.forEach((stop) => {
      const name = String(stop?.name || '').trim().toLowerCase();
      if (name) usedNames.add(name);
    });
  });

  const missingSlots = [];
  for (let dayNumber = 1; dayNumber <= requestedDays; dayNumber += 1) {
    const existing = dayMap.get(dayNumber);
    const hasStops = Array.isArray(existing?.stops) && existing.stops.length > 0;
    if (!hasStops) {
      missingSlots.push(dayNumber);
    }
  }

  if (!missingSlots.length) {
    return Array.from({ length: requestedDays }).map((_, index) => dayMap.get(index + 1));
  }

  const supplementalPlaces = await getSupplementalPlaces(
    input.destination,
    missingSlots.length * perDayStops,
    usedNames
  );
  const destinationCenter = await placesService.getCoordinatesForDestination(input.destination);
  let pointer = 0;

  missingSlots.forEach((dayNumber) => {
    const draftedStops = [];
    while (draftedStops.length < perDayStops && pointer < supplementalPlaces.length) {
      const nextPlace = supplementalPlaces[pointer];
      pointer += 1;
      draftedStops.push(mapPlaceToDraftStop(nextPlace, input, draftedStops.length));
    }

    if (!draftedStops.length) {
      const fallbackStart = toMinutes(input.dailyStartTime) || 540;
      dayMap.set(dayNumber, {
        day: dayNumber,
        title: `Day ${dayNumber} Highlights`,
        stops: defaultCityDayStops({
          destination: input.destination,
          dayNumber,
          center: destinationCenter,
          budget: input.budget,
          startMinutes: fallbackStart,
        }),
      });
      return;
    }

    dayMap.set(dayNumber, {
      day: dayNumber,
      title: `Day ${dayNumber} City Highlights`,
      stops: draftedStops,
    });
  });

  return Array.from({ length: requestedDays }).map((_, index) => dayMap.get(index + 1));
}

function buildPrompt(input) {
  const requestedDays = resolveRequestedDays(input);
  return `You are a strict travel planner. Create a realistic itinerary JSON for ${input.destination}.
Rules:
- Respect daily start time ${input.dailyStartTime} and end time ${input.dailyEndTime}
- Generate exactly ${requestedDays} day plans in the "days" array (no fewer, no extra).
- Day numbers must be sequential from 1 to ${requestedDays}.
- Include realistic arrivalTime and departureTime for each stop in 24h HH:MM format.
- Include 3-6 stops per day.
- Include popular real places in ${input.destination}.
- Include location lat/lng if known, else 0.
- Keep travel realistic and non-overlapping.
- Include short address.
- Include estimatedCost in ${input.currency || 'INR'} and openingHours when possible.
- Include quick traveler tips and bestFor tags.
- Return strict valid JSON only (RFC8259).
- Do not include markdown fences, comments, explanations, or trailing commas.
Return ONLY JSON in this schema:
{
  "destination": "string",
  "summary": "string",
  "days": [
    {
      "day": 1,
      "title": "string",
      "stops": [
        {
          "name": "string",
          "address": "string",
          "description": "string",
          "arrivalTime": "09:00",
          "departureTime": "10:30",
          "durationMinutes": 90,
          "category": "sightseeing|food|shopping|nature|culture",
          "openingHours": "09:00 - 18:00",
          "estimatedCost": 1200,
          "rating": 4.3,
          "bestFor": ["Culture", "Photography"],
          "crowdTip": "string",
          "location": { "lat": 0, "lng": 0 }
        }
      ]
    }
  ]
}
Traveler preferences: interests=${(input.interests || []).join(', ') || 'general'}, budget=${input.budget || 'mid'}, pace=${input.pace || 'balanced'}, transport=${input.transportMode || 'car'}, travelers=${input.travelers || 1}, specialRequirements=${input.specialRequirements || 'none'}, travelDates=${input.startDate || '-'} to ${input.endDate || '-'}`;
}

function validateRawItineraryShape(raw) {
  if (!raw || typeof raw !== 'object') {
    return 'Generated payload is not an object.';
  }

  if (raw.days != null && !Array.isArray(raw.days)) {
    return 'Generated payload has invalid day plans.';
  }

  return true;
}

async function validateAndEnhanceItinerary(raw, input) {
  const requestedDays = resolveRequestedDays(input);
  const draftedDays = await buildSupplementalDayDrafts(raw?.days, input, requestedDays);
  const destinationCenter = await placesService.getCoordinatesForDestination(input.destination);
  const resultDays = [];
  let overallDistanceKm = 0;
  let overallTravelMinutes = 0;
  let overallEstimatedCost = 0;

  for (let dayIndex = 0; dayIndex < requestedDays; dayIndex += 1) {
    const dayNumber = dayIndex + 1;
    const day = draftedDays?.[dayIndex] || {};
    const fallbackStart = toMinutes(input.dailyStartTime) || 540;

    const fallbackStops = defaultCityDayStops({
      destination: input.destination,
      dayNumber,
      center: destinationCenter,
      budget: input.budget,
      startMinutes: fallbackStart,
    });

    const rawStops = Array.isArray(day?.stops) && day.stops.length ? day.stops : fallbackStops;
    const stops = rawStops.map(normalizeStop);
    const enriched = [];
    let dayDistanceKm = 0;
    let dayTravelMinutes = 0;
    let dayEstimatedCost = 0;

    for (const stop of stops) {
      const fixed = await enrichStopCoordinates(input.destination, stop);
      fixed.category = normalizeCategory(fixed.category);
      if (!Number.isFinite(Number(fixed.estimatedCost)) || Number(fixed.estimatedCost) <= 0) {
        fixed.estimatedCost = estimateStopCost(fixed.category, input.budget);
      }
      enriched.push(fixed);
      dayEstimatedCost += Number(fixed.estimatedCost || 0);
    }

    const hasAnyCoords = enriched.some((stop) => hasValidCoordinates(stop.location));
    if (!hasAnyCoords && destinationCenter?.lat && destinationCenter?.lon) {
      const anchorLat = Number(destinationCenter.lat);
      const anchorLng = Number(destinationCenter.lon);
      const delta = 0.01;
      enriched.forEach((stop, index) => {
        stop.location.lat = Number((anchorLat + delta * Math.cos(index + dayNumber)).toFixed(6));
        stop.location.lng = Number((anchorLng + delta * Math.sin(index + dayNumber)).toFixed(6));
      });
    }

    for (let i = 0; i < enriched.length; i += 1) {
      const current = enriched[i];
      const arr = toMinutes(current.arrivalTime);
      const dep = toMinutes(current.departureTime);
      if (arr == null || dep == null || dep <= arr) {
        const fallbackArr = i === 0 ? toMinutes(input.dailyStartTime) || 540 : (toMinutes(enriched[i - 1].departureTime) || 540) + 20;
        const fallbackDep = fallbackArr + Math.max(45, current.durationMinutes || 90);
        current.arrivalTime = minutesToTime(fallbackArr);
        current.departureTime = minutesToTime(fallbackDep);
      }

      if (i > 0) {
        const prev = enriched[i - 1];
        const distKm = (prev.location.lat && prev.location.lng && current.location.lat && current.location.lng)
          ? haversineKm(prev.location.lat, prev.location.lng, current.location.lat, current.location.lng)
          : 3;
        const travelMin = estimateTransit(distKm, input.transportMode);
        current.travelFromPrevious = {
          mode: input.transportMode || 'car',
          distanceKm: Number(distKm.toFixed(1)),
          estimatedMinutes: travelMin,
        };
        dayDistanceKm += Number(distKm.toFixed(1));
        dayTravelMinutes += travelMin;

        const prevDep = toMinutes(prev.departureTime) || 540;
        const expectedArr = prevDep + travelMin;
        const currArr = toMinutes(current.arrivalTime) || expectedArr;
        if (currArr < expectedArr) {
          const delta = expectedArr - currArr;
          const currDep = toMinutes(current.departureTime) || currArr + 90;
          current.arrivalTime = minutesToTime(expectedArr);
          current.departureTime = minutesToTime(currDep + delta);
        }
      }
    }

    resultDays.push({
      day: dayNumber,
      title: String(day?.title || `Day ${dayNumber}`).trim(),
      summary: {
        distanceKm: Number(dayDistanceKm.toFixed(1)),
        movingTimeMinutes: dayTravelMinutes,
        estimatedCost: Math.round(dayEstimatedCost),
      },
      stops: enriched,
    });

    overallDistanceKm += dayDistanceKm;
    overallTravelMinutes += dayTravelMinutes;
    overallEstimatedCost += dayEstimatedCost;
  }

  return {
    destination: raw?.destination || input.destination,
    summary: raw?.summary || `Personalized ${requestedDays}-day plan for ${input.destination}`,
    meta: {
      overallDistanceKm: Number(overallDistanceKm.toFixed(1)),
      overallTravelMinutes,
      overallEstimatedCost: Math.round(overallEstimatedCost),
      currency: input.currency || 'INR',
    },
    days: resultDays,
  };
}

async function generateItinerary(input) {
  const prompt = buildPrompt(input);
  const requestedDays = resolveRequestedDays(input);
  const dynamicMaxOutputTokens = Math.min(12000, Math.max(3200, requestedDays * 1400));
  try {
    const raw = await geminiService.generateStructuredJson({
      prompt,
      maxOutputTokens: dynamicMaxOutputTokens,
      temperature: 0.35,
      validateJson: validateRawItineraryShape,
    });
    const itinerary = await validateAndEnhanceItinerary(raw, input);

    const hasValidDays = Array.isArray(itinerary?.days) && itinerary.days.length > 0;
    const hasAtLeastOneStop = hasValidDays && itinerary.days.some((day) => Array.isArray(day?.stops) && day.stops.length > 0);

    if (!hasAtLeastOneStop) {
      throw new Error('Generated itinerary is empty.');
    }

    return itinerary;
  } catch (error) {
    console.warn('[Itinerary] generation failed:', error.message);
    throw new Error('Unable to generate itinerary right now. Please try again later.');
  }
}

module.exports = {
  generateItinerary,
};
