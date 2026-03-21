/**
 * Narrative Itinerary View
 * Presents a day-by-day, time-blocked itinerary similar to a travel guide
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Typography,
  Chip,
  Grid,
} from '@mui/material';

const BLOCK_ORDER = ['morning', 'lunch', 'afternoon', 'evening', 'night'];
const BLOCK_LABELS = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const blockColors = {
  morning: '#F59E0B',
  lunch: '#10B981',
  afternoon: '#3B82F6',
  evening: '#8B5CF6',
  night: '#111827',
};

const parseTimeToMinutes = (timeStr) => {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return (h * 60) + (m || 0);
};

const inferTimeBlock = (activity) => {
  if (activity?.timeBlock) return activity.timeBlock;
  const minutes = parseTimeToMinutes(activity?.startTime || '09:00');
  if (minutes < 720) return 'morning';
  if (minutes < 840) return 'lunch';
  if (minutes < 1050) return 'afternoon';
  if (minutes < 1260) return 'evening';
  return 'night';
};

const formatDate = (startDate, dayNumber) => {
  if (!startDate) return '';
  const base = new Date(startDate);
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + (dayNumber - 1));
  return base.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatMoney = (value, currency) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || 'INR'} ${amount.toFixed(0)}`;
  }
};

const ItineraryNarrative = ({ itinerary }) => {
  const activities = itinerary?.activities || [];
  const groupedByDay = {};

  activities.forEach((activity) => {
    const day = activity.dayNumber || 1;
    const block = inferTimeBlock(activity);
    if (!groupedByDay[day]) groupedByDay[day] = {};
    if (!groupedByDay[day][block]) groupedByDay[day][block] = [];
    groupedByDay[day][block].push(activity);
  });

  const dayNumbers = Object.keys(groupedByDay)
    .map((d) => Number(d))
    .sort((a, b) => a - b);

  if (!itinerary || dayNumbers.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography>No itinerary generated yet.</Typography>
        </CardContent>
      </Card>
    );
  }

  const currency = itinerary?.budget?.currency || 'INR';

  const overview = itinerary?.aiPlan?.summary || itinerary?.description || '';
  const themesByDay = Array.isArray(itinerary?.aiPlan?.dailyThemes)
    ? itinerary.aiPlan.dailyThemes.reduce((acc, item) => {
        if (item?.day) acc[item.day] = item;
        return acc;
      }, {})
    : {};

  return (
    <Box className="story-root">
      {overview && (
        <Card sx={{ mb: 3 }} className="story-card">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }} className="story-card-title">
              Trip Overview
            </Typography>
            <Typography variant="body1">{overview}</Typography>
          </CardContent>
        </Card>
      )}

      {Array.isArray(itinerary?.highlightedPlaces) && itinerary.highlightedPlaces.length > 0 && (
        <Card sx={{ mb: 3 }} className="story-card">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }} className="story-card-title">
              Highlights
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {itinerary.highlightedPlaces.slice(0, 10).map((place) => (
                <Chip key={place} label={place} size="small" className="story-chip" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {dayNumbers.map((dayNumber) => {
        const blocks = groupedByDay[dayNumber] || {};
        const dateLabel = formatDate(itinerary?.startDate, dayNumber);
        return (
          <Card key={dayNumber} sx={{ mb: 3 }} className="story-card">
            <CardContent>
              <Box className="story-day-header" sx={{ mb: 1 }}>
                <Typography variant="h5" className="story-card-title">
                  Day {dayNumber}
                  {dateLabel ? ` - ${dateLabel}` : ''}
                </Typography>
                {themesByDay[dayNumber] && (
                  <Typography variant="body2" className="story-day-tagline">
                    {themesByDay[dayNumber].theme}
                  </Typography>
                )}
              </Box>
              {themesByDay[dayNumber]?.focus && (
                <Typography variant="body2" className="story-day-tagline" sx={{ mb: 2 }}>
                  {themesByDay[dayNumber].focus}
                </Typography>
              )}
              <Divider sx={{ mb: 2 }} />

              {BLOCK_ORDER.filter((block) => (blocks[block] || []).length > 0).map((block) => (
                <Box key={block} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: blockColors[block] || '#94A3B8',
                        mr: 1,
                      }}
                    />
                    <Typography variant="subtitle1" className="story-block-title">
                      {BLOCK_LABELS[block] || block}
                    </Typography>
                  </Box>

                  {(blocks[block] || [])
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((activity, idx) => (
                      <Box key={`${activity._id || idx}`} sx={{ mb: 1.25, pl: 2 }}>
                        <Box className="story-activity">
                          <Typography variant="subtitle2" className="story-activity-name">
                          {activity.name}
                          </Typography>
                          <Typography variant="body2" className="story-activity-time">
                            {activity.startTime} - {activity.endTime}
                          </Typography>
                          {activity.description && (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {activity.description}
                            </Typography>
                          )}
                          {activity.notes && (
                            <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
                              {activity.notes}
                            </Typography>
                          )}
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={activity.category}
                              size="small"
                              className="story-chip"
                              sx={{ mr: 0.5 }}
                            />
                            {Number.isFinite(activity.estimatedCost) && (
                              <Chip
                                label={formatMoney(activity.estimatedCost, currency)}
                                size="small"
                                variant="outlined"
                                className="story-chip"
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                </Box>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card className="story-card">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }} className="story-card-title">
            Estimated Budget
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Transport
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.transportation || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Food
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.food || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Activities
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.activities || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.totalBudget || 0, currency)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {(itinerary?.aiPlan?.localTips?.length || itinerary?.aiPlan?.packingTips?.length) && (
        <Card sx={{ mt: 3 }} className="story-card">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }} className="story-card-title">
              Local Tips
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Local tips
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(itinerary.aiPlan?.localTips || []).slice(0, 6).map((tip, idx) => (
                    <Typography key={`local-tip-${idx}`} variant="body2">
                      {tip}
                    </Typography>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Packing tips
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(itinerary.aiPlan?.packingTips || []).slice(0, 6).map((tip, idx) => (
                    <Typography key={`packing-tip-${idx}`} variant="body2">
                      {tip}
                    </Typography>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ItineraryNarrative;
