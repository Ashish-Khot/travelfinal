import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Card, Typography, Chip, Rating, Paper } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { motion } from 'framer-motion';
import { MAP_CONFIG } from '../../config/mapConfig';

// Import marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const PremiumDestinationMap = ({ destinations = [], center = { lat: 36.3932, lng: 25.4615 }, zoom = 2, onMarkerClick = null }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  // Fix default marker icon
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current).setView([center.lat, center.lng], zoom);

      // Try primary tile layer (CartoDB Light - most reliable visual)
      const primaryTile = MAP_CONFIG.TILE_SERVERS.CartoDB_Light;
      let tileLayerAdded = false;

      // Create tile layer with error handling
      const tileLayer = L.tileLayer(primaryTile.url, {
        attribution: primaryTile.attribution,
        maxZoom: primaryTile.maxZoom,
        minZoom: primaryTile.minZoom,
        opacity: 0.95,
        errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2ZjZmNmYyIvPjwvc3ZnPg==',
      });

      tileLayer.on('load', () => {
        tileLayerAdded = true;
      });

      tileLayer.on('error', () => {
        if (!tileLayerAdded) {
          tileLayer.remove();
          // Fallback to OpenStreetMap
          const fallbackTile = MAP_CONFIG.TILE_SERVERS.OSM;
          L.tileLayer(fallbackTile.url, {
            attribution: fallbackTile.attribution,
            maxZoom: fallbackTile.maxZoom,
            minZoom: fallbackTile.minZoom,
            opacity: 0.95,
          }).addTo(map.current);
        }
      });

      tileLayer.addTo(map.current);
      
      // Add timeout fallback (5 seconds)
      setTimeout(() => {
        if (!tileLayerAdded && map.current) {
          const allLayers = Object.values(map.current._layers);
          const existingTiles = allLayers.filter(layer => layer instanceof L.TileLayer);
          
          // If CartoDB tiles still haven't loaded, add OSM
          if (existingTiles.length === 0) {
            const fallbackTile = MAP_CONFIG.TILE_SERVERS.OSM;
            L.tileLayer(fallbackTile.url, {
              attribution: fallbackTile.attribution,
              maxZoom: fallbackTile.maxZoom,
              minZoom: fallbackTile.minZoom,
              opacity: 0.95,
            }).addTo(map.current);
          }
        }
      }, 5000);
    }

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create premium SVG marker icon
    const createPremiumMarker = (rating = 0, isHovered = false, markerIndex = 0) => {
      // Color based on rating
      let gradColor1, gradColor2, textColor;
      if (rating >= 4.5) {
        gradColor1 = '#10B981';
        gradColor2 = '#059669';
        textColor = '#fff';
      } else if (rating >= 4) {
        gradColor1 = '#3B82F6';
        gradColor2 = '#1D4ED8';
        textColor = '#fff';
      } else if (rating >= 3) {
        gradColor1 = '#F59E0B';
        gradColor2 = '#D97706';
        textColor = '#fff';
      } else {
        gradColor1 = '#EF4444';
        gradColor2 = '#DC2626';
        textColor = '#fff';
      }

      const scale = isHovered ? 1.3 : 1;
      const shadowBlur = isHovered ? 24 : 12;

      const svgPin = `
        <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 ${shadowBlur}px 16px rgba(0,0,0,0.25)); transform: scale(${scale}); transform-origin: center; transition: all 0.3s ease;">
          <defs>
            <linearGradient id="grad_${markerIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${gradColor1};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${gradColor2};stop-opacity:1" />
            </linearGradient>
            <filter id="glow_${markerIndex}">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <!-- Pin body -->
          <path d="M 25 5 C 15 5, 8 12, 8 22 C 8 35, 25 55, 25 55 C 25 55, 42 35, 42 22 C 42 12, 35 5, 25 5 Z" fill="url(#grad_${markerIndex})" stroke="white" stroke-width="2" filter="url(#glow_${markerIndex})"/>
          <!-- Inner circle -->
          <circle cx="25" cy="22" r="11" fill="white" opacity="0.15"/>
          <!-- Icon -->
          <text x="25" y="28" font-size="24" text-anchor="middle" fill="${textColor}" font-weight="bold">✓</text>
        </svg>
      `;

      return L.divIcon({
        html: svgPin,
        iconSize: [50, 60],
        iconAnchor: [25, 60],
        popupAnchor: [0, -60],
        className: 'premium-svg-marker',
      });
    };

    // Add destination markers
    destinations.forEach((dest, index) => {
      if (!dest.lat || !dest.lon) return;

      const marker = L.marker([dest.lat, dest.lon], { 
        icon: createPremiumMarker(dest.rating || 0, false, index),
        riseOnHover: true,
      });

      // Premium popup content with enhanced styling
      const popupContent = `
        <div style="
          border-radius: 16px;
          overflow: hidden;
          min-width: 300px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.2);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: white;
        ">
          <div style="position: relative; height: 180px; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <img src="${dest.image || '/fallback-destination.jpg'}" alt="${dest.name}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 0.9;
            " onerror="this.style.display='none'" />
            <div style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: 600;">
              ⭐ ${(dest.rating || 0).toFixed(1)}/5
            </div>
          </div>
          <div style="padding: 18px;">
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 800;
              color: #1e293b;
              letter-spacing: -0.5px;
            ">${dest.name}</h3>
            <div style="
              font-size: 13px;
              color: #64748b;
              margin-bottom: 12px;
              display: flex;
              align-items: center;
              gap: 6px;
            ">
              <span>📍</span> ${dest.city || 'City'}, ${dest.country || 'Country'}
            </div>
            <p style="
              margin: 0 0 14px 0;
              font-size: 13px;
              color: #475569;
              line-height: 1.6;
              max-height: 70px;
              overflow: hidden;
            ">${(dest.description || 'Discover this amazing destination').substring(0, 120)}...</p>
            <div style="display: flex; gap: 8px;">
              <button onclick="alert('View full details for ${dest.name}')" style="
                flex: 1;
                padding: 10px 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 12px;
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
              " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                View Details →
              </button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'premium-popup-v2',
        offset: L.point(0, -60),
        closeButton: true,
      });

      marker.on('click', () => {
        marker.openPopup();
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      marker.on('popupopen', () => {
        setHoveredMarker(index);
      });

      marker.on('popupclose', () => {
        setHoveredMarker(null);
      });

      marker.addTo(map.current);
      markersRef.current.push(marker);
    });

    // Fit bounds if destinations exist
    if (destinations.length > 0) {
      const validDestinations = destinations.filter(d => d.lat && d.lon);
      if (validDestinations.length > 0) {
        const bounds = L.latLngBounds(validDestinations.map(d => [d.lat, d.lon]));
        map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [destinations, zoom, center, onMarkerClick]);

  return (
    <Box
      sx={{
        position: 'relative',
        height: '600px',
        width: '100%',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgb(243, 244, 246)',
      }}
    >
      <style>{`
        .premium-popup-v2 .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          padding: 0 !important;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2) !important;
          background: transparent !important;
        }
        .premium-popup-v2 .leaflet-popup-content {
          padding: 0 !important;
          margin: 0 !important;
        }
        .premium-popup-v2 .leaflet-popup-tip {
          background-color: white !important;
          box-shadow: -3px -3px 8px rgba(0, 0, 0, 0.1);
        }
        .premium-svg-marker:hover {
          filter: brightness(1.1);
        }
        .leaflet-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
      `}</style>

      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Info Panel */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: '12px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          zIndex: 999,
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
          🗺️ DESTINATION MAP
        </Typography>
      </Paper>

      {/* Premium Legend */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          bottom: 24,
          left: 16,
          p: '16px 20px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          border: '1px solid rgba(255, 255, 255, 0.3)',
          minWidth: '240px',
        }}
      >
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 800, 
            mb: 1.5, 
            color: '#1e293b',
            fontSize: '13px',
            letterSpacing: '-0.5px'
          }}
        >
          📌 How to Use
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
          {/* Marker types */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              ✓
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 600, fontSize: '11px', display: 'block' }}>
                Highly Rated
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10px' }}>
                Rating 4.5+
              </Typography>
            </Box>
          </Box>

          {/* Click interaction */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
            <Box sx={{ fontSize: '18px' }}>👆</Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 600, fontSize: '11px', display: 'block' }}>
                Click Markers
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10px' }}>
                View destination details
              </Typography>
            </Box>
          </Box>

          {/* Zoom interaction */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
            <Box sx={{ fontSize: '18px' }}>🔍</Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 600, fontSize: '11px', display: 'block' }}>
                Zoom & Pan
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10px' }}>
                Explore map smoothly
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '9px', display: 'block' }}>
              Destinations
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>
              {destinations.length}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '9px', display: 'block' }}>
              Avg Rating
            </Typography>
            <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>
              {destinations.length > 0 
                ? ((destinations.reduce((sum, d) => sum + (d.rating || 0), 0) / destinations.length).toFixed(1))
                : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Top Right Controls Info */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          p: '8px 12px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          zIndex: 999,
          border: '1px solid rgba(255, 255, 255, 0.3)',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '10px', fontWeight: 600 }}>
          🌍 {destinations.length} Destiny Awaits
        </Typography>
      </Paper>
    </Box>
  );
};

export default PremiumDestinationMap;
