/**
 * MAP INTEGRATION - REAL-WORLD IMPLEMENTATION EXAMPLES
 * Copy and modify these examples for your specific use case
 */

// ============================================================================
// EXAMPLE 1: Hotel Booking - Show All Hotels with Routes
// ============================================================================

import React, { useState, useEffect } from 'react';
import AdvancedMap from '@/components/AdvancedMap';
import axios from 'axios';

export function HotelBookingPage() {
  const [hotels, setHotels] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    async function fetchHotels() {
      try {
        const response = await axios.get('/api/hotels');
        const mappedHotels = response.data.map((hotel) => ({
          id: hotel._id,
          name: hotel.name,
          latitude: hotel.location.coordinates[1],
          longitude: hotel.location.coordinates[0],
          type: 'HOTEL',
          description: `${hotel.roomsAvailable} rooms available`,
          rating: hotel.rating,
          price: `₹${hotel.pricePerNight}`,
        }));
        setHotels(mappedHotels);
      } catch (error) {
        console.error('Error fetching hotels:', error);
      }
    }
    fetchHotels();
  }, []);

  const handleRouteCalculated = (route) => {
    setSelectedRoute(route);
    console.log('Route from current location to hotel:');
    console.log('Distance:', route.routes[0].distanceKM, 'km');
    console.log('Duration:', route.routes[0].durationHM);
  };

  return (
    <div>
      <h1>Find Hotels Near You</h1>
      <AdvancedMap
        destinations={hotels}
        initialCenter={[20.5937, 78.9629]} // India center
        initialZoom={10}
        onRouteCalculated={handleRouteCalculated}
        showClustering={true}
        showSearch={true}
        showRouting={true}
        height="600px"
      />
      {selectedRoute && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
          <h3>🛣️ Route Information</h3>
          <p>Distance: {selectedRoute.routes[0].distanceKM} km</p>
          <p>Duration: {selectedRoute.routes[0].durationHM}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Tour Guide - Show Guide Location and Tourist Attractions
// ============================================================================

import { searchLocation, reverseGeocode } from '@/services/geocodingService';

export function TourGuidePage() {
  const [guideLocation, setGuideLocation] = useState(null);
  const [attractions, setAttractions] = useState([]);

  useEffect(() => {
    // Get guide's current location
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setGuideLocation([latitude, longitude]);

      // Search for nearby attractions
      searchNearbyAttractions(latitude, longitude);
    });
  }, []);

  const searchNearbyAttractions = async (lat, lng) => {
    try {
      // Reverse geocode to get city name
      const addressResult = await reverseGeocode(lat, lng);
      const city = addressResult.address?.city;

      // Search for attractions
      const searchResult = await searchLocation(`attractions in ${city}`);

      const mapped = searchResult.locations.map((loc, idx) => ({
        id: idx,
        name: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        type: 'ATTRACTION',
        description: loc.displayName,
      }));

      setAttractions(mapped);
    } catch (error) {
      console.error('Error searching attractions:', error);
    }
  };

  const destinations = guideLocation
    ? [
        {
          id: 'guide',
          name: 'Your Location',
          latitude: guideLocation[0],
          longitude: guideLocation[1],
          type: 'GUIDE',
          description: 'You are here',
        },
        ...attractions,
      ]
    : attractions;

  return (
    <AdvancedMap
      destinations={destinations}
      initialCenter={guideLocation || [20.5937, 78.9629]}
      initialZoom={14}
      showClustering={true}
      showSearch={true}
      showRouting={true}
      height="600px"
    />
  );
}

// ============================================================================
// EXAMPLE 3: Multi-Destination Tour - Optimize Route Order
// ============================================================================

import { getRoute, optimizeRoute, calculateRouteStats } from '@/services/routingService';

