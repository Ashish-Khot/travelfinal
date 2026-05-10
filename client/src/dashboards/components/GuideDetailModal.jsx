import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Rating,
  Divider,
  Avatar,
  Tab,
  Tabs,
  ImageList,
  ImageListItem,
  Grid,
  Paper,
  IconButton,
  LinearProgress,
  TextField,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VerifiedIcon from '@mui/icons-material/Verified';
import LanguageIcon from '@mui/icons-material/Language';
import { motion } from 'framer-motion';
import PremiumImage from '../../components/PremiumImage';
import api from '../../api';

export default function GuideDetailModal({ open, guide, onClose, onBook, onReviewSubmitted = () => {}, isFavorite, onFavoriteToggle }) {
  const [tabValue, setTabValue] = useState(0);
  const [liked, setLiked] = useState(isFavorite);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewPlace, setReviewPlace] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);

  useEffect(() => {
    setLiked(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    setReviewRating(0);
    setReviewPlace(guide?.eligibleReviewBooking?.destination || '');
    setReviewComment('');
    setReviewMessage(null);
  }, [guide?._id, guide?.eligibleReviewBooking?._id, open]);

  if (!guide) return null;

  const languages = Array.isArray(guide.languages) ? guide.languages : [];
  const reviews = Array.isArray(guide.reviews) ? guide.reviews : [];
  const eligibleReviewBooking = guide.eligibleReviewBooking || null;
  const reviewDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Math.round(Number(review.rating || 0)) === rating).length,
  }));
  const formatReviewDate = (value) => {
    if (!value) return 'Recently';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const mockImages = [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1494783367193-149034c05e41?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=500&h=500&fit=crop',
    'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=500&h=500&fit=crop',
  ];

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  const handleSubmitReview = async () => {
    if (!eligibleReviewBooking) return;
    if (!reviewRating || !reviewComment.trim()) {
      setReviewMessage({ severity: 'warning', text: 'Please add both a rating and a comment.' });
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.post('/review', {
        guideId: guide.userId,
        bookingId: eligibleReviewBooking._id,
        place: reviewPlace || eligibleReviewBooking.destination,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewMessage({ severity: 'success', text: 'Your review is now visible for other tourists.' });
      setReviewRating(0);
      setReviewComment('');
      onReviewSubmitted(guide.userId);
      window.dispatchEvent(new CustomEvent('guideReviewsUpdated', {
        detail: { guideId: guide.userId },
      }));
    } catch (err) {
      setReviewMessage({
        severity: 'error',
        text: err.response?.data?.message || err.message || 'Failed to submit review.',
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' },
      }}
    >
      {/* Close Button */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            bgcolor: 'rgba(0,0,0,0.05)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Cover Image */}
          <PremiumImage
            src={guide.avatar}
            alt={guide.name}
            name={guide.name}
            height={240}
            width="100%"
            showLabel
          />

          {/* Header Info */}
          <Box sx={{ px: 2.5, py: 2.5 }}>
            <Stack spacing={1.5}>
              {/* Name & Buttons */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" gap={0.7} mb={0.5}>
                    <Typography variant="h6" fontWeight={800}>
                      {guide.name}
                    </Typography>
                    <VerifiedIcon sx={{ color: '#667eea', fontSize: 20 }} />
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.3}>
                    <LocationOnIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                      {guide.location}
                    </Typography>
                  </Stack>
                  <Chip
                    label={guide.isAvailable ? 'Available for booking' : 'Currently unavailable'}
                    size="small"
                    sx={{
                      mt: 1,
                      bgcolor: guide.isAvailable ? '#dcfce7' : '#e2e8f0',
                      color: guide.isAvailable ? '#166534' : '#475569',
                      fontWeight: 800,
                    }}
                  />
                </Box>
                <Stack direction="row" gap={0.5}>
                  <IconButton
                    onClick={() => {
                      setLiked(!liked);
                      onFavoriteToggle(guide);
                    }}
                    size="small"
                    sx={{
                      bgcolor: liked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                      color: liked ? '#ef4444' : '#6B7280',
                    }}
                  >
                    {liked ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,0.05)' }}>
                    <ShareIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              </Stack>

              {/* Quick Stats */}
              <Stack direction="row" spacing={1.5} sx={{ py: 1.5, borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#667eea" sx={{ fontSize: '1.1rem' }}>
                    {guide.rating > 0 ? guide.rating.toFixed(1) : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {guide.reviewCount > 0 ? `${guide.reviewCount} ${guide.reviewCount === 1 ? 'review' : 'reviews'}` : 'No reviews'}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#667eea" sx={{ fontSize: '1.1rem' }}>
                    {guide.bookings || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {guide.bookings === 1 ? 'Tour' : 'Tours'}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800} color="#667eea" sx={{ fontSize: '1.1rem' }}>
                    &lt;2h
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Response
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            sx={{
              px: 2.5,
              borderBottom: '1px solid #e5e7eb',
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.85rem',
                color: '#9CA3AF',
                py: 1.5,
                '&.Mui-selected': {
                  color: '#667eea',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#667eea',
                height: 3,
              },
            }}
          >
            <Tab label="About" />
            <Tab label="Gallery" />
            <Tab label="Reviews" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ px: 2.5, py: 2.5, maxHeight: '450px', overflowY: 'auto' }}>
            {/* About Tab */}
            <TabPanel value={tabValue} index={0}>
              <Stack spacing={2}>
                {/* Languages */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={0.8} mb={1}>
                    <LanguageIcon sx={{ fontSize: 18, color: '#667eea' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                      Languages
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap">
                    {languages.map((lang, idx) => {
                      const label = typeof lang === 'string' ? lang : lang?.name;
                      if (!label) return null;
                      return (
                        <Chip
                          key={`${label}-${idx}`}
                          label={label}
                          size="small"
                          sx={{ bgcolor: '#f0f4ff', color: '#667eea', fontWeight: 600 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* About */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={0.8} sx={{ fontSize: '0.95rem' }}>
                    About
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '0.9rem' }}>
                    {guide.description || 'Experienced guide passionate about sharing local culture and authentic experiences.'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* Experience */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1} sx={{ fontSize: '0.95rem' }}>
                    Experience Highlights
                  </Typography>
                  <Stack spacing={0.8}>
                    {[
                      { label: 'Tours Completed', value: '127' },
                      { label: 'Satisfied Tourists', value: '500+' },
                      { label: 'Experience', value: '8 years' },
                      { label: 'Languages', value: languages.length },
                    ].map((item, idx) => (
                      <Stack direction="row" justifyContent="space-between" alignItems="center" key={idx}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="#667eea" sx={{ fontSize: '0.9rem' }}>
                          {item.value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* Price */}
                <Paper sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                      Starting from
                    </Typography>
                    <Typography variant="h6" fontWeight={900} color="#667eea">
                      ₹{guide.price}<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/{guide.rateType === 'hourly' ? 'hr' : 'day'}</span>
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
            </TabPanel>

            {/* Gallery Tab */}
            <TabPanel value={tabValue} index={1}>
              <ImageList sx={{ width: '100%' }} cols={3} rowHeight={110} gap={6}>
                {mockImages.map((image, idx) => (
                  <ImageListItem key={idx}>
                    <img src={image} alt={`Gallery ${idx + 1}`} loading="lazy" style={{ borderRadius: 6, objectFit: 'cover' }} />
                  </ImageListItem>
                ))}
              </ImageList>
            </TabPanel>

            {/* Reviews Tab */}
            <TabPanel value={tabValue} index={2}>
              <Stack spacing={1.5}>
                {eligibleReviewBooking && (
                  <Paper sx={{ p: 1.6, borderRadius: 1.5, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                      Write your review for this completed tour
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
                      Your feedback will help other tourists choose the right guide.
                    </Typography>
                    {reviewMessage && (
                      <Alert severity={reviewMessage.severity} sx={{ mb: 1.2 }}>
                        {reviewMessage.text}
                      </Alert>
                    )}
                    {reviewMessage?.severity !== 'success' && (
                      <Stack spacing={1.2}>
                        <Rating
                          value={reviewRating}
                          onChange={(_, value) => setReviewRating(value || 0)}
                        />
                        <TextField
                          size="small"
                          label="Place"
                          value={reviewPlace}
                          onChange={(event) => setReviewPlace(event.target.value)}
                        />
                        <TextField
                          size="small"
                          label="Your review"
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          multiline
                          minRows={3}
                        />
                        <Button
                          variant="contained"
                          onClick={handleSubmitReview}
                          disabled={reviewSubmitting}
                          sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
                        >
                          {reviewSubmitting ? 'Submitting...' : 'Submit review'}
                        </Button>
                      </Stack>
                    )}
                  </Paper>
                )}

                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f9fafb', border: '1px solid #f0f0f0' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={900} color="#667eea">
                        {guide.rating > 0 ? guide.rating.toFixed(1) : 'New'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {reviews.length} {reviews.length === 1 ? 'tourist review' : 'tourist reviews'}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      {reviewDistribution.map((item) => {
                        const width = reviews.length > 0 ? Math.round((item.count / reviews.length) * 100) : 0;
                        return (
                          <Stack key={item.rating} direction="row" alignItems="center" gap={1} sx={{ mb: 0.4 }}>
                            <Typography variant="caption" sx={{ width: 28, color: 'text.secondary' }}>
                              {item.rating}
                            </Typography>
                            <Box sx={{ flex: 1, height: 6, bgcolor: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                              <Box sx={{ width: `${width}%`, height: '100%', bgcolor: '#f59e0b' }} />
                            </Box>
                            <Typography variant="caption" sx={{ width: 24, textAlign: 'right', color: 'text.secondary' }}>
                              {item.count}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Box>
                  </Stack>
                </Paper>

                {reviews.length === 0 ? (
                  <Paper sx={{ p: 2.5, borderRadius: 1.5, bgcolor: '#f9fafb', border: '1px dashed #d1d5db', textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      No tourist reviews yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Completed tour feedback will appear here once tourists submit reviews.
                    </Typography>
                  </Paper>
                ) : (
                  reviews.map((review) => (
                    <Paper key={review._id} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#ffffff', border: '1px solid #f0f0f0' }}>
                      <Stack direction="row" gap={1} mb={0.8}>
                        <Avatar src={review.touristAvatar} sx={{ width: 32, height: 32 }}>
                          {review.touristName?.charAt(0)?.toUpperCase() || 'T'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                              {review.touristName || 'Tourist'}
                            </Typography>
                            <VerifiedIcon sx={{ fontSize: 12, color: '#667eea' }} />
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={0.8} mt={0.2} sx={{ flexWrap: 'wrap' }}>
                            <Rating value={Number(review.rating || 0)} readOnly size="small" />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {formatReviewDate(review.createdAt)}
                            </Typography>
                            {review.place && (
                              <Chip label={review.place} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: '#eef2ff', color: '#4f46e5' }} />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.85rem' }}>
                        {review.comment || 'No written comment provided.'}
                      </Typography>
                      {review.guideReply && (
                        <Box sx={{ mt: 1.2, p: 1.2, borderRadius: 1.2, bgcolor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                          <Typography variant="caption" fontWeight={800} color="#15803d">
                            Guide reply
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.4, color: '#36574c', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {review.guideReply}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </TabPanel>
          </Box>

          {/* Action Buttons */}
          <Divider />
          <Box sx={{ px: 2.5, py: 2.5, bgcolor: '#f9fafb' }}>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                fullWidth
                disabled={guide.isAvailable === false}
                onClick={() => {
                  if (guide.isAvailable === false) return;
                  onBook(guide);
                  onClose();
                }}
                sx={{
                  background: guide.isAvailable === false
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    boxShadow: guide.isAvailable === false ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)',
                  },
                  '&.Mui-disabled': {
                    background: '#cbd5e1',
                    color: '#475569',
                  },
                }}
              >
                {guide.isAvailable === false ? 'Unavailable' : 'Book Now'}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#e5e7eb',
                  color: '#667eea',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.05)',
                  },
                }}
              >
                Contact
              </Button>
            </Stack>
          </Box>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
