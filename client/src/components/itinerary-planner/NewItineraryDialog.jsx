/**
 * New Itinerary Dialog
 * Form to create new itinerary with AI generation
 */

import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box,
  Alert,
  Typography,
} from '@mui/material';
import itineraryService from '../../services/itineraryService.js';

const NewItineraryDialog = ({ open, onClose, onItineraryCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const MAX_IMAGE_MB = 4;
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [imageName, setImageName] = useState(null);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInterestToggle = (interestValue) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestValue)
        ? prev.interests.filter(i => i !== interestValue)
        : [...prev.interests, interestValue],
    }));
  };

  const handleImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported');
      return;
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large. Max ${MAX_IMAGE_MB}MB allowed.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setError('Failed to read image');
        return;
      }
      const match = result.match(/^data:(.+?);base64,(.+)$/);
      setImagePreview(result);
      setImageMimeType(match?.[1] || file.type);
      setImageData(match?.[2] || result);
      setImageName(file.name);
      setError(null);
    };
    reader.onerror = () => setError('Failed to read image');
    reader.readAsDataURL(file);
  };

  const handleImagePaste = (event) => {
    const items = event.clipboardData?.items || [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          handleImageFile(file);
        }
        break;
      }
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    event.target.value = '';
  };

  const handleImageRemove = () => {
    setImagePreview(null);
    setImageData(null);
    setImageMimeType(null);
    setImageName(null);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateItinerary = async () => {
    // Validation
    if (!formData.destination.trim()) {
      setError('Please enter a destination');
      return;
    }
    if (formData.days < 1) {
      setError('Days must be at least 1');
      return;
    }
    if (formData.budget < 100) {
      setError('Budget should be at least ₹100');
      return;
    }
    if (formData.interests.length === 0) {
      setError('Please select at least one interest');
      return;
    }
    
    // Check that interests are valid (should be lowercase from our array)
    const validInterests = formData.interests.every(i => 
      interestOptions.some(opt => opt.value === i)
    );
    if (!validInterests) {
      setError('Invalid interest selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call API to generate itinerary
      const generatedItinerary = await itineraryService.generateItinerary({
        destination: formData.destination,
        days: parseInt(formData.days),
        budget: parseFloat(formData.budget),
        currency: 'INR',
        numberOfTravelers: parseInt(formData.numberOfTravelers),
        travelStyle: formData.travelStyle,
        interests: formData.interests,
        startDate: formData.startDate,
        aiNotes: formData.aiNotes,
        imageData,
        imageMimeType,
        imageName,
      });

      console.log('✅ Itinerary generated:', generatedItinerary);

      // Notify parent component
      if (onItineraryCreated) {
        onItineraryCreated(generatedItinerary);
      }

      // Close dialog and reset form
      setFormData({
        destination: '',
        days: 5,
        budget: 2000,
        numberOfTravelers: 1,
        travelStyle: 'solo',
        interests: [],
        startDate: new Date().toISOString().split('T')[0],
        aiNotes: '',
      });
      handleImageRemove();
      onClose();
    } catch (err) {
      console.error('❌ Error generating itinerary:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      handleImageRemove();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        ✈️ Create New Itinerary
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Destination */}
          <TextField
            fullWidth
            label="Destination"
            placeholder="e.g., Paris, Tokyo, New York"
            name="destination"
            value={formData.destination}
            onChange={handleInputChange}
            disabled={loading}
            helperText="Enter city or destination name"
          />

          {/* Days and Budget Row */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Number of Days"
                type="number"
                name="days"
                value={formData.days}
                onChange={handleInputChange}
                disabled={loading}
                inputProps={{ min: 1, max: 30 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Total Budget (₹)"
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                disabled={loading}
                inputProps={{ min: 100, step: 100 }}
              />
            </Grid>
          </Grid>

          {/* Number of Travelers and Travel Style Row */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Number of Travelers"
                type="number"
                name="numberOfTravelers"
                value={formData.numberOfTravelers}
                onChange={handleInputChange}
                disabled={loading}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth disabled={loading}>
                <InputLabel>Travel Style</InputLabel>
                <Select
                  name="travelStyle"
                  value={formData.travelStyle}
                  onChange={handleInputChange}
                  label="Travel Style"
                >
                  <MenuItem value="solo">Solo Traveler</MenuItem>
                  <MenuItem value="couple">Couple</MenuItem>
                  <MenuItem value="family">Family</MenuItem>
                  <MenuItem value="group">Group/Friends</MenuItem>
                  <MenuItem value="adventure">Adventure Seeker</MenuItem>
                  <MenuItem value="relaxation">Relaxation Focus</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Start Date */}
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleInputChange}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
          />

          {/* Reference Image */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Reference Image (optional)
            </Typography>
            <Box
              onPaste={handleImagePaste}
              onClick={handleImageUploadClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleImageUploadClick();
                }
              }}
              role="button"
              tabIndex={0}
              sx={{
                border: '1px dashed #cbd5e1',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f8fafc',
              }}
            >
              {imagePreview ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <img
                    src={imagePreview}
                    alt={imageName || 'Pasted preview'}
                    style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8 }}
                  />
                  <Typography variant="caption">
                    {imageName || 'Pasted image'}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Paste an image here (Ctrl+V) or click to upload
                </Typography>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageSelect}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Max {MAX_IMAGE_MB}MB. Image helps the AI detect landmarks and vibe.
            </Typography>
            {imagePreview && (
              <Button size="small" onClick={handleImageRemove} sx={{ mt: 1 }}>
                Remove Image
              </Button>
            )}
          </Box>

          {/* AI Notes */}
          <TextField
            fullWidth
            label="AI Preferences (optional)"
            name="aiNotes"
            value={formData.aiNotes}
            onChange={handleInputChange}
            disabled={loading}
            multiline
            minRows={3}
            placeholder="Example: focus on local food, avoid long hikes, prefer sunrise spots"
          />

          {/* Interests */}
          <Box>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              What are your interests? (Select at least one)
            </label>
            <FormGroup>
              <Grid container spacing={1}>
                {interestOptions.map(option => (
                  <Grid item xs={6} key={option.value}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.interests.includes(option.value)}
                          onChange={() => handleInterestToggle(option.value)}
                          disabled={loading}
                        />
                      }
                      label={option.label}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerateItinerary}
          variant="contained"
          disabled={loading}
          sx={{ minWidth: 150 }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Generating...
            </>
          ) : (
            '🤖 Generate with AI'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewItineraryDialog;
