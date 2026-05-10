/**
 * Itinerary Controller
 * Handles all itinerary operations: CRUD, AI generation, optimization, etc.
 */

const Itinerary = require('../models/Itinerary');
const ItineraryTemplate = require('../models/ItineraryTemplate');
const User = require('../models/User');
const AIService = require('../services/aiService');
const ExportService = require('../services/exportService');

const aiService = new AIService();
const exportService = new ExportService();

const DEFAULT_BUDGET_SPLIT = {
  accommodation: 35,
  transportation: 15,
  activities: 25,
  food: 20,
  misc: 5,
};

const ALLOWED_SEASONS = new Set(['spring', 'summer', 'fall', 'winter']);
const ALLOWED_DIFFICULTY = new Set(['easy', 'moderate', 'hard']);

const normalizeStringArray = (value, maxItems = 8) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const clampNumber = (value, min, max, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const normalizeGeneratedActivities = (activities) => {
  if (!Array.isArray(activities)) return [];
  return activities.map((activity) => ({
    ...activity,
    rating: clampNumber(activity?.rating, 0, 5, 0),
  }));
};

const buildSafeDescription = (summary, destination) => {
  const fallback = `AI-generated itinerary for ${destination}`;
  const raw = String(summary || '').trim() || fallback;
  return raw.length > 900 ? `${raw.slice(0, 897)}...` : raw;
};

const cleanAiText = (text) =>
  String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const looksLikeJsonBlob = (text) => {
  const value = String(text || '').trim();
  return (
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']')) ||
    value.includes('"itinerary"') ||
    value.includes('"dailyPlan"')
  );
};

const buildReadableDetailedPlan = (dailyPlan) => {
  if (!Array.isArray(dailyPlan) || dailyPlan.length === 0) return '';
  return dailyPlan
    .map((dayPlan, index) => {
      const dayNumber = Number(dayPlan?.day) || index + 1;
      const theme = String(dayPlan?.theme || '').trim();
      const activities = Array.isArray(dayPlan?.activities) ? dayPlan.activities : [];
      const activityLines = activities.map((activity) => {
        const time = String(activity?.time || '').trim() || 'Flexible time';
        const place = String(activity?.placeName || activity?.name || 'Planned stop').trim();
        const description = String(activity?.description || '').trim();
        const cost = Number(activity?.estimatedCost);
        const costText = Number.isFinite(cost) && cost > 0 ? ` | Est. INR ${cost}` : '';
        return `- ${time}: ${place}${description ? ` - ${description}` : ''}${costText}`;
      });
      return [`Day ${dayNumber}${theme ? ` - ${theme}` : ''}`, ...activityLines].join('\n');
    })
    .join('\n\n');
};

const normalizeBudgetSplit = (split) => {
  if (!split || typeof split !== 'object') return null;
  const keys = Object.keys(DEFAULT_BUDGET_SPLIT);
  const cleaned = {};
  let total = 0;

  for (const key of keys) {
    const value = Number(split[key]);
    if (!Number.isFinite(value) || value < 0) return null;
    cleaned[key] = value;
    total += value;
  }

  if (total <= 0) return null;

  const normalized = {};
  keys.forEach((key) => {
    normalized[key] = (cleaned[key] / total) * 100;
  });
  return normalized;
};

const buildBudgetAllocation = (totalBudget, split) => {
  const normalizedSplit = normalizeBudgetSplit(split) || DEFAULT_BUDGET_SPLIT;
  const keys = Object.keys(DEFAULT_BUDGET_SPLIT);
  const allocations = {};
  let allocatedTotal = 0;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      allocations[key] = Math.max(0, Math.round(totalBudget - allocatedTotal));
    } else {
      const amount = Math.round((totalBudget * normalizedSplit[key]) / 100);
      allocations[key] = Math.max(0, amount);
      allocatedTotal += allocations[key];
    }
  });

  return allocations;
};

const pickEnumValue = (value, allowed, fallback) => {
  if (!value) return fallback;
  return allowed.has(value) ? value : fallback;
};

const estimateMinimumBudget = ({ days, travelers, travelStyle }) => {
  const dayCount = Math.max(1, Number(days) || 1);
  const pax = Math.max(1, Number(travelers) || 1);
  const style = String(travelStyle || 'solo').toLowerCase();
  const basePerPersonPerDay =
    style === 'budget' ? 1800 :
      style === 'luxury' ? 6500 :
        style === 'family' ? 2800 :
          style === 'group' ? 2400 : 2600;
  return Math.round(basePerPersonPerDay * dayCount * pax);
};

