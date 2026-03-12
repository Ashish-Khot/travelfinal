/**
 * Centralized API Configuration File
 * All external API keys and endpoints are managed here
 * This allows for easy updates and environment-specific configurations
 */

module.exports = {
  // OpenTripMap API - Free destination & attraction data
  OPENTRIPMAP: {
    API_KEY: process.env.OPENTRIPMAP_API_KEY || '',
    BASE_URL: 'https://api.opentripmap.com/0.1/en/places',
    DETAILS_URL: 'https://api.opentripmap.com/0.1/en/places/xid',
    AROUND_URL: 'https://api.opentripmap.com/0.1/en/places/around',
  },

  // OpenWeatherMap API - Free weather data
  WEATHER: {
    API_KEY: process.env.OPENWEATHER_API_KEY || '',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    FORECAST_URL: 'https://api.openweathermap.org/data/2.5/forecast',
    CURRENT_URL: 'https://api.openweathermap.org/data/2.5/weather',
  },

  // OpenRouter API - Free AI models (Mistral, Llama, etc.)
  // Sign up at https://openrouter.ai/ to get free credits
  OPENROUTER: {
    API_KEY: process.env.OPENROUTER_API_KEY || '',
    BASE_URL: 'https://openrouter.ai/api/v1',
    MODEL: 'mistralai/mistral-7b-instruct:free', // Free model
  },

  // Google Gemini API - Multimodal AI (text + images)
  // Get your API key from Google AI Studio
  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY || '',
    BASE_URL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    VISION_MODEL: process.env.GEMINI_VISION_MODEL || '',
    MAX_IMAGE_MB: Number(process.env.GEMINI_MAX_IMAGE_MB || 4),
  },

  // Google Maps (optional for premium features)
  GOOGLE_MAPS: {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'your-google-maps-key',
    BASE_URL: 'https://maps.googleapis.com/maps/api',
  },

  // OpenRouteService - Free routing & optimization
  OPENROUTE_SERVICE: {
    API_KEY: process.env.OPENROUTE_API_KEY || 'your-openroute-api-key',
    BASE_URL: 'https://api.openrouteservice.org/v2',
    MATRIX_URL: 'https://api.openrouteservice.org/v2/matrix',
    DIRECTIONS_URL: 'https://api.openrouteservice.org/v2/directions',
  },

  // Geodb Cities API - City data (via RapidAPI free tier)
  GEODB: {
    API_KEY: process.env.GEODB_API_KEY || 'your-geodb-api-key',
    BASE_URL: 'https://wft-geo-db.p.rapidapi.com/v1/geo',
  },

  // Unsplash API - Free images
  UNSPLASH: {
    API_KEY: process.env.UNSPLASH_API_KEY || 'your-unsplash-key',
    BASE_URL: 'https://api.unsplash.com',
  },

  // Wikipedia API - Free info & images
  WIKIPEDIA: {
    BASE_URL: 'https://en.wikipedia.org/w/api.php',
  },

  // Amadeus API - Real hotel and flight data
  AMADEUS: {
    CLIENT_ID: process.env.AMADEUS_CLIENT_ID || 'your-amadeus-client-id',
    CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET || 'your-amadeus-client-secret',
    BASE_URL: 'https://api.amadeus.com/v2',
    AUTH_URL: 'https://api.amadeus.com/v1/security/oauth2/token',
  },

  // Exchange Rates API - Free currency conversion
  EXCHANGE_RATES: {
    API_KEY: process.env.EXCHANGE_RATES_KEY || '',
    BASE_URL: 'https://api.exchangerate-api.com/v4/latest',
  },

  // Default timeouts and limits
  DEFAULTS: {
    REQUEST_TIMEOUT: 10000, // 10 seconds
    MAX_RESULTS: 50,
    MAX_ACTIVITIES_PER_DAY: 8,
    DEFAULT_ACTIVITY_DURATION: 120, // 2 hours in minutes
    DEFAULT_TRAVEL_TIME: 30, // 30 minutes between activities
  },
};
