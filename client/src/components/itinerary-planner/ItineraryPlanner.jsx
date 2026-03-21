/**
 * Premium Itinerary Planner
 * Chat-first itinerary builder with live output modules
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Stack,
  Paper,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ItineraryNarrative from './ItineraryNarrative.jsx';
import TimelineView from './TimelineView.jsx';
import MapPlanner from './MapPlanner.jsx';
import ActivityList from './ActivityList.jsx';
import BudgetDashboard from './BudgetDashboard.jsx';
import AIPlanner from './AIPlanner.jsx';
import NewItineraryDialog from './NewItineraryDialog.jsx';
import itineraryService from '../../services/itineraryService.js';
import useItinerary from '../../hooks/useItinerary.js';
import './itineraryPlanner.css';

const interestOptions = [
  { value: 'nature', label: 'Nature' },
  { value: 'culture', label: 'Culture' },
  { value: 'food', label: 'Food' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'history', label: 'History' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'photography', label: 'Photography' },
];

const quickPrompts = [
  'Weekend foodie escape',
  'Luxury slow travel',
  'Family friendly highlights',
  'Hidden gems and local markets',
];

const moduleTabs = [
  { id: 'overview', label: 'Overview', icon: <AutoAwesomeRoundedIcon fontSize="small" /> },
  { id: 'timeline', label: 'Timeline', icon: <TimelineRoundedIcon fontSize="small" /> },
  { id: 'map', label: 'Map', icon: <MapRoundedIcon fontSize="small" /> },
  { id: 'activities', label: 'Activities', icon: <ViewListRoundedIcon fontSize="small" /> },
  { id: 'budget', label: 'Budget', icon: <AccountBalanceWalletRoundedIcon fontSize="small" /> },
  { id: 'ai', label: 'AI Studio', icon: <InsightsRoundedIcon fontSize="small" /> },
];

const progressSteps = [
  'Analyzing preferences',
  'Curating highlights',
  'Optimizing routes',
  'Balancing time blocks',
  'Final polish',
];

const formatMoney = (value, currency = 'INR') => {
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

function ItineraryPlanner() {
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [activeModule, setActiveModule] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Tell me your destination, dates, and vibe. I will craft a day-by-day itinerary.',
    },
  ]);

  const [formData, setFormData] = useState({
    destination: '',
    days: 5,
    budget: 2000,
    numberOfTravelers: 1,
    travelStyle: 'solo',
    interests: [],
    startDate: new Date().toISOString().split('T')[0],
    aiNotes: '',
  });

  const { itinerary, loading, setItinerary, addActivity, updateActivity, removeActivity } =
    useItinerary();

  if (loading && !itinerary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress />
      </Box>
    );
  }

  useEffect(() => {
    if (!isGenerating) {
      setProgressIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, progressSteps.length));
    }, 950);
    return () => clearInterval(timer);
  }, [isGenerating]);

  const addMessage = (role, content) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, content },
    ]);
  };

  const summaryText = useMemo(() => {
    if (!itinerary) return '';
    const destinationName = itinerary?.destination?.name || itinerary?.destination || itinerary?.title || 'Your trip';
    const days = itinerary?.numberOfDays || itinerary?.days || '';
    const travelers = itinerary?.numberOfTravelers || '';
    const budget = itinerary?.budget?.totalBudget || '';
    const currency = itinerary?.budget?.currency || 'INR';
    return `${destinationName}${days ? `, ${days} days` : ''}${travelers ? `, ${travelers} travelers` : ''}${
      budget ? `, budget ${formatMoney(budget, currency)}` : ''
    }`;
  }, [itinerary]);

  const summaryChips = useMemo(() => {
    if (!itinerary) return [];
    const chips = [];
    if (itinerary?.numberOfDays) chips.push(`${itinerary.numberOfDays} days`);
    if (itinerary?.numberOfTravelers) chips.push(`${itinerary.numberOfTravelers} travelers`);
    if (itinerary?.season) chips.push(`Season: ${itinerary.season}`);
    if (itinerary?.budget?.totalBudget) {
      const currency = itinerary?.budget?.currency || 'INR';
      chips.push(`Budget: ${formatMoney(itinerary.budget.totalBudget, currency)}`);
    }
    return chips;
  }, [itinerary]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (value) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter((item) => item !== value)
        : [...prev.interests, value],
    }));
  };

  const handleGenerate = async () => {
    const missing = [];
    if (!formData.destination.trim()) missing.push('destination');
    if (!formData.days || formData.days < 1) missing.push('trip length');
    if (!formData.budget || formData.budget < 100) missing.push('budget');
    if (!formData.interests.length) missing.push('interests');

    if (missing.length) {
      addMessage('assistant', `I need ${missing.join(', ')} to build the itinerary.`);
      return;
    }

    const userSummary = `${formData.days}-day ${formData.travelStyle} trip to ${formData.destination} for ${formData.numberOfTravelers} traveler(s). Budget ₹${formData.budget}. Start ${formData.startDate}. Interests: ${formData.interests.join(', ')}. ${formData.aiNotes ? `Notes: ${formData.aiNotes}` : ''}`;
    addMessage('user', userSummary);
    addMessage('assistant', 'Generating your itinerary now. I will post updates as soon as it is ready.');

    setIsGenerating(true);
    setProgressIndex(0);

    try {
      const generatedItinerary = await itineraryService.generateItinerary({
        destination: formData.destination,
        days: parseInt(formData.days, 10),
        budget: parseFloat(formData.budget),
        currency: 'INR',
        numberOfTravelers: parseInt(formData.numberOfTravelers, 10),
        travelStyle: formData.travelStyle,
        interests: formData.interests,
        startDate: formData.startDate,
        aiNotes: formData.aiNotes,
      });

      setItinerary(generatedItinerary);
      setActiveModule('overview');
      addMessage(
        'assistant',
        `Your itinerary is ready. Review the overview and switch modules for timeline, map, and budget.`
      );
    } catch (err) {
      addMessage('assistant', err?.message || 'Unable to generate the itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgressIndex(progressSteps.length);
    }
  };

  const handleAdvancedCreated = (newItinerary) => {
    setItinerary(newItinerary);
    setActiveModule('overview');
    addMessage('assistant', 'Your itinerary was updated with the advanced details.');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} className="itinerary-root">
      <Box className="itinerary-shell">
        <Box className="itinerary-chat">
          <Box className="itinerary-chat-header">
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
              Itinerary Concierge
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Describe the trip you want. I will build the plan in real time.
            </Typography>
          </Box>

          <Box className="itinerary-chat-form">
            <Stack spacing={2}>
              <TextField
                label="Destination"
                placeholder="Paris, Tokyo, Bali"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Days"
                  type="number"
                  value={formData.days}
                  onChange={(e) => handleInputChange('days', e.target.value)}
                  inputProps={{ min: 1, max: 30 }}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Travelers"
                  type="number"
                  value={formData.numberOfTravelers}
                  onChange={(e) => handleInputChange('numberOfTravelers', e.target.value)}
                  inputProps={{ min: 1, max: 20 }}
                  fullWidth
                />
                <TextField
                  label="Budget (₹)"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                  inputProps={{ min: 100, step: 100 }}
                  fullWidth
                />
              </Stack>
              <FormControl fullWidth>
                <InputLabel>Travel style</InputLabel>
                <Select
                  label="Travel style"
                  value={formData.travelStyle}
                  onChange={(e) => handleInputChange('travelStyle', e.target.value)}
                >
                  <MenuItem value="solo">Solo traveler</MenuItem>
                  <MenuItem value="couple">Couple</MenuItem>
                  <MenuItem value="family">Family</MenuItem>
                  <MenuItem value="group">Group</MenuItem>
                  <MenuItem value="adventure">Adventure</MenuItem>
                  <MenuItem value="relaxation">Relaxation</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#475569' }}>
                  Interests
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {interestOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      onClick={() => toggleInterest(option.value)}
                      color={formData.interests.includes(option.value) ? 'primary' : 'default'}
                      variant={formData.interests.includes(option.value) ? 'filled' : 'outlined'}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box className="itinerary-chat-body">
            {messages.map((message) => (
              <Box
                key={message.id}
                className={`itinerary-bubble ${message.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}
              >
                <Typography variant="body2">{message.content}</Typography>
              </Box>
            ))}
          </Box>

          <Box className="itinerary-chat-compose">
            <TextField
              placeholder="Add preferences like pace, food, or accessibility"
              value={formData.aiNotes}
              onChange={(e) => handleInputChange('aiNotes', e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {quickPrompts.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  size="small"
                  onClick={() =>
                    handleInputChange(
                      'aiNotes',
                      formData.aiNotes ? `${formData.aiNotes} ${prompt}` : prompt
                    )
                  }
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => setOpenAdvanced(true)}
              >
                Advanced details
              </Button>
              <Button
                variant="contained"
                endIcon={<SendRoundedIcon />}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate itinerary'}
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box className="itinerary-output">
          <Box className="itinerary-output-header">
            <Box>
              <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                Live output
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {summaryText || 'Your itinerary will appear here'}
              </Typography>
            </Box>
            <Chip
              label={isGenerating ? 'Generating' : itinerary ? 'Ready' : 'Waiting'}
              color={isGenerating ? 'warning' : itinerary ? 'success' : 'default'}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {summaryChips.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {summaryChips.map((chip) => (
                <Chip key={chip} label={chip} variant="outlined" />
              ))}
            </Stack>
          )}

          {isGenerating && (
            <Paper className="itinerary-live-card">
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Building your plan
              </Typography>
              <Stack spacing={1}>
                {progressSteps.map((step, index) => (
                  <Box key={step} className={`itinerary-live-step ${index < progressIndex ? 'is-active' : ''}`}>
                    <Typography variant="body2">{step}</Typography>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Generating real-time results
                </Typography>
              </Box>
            </Paper>
          )}

          {!itinerary && !isGenerating && (
            <Paper className="itinerary-empty-card">
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Start with a request
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Fill the form on the left and press Generate itinerary. Your modules will unlock here.
              </Typography>
            </Paper>
          )}

          {itinerary && (
            <>
              <Tabs
                value={activeModule}
                onChange={(event, value) => setActiveModule(value)}
                variant="scrollable"
                scrollButtons="auto"
                className="itinerary-module-tabs"
              >
                {moduleTabs.map((tab) => (
                  <Tab key={tab.id} value={tab.id} icon={tab.icon} iconPosition="start" label={tab.label} />
                ))}
              </Tabs>
              <Box className="itinerary-module-panel">
                {activeModule === 'overview' && <ItineraryNarrative itinerary={itinerary} />}
                {activeModule === 'timeline' && (
                  <TimelineView itinerary={itinerary} onActivityUpdate={updateActivity} />
                )}
                {activeModule === 'map' && (
                  <MapPlanner itinerary={itinerary} onActivityAdd={addActivity} onActivityRemove={removeActivity} />
                )}
                {activeModule === 'activities' && (
                  <ActivityList
                    itinerary={itinerary}
                    onActivityAdd={addActivity}
                    onActivityUpdate={updateActivity}
                    onActivityRemove={removeActivity}
                  />
                )}
                {activeModule === 'budget' && <BudgetDashboard itinerary={itinerary} />}
                {activeModule === 'ai' && <AIPlanner itinerary={itinerary} />}
              </Box>
            </>
          )}
        </Box>
      </Box>

      <NewItineraryDialog
        open={openAdvanced}
        onClose={() => setOpenAdvanced(false)}
        onItineraryCreated={handleAdvancedCreated}
      />
    </Container>
  );
}

export default ItineraryPlanner;
