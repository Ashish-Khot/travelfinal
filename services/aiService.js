/**
 * AI Service - Gemini/OpenRouter orchestration
 * Handles AI-powered itinerary generation and recommendations
 */

const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class AIService {
  constructor() {
    this.openRouterKey = (API_CONFIG.OPENROUTER.API_KEY || '').trim();
    this.openRouterBaseUrl = API_CONFIG.OPENROUTER.BASE_URL;
    this.openRouterModel = API_CONFIG.OPENROUTER.MODEL;
    this.hasOpenRouterAccess = Boolean(this.openRouterKey);

    this.geminiKey = (API_CONFIG.GEMINI?.API_KEY || '').trim();
    this.geminiBaseUrl =
      API_CONFIG.GEMINI?.BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    this.geminiModel = API_CONFIG.GEMINI?.MODEL || 'gemini-1.5-flash';
    this.geminiVisionModel =
      API_CONFIG.GEMINI?.VISION_MODEL || this.geminiModel;
    this.maxImageMb = API_CONFIG.GEMINI?.MAX_IMAGE_MB || 4;
    this.hasGeminiAccess = Boolean(this.geminiKey);
  }

  normalizeImagePayload(imageData, imageMimeType) {
    if (!imageData || typeof imageData !== 'string') return null;

    let data = imageData.trim();
    let mimeType = imageMimeType;
    const dataUrlMatch = data.match(/^data:(.+?);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = mimeType || dataUrlMatch[1];
      data = dataUrlMatch[2];
    }

    data = data.replace(/\s/g, '');
    return {
      data,
      mimeType: mimeType || 'image/jpeg',
    };
  }

  estimateBase64Bytes(base64Data) {
    if (!base64Data) return 0;
    return Math.floor((base64Data.length * 3) / 4);
  }

  extractJsonBlock(content, fallback = null) {
    if (!content || typeof content !== 'string') return fallback;
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) return objectMatch[0];
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0];
    return fallback;
  }

  async callGemini({
    prompt,
    imageData,
    imageMimeType,
    model,
    temperature = 0.7,
    maxOutputTokens = 1200,
    responseMimeType,
  }) {
    if (!this.hasGeminiAccess) {
      throw new Error('Gemini API key is missing');
    }

    const parts = [{ text: prompt }];
    if (imageData) {
      const normalized = this.normalizeImagePayload(imageData, imageMimeType);
      if (normalized?.data) {
        parts.push({
          inline_data: {
            mime_type: normalized.mimeType,
            data: normalized.data,
          },
        });
      }
    }

    const generationConfig = {
      temperature,
      maxOutputTokens,
    };
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig,
    };

    const modelName = model || this.geminiModel;
    const url = `${this.geminiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent?key=${this.geminiKey}`;

    const response = await axios.post(url, requestBody, {
      timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    const partsOut = response.data?.candidates?.[0]?.content?.parts || [];
    return partsOut.map((part) => part.text || '').join('').trim();
  }

  /**
   * Generate a complete itinerary using AI
   * @param {Object} params - Itinerary generation parameters
   * @param {string} params.destination - Travel destination
   * @param {number} params.days - Number of days for the trip
   * @param {number} params.budget - Total budget in USD
   * @param {Array<string>} params.interests - User interests (food, culture, adventure, etc.)
   * @param {string} params.travelStyle - Travel style (luxury, budget, adventure, relaxed)
   * @param {number} params.travelers - Number of travelers
   * @returns {Promise<Object>} Generated itinerary structure
   */
  async generateItinerary(params) {
    try {
      const {
        destination,
        days,
        budget,
        interests = [],
        travelStyle = 'moderate',
        travelers = 1,
      } = params;

      const prompt = this.buildItineraryPrompt({
        destination,
        days,
        budget,
        interests,
        travelStyle,
        travelers,
      });

      if (this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json',
          });
          return this.parseItineraryResponse(content, days);
        } catch (error) {
          console.error('Gemini itinerary generation error:', error.message);
        }
      }

      if (!this.hasOpenRouterAccess) {
        return this.generateDefaultItinerary(params);
      }

      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.openRouterModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      return this.parseItineraryResponse(content, days);
    } catch (error) {
      console.error('AI itinerary generation error:', error.message);
      return this.generateDefaultItinerary(params);
    }
  }

  /**
   * Generate activity suggestions for a specific day
   * @param {string} destination - Travel destination
   * @param {number} dayNumber - Day number
   * @param {Array<string>} interests - User interests
   * @param {Array} previousActivities - Activities already planned
   * @returns {Promise<Array>} Suggested activities
   */
  async suggestActivities(destination, dayNumber, interests = [], previousActivities = []) {
    try {
      const prompt = `
        For a trip to ${destination} (Day ${dayNumber}), suggest 4-5 interesting activities.
        
        User interests: ${interests.join(', ')}
        
        Already planned activities: ${previousActivities.map((a) => a.name).join(', ')}
        
        Return a JSON array with activities in this format:
        [
          {
            "name": "Activity name",
            "category": "sightseeing|food|adventure|culture|shopping|relaxation",
            "description": "Brief description",
            "estimatedDuration": 120,
            "estimatedCost": 50,
            "importance": "must-do|recommended|optional",
            "timeSlot": "09:00-11:00"
          }
        ]
        
        Return ONLY valid JSON, no other text.
      `;

      if (this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          });
          return this.parseActivitiesResponse(content);
        } catch (error) {
          console.error('Gemini activity suggestions error:', error.message);
        }
      }

      if (!this.hasOpenRouterAccess) {
        return this.getDefaultActivitySuggestions(destination, interests);
      }

      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.openRouterModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      return this.parseActivitiesResponse(content);
    } catch (error) {
      console.error('Activity suggestions error:', error.message);
      return this.getDefaultActivitySuggestions(destination, interests);
    }
  }

  /**
   * Get AI-powered recommendations based on weather
   * @param {string} destination - Travel destination
   * @param {Object} weatherData - Current weather data
   * @param {Array<string>} interests - User interests
   * @returns {Promise<Object>} Weather-based recommendations
   */
  async getWeatherBasedRecommendations(destination, weatherData, interests = []) {
    try {
      const prompt = `
        Weather in ${destination}: ${weatherData.condition}, ${weatherData.temperature} deg C
        
        User interests: ${interests.join(', ')}
        
        Based on this weather, what activities and attractions would you recommend?
        
        Return a JSON object with:
        {
          "suitable_activities": ["activity1", "activity2", ...],
          "avoid_activities": ["activity1", ...],
          "warnings": ["warning1", ...],
          "packing_tips": ["tip1", "tip2", ...]
        }
        
        Return ONLY valid JSON, no other text.
      `;

      if (this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
          });
          return this.parseRecommendationsResponse(content);
        } catch (error) {
          console.error('Gemini weather recommendations error:', error.message);
        }
      }

      if (!this.hasOpenRouterAccess) {
        return this.getDefaultRecommendations();
      }

      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.openRouterModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      return this.parseRecommendationsResponse(content);
    } catch (error) {
      console.error('Weather recommendations error:', error.message);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Optimize day's schedule based on locations and preferences
   * @param {Array} activities - Activities with timestamps and locations
   * @param {Object} constraints - Timing and other constraints
   * @returns {Promise<Array>} Optimized activity order
   */
  async optimizeSchedule(activities, constraints = {}) {
    try {
      const activitiesText = activities
        .map(
          (a, i) =>
            `${i + 1}. ${a.name} (${a.location.address || 'Unknown location'}, ${a.estimatedDuration}min, $${a.estimatedCost})`
        )
        .join('\n');

      const prompt = `
        Help optimize this day's itinerary for ${activities.length} activities:
        
        ${activitiesText}
        
        Constraints:
        - Start time: ${constraints.startTime || '09:00'}
        - End time: ${constraints.endTime || '18:00'}
        - Travel time between locations: 15-30 minutes average
        - Include 1 hour lunch break
        
        Suggest the best order to visit these activities to minimize travel time and maximize experience.
        
        Return a JSON object:
        {
          "optimized_order": [1, 3, 2, ...],
          "suggested_times": ["09:00-11:00", "11:30-13:30", ...],
          "total_travel_time": 45,
          "notes": "Explanation of optimization"
        }
        
        Return ONLY valid JSON, no other text.
      `;

      if (this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          });
          return this.parseScheduleResponse(content);
        } catch (error) {
          console.error('Gemini schedule optimization error:', error.message);
        }
      }

      if (!this.hasOpenRouterAccess) {
        return this.getDefaultScheduleOptimization(activities);
      }

      const response = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          model: this.openRouterModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      return this.parseScheduleResponse(content);
    } catch (error) {
      console.error('Schedule optimization error:', error.message);
      return this.getDefaultScheduleOptimization(activities);
    }
  }

  /**
   * Generate itinerary enhancement metadata using Gemini (optional image input)
   * @param {Object} params - Itinerary parameters
   * @returns {Promise<Object|null>} Enhancement data or null
   */
  async generateItineraryEnhancement(params) {
    if (!this.hasGeminiAccess) return null;

    const prompt = this.buildEnhancementPrompt(params);
    const useVision = Boolean(params?.imageData);

    try {
      const content = await this.callGemini({
        prompt,
        imageData: params?.imageData,
        imageMimeType: params?.imageMimeType,
        model: useVision ? this.geminiVisionModel : this.geminiModel,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      });

      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) return null;
      return JSON.parse(jsonBlock);
    } catch (error) {
      console.error('AI enhancement error:', error.message);
      return null;
    }
  }

  /**
   * Build enhancement prompt for Gemini
   * @private
   */
  buildEnhancementPrompt(params) {
    const notes = params?.aiNotes ? `Additional notes: ${params.aiNotes}` : '';
    return `
      You are a travel planning assistant. Create structured metadata for a trip.

      Trip details:
      - Destination: ${params.destination}
      - Days: ${params.days}
      - Budget: $${params.budget}
      - Travelers: ${params.travelers || params.numberOfTravelers || 1}
      - Interests: ${(params.interests || []).join(', ')}
      - Travel style: ${params.travelStyle}
      - Start date: ${params.startDate || 'N/A'}
      ${notes}

      If an image is provided, infer landmarks, vibe, and suitable activities.

      Return ONLY valid JSON with this exact structure:
      {
        "summary": "1-2 sentence overview",
        "highlights": ["3-6 key highlights"],
        "tags": ["theme tags"],
        "dailyThemes": [
          { "day": 1, "theme": "Theme", "focus": "Focus area", "tip": "Actionable tip" }
        ],
        "packingTips": ["tips"],
        "localTips": ["local etiquette or safety tips"],
        "budgetSplit": { "accommodation": 35, "transportation": 15, "activities": 25, "food": 20, "misc": 5 },
        "difficulty": "easy|moderate|hard",
        "season": "spring|summer|fall|winter"
      }

      Rules:
      - dailyThemes length must equal the number of days.
      - budgetSplit values are percentages and must sum to 100.
      - Use only the allowed values for difficulty and season.
    `;
  }

  /**
   * Build itinerary generation prompt
   * @private
   */
  buildItineraryPrompt(params) {
    return `
      Create a detailed ${params.days}-day travel itinerary for ${params.destination}.
      
      Trip Details:
      - Budget: $${params.budget} total (${Math.round(params.budget / params.days)}/day)
      - Travelers: ${params.travelers}
      - Interests: ${params.interests.join(', ')}
      - Travel style: ${params.travelStyle}
      
      For each day, provide:
      1. Main activities (2-4 per day)
      2. Estimated costs
      3. Time allocations
      4. Travel tips
      
      Return as JSON with this structure:
      {
        "itinerary": [
          {
            "day": 1,
            "theme": "Day theme",
            "activities": [
              {
                "time": "09:00",
                "name": "Activity name",
                "category": "sightseeing",
                "duration": 120,
                "cost": 50,
                "description": "What to do",
                "importance": "must-do"
              }
            ],
            "totalCost": 150,
            "tips": ["Tip 1", "Tip 2"]
          }
        ],
        "highlights": ["Highlight 1", "Highlight 2"],
        "packingTips": ["Tip 1", "Tip 2"]
      }
      
      Return ONLY valid JSON, no other text.
    `;
  }

  /**
   * Parse itinerary response from AI
   * @private
   */
  parseItineraryResponse(content, days) {
    try {
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonBlock);
      return parsed.itinerary || this.generateDefaultItinerary({ days });
    } catch {
      return this.generateDefaultItinerary({ days });
    }
  }

  /**
   * Parse activities response from AI
   * @private
   */
  parseActivitiesResponse(content) {
    try {
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) throw new Error('No JSON found');
      return JSON.parse(jsonBlock);
    } catch {
      return this.getDefaultActivitySuggestions();
    }
  }

  /**
   * Parse recommendations response from AI
   * @private
   */
  parseRecommendationsResponse(content) {
    try {
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) throw new Error('No JSON found');
      return JSON.parse(jsonBlock);
    } catch {
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Parse schedule optimization response from AI
   * @private
   */
  parseScheduleResponse(content) {
    try {
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) throw new Error('No JSON found');
      return JSON.parse(jsonBlock);
    } catch {
      return this.getDefaultScheduleOptimization();
    }
  }

  /**
   * Generate default itinerary when AI fails
   * @private
   */
  generateDefaultItinerary(params) {
    const { destination, days, budget, interests } = params;
    const itinerary = [];

    for (let i = 1; i <= days; i++) {
      itinerary.push({
        day: i,
        theme: `Day ${i} - ${destination} Exploration`,
        activities: [
          {
            time: '09:00',
            name: 'Local breakfast',
            category: 'food',
            duration: 60,
            cost: 15,
            description: 'Start your day with local cuisine',
            importance: 'recommended',
          },
          {
            time: '10:30',
            name: 'Main attraction',
            category: 'sightseeing',
            duration: 120,
            cost: 25,
            description: 'Visit major landmarks and attractions',
            importance: 'must-do',
          },
          {
            time: '13:00',
            name: 'Lunch',
            category: 'food',
            duration: 60,
            cost: 20,
            description: 'Try local restaurants',
            importance: 'recommended',
          },
          {
            time: '14:30',
            name: 'Secondary attraction',
            category: 'sightseeing',
            duration: 120,
            cost: 15,
            description: 'Explore cultural sites or nature',
            importance: 'recommended',
          },
          {
            time: '17:00',
            name: 'Dinner & relaxation',
            category: 'food',
            duration: 90,
            cost: 30,
            description: 'Evening dining experience',
            importance: 'recommended',
          },
        ],
        totalCost: 105,
        tips: [
          'Start early to maximize daylight',
          'Bring water and comfortable shoes',
          'Book popular attractions in advance',
        ],
      });
    }

    return itinerary;
  }

  /**
   * Default activity suggestions
   * @private
   */
  getDefaultActivitySuggestions(destination = 'destination', interests = []) {
    return [
      {
        name: 'Local market exploration',
        category: 'shopping',
        description: 'Explore local markets and street food',
        estimatedDuration: 120,
        estimatedCost: 30,
        importance: 'recommended',
        timeSlot: '09:00-11:00',
      },
      {
        name: 'Historic landmarks tour',
        category: 'culture',
        description: 'Visit important historic sites',
        estimatedDuration: 120,
        estimatedCost: 25,
        importance: 'must-do',
        timeSlot: '11:00-13:00',
      },
      {
        name: 'Local cuisine lunch',
        category: 'food',
        description: 'Try authentic local dishes',
        estimatedDuration: 90,
        estimatedCost: 35,
        importance: 'recommended',
        timeSlot: '13:00-14:30',
      },
      {
        name: 'Scenic viewpoint visit',
        category: 'sightseeing',
        description: 'Enjoy panoramic views',
        estimatedDuration: 60,
        estimatedCost: 0,
        importance: 'optional',
        timeSlot: '16:00-17:00',
      },
    ];
  }

  /**
   * Default recommendations
   * @private
   */
  getDefaultRecommendations() {
    return {
      suitable_activities: [
        'sightseeing',
        'museums',
        'indoor shopping',
        'restaurants',
        'spas',
      ],
      avoid_activities: ['water sports', 'hiking', 'outdoor activities'],
      warnings: ['Check weather updates regularly'],
      packing_tips: [
        'Bring umbrella',
        'Wear comfortable shoes',
        'Pack light layers',
      ],
    };
  }

  /**
   * Default schedule optimization
   * @private
   */
  getDefaultScheduleOptimization() {
    return {
      optimized_order: [1, 2, 3],
      suggested_times: [
        '09:00-11:00',
        '11:30-13:30',
        '14:00-16:00',
      ],
      total_travel_time: 45,
      notes: 'Default optimization based on activity order',
    };
  }
}

module.exports = AIService;
