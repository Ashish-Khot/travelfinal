const GeminiService = require('./geminiService');
const PlacesService = require('./placesService');

const geminiService = new GeminiService();
const placesService = new PlacesService();

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

function normalizeStop(stop) {
  return {
    name: String(stop?.name || 'Unknown destination').trim(),
    address: String(stop?.address || '').trim(),
    description: String(stop?.description || '').trim(),
    arrivalTime: String(stop?.arrivalTime || '').trim(),
    departureTime: String(stop?.departureTime || '').trim(),
    durationMinutes: Number(stop?.durationMinutes || 90),
    category: String(stop?.category || 'sightseeing').trim(),
    openingHours: String(stop?.openingHours || '').trim(),
    estimatedCost: Number(stop?.estimatedCost || 0),
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

function sanitizeTitle(name, fallback) {
  const value = String(name || '').trim();
  if (!value) return fallback;
  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveTripDays(input) {
  const start = safeDate(input.startDate);
  const end = safeDate(input.endDate);
  if (!start || !end || end < start) return 3;
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  return Math.max(1, Math.min(days, 10));
}

function resolveStopsPerDay(input) {
  const pace = String(input.pace || '').toLowerCase();
  if (pace === 'relaxed') return 3;
  if (pace === 'fast' || pace === 'packed') return 5;
  return 4;
}

function normalizeAttractionStop(place, fallbackCoords, slotStart, slotEnd) {
  const lat = Number(place?.location?.coordinates?.latitude || fallbackCoords?.lat || 0);
  const lng = Number(place?.location?.coordinates?.longitude || fallbackCoords?.lon || 0);
  const category = String(place?.category || 'sightseeing').toLowerCase();

  const estimatedCostByCategory = {
    sightseeing: 900,
    culture: 1100,
    nature: 700,
    food: 1400,
    shopping: 2200,
    adventure: 1800,
    entertainment: 1600,
    relaxation: 1300,
  };

  return {
    name: sanitizeTitle(place?.name, 'Local highlight'),
    address: String(place?.location?.address || `${String(place?.name || '').trim()}, ${fallbackCoords?.label || 'City center'}`),
    description: String(place?.description || 'Popular stop selected based on your trip preferences.'),
    arrivalTime: slotStart,
    departureTime: slotEnd,
    durationMinutes: Math.max(45, toMinutes(slotEnd) - toMinutes(slotStart)),
    category,
    openingHours: String(place?.openingHours || '09:00 - 18:00'),
    estimatedCost: Number(estimatedCostByCategory[category] || 1000),
    rating: Number(place?.rating || 4),
    image: String(place?.imageUrl || ''),
    bestFor: [category.charAt(0).toUpperCase() + category.slice(1), 'Leisure'],
    crowdTip: 'Arrive early to avoid peak crowds.',
    location: { lat, lng },
  };
}

function buildPlaceholderStop({ destination, fallbackCoords, slotStart, slotEnd, index }) {
  const templates = [
    {
      name: `${destination} City Walk`,
      description: 'Explore central streets, architecture, and local cafes.',
      category: 'sightseeing',
      cost: 600,
    },
    {
      name: `${destination} Local Market`,
      description: 'Browse handmade crafts and regional specialties.',
      category: 'shopping',
      cost: 1500,
    },
    {
      name: `${destination} Signature Landmark`,
      description: 'Visit a must-see landmark and capture scenic views.',
      category: 'culture',
      cost: 900,
    },
    {
      name: `${destination} Food Experience`,
      description: 'Taste local cuisine at a trusted neighborhood spot.',
      category: 'food',
      cost: 1400,
    },
    {
      name: `${destination} Sunset Point`,
      description: 'Wind down with a relaxed evening viewpoint stop.',
      category: 'nature',
      cost: 700,
    },
  ];

  const template = templates[index % templates.length];
  return {
    name: template.name,
    address: `Central ${destination}`,
    description: template.description,
    arrivalTime: slotStart,
    departureTime: slotEnd,
    durationMinutes: Math.max(45, toMinutes(slotEnd) - toMinutes(slotStart)),
    category: template.category,
    openingHours: '09:00 - 20:00',
    estimatedCost: template.cost,
    rating: 4,
    image: '',
    bestFor: [template.category.charAt(0).toUpperCase() + template.category.slice(1), 'General'],
    crowdTip: 'Keep 15-20 minutes of transfer buffer between stops.',
    location: {
      lat: Number(fallbackCoords?.lat || 0),
      lng: Number(fallbackCoords?.lon || 0),
    },
  };
}

async function buildRuleBasedItinerary(input) {
  const tripDays = resolveTripDays(input);
  const stopsPerDay = resolveStopsPerDay(input);
  const destinationCoords = await placesService.getCoordinatesForDestination(input.destination);
  const fallbackCoords = {
    lat: Number(destinationCoords?.lat || 0),
    lon: Number(destinationCoords?.lon || 0),
    label: input.destination,
  };

  const attractions = await placesService.getPopularAttractions(
    input.destination,
    Math.max(12, tripDays * stopsPerDay * 2)
  );
  const safeAttractions = Array.isArray(attractions) ? attractions.filter((item) => item?.name) : [];

  const dayPlans = [];
  let cursor = 0;
  const dayStart = toMinutes(input.dailyStartTime) || 540;
  const dayEnd = toMinutes(input.dailyEndTime) || 1260;
  const usableMinutes = Math.max(300, dayEnd - dayStart);
  const slotDuration = Math.max(70, Math.floor(usableMinutes / Math.max(3, stopsPerDay)));

  for (let dayIndex = 0; dayIndex < tripDays; dayIndex += 1) {
    const stops = [];
    for (let stopIndex = 0; stopIndex < stopsPerDay; stopIndex += 1) {
      const start = dayStart + slotDuration * stopIndex;
      const end = Math.min(dayEnd, start + Math.max(60, slotDuration - 20));
      const slotStart = minutesToTime(start);
      const slotEnd = minutesToTime(end);

      const place = safeAttractions.length ? safeAttractions[cursor % safeAttractions.length] : null;
      if (place) {
        stops.push(normalizeAttractionStop(place, fallbackCoords, slotStart, slotEnd));
        cursor += 1;
      } else {
        stops.push(
          buildPlaceholderStop({
            destination: input.destination,
            fallbackCoords,
            slotStart,
            slotEnd,
            index: dayIndex * stopsPerDay + stopIndex,
          })
        );
      }
    }

    dayPlans.push({
      day: dayIndex + 1,
      title: `Day ${dayIndex + 1} in ${input.destination}`,
      stops,
    });
  }

  return {
    destination: input.destination,
    summary: `Auto-generated ${tripDays}-day itinerary for ${input.destination} based on your travel preferences.`,
    days: dayPlans,
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

function buildPrompt(input) {
  return `You are a strict travel planner. Create a realistic itinerary JSON for ${input.destination}.
Rules:
- Respect daily start time ${input.dailyStartTime} and end time ${input.dailyEndTime}
- Include realistic arrivalTime and departureTime for each stop in 24h HH:MM format.
- Include 3-6 stops per day.
- Include popular real places in ${input.destination}.
- Include location lat/lng if known, else 0.
- Keep travel realistic and non-overlapping.
- Include short address.
- Include estimatedCost in ${input.currency || 'INR'} and openingHours when possible.
- Include quick traveler tips and bestFor tags.
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

async function validateAndEnhanceItinerary(raw, input) {
  const days = Array.isArray(raw?.days) ? raw.days : [];
  const resultDays = [];
  let overallDistanceKm = 0;
  let overallTravelMinutes = 0;
  let overallEstimatedCost = 0;

  for (const day of days) {
    const stops = (Array.isArray(day?.stops) ? day.stops : []).map(normalizeStop);
    const enriched = [];
    let dayDistanceKm = 0;
    let dayTravelMinutes = 0;
    let dayEstimatedCost = 0;

    for (const stop of stops) {
      const fixed = await enrichStopCoordinates(input.destination, stop);
      enriched.push(fixed);
      dayEstimatedCost += Number(fixed.estimatedCost || 0);
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
      day: Number(day?.day || resultDays.length + 1),
      title: String(day?.title || `Day ${resultDays.length + 1}`).trim(),
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
    summary: raw?.summary || `Personalized ${resultDays.length}-day plan for ${input.destination}`,
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
  try {
    const raw = await geminiService.generateStructuredJson({ prompt, maxOutputTokens: 3200, temperature: 0.35 });
    return validateAndEnhanceItinerary(raw, input);
  } catch (error) {
    console.warn('[Itinerary] AI generation fallback activated:', error.message);
    const fallbackRaw = await buildRuleBasedItinerary(input);
    return validateAndEnhanceItinerary(fallbackRaw, input);
  }
}

module.exports = {
  generateItinerary,
};
