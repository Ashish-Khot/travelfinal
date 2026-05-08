import React, { useState, useRef } from 'react';
import {
  Box, Button, TextField, Typography, Rating, Chip, Stack, Paper, Alert, Snackbar, Grid, IconButton, Tooltip, Stepper, Step, StepLabel, Card, Divider, InputAdornment
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/SaveAltOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../../api';

const steps = ['Story', 'Media', 'Trip Details', 'Review & Submit'];
const difficulties = ['easy', 'moderate', 'challenging'];
const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];

export default function CreateTravelogue() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    location: '',
    rating: 0,
    tags: [],
    startDate: '',
    endDate: '',
    duration: '',
    travelersCount: 1,
    estimatedCost: '',
    difficulty: 'moderate',
    season: '',
    highlights: []
  });

  const [media, setMedia] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      background:
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.background.paper, 0.6)
          : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      borderColor: alpha(theme.palette.text.primary, 0.08),
      '&:hover fieldset': { borderColor: theme.palette.primary.main, borderWidth: '2px' },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: '2px' }
    }
  };

  const sectionCardSx = {
    borderRadius: '18px',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
    bgcolor: theme.palette.background.paper,
    boxShadow:
      theme.palette.mode === 'dark'
        ? '0 18px 40px rgba(0,0,0,0.35)'
        : '0 18px 40px rgba(15,23,42,0.06)',
    p: { xs: 2.5, md: 3 }
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setMedia([...media, ...files]);
  };

  const handleRemoveMedia = (idx) => {
    setMedia(media.filter((_, i) => i !== idx));
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput]
      });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToDelete)
    });
  };

  const handleAddHighlight = () => {
    if (highlightInput && !formData.highlights.includes(highlightInput)) {
      setFormData({
        ...formData,
        highlights: [...formData.highlights, highlightInput]
      });
      setHighlightInput('');
    }
  };

  const handleDeleteHighlight = (highlight) => {
    setFormData({
      ...formData,
      highlights: formData.highlights.filter(h => h !== highlight)
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (asDraft = false) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formData[key].forEach(item => submitData.append(key, item));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      // Add media files
      media.forEach(file => {
        submitData.append('media', file);
      });

      const endpoint = asDraft ? '/travelogue/draft' : '/travelogue/create';
      const response = await api.post(endpoint, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      setTimeout(() => {
        // Reset form
        setFormData({
          title: '', description: '', destination: '', location: '', rating: 0, tags: [],
          startDate: '', endDate: '', duration: '', travelersCount: 1, estimatedCost: '',
          difficulty: 'moderate', season: '', highlights: []
        });
        setMedia([]);
        setActiveStep(0);
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit travelogue.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) return formData.title && formData.description && formData.destination;
    if (activeStep === 1) return media.length > 0;
    if (activeStep === 2) return formData.startDate && formData.endDate;
    return true;
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        pb: 4,
        backgroundImage:
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at top, rgba(79,138,139,0.16), transparent 55%)'
            : 'radial-gradient(circle at top, rgba(79,138,139,0.14), transparent 55%)'
      }}
    >
      <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 18px 50px rgba(0,0,0,0.45)'
                : '0 16px 50px rgba(15,23,42,0.08)',
            bgcolor: theme.palette.background.paper,
            mt: 1.5,
            mb: 3
          }}
        >
          {/* Premium Cover */}
          <Box
            sx={{
              height: { xs: 180, sm: 200, md: 220 },
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(120deg, #0B1120 0%, #1F2937 45%, #0F766E 100%)'
                  : 'linear-gradient(120deg, #0F172A 0%, #4F8A8B 45%, #6BA8AC 100%)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '40%',
                height: '100%',
                background:
                  theme.palette.mode === 'dark'
                    ? 'radial-gradient(circle at 100% 50%, rgba(249,237,105,0.12), transparent)'
                    : 'radial-gradient(circle at 100% 50%, rgba(249,237,105,0.2), transparent)',
                pointerEvents: 'none'
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -40,
                left: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background:
                  theme.palette.mode === 'dark'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)'
              }
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2.5}
              alignItems={{ xs: 'center', md: 'flex-start' }}
              sx={{ zIndex: 1, textAlign: { xs: 'center', md: 'left' } }}
            >
              <Box>
                <TrendingUpIcon sx={{ fontSize: { xs: 32, md: 44 }, color: '#fff', mb: 1 }} />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '0.5px',
                    fontSize: { xs: '1.6rem', md: '2.2rem' }
                  }}
                >
                  Create a Travelogue
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: { xs: '0.85rem', md: '1rem' } }}>
                  Craft a cinematic travel story with photos, videos, and real tips.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: { md: 1.5 } }}>
                <Chip label="4 min setup" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700 }} />
                <Chip label="Verified stories" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 700 }} />
              </Stack>
            </Stack>
          </Box>

          {/* Stepper Section */}
          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: '16px',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
                mb: 4
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" fontWeight={700} color="#4F8A8B">
                  Step {activeStep + 1} of {steps.length}
                </Typography>
                <Typography variant="caption" color="#64748B">
                  Complete each step to publish
                </Typography>
              </Stack>
              <Stepper activeStep={activeStep}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: { xs: '0.75rem', md: '0.9rem' },
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                        '&.Mui-active': { color: theme.palette.primary.main, fontWeight: 700 },
                        '&.Mui-completed': { color: '#10b981' }
                      }
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                {/* Step 1: Story */}
                {activeStep === 0 && (
                  <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} sx={{ color: '#1a1a1a' }}>
                      Tell Us Your Story
                    </Typography>
                    <Stack spacing={2.5}>
                      <TextField
                        label="Journey Title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g., My 10 Days in Bali"
                        size="medium"
                        sx={inputSx}
                      />
                      <TextField
                        label="Destination"
                        name="destination"
                        value={formData.destination}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="e.g., Bali, Indonesia"
                        size="medium"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOnIcon sx={{ color: '#4F8A8B' }} />
                            </InputAdornment>
                          )
                        }}
                        sx={inputSx}
                      />
                      <TextField
                        label="Your Experience"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        fullWidth
                        multiline
                        rows={6}
                        placeholder="Describe your journey, what you did, what you learned, and your favorite moments..."
                        sx={inputSx}
                      />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700} mb={2} color="#1a1a1a">
                          Rate Your Experience
                        </Typography>
                        <Rating
                          value={formData.rating}
                          onChange={(e, newValue) => setFormData({ ...formData, rating: newValue })}
                          size="large"
                          sx={{ '& .MuiRating-icon': { fontSize: '2.5rem' } }}
                        />
                      </Box>
                    </Stack>
                  </Box>
                )}

                {/* Step 2: Media */}
                {activeStep === 1 && (
                  <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} sx={{ color: '#1a1a1a' }}>
                      Add Photos & Videos
                    </Typography>
                    <Box
                      sx={{
                        borderRadius: '16px',
                        border: '1.5px dashed rgba(79,138,139,0.5)',
                        p: 3,
                        mb: 3,
                        textAlign: 'center',
                        bgcolor: 'rgba(79,138,139,0.05)'
                      }}
                    >
                      <Typography fontWeight={700} color="#0F172A" mb={1}>
                        Drop files here or upload
                      </Typography>
                      <Typography variant="body2" color="#64748B" mb={2}>
                        Photos, reels, and short clips bring your story alive.
                      </Typography>
                      <Button
                        variant="contained"
                        component="label"
                        startIcon={<PhotoCamera />}
                        sx={{
                          borderRadius: '12px',
                          py: 1.4,
                          px: 3,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                          boxShadow: '0 8px 24px rgba(79,138,139,0.25)',
                          fontSize: '0.95rem',
                          '&:hover': {
                            boxShadow: '0 12px 36px rgba(79,138,139,0.35)',
                            transform: 'translateY(-2px)'
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        Select Photos & Videos
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          hidden
                          ref={fileInputRef}
                          onChange={handleMediaChange}
                        />
                      </Button>
                    </Box>

                    {media.length > 0 && (
                      <Box>
                        <Typography variant="body2" fontWeight={600} mb={2} color="#6B7280">
                          {media.length} file(s) selected
                        </Typography>
                        <Grid container spacing={2}>
                          {media.map((file, idx) => {
                            const isImage = file.type.startsWith('image/');
                            const url = URL.createObjectURL(file);
                            return (
                              <Grid item xs={6} sm={4} md={3} key={idx}>
                                <Card
                                  elevation={0}
                                  sx={{
                                    position: 'relative',
                                    borderRadius: '12px',
                                    border: '2px solid rgba(79,138,139,0.1)',
                                    overflow: 'hidden',
                                    '&:hover': {
                                      boxShadow: '0 8px 24px rgba(79,138,139,0.15)'
                                    }
                                  }}
                                >
                                  {isImage && (
                                    <Box
                                      component="img"
                                      src={url}
                                      alt={file.name}
                                      sx={{
                                        width: '100%',
                                        height: 120,
                                        objectFit: 'cover',
                                        borderRadius: '10px'
                                      }}
                                    />
                                  )}
                                  {!isImage && (
                                    <video src={url} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                                  )}
                                  <Tooltip title="Remove">
                                    <IconButton
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        bgcolor: 'rgba(255,255,255,0.95)',
                                        zIndex: 2,
                                        '&:hover': { bgcolor: '#fff' }
                                      }}
                                      onClick={() => handleRemoveMedia(idx)}
                                    >
                                      <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    mt={1}
                                    px={1}
                                    noWrap
                                    fontWeight={600}
                                    color="#6B7280"
                                  >
                                    {file.name}
                                  </Typography>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Step 3: Trip Details */}
                {activeStep === 2 && (
                  <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} sx={{ color: '#1a1a1a' }}>
                      Trip Information
                    </Typography>
                    <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Start Date"
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="End Date"
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Duration (days)"
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        fullWidth
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Number of Travelers"
                        type="number"
                        name="travelersCount"
                        value={formData.travelersCount}
                        onChange={handleInputChange}
                        fullWidth
                        sx={inputSx}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Difficulty Level"
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleInputChange}
                        fullWidth
                        SelectProps={{
                          native: true
                        }}
                        sx={inputSx}
                      >
                        {difficulties.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        label="Best Season"
                        name="season"
                        value={formData.season}
                        onChange={handleInputChange}
                        fullWidth
                        SelectProps={{
                          native: true
                        }}
                        sx={inputSx}
                      >
                        <option value="">Select Season</option>
                        {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                      </TextField>
                    </Grid>
                  </Grid>

                  <TextField
                    label="Estimated Cost (in your currency)"
                    type="number"
                    name="estimatedCost"
                    value={formData.estimatedCost}
                    onChange={handleInputChange}
                    fullWidth
                    sx={inputSx}
                  />

                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} mb={2} color="#1a1a1a">
                      Key Highlights
                    </Typography>
                    <Stack direction="row" spacing={1} mb={2}>
                      <TextField
                        size="small"
                        value={highlightInput}
                        onChange={(e) => setHighlightInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHighlight(); } }}
                        placeholder="e.g., Beautiful waterfalls, local cuisine"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px'
                          }
                        }}
                      />
                      <Button onClick={handleAddHighlight} variant="outlined" sx={{ borderRadius: '10px' }}>
                        Add
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {formData.highlights.map((h) => (
                        <Chip
                          key={h}
                          label={h}
                          onDelete={() => handleDeleteHighlight(h)}
                          sx={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            bgcolor: 'rgba(79,138,139,0.1)',
                            color: '#4F8A8B',
                            '& .MuiChip-deleteIcon': { color: '#4F8A8B' }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} mb={2} color="#1a1a1a">
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1} mb={2}>
                      <TextField
                        size="small"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        placeholder="Add tag (e.g., adventure, beach, budget)"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px'
                          }
                        }}
                      />
                      <Button onClick={handleAddTag} variant="outlined" sx={{ borderRadius: '10px' }}>
                        Add
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {formData.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => handleDeleteTag(tag)}
                          sx={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            bgcolor: 'rgba(249,237,105,0.15)',
                            color: '#B8860B',
                            '& .MuiChip-deleteIcon': { color: '#B8860B' }
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                    </Stack>
                  </Box>
                )}

                {/* Step 4: Review */}
                {activeStep === 3 && (
                  <Box sx={sectionCardSx}>
                    <Typography variant="h6" fontWeight={800} mb={3} sx={{ color: '#1a1a1a' }}>
                      Review Your Travelogue
                    </Typography>
                    <Card elevation={0} sx={{ p: 3, borderRadius: '12px', bgcolor: 'rgba(79,138,139,0.03)', border: '2px solid rgba(79,138,139,0.1)' }}>
                      <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Title
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="#1a1a1a">{formData.title || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Destination
                      </Typography>
                      <Typography variant="body1" color="#1a1a1a">{formData.destination || '—'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Rating
                      </Typography>
                      <Rating value={formData.rating} readOnly size="small" />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Description
                      </Typography>
                      <Typography variant="body2" color="#1a1a1a" sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {formData.description || '—'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Duration
                      </Typography>
                      <Typography variant="body1" color="#1a1a1a">{formData.duration || '—'} days</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Travelers
                      </Typography>
                      <Typography variant="body1" color="#1a1a1a">{formData.travelersCount || '—'} people</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Difficulty
                      </Typography>
                      <Typography variant="body1" color="#1a1a1a">{formData.difficulty}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography fontWeight={700} color="#6B7280" fontSize="0.85rem" textTransform="uppercase">
                        Media Files
                      </Typography>
                      <Typography variant="body1" color="#1a1a1a">{media.length} file(s)</Typography>
                    </Grid>
                      </Grid>
                    </Card>
                  </Box>
                )}

                {/* Navigation Buttons */}
                <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'space-between' }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      py: 1.2,
                      px: 3,
                      fontWeight: 700,
                      borderColor: '#E5E7EB',
                      color: '#6B7280',
                      '&:hover': {
                        borderColor: '#4F8A8B',
                        color: '#4F8A8B',
                        bgcolor: 'rgba(79,138,139,0.05)'
                      }
                    }}
                  >
                    Back
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {activeStep === 3 && (
                      <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        disabled={loading}
                        onClick={() => handleSubmit(true)}
                        sx={{
                          borderRadius: '12px',
                          py: 1.2,
                          px: 3,
                          fontWeight: 700,
                          borderColor: '#F9ED69',
                          color: '#B8860B',
                          '&:hover': {
                            borderColor: '#F9ED69',
                            bgcolor: 'rgba(249,237,105,0.1)'
                          }
                        }}
                      >
                        Save Draft
                      </Button>
                    )}

                    {activeStep < 3 ? (
                      <Button
                        disabled={!isStepValid()}
                        onClick={handleNext}
                        variant="contained"
                        sx={{
                          borderRadius: '12px',
                          py: 1.2,
                          px: 3,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                          boxShadow: '0 8px 24px rgba(79,138,139,0.25)',
                          '&:hover': {
                            boxShadow: '0 12px 36px rgba(79,138,139,0.35)',
                            transform: 'translateY(-2px)'
                          },
                          '&:disabled': { opacity: 0.5 },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        disabled={loading}
                        onClick={() => handleSubmit(false)}
                        sx={{
                          borderRadius: '12px',
                          py: 1.2,
                          px: 3,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
                          '&:hover': {
                            boxShadow: '0 12px 36px rgba(16, 185, 129, 0.35)',
                            transform: 'translateY(-2px)'
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {loading ? 'Publishing...' : 'Publish Travelogue'}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: '16px',
                    border: '1px solid rgba(79,138,139,0.15)',
                    bgcolor: 'rgba(79,138,139,0.04)',
                    p: 2.5,
                    position: { md: 'sticky' },
                    top: { md: 100 }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={2}>
                    Story Checklist
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4F8A8B' }} />
                      <Typography variant="body2" color="#475569">
                        A strong title and clear destination
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F9ED69' }} />
                      <Typography variant="body2" color="#475569">
                        6 to 10 standout photos or a short reel
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981' }} />
                      <Typography variant="body2" color="#475569">
                        Highlight key moments and tips for others
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight={700} color="#0F172A" mb={1}>
                    Visibility
                  </Typography>
                  <Typography variant="body2" color="#64748B">
                    Travelogues are reviewed before they appear in the public feed to keep the community authentic.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>

      {/* Notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ width: '100%' }}>
          Travelogue submitted successfully! 🎉
        </Alert>
      </Snackbar>
    </Box>
  );
}
