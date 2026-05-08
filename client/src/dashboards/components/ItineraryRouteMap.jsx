import React, { useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function FitToStops({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!Array.isArray(points) || points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [36, 36], animate: true });
  }, [map, points]);

  return null;
}

export default function ItineraryRouteMap({
  stops = [],
  selectedStopId = '',
  onStopClick = () => {},
  height = 560,
}) {
  const normalizedStops = useMemo(
    () =>
      stops.filter(
        (stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lon))
      ),
    [stops]
  );

  const points = useMemo(
    () => normalizedStops.map((stop) => [Number(stop.lat), Number(stop.lon)]),
    [normalizedStops]
  );

  if (normalizedStops.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'grid',
          placeItems: 'center',
          background: '#f8fafc',
          borderTop: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No map locations available for this day.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, width: '100%', '.leaflet-container': { height: '100%', width: '100%' } }}>
      <MapContainer center={points[0]} zoom={12} scrollWheelZoom zoomControl style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitToStops points={points} />

        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{
              color: '#0f766e',
              weight: 4,
              opacity: 0.85,
              lineJoin: 'round',
            }}
          />
        )}

        {normalizedStops.map((stop, index) => {
          const isActive = selectedStopId === stop.id;
          return (
            <CircleMarker
              key={stop.id}
              center={[Number(stop.lat), Number(stop.lon)]}
              radius={isActive ? 10 : 7}
              pathOptions={{
                color: isActive ? '#0f172a' : '#0f766e',
                fillColor: isActive ? '#14b8a6' : '#0ea5a4',
                fillOpacity: 0.95,
                weight: isActive ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onStopClick(stop),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {index + 1}. {stop.name}
              </Tooltip>
              <Popup>
                <strong>{stop.name}</strong>
                <br />
                {stop.start} - {stop.end}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </Box>
  );
}
