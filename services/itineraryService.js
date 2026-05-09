const GeminiService = require('./geminiService');
const PlacesService = require('./placesService');

const geminiService = new GeminiService({ scope: 'itinerary' });
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

  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    return 'Generated payload has no day plans.';
  }

  const hasAtLeastOneStop = raw.days.some(
    (day) => Array.isArray(day?.stops) && day.stops.length > 0
  );
  if (!hasAtLeastOneStop) {
    return 'Generated payload has no itinerary stops.';
  }

  return true;
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
    const raw = await geminiService.generateStructuredJson({
      prompt,
      maxOutputTokens: 3200,
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
