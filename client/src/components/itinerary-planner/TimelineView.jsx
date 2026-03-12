/**
 * Timeline View Component
 * Display itinerary activities by time/hour
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Paper,
} from '@mui/material';

const TimelineView = ({ itinerary, onActivityUpdate }) => {
  const getHourActivities = (day) => {
    return (itinerary?.activities || [])
      .filter((a) => a.dayNumber === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getDayColor = (dayNumber) => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
    ];
    return colors[(dayNumber - 1) % colors.length];
  };

  const getImportanceColor = (importance) => {
    const colors = {
      'must-do': '#d32f2f',
      'recommended': '#1976d2',
      'optional': '#757575',
    };
    return colors[importance] || '#757575';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Day-by-Day Timeline
      </Typography>

      {/* Timeline for each day */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Array.from({ length: itinerary?.numberOfDays || 0 }).map((_, dayIdx) => {
          const dayNumber = dayIdx + 1;
          const activities = getHourActivities(dayNumber);

          return (
            <Card key={dayNumber}>
              <CardContent>
                {/* Day Header */}
                <Box
                  sx={{
                    backgroundColor: getDayColor(dayNumber),
                    color: 'white',
                    p: 2,
                    borderRadius: 1,
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">
                    Day {dayNumber}
                  </Typography>
                  <Typography variant="caption">
                    {activities.length} activities
                  </Typography>
                </Box>

                {/* Activities Timeline */}
                {activities.length > 0 ? (
                  <Box>
                    {activities.map((activity, idx) => (
                      <Box
                        key={activity._id || idx}
                        sx={{
                          display: 'flex',
                          mb: 2,
                          pb: 2,
                          borderBottom: idx < activities.length - 1 ? '1px dashed #ccc' : 'none',
                        }}
                      >
                        {/* Time Column */}
                        <Box sx={{ minWidth: 100, mr: 2 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 'bold',
                              color: '#1976d2',
                              fontSize: '1rem',
                            }}
                          >
                            {activity.startTime}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            {activity.duration} min
                          </Typography>
                        </Box>

                        {/* Activity Content */}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {activity.name}
                          </Typography>
                          {activity.description && (
                            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                              {activity.description}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            <Chip
                              label={activity.category}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={activity.importance}
                              size="small"
                              sx={{
                                backgroundColor: getImportanceColor(activity.importance),
                                color: 'white',
                              }}
                            />
                            {activity.estimatedCost > 0 && (
                              <Chip
                                label={`$${activity.estimatedCost}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
                    No activities scheduled for this day
                  </Typography>
                )}

                {/* Day Summary */}
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-around',
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      Total Duration
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {activities.reduce((sum, a) => sum + a.duration, 0)} min
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      Total Cost
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      ${activities.reduce((sum, a) => sum + a.estimatedCost, 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      Activities
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {activities.length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default TimelineView;
