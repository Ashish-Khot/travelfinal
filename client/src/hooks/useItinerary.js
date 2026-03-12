/**
 * useItinerary Hook
 * Manages itinerary state and API interactions
 */

import { useState, useEffect } from 'react';
import itineraryService from '../services/itineraryService.js';

const useItinerary = (itineraryId) => {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch itinerary
  const fetchItinerary = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await itineraryService.getItinerary(id);
      setItinerary(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itineraryId) {
      fetchItinerary(itineraryId);
    }
  }, [itineraryId]);

  // Add activity
  const addActivity = async (activity) => {
    try {
      const updatedItinerary = await itineraryService.addActivity(
        itinerary._id,
        activity
      );
      setItinerary(updatedItinerary);
      return updatedItinerary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update activity
  const updateActivity = async (activityId, updates) => {
    try {
      const updatedItinerary = await itineraryService.updateActivity(
        itinerary._id,
        activityId,
        updates
      );
      setItinerary(updatedItinerary);
      return updatedItinerary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Remove activity
  const removeActivity = async (activityId) => {
    try {
      const updatedItinerary = await itineraryService.removeActivity(
        itinerary._id,
        activityId
      );
      setItinerary(updatedItinerary);
      return updatedItinerary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update itinerary
  const updateItinerary = async (updates) => {
    try {
      const updatedItinerary = await itineraryService.updateItinerary(
        itinerary._id,
        updates
      );
      setItinerary(updatedItinerary);
      return updatedItinerary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    itinerary,
    setItinerary,
    loading,
    error,
    addActivity,
    updateActivity,
    removeActivity,
    updateItinerary,
    fetchItinerary,
  };
};

export default useItinerary;
