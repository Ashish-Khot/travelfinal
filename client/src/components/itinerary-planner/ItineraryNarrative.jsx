/**
 * Narrative Itinerary View
 * Presents a destination-aware, day-by-day itinerary with practical budget and weather insights.
 */

import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

const BLOCK_ORDER = ['morning', 'lunch', 'afternoon', 'evening', 'night'];
const BLOCK_LABELS = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

const BLOCK_COLORS = {
  morning: '#f97316',
  lunch: '#16a34a',
  afternoon: '#2563eb',
  evening: '#7c3aed',
  night: '#0f172a',
};

const DESTINATION_PALETTES = [
  ['#0f766e', '#1d4ed8'],
  ['#b45309', '#be123c'],
  ['#0369a1', '#4338ca'],
  ['#166534', '#0f766e'],
  ['#c2410c', '#7c2d12'],
  ['#4c1d95', '#0f172a'],
  ['#1d4ed8', '#0f766e'],
];

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

const formatWeatherDate = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
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

const getDestinationPalette = (name) => {
  const hash = String(name || '')
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DESTINATION_PALETTES[hash % DESTINATION_PALETTES.length];
};

const getBudgetStatusMeta = (status) => {
  const map = {
    'below-minimum': {
      label: 'Adjusted to minimum practical budget',
      color: 'warning',
      description: 'Input budget was below realistic minimum for this destination.',
    },
    'within-range': {
      label: 'Budget in realistic range',
      color: 'success',
      description: 'Budget aligns with common costs for this destination.',
    },
    'above-premium': {
      label: 'Budget above premium range',
      color: 'info',
      description: 'Plan can include high-end experiences while still showing realistic ranges.',
    },
  };
  return map[status] || map['within-range'];
};

const formatMinutes = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '0 min';
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const remainder = Math.round(value % 60);
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
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

  const destinationName = itinerary?.destination?.name || itinerary?.destination || 'Destination';
  const currency = itinerary?.budget?.currency || 'INR';
  const overview = itinerary?.aiPlan?.summary || itinerary?.description || '';
  const weatherForecast = (itinerary?.weatherData?.forecast || []).slice(0, itinerary?.numberOfDays || 7);
  const [primaryColor, secondaryColor] = getDestinationPalette(destinationName);
  const budgetMeta = getBudgetStatusMeta(itinerary?.budget?.status);

  const themesByDay = Array.isArray(itinerary?.aiPlan?.dailyThemes)
    ? itinerary.aiPlan.dailyThemes.reduce((acc, item) => {
        if (item?.day) acc[item.day] = item;
        return acc;
      }, {})
    : {};

  return (
    <Box className="story-root">
      <Card
        className="story-card story-hero-card"
        sx={{
          mb: 3,
          background: `linear-gradient(130deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          color: '#ffffff',
        }}
      >
        <CardContent>
          <Typography variant="overline" sx={{ letterSpacing: '0.14em', opacity: 0.8 }}>
            Destination Intelligence
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            {destinationName}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95, mb: 2 }}>
            {itinerary?.numberOfDays || 0} days for {itinerary?.numberOfTravelers || 1} traveler(s)
          </Typography>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              label={`Planned budget: ${formatMoney(itinerary?.budget?.totalBudget || 0, currency)}`}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
            />
            {Number(itinerary?.budget?.minimumRecommended) > 0 && (
              <Chip
                label={`Minimum practical: ${formatMoney(itinerary.budget.minimumRecommended, currency)}`}
                size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
              />
            )}
            <Chip
              label={`Avg activity: ${formatMinutes(itinerary?.planningInsights?.averageActivityDurationMinutes || 0)}`}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
            />
            <Chip
              label={`Daily travel: ${formatMinutes(itinerary?.planningInsights?.totalEstimatedTravelMinutes || 0)}`}
              size="small"
              sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Alert severity={budgetMeta.color} sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {budgetMeta.label}
        </Typography>
        <Typography variant="body2">{itinerary?.budget?.adjustmentMessage || budgetMeta.description}</Typography>
      </Alert>

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

      {weatherForecast.length > 0 && (
        <Card sx={{ mb: 3 }} className="story-card">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }} className="story-card-title">
              Weather Outlook
            </Typography>
            <Grid container spacing={1.5}>
              {weatherForecast.map((day) => (
                <Grid item xs={12} sm={6} md={4} key={day.date}>
                  <Paper className="story-weather-card">
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {formatWeatherDate(day.date)}
                    </Typography>
                    <Typography variant="body2">
                      {day.condition || 'Condition unavailable'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(day.minTemp || 0)} - {Math.round(day.maxTemp || 0)} deg C
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Rain probability: {Math.round(day.rainProbability || 0)}%
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
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
              {itinerary.highlightedPlaces.slice(0, 12).map((place) => (
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
                        backgroundColor: BLOCK_COLORS[block] || '#94A3B8',
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
                            {activity.startTime} - {activity.endTime} ({formatMinutes(activity.duration)})
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
            Budget Intelligence
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Requested
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.requestedBudget || itinerary?.budget?.totalBudget || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Planned total
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.totalBudget || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Suggested daily
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.suggestedDailyBudget || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Minimum practical
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.minimumRecommended || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Comfortable range
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.comfortableEstimate || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                Premium range
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.premiumEstimate || 0, currency)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Transport allocation
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.transportation || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Food allocation
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.food || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Activities allocation
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.activities || 0, currency)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Accommodation allocation
              </Typography>
              <Typography variant="subtitle2">
                {formatMoney(itinerary?.budget?.accommodation || 0, currency)}
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
