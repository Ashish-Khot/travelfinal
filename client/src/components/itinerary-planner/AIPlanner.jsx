/**
 * AI Planner Component
 * AI-powered suggestions, optimization, and recommendations
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Typography,
  Chip,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AutoFixHigh as AIIcon, CloudDownload as WeatherIcon } from '@mui/icons-material';
import itineraryService from '../../services/itineraryService.js';

const AIPlanner = ({ itinerary }) => {
  const currency = itinerary?.budget?.currency || 'INR';
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const[recommendations, setRecommendations] = useState([]);
  const [dayForSuggestion, setDayForSuggestion] = useState(1);
  const [openSuggestionsDialog, setOpenSuggestionsDialog] = useState(false);

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

  const handleGetSuggestions = async () => {
    if (!itinerary?._id) {
      alert('Please create an itinerary first');
      return;
    }

    setLoading(true);
    try {
      const response = await itineraryService.suggestActivities(
        itinerary._id,
        dayForSuggestion
      );
      setSuggestions(response.suggestions || []);
      setOpenSuggestionsDialog(true);
    } catch (error) {
      alert('Error generating suggestions: ' + error.message);
    }  finally {
      setLoading(false);
    }
  };

  const handleGetWeatherRecommendations = async () => {
    if (!itinerary?._id) {
      alert('Please create an itinerary first');
      return;
    }

    setLoading(true);
    try {
      const response = await itineraryService.getWeatherRecommendations(
        itinerary._id
      );
      setRecommendations(response.recommendations || {});
    } catch (error) {
      alert('Error getting recommendations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeItinerary = async () => {
    if (!itinerary?._id) {
      alert('Please create an itinerary first');
      return;
    }

    setLoading(true);
    try {
      const response = await itineraryService.optimizeItinerary(itinerary._id);
      alert('Itinerary optimized successfully!');
    } catch (error) {
      alert('Error optimizing itinerary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        AI-Powered Planning
      </Typography>

      {itinerary?.aiPlan && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">AI Plan Summary</Typography>
            {itinerary.aiPlan.summary && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {itinerary.aiPlan.summary}
              </Typography>
            )}

            {itinerary.aiPlan.highlights?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Highlights</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {itinerary.aiPlan.highlights.map((highlight, idx) => (
                    <Chip key={idx} label={highlight} />
                  ))}
                </Box>
              </Box>
            )}

            {itinerary.aiPlan.dailyThemes?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Daily Themes</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  {itinerary.aiPlan.dailyThemes.map((theme, idx) => (
                    <Paper key={idx} sx={{ p: 1.5, backgroundColor: '#f8fafc' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Day {theme.day}: {theme.theme}
                      </Typography>
                      {theme.focus && (
                        <Typography variant="caption" display="block">
                          Focus: {theme.focus}
                        </Typography>
                      )}
                      {theme.tip && (
                        <Typography variant="caption" display="block">
                          Tip: {theme.tip}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {itinerary.aiPlan.packingTips?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Packing Tips</Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {itinerary.aiPlan.packingTips.map((tip, idx) => (
                    <li key={idx}>
                      <Typography variant="caption">{tip}</Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            )}

            {itinerary.aiPlan.localTips?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Local Tips</Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {itinerary.aiPlan.localTips.map((tip, idx) => (
                    <li key={idx}>
                      <Typography variant="caption">{tip}</Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            )}

            {itinerary.aiPlan.budgetSplit && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Budget Split</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {Object.entries(itinerary.aiPlan.budgetSplit).map(([key, value]) => (
                    <Chip key={key} label={`${key}: ${Math.round(value)}%`} variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Suggestions Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AIIcon sx={{ mr: 1, color: '#2196F3' }} />
                <Typography variant="h6">Activity Suggestions</Typography>
              </Box>

              <TextField
                label="Select Day"
                type="number"
                value={dayForSuggestion}
                onChange={(e) => setDayForSuggestion(parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1, max: itinerary?.numberOfDays || 7 }}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleGetSuggestions}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Get Suggestions'}
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                AI will suggest interesting activities for the selected day based on your destination and interests.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Weather Recommendations Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WeatherIcon sx={{ mr: 1, color: '#FF9800' }} />
                <Typography variant="h6">Weather Recommendations</Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleGetWeatherRecommendations}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Get Recommendations'}
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                Get AI-powered recommendations based on weather forecast for your destination.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Optimization Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AIIcon sx={{ mr: 1, color: '#4CAF50' }} />
                <Typography variant="h6">Optimize Schedule</Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleOptimizeItinerary}
                disabled={loading || !itinerary?.activities?.length}
              >
                {loading ? <CircularProgress size={20} /> : 'Optimize Activities Order'}
              </Button>

              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                AI will reorder your activities to minimize travel time and maximize experience.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Weather Recommendations Display */}
      {Object.keys(recommendations).length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Weather-Based Recommendations
            </Typography>

            {recommendations.suitable_activities && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">✅ Suitable Activities:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {recommendations.suitable_activities.map((activity, idx) => (
                    <Chip key={idx} label={activity} />
                  ))}
                </Box>
              </Box>
            )}

            {recommendations.avoid_activities && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">❌ Avoid:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {recommendations.avoid_activities.map((activity, idx) => (
                    <Chip key={idx} label={activity} variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {recommendations.packing_tips && (
              <Box>
                <Typography variant="subtitle2">🎒 Packing Tips:</Typography>
                <ul style={{ marginTop: 8 }}>
                  {recommendations.packing_tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions Dialog */}
      <Dialog
        open={openSuggestionsDialog}
        onClose={() => setOpenSuggestionsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Suggested Activities for Day {dayForSuggestion}</DialogTitle>
        <DialogContent>
          {suggestions.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {suggestions.map((suggestion, idx) => (
                <Paper key={idx} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {suggestion.name}
                  </Typography>
                  {suggestion.description && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      {suggestion.description}
                    </Typography>
                  )}
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={suggestion.category} size="small" />
                    {suggestion.timeSlot && (
                      <Chip label={suggestion.timeSlot} size="small" variant="outlined" />
                    )}
                    {suggestion.estimatedCost > 0 && (
                      <Chip label={formatMoney(suggestion.estimatedCost)} size="small" />
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Alert severity="info">No suggestions available</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSuggestionsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIPlanner;