export function MultiDestinationTour() {
  const [tourDestinations] = useState([
    { id: 1, name: 'Starting Point', lat: 16.7089, lng: 74.247, type: 'START_POINT' },
    { id: 2, name: 'Hotel 1', lat: 16.7012, lng: 74.2201, type: 'HOTEL' },
    { id: 3, name: 'Restaurant', lat: 16.7035, lng: 74.2465, type: 'RESTAURANT' },
    { id: 4, name: 'Attraction', lat: 16.6961, lng: 74.2239, type: 'ATTRACTION' },
    { id: 5, name: 'End Point', lat: 16.7245, lng: 74.3053, type: 'END_POINT' },
  ]);

  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [routeStats, setRouteStats] = useState(null);

  const handleOptimizeRoute = async () => {
    try {
      const waypoints = tourDestinations.map((d) => [d.lat, d.lng]);

      // Optimize the route
      const result = await optimizeRoute(waypoints);

      if (result.optimized) {
        // Get the optimized route
        const route = await getRoute(result.waypoints);

        setOptimizedRoute(route);
        setRouteStats(calculateRouteStats(route));
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
    }
  };

  const destinations = tourDestinations.map((d) => ({
    ...d,
    latitude: d.lat,
    longitude: d.lng,
  }));

  return (
    <div>
      <h1>Plan Multi-Destination Tour</h1>
      <button onClick={handleOptimizeRoute} style={{ marginBottom: '16px', padding: '10px 20px' }}>
        ✨ Optimize Route Order
      </button>

      <AdvancedMap
        destinations={destinations}
        initialCenter={[16.7089, 74.247]}
        initialZoom={12}
        showRouting={true}
        showSearch={true}
        height="600px"
      />

      {optimizedRoute && routeStats && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#f0f7ff', borderRadius: '8px' }}>
          <h3>✅ Optimized Route</h3>
          <p>Total Distance: {routeStats.distanceKM} km</p>
          <p>Total Duration: {routeStats.durationHM}</p>
          <p>Optimized waypoint order has been calculated</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Real-Time Travel - Show User Location + Nearby Services
// ============================================================================

import { getTravelMatrix, formatDistance, formatDuration } from '@/services/routingService';

export function RealTimeTravelPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyServices, setNearbyServices] = useState([]);
  const [travelTimes, setTravelTimes] = useState({});

  useEffect(() => {
    // Get user's location
    navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = [latitude, longitude];
        setUserLocation(newLocation);

        // Fetch nearby hotels
        fetchNearbyServices(newLocation);

        // Calculate travel times
        calculateTravelTimes(newLocation);
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );
  }, []);

  const fetchNearbyServices = async (location) => {
    try {
      const response = await axios.get('/api/hotels/nearby', {
        params: { lat: location[0], lng: location[1], radius: 10 },
      });

      const mapped = response.data.map((hotel) => ({
        id: hotel._id,
        name: hotel.name,
        latitude: hotel.location.coordinates[1],
        longitude: hotel.location.coordinates[0],
        type: 'HOTEL',
        rating: hotel.rating,
      }));

      setNearbyServices(mapped);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const calculateTravelTimes = async (userLoc) => {
    if (nearbyServices.length === 0) return;

    try {
      const destinations = nearbyServices.map((s) => [s.latitude, s.longitude]);
      const result = await getTravelMatrix([userLoc], destinations);

      const times = {};
      nearbyServices.forEach((service, idx) => {
        times[service.id] = {
          distance: formatDistance(result.distances[0][idx]),
          duration: formatDuration(result.durations[0][idx]),
        };
      });

      setTravelTimes(times);
    } catch (error) {
      console.error('Error calculating travel times:', error);
    }
  };

  const destinations = userLocation
    ? [
        {
          id: 'user',
          name: 'Your Location',
          latitude: userLocation[0],
          longitude: userLocation[1],
          type: 'USER_LOCATION',
        },
        ...nearbyServices,
      ]
    : nearbyServices;

  return (
    <div>
      <h1>Nearby Hotels</h1>

      <AdvancedMap
        destinations={destinations}
        initialCenter={userLocation || [20.5937, 78.9629]}
        initialZoom={14}
        showClustering={true}
        height="500px"
      />

      <div style={{ marginTop: '20px' }}>
        <h3>Hotels Near You:</h3>
        {nearbyServices.map((service) => (
          <div
            key={service.id}
            style={{
              padding: '12px',
              margin: '8px 0',
              background: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #ddd',
            }}
          >
            <h4>{service.name}</h4>
            {travelTimes[service.id] && (
              <p>
                📍 {travelTimes[service.id].distance} away • ⏱️{' '}
                {travelTimes[service.id].duration}
              </p>
            )}
            ⭐ {service.rating}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Search and Get Address Details
// ============================================================================

import { searchLocation, reverseGeocode, formatAddress } from '@/services/geocodingService';

export function LocationSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addressDetails, setAddressDetails] = useState(null);

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await searchLocation(query, { limit: 10 });
      setSearchResults(result.locations || []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleSelectLocation = async (location) => {
    setSelectedLocation(location);

    // Get detailed address info
    try {
      const details = await reverseGeocode(location.lat, location.lng);
      setAddressDetails(details);
    } catch (error) {
      console.error('Error getting address details:', error);
    }
  };

  const destinationsForMap = selectedLocation
    ? [
        {
          id: 1,
          name: selectedLocation.name,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          type: 'DESTINATION',
          description: selectedLocation.displayName,
        },
      ]
    : [];

  return (
    <div>
      <h1>Search and Explore Locations</h1>

      <input
        type="text"
        placeholder="Search for a location..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          marginBottom: '16px',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      />

      {searchResults.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {searchResults.map((result) => (
            <div
              key={result.id}
              onClick={() => handleSelectLocation(result)}
              style={{
                padding: '10px',
                margin: '8px 0',
                background: '#f0f7ff',
                borderRadius: '6px',
                cursor: 'pointer',
                border: '1px solid #1f77b4',
              }}
            >
              <strong>{result.name}</strong>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                {result.displayName.substring(0, 100)}...
              </p>
            </div>
          ))}
        </div>
      )}

      {destinationsForMap.length > 0 && (
        <>
          <AdvancedMap
            destinations={destinationsForMap}
            initialCenter={[selectedLocation.lat, selectedLocation.lng]}
            initialZoom={14}
            height="400px"
          />

          {addressDetails?.success && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3>📍 Location Details</h3>
              <p>
                <strong>Full Address:</strong> {addressDetails.displayName}
              </p>
              <p>
                <strong>City:</strong> {addressDetails.address?.city || 'N/A'}
              </p>
              <p>
                <strong>Country:</strong> {addressDetails.address?.country || 'N/A'}
              </p>
              <p>
                <strong>Coordinates:</strong> {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

//============================================================================
// Export all examples
//============================================================================

export default {
  HotelBookingPage,
  TourGuidePage,
  MultiDestinationTour,
  RealTimeTravelPage,
  LocationSearchPage,
};
