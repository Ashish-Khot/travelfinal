/**
 * Itinerary Controller
 * Handles all itinerary operations: CRUD, AI generation, optimization, etc.
 */

const Itinerary = require('../models/Itinerary');
const ItineraryTemplate = require('../models/ItineraryTemplate');
const User = require('../models/User');
const AIService = require('../services/aiService');
const PlacesService = require('../services/placesService');
const WeatherService = require('../services/weatherService');
const HotelsService = require('../services/hotelsService');
const WikipediaService = require('../services/wikipediaService');
const ItineraryGenerator = require('../services/itineraryGenerator');
const ExportService = require('../services/exportService');

const aiService = new AIService();
const placesService = new PlacesService();
const weatherService = new WeatherService();
const hotelsService = new HotelsService();
const wikipediaService = new WikipediaService();
const itineraryGenerator = new ItineraryGenerator({
  aiService,
  placesService,
  hotelsService,
  weatherService,
  wikipediaService,
});
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
        currency,
        imageData,
        imageMimeType,
      } = req.body;

      // Validate required fields
      if (!destination || !days || !budget) {
        return res.status(400).json({
          message: 'Missing required fields: destination, days, budget',
        });
      }

      const userId = req.user?.userId;

      const normalizedImage = aiService.normalizeImagePayload(
        imageData,
        imageMimeType
      );
      if (normalizedImage?.data) {
        const imageBytes = aiService.estimateBase64Bytes(normalizedImage.data);
        const maxBytes = (aiService.maxImageMb || 4) * 1024 * 1024;
        if (imageBytes > maxBytes) {
          return res.status(413).json({
            message: `Image too large. Max ${aiService.maxImageMb || 4}MB`,
          });
        }
      }

      const generated = await itineraryGenerator.generate({
        destination,
        days,
        budget,
        currency,
        interests,
        placesToVisit,
        travelStyle,
        numberOfTravelers,
        startDate,
        aiNotes,
        imageData: normalizedImage?.data,
        imageMimeType: normalizedImage?.mimeType,
      });

      const coord = generated.coordinates || { latitude: 40, longitude: 0 };
      const weatherForecast = generated.weatherForecast || [];
      const activities = normalizeGeneratedActivities(generated.activities || []);
      const aiPlan = generated.aiPlan || null;
      const budgetInsights = generated.budgetInsights || null;
      const highlightedFallback = generated.highlights || [];

      // Create itinerary document
      const tripStartDate = startDate ? new Date(startDate) : new Date();
      const endDate = new Date(tripStartDate);
      endDate.setDate(endDate.getDate() + days - 1);

      // DEBUG: Log what was generated
      console.log('DYNAMIC ITINERARY GENERATED:');
      console.log(`   Destination: ${destination}`);
      console.log(`   Days: ${days}, Total Activities: ${activities.length}`);

      const highlightsFromAI = normalizeStringArray(aiPlan?.highlights, 8);
      const tagsFromAI = normalizeStringArray(aiPlan?.tags, 8);
      const defaultHighlights = normalizeStringArray(
        highlightedFallback,
        8
      );
      const highlightedPlaces =
        highlightsFromAI.length > 0 ? highlightsFromAI : defaultHighlights;

      const requestedBudgetValue = Number(budget) || 0;
      const totalBudgetValue =
        Number(budgetInsights?.adjustedBudget) || requestedBudgetValue;
      const currencyValue = String(
        budgetInsights?.currency || currency || 'INR'
      ).toUpperCase();
      const budgetAllocation = buildBudgetAllocation(
        totalBudgetValue,
        aiPlan?.budgetSplit
      );

      const difficultyValue = pickEnumValue(
        aiPlan?.difficulty,
        ALLOWED_DIFFICULTY,
        'moderate'
      );
      const seasonValue = pickEnumValue(
        season || aiPlan?.season,
        ALLOWED_SEASONS,
        'summer'
      );

      const aiPlanPayload = aiPlan
        ? {
            summary: aiPlan.summary || '',
            detailedPlan: generated.narrativeText || '',
            highlights: highlightedPlaces,
            dailyThemes: Array.isArray(aiPlan.dailyThemes)
              ? aiPlan.dailyThemes
              : [],
            packingTips: normalizeStringArray(aiPlan.packingTips, 8),
            localTips: normalizeStringArray(aiPlan.localTips, 8),
            budgetSplit:
              normalizeBudgetSplit(aiPlan.budgetSplit) || DEFAULT_BUDGET_SPLIT,
            notes: aiNotes || '',
            imageBased: Boolean(normalizedImage?.data),
          }
        : (generated.narrativeText
          ? {
              summary: '',
              detailedPlan: generated.narrativeText,
              highlights: highlightedPlaces,
              dailyThemes: [],
              packingTips: [],
              localTips: [],
              budgetSplit: DEFAULT_BUDGET_SPLIT,
              notes: aiNotes || '',
              imageBased: Boolean(normalizedImage?.data),
            }
          : null);


      const itinerary = new Itinerary({
        title: `${days}-Day Trip to ${destination}`,
        description: buildSafeDescription(aiPlan?.summary, destination),
        startDate: tripStartDate,
        endDate,
        numberOfDays: days,
        destination: {
          name: destination,
          coordinates: {
            latitude: coord.latitude,
            longitude: coord.longitude,
          },
        },
        tripType: travelStyle || 'solo',
        numberOfTravelers: numberOfTravelers || 1,
        interests: interests || [],
        difficulty: difficultyValue,
        season: seasonValue,
        budget: {
          totalBudget: totalBudgetValue,
          requestedBudget: requestedBudgetValue,
          currency: currencyValue,
          minimumRecommended: Number(budgetInsights?.minimumRecommended) || 0,
          comfortableEstimate: Number(budgetInsights?.comfortableEstimate) || 0,
          premiumEstimate: Number(budgetInsights?.premiumEstimate) || 0,
          suggestedDailyBudget: Number(budgetInsights?.suggestedDailyBudget) || 0,
          status: budgetInsights?.budgetStatus || 'within-range',
          adjustmentApplied: Boolean(budgetInsights?.adjustmentApplied),
          adjustmentMessage: budgetInsights?.adjustmentMessage || '',
          destinationCostLevel:
            budgetInsights?.destinationProfile?.costLevel || 'medium',
          destinationType:
            budgetInsights?.destinationProfile?.destinationType || 'domestic-city',
          ...budgetAllocation,
        },
        weatherData: {
          lastUpdated: new Date(),
          forecast: weatherForecast,
        },
        userId,
        status: 'draft',
        activities: activities, // NOW POPULATED WITH ACTIVITIES!
        tags: tagsFromAI.length > 0 ? tagsFromAI : interests || [],
        highlightedPlaces,
        aiPlan: aiPlanPayload || undefined,
        planningInsights: {
          averageActivityDurationMinutes:
            Number(generated.metadata?.averageActivityDurationMinutes) || 0,
          totalEstimatedTravelMinutes:
            Number(generated.metadata?.totalEstimatedTravelMinutes) || 0,
          budgetStatus: budgetInsights?.budgetStatus || 'within-range',
          destinationProfile: budgetInsights?.destinationProfile || null,
          weatherStatus: weatherForecast.length > 0 ? 'live' : 'unavailable',
        },
      });

      // Save initial itinerary with activities
      await itinerary.save();

      return res.status(201).json({
        message: 'Itinerary generated successfully',
        itinerary,
        metadata: {
          ...(generated.metadata || {}),
          weatherForecastDays: weatherForecast.length,
          aiPlanUsed: Boolean(aiPlan),
          highlightedPlacesCount: highlightedPlaces.length,
          budgetStatus: budgetInsights?.budgetStatus || 'within-range',
          budgetAdjusted: Boolean(budgetInsights?.adjustmentApplied),
          budgetAdjustmentMessage: budgetInsights?.adjustmentMessage || '',
        },
      });
    } catch (error) {
      console.error('Generate itinerary error:', error);
      const message = String(error?.message || '');
      const isInputOrDataIssue =
        message.includes('Unable to resolve coordinates for destination') ||
        message.includes('Could not build enough live, location-based activities');

      res
        .status(isInputOrDataIssue ? 422 : 500)
        .json({
          message: isInputOrDataIssue
            ? 'Unable to generate fully dynamic itinerary with live location data'
            : 'Error generating itinerary',
          error: error.message,
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
        currency: activityData.currency || itinerary?.budget?.currency || 'INR',
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
   * POST: Suggest activities for a day using AI
   * POST /api/itinerary/:id/suggest-activities
   */
  async suggestActivities(req, res) {
    try {
      const { id } = req.params;
      const { dayNumber } = req.body;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      const previousActivities = itinerary.activities.filter(
        (a) => a.dayNumber < dayNumber
      );

      const suggestions = await aiService.suggestActivities(
        itinerary.destination.name,
        dayNumber,
        itinerary.interests,
        previousActivities
      );

      res.json({
        message: 'Activity suggestions generated',
        suggestions,
      });
    } catch (error) {
      console.error('Suggest activities error:', error);
      res.status(500).json({
        message: 'Error generating suggestions',
        error: error.message,
      });
    }
  }

  /**
   * POST: Get weather-based recommendations
   * POST /api/itinerary/:id/weather-recommendations
   */
  async getWeatherRecommendations(req, res) {
    try {
      const { id } = req.params;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      const weatherData = itinerary.weatherData?.forecast?.[0] || {
        condition: 'Clear',
        temperature: 25,
      };

      const recommendations = await aiService.getWeatherBasedRecommendations(
        itinerary.destination.name,
        weatherData,
        itinerary.interests
      );

      res.json({
        message: 'Weather recommendations generated',
        recommendations,
        currentWeather: weatherData,
      });
    } catch (error) {
      console.error('Weather recommendations error:', error);
      res.status(500).json({
        message: 'Error generating recommendations',
        error: error.message,
      });
    }
  }

  /**
   * POST: Optimize itinerary schedule
   * POST /api/itinerary/:id/optimize
   */
  async optimizeItinerary(req, res) {
    try {
      const { id } = req.params;

      const itinerary = await Itinerary.findById(id);

      if (!itinerary) {
        return res.status(404).json({ message: 'Itinerary not found' });
      }

      const optimization = await aiService.optimizeSchedule(
        itinerary.activities,
        {
          startTime: '09:00',
          endTime: '18:00',
        }
      );

      // Apply optimized order if valid
      if (
        optimization.optimized_order &&
        Array.isArray(optimization.optimized_order)
      ) {
        const reorderedActivities = optimization.optimized_order.map(
          (idx) => itinerary.activities[idx - 1]
        );
        itinerary.activities = reorderedActivities;
        itinerary.routeOptimized = true;

        itinerary.version++;
        itinerary.versionHistory.push({
          version: itinerary.version,
          changes: 'Optimized itinerary schedule',
          changedAt: new Date(),
          changedBy: req.user?.userId,
        });

        await itinerary.save();
      }

      res.json({
        message: 'Itinerary optimized successfully',
        itinerary,
        optimization,
      });
    } catch (error) {
      console.error('Optimize itinerary error:', error);
      res.status(500).json({
        message: 'Error optimizing itinerary',
        error: error.message,
      });
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
