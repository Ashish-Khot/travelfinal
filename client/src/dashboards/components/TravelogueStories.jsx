import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import API from '../../api';
import TravelogueCard from './TravelogueCard';
import TravelogueDetailView from './TravelogueDetailView';
import { buildImageUrl, isVideoFile } from '../../utils/imageHelper';

const STORY_DURATION_MS = 6000;

export default function TravelogueStories() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id || user.userId;

  const [travelogues, setTravelogues] = useState([]);
  const [myLatest, setMyLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [composerOpen, setComposerOpen] = useState(false);
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    destination: ''
  });
  const [storyMedia, setStoryMedia] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [selectedTravelogue, setSelectedTravelogue] = useState(null);
  const [selectedTravelogueId, setSelectedTravelogueId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fileInputRef = useRef();

  useEffect(() => {
    fetchStories();
    fetchMyLatest();
  }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/travelogue/all?sortBy=newest&page=1&limit=24');
      setTravelogues(response.data.travelogues || []);
    } catch (err) {
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLatest = async () => {
    try {
      if (!userId) return;
      const response = await API.get(`/travelogue/user/${userId}?page=1&limit=1`);
      setMyLatest(response.data.travelogues?.[0] || null);
    } catch (err) {
      // Silent fail to avoid blocking the UI
    }
  };

  const storyItems = useMemo(() => {
    const items = [];
    if (myLatest && myLatest.images?.length) {
      items.push({
        ...myLatest,
        isMine: true,
        pending: myLatest.status !== 'approved'
      });
    }

    const others = travelogues
      .filter((t) => t.images?.length)
      .filter((t) => t._id !== myLatest?._id);

    return [...items, ...others];
  }, [myLatest, travelogues]);

  const activeStory = storyItems[activeStoryIndex] || null;
  const activeMediaPath = activeStory?.images?.[activeMediaIndex] || '';
  const activeMediaUrl = buildImageUrl(activeMediaPath);
  const activeMediaIsVideo = isVideoFile(activeMediaPath);

  useEffect(() => {
    if (storyItems.length === 0) {
      setStoryViewerOpen(false);
      setActiveStoryIndex(0);
      setActiveMediaIndex(0);
      return;
    }

    if (activeStoryIndex >= storyItems.length) {
      setActiveStoryIndex(0);
      setActiveMediaIndex(0);
    }
  }, [storyItems.length, activeStoryIndex]);

  useEffect(() => {
    if (!storyViewerOpen || !activeStory) return undefined;

    const timer = setTimeout(() => {
      handleNextMedia();
    }, STORY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [storyViewerOpen, activeStoryIndex, activeMediaIndex]);

  const openStory = (index) => {
    setActiveStoryIndex(index);
    setActiveMediaIndex(0);
    setStoryViewerOpen(true);
  };

  const handleNextMedia = () => {
    if (!activeStory) return;
    const mediaCount = activeStory.images?.length || 0;

    if (activeMediaIndex < mediaCount - 1) {
      setActiveMediaIndex((prev) => prev + 1);
      return;
    }

    if (activeStoryIndex < storyItems.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setActiveMediaIndex(0);
      return;
    }

    setStoryViewerOpen(false);
  };

  const handlePrevMedia = () => {
    if (!activeStory) return;
    const mediaCount = activeStory.images?.length || 0;

    if (activeMediaIndex > 0) {
      setActiveMediaIndex((prev) => prev - 1);
      return;
    }

    if (activeStoryIndex > 0) {
      const prevStoryIndex = activeStoryIndex - 1;
      const prevStory = storyItems[prevStoryIndex];
      setActiveStoryIndex(prevStoryIndex);
      setActiveMediaIndex(Math.max((prevStory?.images?.length || 1) - 1, 0));
      return;
    }
  };

  const handleMediaChange = (event) => {
    const files = Array.from(event.target.files || []);
    setStoryMedia((prev) => [...prev, ...files]);
  };

  const handleRemoveMedia = (index) => {
    setStoryMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitStory = async () => {
    if (!storyForm.description.trim()) {
      setSubmitError('Please add a caption for your story.');
      return;
    }
    if (storyMedia.length === 0) {
      setSubmitError('Please add at least one photo or video.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      const submitData = new FormData();
      const storyTitle = storyForm.title || `Story from ${storyForm.destination || 'my trip'}`;

      submitData.append('title', storyTitle);
      submitData.append('description', storyForm.description);
      if (storyForm.destination) {
        submitData.append('destination', storyForm.destination);
        submitData.append('location', storyForm.destination);
      }
      submitData.append('tags', 'story');
      submitData.append('difficulty', 'easy');

      storyMedia.forEach((file) => {
        submitData.append('media', file);
      });

      await API.post('/travelogue/create', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setComposerOpen(false);
      setStoryForm({ title: '', description: '', destination: '' });
      setStoryMedia([]);
      setSubmitSuccess('Story submitted for review. It will appear once approved.');
      fetchMyLatest();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to submit story.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = (travelogueId) => {
    const match = travelogues.find((t) => t._id === travelogueId) || null;
    setSelectedTravelogue(match || null);
    setSelectedTravelogueId(travelogueId);
    setDetailOpen(true);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F8FAFB', pb: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(15,23,42,0.08)',
            bgcolor: '#ffffff',
            mt: 1.5,
            mb: 3,
            p: { xs: 2, sm: 3, md: 4 }
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography
                variant="h4"
                fontWeight={800}
                color="#0F172A"
                mb={0.5}
                sx={{ letterSpacing: '0.5px' }}
              >
                Stories & Travel Feed
              </Typography>
              <Typography variant="body2" color="#64748B" fontWeight={500}>
                Discover real travel moments and share yours instantly.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setComposerOpen(true)}
              sx={{
                borderRadius: '12px',
                px: 3,
                py: 1.2,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                boxShadow: '0 10px 24px rgba(79,138,139,0.25)'
              }}
            >
              Add Story
            </Button>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: '22px',
            bgcolor: '#ffffff',
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            border: '1px solid rgba(79,138,139,0.1)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <AutoStoriesIcon sx={{ color: '#4F8A8B' }} />
            <Typography fontWeight={700} color="#0F172A">
              Stories
            </Typography>
            <Typography variant="caption" color="#94A3B8">
              Tap to view
            </Typography>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
              {!myLatest?.images?.length && (
                <Box
                  onClick={() => setComposerOpen(true)}
                  sx={{
                    minWidth: 90,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      border: '2px dashed rgba(79,138,139,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 1
                    }}
                  >
                    <AddIcon sx={{ color: '#4F8A8B' }} />
                  </Box>
                  <Typography variant="caption" fontWeight={600} color="#475569">
                    Your Story
                  </Typography>
                </Box>
              )}
              {storyItems.map((story, index) => {
                const storyMediaPath = story.images?.[0] || '';
                const storyMediaUrl = buildImageUrl(storyMediaPath);
                const storyIsVideo = isVideoFile(storyMediaPath);
                const isMine = story.isMine;

                return (
                  <Box
                    key={story._id}
                    onClick={() => openStory(index)}
                    sx={{
                      minWidth: 90,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        p: '3px',
                        background: isMine
                          ? 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)'
                          : 'linear-gradient(135deg, #F9ED69 0%, #4F8A8B 100%)',
                        mx: 'auto',
                        position: 'relative'
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid #fff',
                          bgcolor: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {storyIsVideo ? (
                          <Box
                            component="video"
                            src={storyMediaUrl}
                            muted
                            playsInline
                            preload="metadata"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={storyMediaUrl}
                            alt={story.title}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </Box>
                      {storyIsVideo && (
                        <Box
                          sx={{
                            position: 'absolute',
                            right: -2,
                            bottom: -2,
                            bgcolor: '#0F172A',
                            color: '#fff',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #fff'
                          }}
                        >
                          <PlayArrowIcon sx={{ fontSize: 14 }} />
                        </Box>
                      )}
                      {isMine && (
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setComposerOpen(true);
                          }}
                          sx={{
                            position: 'absolute',
                            right: -6,
                            top: -6,
                            bgcolor: '#fff',
                            border: '1px solid rgba(79,138,139,0.3)',
                            width: 24,
                            height: 24,
                            '&:hover': { bgcolor: '#F8FAFB' }
                          }}
                        >
                          <AddIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                        </IconButton>
                      )}
                    </Box>
                    <Typography variant="caption" fontWeight={600} color="#475569" noWrap>
                      {isMine ? 'You' : story.userId?.name || 'Traveler'}
                    </Typography>
                    {isMine && story.pending && (
                      <Typography variant="caption" color="#F59E0B" sx={{ display: 'block' }}>
                        Pending
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: '22px',
            bgcolor: '#ffffff',
            p: { xs: 2, sm: 3 },
            border: '1px solid rgba(79,138,139,0.1)'
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5}>
                Community Feed
              </Typography>
              <Typography variant="body2" color="#64748B">
                Fresh travelogues, reels, and photo stories from real travelers.
              </Typography>
            </Box>
            <Chip
              label={`${travelogues.length} stories today`}
              sx={{
                bgcolor: 'rgba(79,138,139,0.12)',
                color: '#4F8A8B',
                fontWeight: 700
              }}
            />
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : travelogues.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography fontWeight={700} color="#64748B">
                No stories yet. Be the first to share!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {travelogues.map((travelogue) => (
                <TravelogueCard
                  key={travelogue._id}
                  travelogue={travelogue}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </Stack>
          )}
        </Paper>
      </Box>

      {/* Story Viewer */}
      <Dialog
        open={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            bgcolor: '#0B1120'
          }
        }}
      >
        {activeStory && (
          <DialogContent sx={{ p: 0, position: 'relative', bgcolor: '#0B1120' }}>
            <Box sx={{ position: 'absolute', top: 12, left: 16, right: 16, zIndex: 5 }}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                {(activeStory.images || []).map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: 999,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: idx < activeMediaIndex ? '100%' : idx === activeMediaIndex ? '60%' : '0%',
                        height: '100%',
                        bgcolor: '#F9ED69'
                      }}
                    />
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={
                      activeStory.userId?.avatar?.startsWith('http')
                        ? activeStory.userId.avatar
                        : activeStory.userId?.avatar
                          ? `http://localhost:3001${activeStory.userId.avatar}`
                          : '/default-avatar.png'
                    }
                    sx={{ width: 36, height: 36, border: '2px solid #fff' }}
                  />
                  <Box>
                    <Typography fontWeight={700} color="#fff">
                      {activeStory.userId?.name || 'Traveler'}
                    </Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)">
                      {activeStory.destination || activeStory.location || 'Travel Story'}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  onClick={() => setStoryViewerOpen(false)}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: { xs: 420, sm: 520, md: 620 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#0B1120'
              }}
            >
              {activeMediaIsVideo ? (
                <video
                  key={`story-video-${activeMediaIndex}`}
                  src={activeMediaUrl}
                  autoPlay
                  muted
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <img
                  key={`story-image-${activeMediaIndex}`}
                  src={activeMediaUrl}
                  alt={activeStory.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              )}

              <IconButton
                onClick={handlePrevMedia}
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={handleNextMedia}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>

            <Box sx={{ p: 2.5, bgcolor: '#0B1120' }}>
              <Typography color="rgba(255,255,255,0.9)" fontWeight={600}>
                {activeStory.title}
              </Typography>
              <Typography color="rgba(255,255,255,0.7)" variant="body2" sx={{ mt: 0.5 }}>
                {activeStory.description}
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Button
                variant="contained"
                onClick={() => {
                  setStoryViewerOpen(false);
                  setSelectedTravelogue(activeStory);
                  setSelectedTravelogueId(activeStory?._id || null);
                  setDetailOpen(true);
                }}
                sx={{
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)'
                }}
              >
                View Full Story
              </Button>
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Story Composer */}
      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '18px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
          Share a Quick Story
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError('')} sx={{ mb: 2, borderRadius: '12px' }}>
              {submitError}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              label="Story Title (optional)"
              value={storyForm.title}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
            <TextField
              label="Caption"
              value={storyForm.description}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />
            <TextField
              label="Destination"
              value={storyForm.destination}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, destination: e.target.value }))}
              fullWidth
              InputProps={{
                startAdornment: <LocationOnIcon sx={{ mr: 1, color: '#4F8A8B' }} />
              }}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
              }}
            />

            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              sx={{
                borderRadius: '12px',
                py: 1.2,
                fontWeight: 700,
                color: '#4F8A8B',
                borderColor: 'rgba(79,138,139,0.4)'
              }}
            >
              Add Photos or Videos
              <input
                type="file"
                accept="image/*,video/*"
                hidden
                multiple
                ref={fileInputRef}
                onChange={handleMediaChange}
              />
            </Button>

            {storyMedia.length > 0 && (
              <Stack spacing={1.5}>
                <Typography variant="caption" color="#64748B" fontWeight={600}>
                  {storyMedia.length} file(s) selected
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {storyMedia.map((file, idx) => (
                    <Chip
                      key={`${file.name}-${idx}`}
                      label={file.name}
                      onDelete={() => handleRemoveMedia(idx)}
                      sx={{
                        borderRadius: '8px',
                        bgcolor: 'rgba(79,138,139,0.08)',
                        color: '#4F8A8B'
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setComposerOpen(false)}
            variant="outlined"
            sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitStory}
            disabled={submitLoading}
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
              px: 3,
              fontWeight: 700
            }}
          >
            {submitLoading ? 'Sharing...' : 'Share Story'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View */}
      {detailOpen && (selectedTravelogue || selectedTravelogueId) && (
        <TravelogueDetailView
          travelogue={selectedTravelogue}
          travelogueId={selectedTravelogueId}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedTravelogueId(null);
            setSelectedTravelogue(null);
          }}
        />
      )}

      <Snackbar
        open={!!submitSuccess}
        autoHideDuration={5000}
        onClose={() => setSubmitSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSubmitSuccess('')} sx={{ width: '100%' }}>
          {submitSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}
