/**
 * Map Planner Component
 * Interactive map-based itinerary planning
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  Chip,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

const MapPlanner = ({ itinerary, onActivityAdd, onActivityRemove }) => {
  const currency = itinerary?.budget?.currency || 'INR';
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [openActivityForm, setOpenActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    category: 'sightseeing',
    dayNumber: 1,
    startTime: '09:00',
    endTime: '11:00',
    estimatedCost: 0,
  });

  // Default center (Paris)
  const defaultCenter = [48.8566, 2.3522];
  const center = itinerary?.destination?.coordinates
    ? [itinerary.destination.coordinates.latitude, itinerary.destination.coordinates.longitude]
    : defaultCenter;

  // Create color map for days
  const getDayColor = (dayNumber) => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#FFA07A', // Light Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
    ];
    return colors[(dayNumber - 1) % colors.length];
  };

  const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(0)}`;
    }
  };

  const handleMapClick = (e) => {
    setSelectedLocation({
      latitude: e.latlng.lat,
      longitude: e.latlng.lng,
    });
    setOpenActivityForm(true);
  };

  const handleAddActivity = () => {
    if (!selectedLocation || !activityForm.name) return;

    onActivityAdd({
      ...activityForm,
      location: {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: 'Selected Location',
      },
    });

    // Reset form
    setActivityForm({
      name: '',
      description: '',
      category: 'sightseeing',
      dayNumber: 1,
      startTime: '09:00',
      endTime: '11:00',
      estimatedCost: 0,
    });
    setSelectedLocation(null);
    setOpenActivityForm(false);
  };

  // Create polyline connecting activities
  const getActivityPolyline = () => {
    if (!itinerary?.activities || itinerary.activities.length < 2) return null;

    const sortedActivities = [...itinerary.activities].sort(
      (a, b) => a.dayNumber - b.dayNumber || a.startTime.localeCompare(b.startTime)
    );

    const points = sortedActivities.map((activity) => [
      activity.location.coordinates[1],
      activity.location.coordinates[0],
    ]);

    return points;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Map Section */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ height: 600, borderRadius: 2, overflow: 'hidden' }}>
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              onClick={(e) => handleMapClick(e)}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              {/* Activity Markers */}
              {itinerary?.activities.map((activity, idx) => (
                <Marker
                  key={activity._id || idx}
                  position={[
                    activity.location.coordinates[1],
                    activity.location.coordinates[0],
                  ]}
                  icon={L.icon({
                    iconUrl: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iMTAiIGZpbGw9IiR7Z2V0RGF5Q29sb3IoYWN0aXZpdHkuZGF5TnVtYmVyKX0iLz48L3N2Zz4=`,
                    iconSize: [25, 41],
                    popupAnchor: [0, -20],
                  })}
                >
                  <Popup>
                    <Box sx={{ minWidth: 200 }}>
                      <Typography variant="subtitle2">{activity.name}</Typography>
                      <Typography variant="caption" display="block">
                        Day {activity.dayNumber}
                      </Typography>
                      <Typography variant="caption">
                        {activity.startTime} - {activity.endTime}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => onActivityRemove(activity._id)}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Popup>
                </Marker>
              ))}

              {/* Activity Connection Polyline */}
              {getActivityPolyline() && (
                <Polyline
                  positions={getActivityPolyline()}
                  color="#2196F3"
                  weight={2}
                  opacity={0.7}
                  dashArray="5, 5"
                />
              )}
            </MapContainer>
          </Paper>
        </Grid>

        {/* Side Panel */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activities ({itinerary?.activities?.length || 0})
              </Typography>

              <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                {[...(itinerary?.activities || [])]
                  .sort((a, b) => {
                    const dayCompare = Number(a.dayNumber || 0) - Number(b.dayNumber || 0);
                    if (dayCompare !== 0) return dayCompare;
                    return String(a.startTime || '').localeCompare(String(b.startTime || ''));
                  })
                  .map((activity, idx) => (
                    <Box
                      key={activity._id || `${activity.dayNumber}-${activity.startTime}-${idx}`}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        backgroundColor: '#f5f5f5',
                        borderLeft: `4px solid ${getDayColor(activity.dayNumber)}`,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {activity.name}
                      </Typography>
                      <Typography variant="caption">
                        Day {activity.dayNumber} - {activity.startTime} - {activity.endTime}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={activity.category}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        />
                        <Chip
                          label={formatMoney(activity.estimatedCost)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  ))}
              </Box>

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setOpenActivityForm(true)}
              >
                Add Activity
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Activity Dialog */}
      <Dialog
        open={openActivityForm}
        onClose={() => setOpenActivityForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Activity</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Activity Name"
              value={activityForm.name}
              onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Category"
              value={activityForm.category}
              onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="sightseeing">Sightseeing</option>
              <option value="food">Food</option>
              <option value="adventure">Adventure</option>
              <option value="culture">Culture</option>
              <option value="shopping">Shopping</option>
              <option value="relaxation">Relaxation</option>
            </TextField>
            <TextField
              label="Day Number"
              type="number"
              value={activityForm.dayNumber}
              onChange={(e) => setActivityForm({ ...activityForm, dayNumber: parseInt(e.target.value) })}
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Start Time"
              type="time"
              value={activityForm.startTime}
              onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Time"
              type="time"
              value={activityForm.endTime}
              onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Estimated Cost (₹)"
              type="number"
              value={activityForm.estimatedCost}
              onChange={(e) => setActivityForm({ ...activityForm, estimatedCost: parseFloat(e.target.value) })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenActivityForm(false)}>Cancel</Button>
          <Button onClick={handleAddActivity} variant="contained">
            Add Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MapPlanner;