const normalizeCategory = (category) => {
  const allowed = new Set([
    'sightseeing',
    'adventure',
    'food',
    'culture',
    'nature',
    'shopping',
    'entertainment',
    'relaxation',
    'accommodation',
    'transportation',
  ]);
  const normalized = String(category || '').trim().toLowerCase();
  return allowed.has(normalized) ? normalized : 'sightseeing';
};

const toTimeBlock = (timeSlot, startTime) => {
  const raw = String(timeSlot || '').trim().toLowerCase();
  if (['morning', 'afternoon', 'evening', 'lunch', 'night'].includes(raw)) {
    if (raw === 'lunch') return 'afternoon';
    if (raw === 'night') return 'evening';
    return raw;
  }
  const hour = Number(String(startTime || '09:00').split(':')[0] || 9);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const buildEndTime = (startTime, durationMinutes) => {
  const [hRaw, mRaw] = String(startTime || '09:00').split(':');
  const h = Math.max(0, Math.min(23, Number(hRaw) || 9));
  const m = Math.max(0, Math.min(59, Number(mRaw) || 0));
  const startTotal = h * 60 + m;
  const endTotal = startTotal + Math.max(30, Number(durationMinutes) || 90);
  const endH = Math.floor((endTotal % 1440) / 60);
  const endM = endTotal % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

const mapPromptPlanToActivities = (dailyPlan, destination, currency = 'INR') => {
  if (!Array.isArray(dailyPlan)) return [];
  return dailyPlan.flatMap((dayPlan, dayIndex) => {
    const dayNumber = Number(dayPlan?.day) || dayIndex + 1;
    const activities = Array.isArray(dayPlan?.activities) ? dayPlan.activities : [];
    return activities.map((activity, idx) => {
      const startTime = String(activity?.time || '').match(/^\d{2}:\d{2}$/)
        ? String(activity.time)
        : ['09:00', '13:00', '17:00'][idx % 3];
      const duration = Math.max(30, Number(activity?.durationMinutes) || 90);
      return {
        name: String(activity?.placeName || activity?.name || `Activity ${idx + 1}`),
        description: String(activity?.description || ''),
        category: normalizeCategory(activity?.category),
        location: {
          type: 'Point',
          coordinates: [
            Number.isFinite(Number(activity?.lng)) ? Number(activity.lng) : 0,
            Number.isFinite(Number(activity?.lat)) ? Number(activity.lat) : 0,
          ],
          city: String(activity?.location || destination || ''),
          country: '',
        },
        dayNumber,
        timeBlock: toTimeBlock(activity?.timeSlot, startTime),
        startTime,
        endTime: buildEndTime(startTime, duration),
        duration,
        estimatedCost: Math.max(0, Number(activity?.estimatedCost) || 0),
        currency: String(currency || 'INR').toUpperCase(),
        notes: [
          dayPlan?.theme ? `Theme: ${dayPlan.theme}` : '',
          activity?.arrivalTime ? `Arrival: ${activity.arrivalTime}` : '',
          activity?.travelTimeFromPrevious ? `Travel time: ${activity.travelTimeFromPrevious}` : '',
        ].filter(Boolean).join(' | '),
        reachOptions: [
          activity?.howToReach,
          activity?.travelTimeFromPrevious ? `Approx ${activity.travelTimeFromPrevious}` : '',
        ].filter(Boolean),
        estimatedTravelTime: Number(String(activity?.travelTimeFromPrevious || '').replace(/[^\d]/g, '')) || 0,
        importance: 'recommended',
      };
    });
  });
};

class ItineraryController {
  /**
   * CREATE: Generate new itinerary using AI
   * POST /api/itinerary/generate
   */
  async generateItinerary(req, res) {
    try {
      const {
        destination,
        days,
        budget,
        interests,
        placesToVisit,
        travelStyle,
        numberOfTravelers,
        startDate,
        season,
        aiNotes,
        imageData,
        imageMimeType,
      } = req.body;

      if (!destination || !days || !budget) {
        return res.status(400).json({
          message: 'Missing required fields: destination, days, budget',
        });
      }

      const userId = req.user?.userId;
      const currency = 'INR';
      const normalizedImage = aiService.normalizeImagePayload(imageData, imageMimeType);
      const generated = await aiService.generateItinerary({
        destination,
        days,
        budget,
        currency,
        interests,
        placesToVisit,
        travelStyle,
        travelers: numberOfTravelers,
        startDate,
        aiNotes,
        imageData: normalizedImage?.data,
        imageMimeType: normalizedImage?.mimeType,
      });

      const activities = normalizeGeneratedActivities(
        mapPromptPlanToActivities(generated?.dailyPlan, destination, 'INR')
      );
      console.log('[ITINERARY][CTRL] Provider:', generated?.meta?.provider || 'unknown');
      console.log('[ITINERARY][CTRL] Model:', generated?.meta?.model || 'unknown');
      console.log('[ITINERARY][CTRL] Days requested:', days, 'Activities mapped:', activities.length);
      console.log(
        '[ITINERARY][CTRL] Day split:',
        activities.reduce((acc, a) => {
          const k = `D${Number(a.dayNumber || 1)}`;
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {})
      );
      const requestedBudgetValue = Number(budget) || 0;
      const totalBudgetValue = requestedBudgetValue;
      const minimumRecommended = estimateMinimumBudget({
        days,
        travelers: numberOfTravelers || 1,
        travelStyle,
      });
      const budgetTooLow = requestedBudgetValue > 0 && requestedBudgetValue < minimumRecommended;
      const currencyValue = 'INR';
      const budgetAllocation = buildBudgetAllocation(totalBudgetValue, null);
      const highlightedPlaces = normalizeStringArray(
        activities.map((activity) => activity.name),
        8
      );
      const normalizedSummary = cleanAiText(generated?.summary || '');
      const normalizedRawText = cleanAiText(generated?.rawText || '');
      const fallbackDetailedPlan = buildReadableDetailedPlan(generated?.dailyPlan);
      const detailedPlanText = looksLikeJsonBlob(normalizedRawText)
        ? fallbackDetailedPlan
        : (normalizedRawText || fallbackDetailedPlan);
      const aiPlanPayload = {
        summary: normalizedSummary || `AI-generated itinerary for ${destination}`,
        detailedPlan: detailedPlanText,
        highlights: highlightedPlaces,
        dailyThemes: Array.isArray(generated?.dailyPlan)
          ? generated.dailyPlan.map((dayPlan, index) => ({
            day: Number(dayPlan?.day) || index + 1,
            theme: String(dayPlan?.theme || `Day ${index + 1}`),
            focus: '',
            tip: '',
          }))
          : [],
        packingTips: [],
        localTips: normalizeStringArray(generated?.travelTips || [], 8),
        budgetSplit: DEFAULT_BUDGET_SPLIT,
        notes: aiNotes || '',
        imageBased: Boolean(normalizedImage?.data),
      };

      const tripStartDate = startDate ? new Date(startDate) : new Date();
      const endDate = new Date(tripStartDate);
      endDate.setDate(endDate.getDate() + Number(days) - 1);

      const itinerary = new Itinerary({
        title: `${days}-Day Trip to ${destination}`,
        description: buildSafeDescription(generated?.summary, destination),
        startDate: tripStartDate,
        endDate,
        numberOfDays: Number(days),
        destination: {
          name: destination,
          coordinates: { latitude: 0, longitude: 0 },
        },
        tripType: travelStyle || 'solo',
        numberOfTravelers: numberOfTravelers || 1,
        interests: interests || [],
        difficulty: pickEnumValue(null, ALLOWED_DIFFICULTY, 'moderate'),
        season: pickEnumValue(season, ALLOWED_SEASONS, 'summer'),
        budget: {
          totalBudget: totalBudgetValue,
          requestedBudget: requestedBudgetValue,
          currency: currencyValue,
          minimumRecommended,
          comfortableEstimate: 0,
          premiumEstimate: 0,
          suggestedDailyBudget: Math.round(totalBudgetValue / Math.max(1, Number(days) || 1)),
          status: budgetTooLow ? 'below-minimum' : 'within-range',
          adjustmentApplied: budgetTooLow,
          adjustmentMessage: budgetTooLow
            ? `Entered budget is below minimum recommended ${currencyValue} ${minimumRecommended} for ${numberOfTravelers || 1} traveler(s) and ${days} day(s).`
            : '',
          destinationCostLevel: 'medium',
          destinationType: 'domestic-city',
          ...budgetAllocation,
        },
        weatherData: {
          lastUpdated: new Date(),
          current: undefined,
          forecast: [],
        },
        userId,
        status: 'draft',
        activities,
        tags: normalizeStringArray(interests || [], 8),
        highlightedPlaces,
        aiPlan: aiPlanPayload,
        planningInsights: {
          averageActivityDurationMinutes: 0,
          totalEstimatedTravelMinutes: 0,
          budgetStatus: budgetTooLow ? 'below-minimum' : 'within-range',
          destinationProfile: null,
          weatherStatus: 'unavailable',
        },
      });

      await itinerary.save();

      return res.status(201).json({
        message: 'Itinerary generated successfully',
        itinerary,
        metadata: {
          provider: generated?.meta?.provider || 'unknown',
          model: generated?.meta?.model || 'unknown',
          tokenUsage: generated?.meta?.usage || null,
          weatherForecastDays: 0,
          aiPlanUsed: true,
          highlightedPlacesCount: highlightedPlaces.length,
          budgetStatus: 'within-range',
          budgetAdjusted: budgetTooLow,
          budgetAdjustmentMessage: budgetTooLow
            ? `Minimum recommended ${currencyValue} ${minimumRecommended}`
            : '',
        },
      });
    } catch (error) {
      console.error('Generate itinerary error:', error);
      return res.status(500).json({
        message: 'Error generating itinerary from Gemini/OpenRouter',
        error: error.message,
        providerErrors: Array.isArray(error?.providerErrors)
          ? error.providerErrors
          : [],
      });
    }
  }

  /**
   * GET: Retrieve a specific itinerary
   * GET /api/itinerary/:id
   */
  async getItinerary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id)
        .populate('userId', 'name email avatar')
        .populate('collaborators.userId', 'name email avatar');

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check access permissions
      const isOwner = itinerary.userId._id.toString() === userId;
      const isCollaborator = itinerary.collaborators.some(
        (c) => c.userId._id.toString() === userId
      );
      const isPublic = itinerary.isPublic;

      if (!isOwner && !isCollaborator && !isPublic) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ itinerary });
    } catch (error) {
      console.error('Get itinerary error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * GET: List user's itineraries
   * GET /api/itinerary/user/mine
   */
  async getUserItineraries(req, res) {
    try {
      const userId = req.user?.userId;
      const { status, isPublic } = req.query;

      const query = {
        $or: [
          { userId },
          { 'collaborators.userId': userId },
        ],
      };

      if (status) query.status = status;
      if (isPublic !== undefined) query.isPublic = isPublic === 'true';

      const itineraries = await Itinerary.find(query)
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({ itineraries });
    } catch (error) {
      console.error('Get user itineraries error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * UPDATE: Add activity to itinerary
   * POST /api/itinerary/:id/activity
   */
  async addActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const activityData = req.body;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check authorization
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.collaborators.some(
          (c) => c.userId.toString() === userId && c.role === 'editor'
        )
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Create activity with required fields
      const activity = {
        name: activityData.name,
        description: activityData.description || '',
        category: activityData.category || 'sightseeing',
        location: {
          type: 'Point',
          coordinates: [
            activityData.location?.longitude || 0,
            activityData.location?.latitude || 0,
          ],
          address: activityData.location?.address || '',
          city: activityData.location?.city || '',
        },
        dayNumber: activityData.dayNumber,
        timeBlock: activityData.timeBlock || null,
        startTime: activityData.startTime,
        endTime: activityData.endTime,
        duration: activityData.duration || 120,
        estimatedCost: activityData.estimatedCost || 0,
        currency: 'INR',
        notes: activityData.notes || '',
        importance: activityData.importance || 'recommended',
        imageUrl: activityData.imageUrl || null,
      };

      itinerary.activities.push(activity);

      // Update total cost
      itinerary.budget.activities = itinerary.activities.reduce(
        (sum, a) => sum + a.estimatedCost,
        0
      );

      await itinerary.save();

      // Update version history
      itinerary.version++;
      itinerary.versionHistory.push({
        version: itinerary.version,
        changes: `Added activity: ${activity.name}`,
        changedAt: new Date(),
        changedBy: userId,
      });
      await itinerary.save();

      res
        .status(201)
        .json({
          message: 'Activity added successfully',
          activity: itinerary.activities[itinerary.activities.length - 1],
        });
    } catch (error) {
      console.error('Add activity error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * UPDATE: Modify existing itinerary
   * PUT /api/itinerary/:id
   */
  async updateItinerary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const updates = req.body;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check authorization
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.collaborators.some(
          (c) => c.userId.toString() === userId && c.role === 'editor'
        )
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Update allowed fields
      const allowedUpdates = [
        'title',
        'description',
        'tripType',
        'numberOfTravelers',
        'interests',
        'difficulty',
        'season',
        'status',
        'isPublic',
        'tags',
      ];

      allowedUpdates.forEach((field) => {
        if (updates[field] !== undefined) {
          itinerary[field] = updates[field];
        }
      });

      // Update budget if provided
      if (updates.budget) {
        itinerary.budget = { ...itinerary.budget, ...updates.budget };
      }

      itinerary.version++;
      itinerary.versionHistory.push({
        version: itinerary.version,
        changes: 'Updated itinerary details',
        changedAt: new Date(),
        changedBy: userId,
      });

      await itinerary.save();

      res.json({ message: 'Itinerary updated successfully', itinerary });
    } catch (error) {
      console.error('Update itinerary error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * DELETE: Remove an activity
   * DELETE /api/itinerary/:id/activity/:activityId
   */
  async removeActivity(req, res) {
    try {
      const { id, activityId } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check authorization
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.collaborators.some(
          (c) => c.userId.toString() === userId && c.role === 'editor'
        )
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const activityIndex = itinerary.activities.findIndex(
        (a) => a._id.toString() === activityId
      );

      if (activityIndex === -1) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      const removedActivity = itinerary.activities[activityIndex];
      itinerary.activities.splice(activityIndex, 1);

      // Update total cost
      itinerary.budget.activities = itinerary.activities.reduce(
        (sum, a) => sum + a.estimatedCost,
        0
      );

      itinerary.version++;
      itinerary.versionHistory.push({
        version: itinerary.version,
        changes: `Removed activity: ${removedActivity.name}`,
        changedAt: new Date(),
        changedBy: userId,
      });

      await itinerary.save();

      res.json({ message: 'Activity removed successfully' });
    } catch (error) {
      console.error('Remove activity error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * UPDATE: Edit an existing activity
   * PATCH /api/itinerary/:id/activity/:activityId
   */
  async updateActivity(req, res) {
    try {
      const { id, activityId } = req.params;
      const userId = req.user?.userId;
      const updates = req.body || {};

      const itinerary = await Itinerary.findById(id);
      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.collaborators.some(
          (c) => c.userId.toString() === userId && c.role === 'editor'
        )
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const activity = itinerary.activities.id(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      const editableFields = [
        'name',
        'description',
        'category',
        'dayNumber',
        'timeBlock',
        'startTime',
        'endTime',
        'duration',
        'estimatedCost',
        'notes',
        'importance',
        'reachOptions',
      ];

      editableFields.forEach((field) => {
        if (updates[field] !== undefined) {
          activity[field] = updates[field];
        }
      });

      if (updates.location) {
        activity.location = {
          ...activity.location,
          ...updates.location,
          coordinates: Array.isArray(updates.location.coordinates)
            ? updates.location.coordinates
            : activity.location.coordinates,
        };
      }

      activity.updatedAt = new Date();

      itinerary.budget.activities = itinerary.activities.reduce(
        (sum, a) => sum + (Number(a.estimatedCost) || 0),
        0
      );

      itinerary.version++;
      itinerary.versionHistory.push({
        version: itinerary.version,
        changes: `Updated activity: ${activity.name}`,
        changedAt: new Date(),
        changedBy: userId,
      });

      await itinerary.save();

      res.json({
        message: 'Activity updated successfully',
        itinerary,
      });
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * DELETE: Delete entire itinerary
   * DELETE /api/itinerary/:id
   */
  async deleteItinerary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Only owner can delete
      if (itinerary.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      await Itinerary.deleteOne({ _id: id });

      res.json({ message: 'Itinerary deleted successfully' });
    } catch (error) {
      console.error('Delete itinerary error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * POST: Share itinerary with user
   * POST /api/itinerary/:id/share
   */
  async shareItinerary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const { sharedWithUserId, accessLevel } = req.body;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Only owner can share
      if (itinerary.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Check if already shared
      const alreadyShared = itinerary.collaborators.some(
        (c) => c.userId.toString() === sharedWithUserId
      );

      if (!alreadyShared) {
        itinerary.collaborators.push({
          userId: sharedWithUserId,
          role: accessLevel || 'viewer',
          joinedAt: new Date(),
        });

        await itinerary.save();
      }

      res.json({
        message: 'Itinerary shared successfully',
        collaborators: itinerary.collaborators,
      });
    } catch (error) {
      console.error('Share itinerary error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * POST: Like/Unlike itinerary
   * POST /api/itinerary/:id/like
   */
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      const likeIndex = itinerary.likes.findIndex(
        (l) => l.toString() === userId
      );

      if (likeIndex > -1) {
        // Unlike
        itinerary.likes.splice(likeIndex, 1);
        itinerary.likeCount--;
      } else {
        // Like
        itinerary.likes.push(userId);
        itinerary.likeCount++;
      }

      await itinerary.save();

      res.json({
        message: likeIndex > -1 ? 'Unliked' : 'Liked',
        likeCount: itinerary.likeCount,
      });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * GET: Get public itineraries (browse templates)
   * GET /api/itinerary/public/browse
   */
  async browsePublicItineraries(req, res) {
    try {
      const { destination, tags, interest } = req.query;

      const query = { isPublic: true, status: 'published' };

      if (destination) {
        query['destination.name'] = new RegExp(destination, 'i');
      }

      if (tags) {
        query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      if (interest) {
        query.interests = interest;
      }

      const itineraries = await Itinerary.find(query)
        .sort({ likeCount: -1, createdAt: -1 })
        .limit(50)
        .populate('userId', 'name avatar');

      res.json({ itineraries });
    } catch (error) {
      console.error('Browse public itineraries error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * POST: Duplicate/Fork itinerary
   * POST /api/itinerary/:id/duplicate
   */
  async duplicateItinerary(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const originalItinerary = await Itinerary.findById(id);

      if (!originalItinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Create copy
      const newItinerary = new Itinerary({
        ...originalItinerary.toObject(),
        _id: undefined,
        userId,
        title: `${originalItinerary.title} (Copy)`,
        status: 'draft',
        isPublic: false,
        collaborators: [],
        likes: [],
        likeCount: 0,
        comments: [],
        shares: [],
        templateId: originalItinerary._id,
        version: 1,
        versionHistory: [],
      });

      await newItinerary.save();

      res.status(201).json({
        message: 'Itinerary duplicated successfully',
        itinerary: newItinerary,
      });
    } catch (error) {
      console.error('Duplicate itinerary error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * EXPORT: Download itinerary as PDF
   * GET /api/itinerary/:id/export/pdf
   */
  async exportPDF(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check access
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.isPublic &&
        !itinerary.collaborators.some((c) => c.userId.toString() === userId)
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Generate PDF (now returns a Promise)
      const pdfBuffer = await ExportService.exportToPDF(itinerary);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${(itinerary.title || 'itinerary').replace(/\s+/g, '_')}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.end(pdfBuffer);
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ message: 'Error exporting PDF', error: error.message });
    }
  }

  /**
   * EXPORT: Download itinerary as HTML
   * GET /api/itinerary/:id/export/html
   */
  async exportHTML(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check access
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.isPublic &&
        !itinerary.collaborators.some((c) => c.userId.toString() === userId)
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Generate HTML
      const htmlContent = ExportService.exportToHTML(itinerary);

      // Set response headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${itinerary.title.replace(/\s+/g, '_')}.html"`
      );

      res.end(htmlContent);
    } catch (error) {
      console.error('HTML export error:', error);
      res.status(500).json({ message: 'Error exporting HTML', error: error.message });
    }
  }

  /**
   * EXPORT: Download itinerary as ICS (iCalendar)
   * GET /api/itinerary/:id/export/ics
   */
  async exportICS(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      // Check access
      if (
        itinerary.userId.toString() !== userId &&
        !itinerary.isPublic &&
        !itinerary.collaborators.some((c) => c.userId.toString() === userId)
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Generate ICS
      const icsContent = ExportService.exportToICS(itinerary);

      // Set response headers
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${itinerary.title.replace(/\s+/g, '_')}.ics"`
      );

      res.end(icsContent);
    } catch (error) {
      console.error('ICS export error:', error);
      res.status(500).json({ message: 'Error exporting ICS', error: error.message });
    }
  }
}

module.exports = ItineraryController;
