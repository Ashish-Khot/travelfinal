/**
 * Itinerary Service
 * Frontend API calls for itinerary operations
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_URL = `${API_BASE}/api/itinerary`;

// Get Authorization Header
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

const itineraryService = {
  // CREATE
  generateItinerary: async (params) => {
    try {
      const response = await axios.post(
        `${API_URL}/generate`,
        params,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // READ
  getItinerary: async (id) => {
    try {
      const response = await axios.get(
        `${API_URL}/${id}`,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserItineraries: async (status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(
        `${API_URL}/user/mine`,
        { 
          headers: getAuthHeader(),
          params
        }
      );
      return response.data.itineraries;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  browsePublicItineraries: async (filters = {}) => {
    try {
      const response = await axios.get(
        `${API_URL}/public/browse`,
        { headers: getAuthHeader(), params: filters }
      );
      return response.data.itineraries;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // UPDATE
  updateItinerary: async (id, updates) => {
    try {
      const response = await axios.put(
        `${API_URL}/${id}`,
        updates,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ACTIVITIES
  addActivity: async (itineraryId, activity) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/activity`,
        activity,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateActivity: async (itineraryId, activityId, updates) => {
    try {
      const response = await axios.patch(
        `${API_URL}/${itineraryId}/activity/${activityId}`,
        updates,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  removeActivity: async (itineraryId, activityId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/${itineraryId}/activity/${activityId}`,
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // AI FEATURES
  suggestActivities: async (itineraryId, dayNumber) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/suggest-activities`,
        { dayNumber },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getWeatherRecommendations: async (itineraryId) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/weather-recommendations`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  optimizeItinerary: async (itineraryId) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/optimize`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // SHARING & COLLABORATION
  shareItinerary: async (itineraryId, sharedWithUserId, accessLevel = 'viewer') => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/share`,
        { sharedWithUserId, accessLevel },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  toggleLike: async (itineraryId) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/like`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  duplicateItinerary: async (itineraryId) => {
    try {
      const response = await axios.post(
        `${API_URL}/${itineraryId}/duplicate`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data.itinerary;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // DELETE
  deleteItinerary: async (id) => {
    try {
      const response = await axios.delete(
        `${API_URL}/${id}`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // EXPORT
  exportPDF: async (itineraryId) => {
    try {
      const response = await axios.get(
        `${API_URL}/${itineraryId}/export/pdf`,
        {
          headers: getAuthHeader(),
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  exportICS: async (itineraryId) => {
    try {
      const response = await axios.get(
        `${API_URL}/${itineraryId}/export/ics`,
        {
          headers: getAuthHeader(),
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default itineraryService;
