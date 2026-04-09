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

  const formatDate = (startDate, dayNumber) => {
    if (!startDate) return '';
    const base = new Date(startDate);
    if (Number.isNaN(base.getTime())) return '';
    base.setDate(base.getDate() + (dayNumber - 1));
    return base.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMoney = (value, currency) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    const normalizedCurrency = currency || 'INR';
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: normalizedCurrency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${normalizedCurrency} ${amount.toFixed(0)}`;
    }
  };

  const formatTimeRange = (start, end) => {
    if (!start && !end) return '';
    if (!end) return start;
    return `${start} - ${end}`;
  };

  const extractTips = (text) => {
    if (!text || typeof text !== 'string') return [];
    const cleaned = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/•/g, '\n')
      .replace(/\s+-\s+/g, '\n');
    return cleaned
      .split(/\n|;|\u2022/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  };

  const currency = itinerary?.budget?.currency || 'INR';

  return (
    <Box className="schedule-root">
      <Box className="schedule-header">
        <Box>
          <Typography variant="h6" className="schedule-title">
            Premium Schedule Timeline
          </Typography>
          <Typography variant="body2" className="schedule-subtitle">
            Clean, day-by-day flow with time blocks, highlights, and tips.
          </Typography>
        </Box>
        <Box className="schedule-summary">
          <Box className="schedule-summary-item">
            <Typography variant="caption">Total days</Typography>
            <Typography variant="subtitle1">{itinerary?.numberOfDays || 0}</Typography>
          </Box>
          <Box className="schedule-summary-item">
            <Typography variant="caption">Total activities</Typography>
            <Typography variant="subtitle1">{itinerary?.activities?.length || 0}</Typography>
          </Box>
          <Box className="schedule-summary-item">
            <Typography variant="caption">Budget</Typography>
            <Typography variant="subtitle1">
              {formatMoney(itinerary?.budget?.totalBudget || 0, currency)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Array.from({ length: itinerary?.numberOfDays || 0 }).map((_, dayIdx) => {
          const dayNumber = dayIdx + 1;
          const activities = getHourActivities(dayNumber);
          const dateLabel = formatDate(itinerary?.startDate, dayNumber);
          const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
          const totalCost = activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);

          return (
            <Card key={dayNumber} className="schedule-day-card">
              <CardContent className="schedule-day-content">
                <Box
                  className="schedule-day-header"
                  style={{ background: `linear-gradient(135deg, ${getDayColor(dayNumber)} 0%, #111827 120%)` }}
                >
                  <Box>
                    <Typography variant="overline">Day {dayNumber}</Typography>
                    <Typography variant="h6">{dateLabel || 'Custom day plan'}</Typography>
                  </Box>
                  <Box className="schedule-day-stats">
                    <Box>
                      <Typography variant="caption">Duration</Typography>
                      <Typography variant="subtitle2">{totalDuration} min</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">Activities</Typography>
                      <Typography variant="subtitle2">{activities.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption">Spend</Typography>
                      <Typography variant="subtitle2">{formatMoney(totalCost, currency)}</Typography>
                    </Box>
                  </Box>
                </Box>

                {activities.length > 0 ? (
                  <Box className="schedule-grid">
                    <Box className="schedule-row schedule-head">
                      <Typography variant="subtitle2">Time</Typography>
                      <Typography variant="subtitle2">Activity</Typography>
                      <Typography variant="subtitle2">Details & Tips</Typography>
                    </Box>

                    {activities.map((activity, idx) => {
                      const tips = extractTips(activity.notes);
                      return (
                        <Box key={activity._id || idx} className="schedule-row">
                          <Box className="schedule-time">
                            <Typography className="schedule-time-range">
                              {formatTimeRange(activity.startTime, activity.endTime)}
                            </Typography>
                            <Typography className="schedule-time-meta">
                              {activity.duration ? `${activity.duration} min` : 'Flexible'}
                            </Typography>
                          </Box>

                          <Box className="schedule-activity">
                            <Typography className="schedule-activity-title">
                              {activity.name}
                            </Typography>
                            {activity.location?.address && (
                              <Typography className="schedule-location">
                                {activity.location.address}
                              </Typography>
                            )}
                            <Box className="schedule-chip-row">
                              <Chip label={activity.category} size="small" className="schedule-chip" />
                              <Chip
                                label={activity.importance}
                                size="small"
                                className="schedule-chip"
                                sx={{
                                  backgroundColor: getImportanceColor(activity.importance),
                                  color: 'white',
                                }}
                              />
                              {Number.isFinite(activity.estimatedCost) && (
                                <Chip
                                  label={formatMoney(activity.estimatedCost, currency)}
                                  size="small"
                                  variant="outlined"
                                  className="schedule-chip"
                                />
                              )}
                            </Box>
                          </Box>

                          <Box className="schedule-details">
                            {activity.description && (
                              <Typography className="schedule-detail-text">
                                {activity.description}
                              </Typography>
                            )}
                            {tips.length > 0 && (
                              <Box component="ul" className="schedule-tips">
                                {tips.map((tip, tipIdx) => (
                                  <li key={`${activity._id || idx}-tip-${tipIdx}`}>{tip}</li>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Paper className="schedule-empty">
                    <Typography variant="body2" color="textSecondary">
                      No activities scheduled for this day.
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default TimelineView;

