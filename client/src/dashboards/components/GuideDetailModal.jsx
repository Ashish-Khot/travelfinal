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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VerifiedIcon from '@mui/icons-material/Verified';
import LanguageIcon from '@mui/icons-material/Language';
import { motion } from 'framer-motion';

export default function GuideDetailModal({ open, guide, onClose, onBook, isFavorite, onFavoriteToggle }) {
  const [tabValue, setTabValue] = useState(0);
  const [liked, setLiked] = useState(isFavorite);

  useEffect(() => {
    setLiked(isFavorite);
  }, [isFavorite]);

  if (!guide) return null;

  const mockReviews = [
    {
      id: 1,
      name: 'Sarah Johnson',
      rating: 5,
      verified: true,
      text: 'Amazing experience! Our guide was knowledgeable and very friendly. Highly recommended!',
      date: '2 weeks ago',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    },
    {
      id: 2,
      name: 'Michael Chen',
      rating: 5,
      verified: true,
      text: 'Best tour guide I\'ve ever had. Showed us hidden gems we would never have found!',
      date: '1 month ago',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    },
    {
      id: 3,
      name: 'Emma Watson',
      rating: 4,
      verified: true,
      text: 'Great knowledge and very patient with questions.',
      date: '1.5 months ago',
      avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    },
  ];

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
          <Box
            component="img"
            src={guide.avatar}
            alt={guide.name}
            sx={{
              width: '100%',
              height: 240,
              objectFit: 'cover',
            }}
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
                    {guide.languages.map((lang) => (
                      <Chip key={lang} label={lang} size="small" sx={{ bgcolor: '#f0f4ff', color: '#667eea', fontWeight: 600 }} />
                    ))}
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
                      { label: 'Languages', value: guide.languages.length },
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
                      {guide.currency === 'INR' ? '₹' : '$'}{guide.price}<span style={{ fontSize: '0.75rem', fontWeight: 600 }}>/{guide.rateType === 'hourly' ? 'hr' : 'day'}</span>
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
                {mockReviews.map((review) => (
                  <Paper key={review.id} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#f9fafb', border: '1px solid #f0f0f0' }}>
                    <Stack direction="row" gap={1} mb={0.8}>
                      <Avatar src={review.avatar} sx={{ width: 32, height: 32 }} />
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                            {review.name}
                          </Typography>
                          {review.verified && <VerifiedIcon sx={{ fontSize: 12, color: '#667eea' }} />}
                        </Stack>
                        <Stack direction="row" alignItems="center" gap={0.8} mt={0.2}>
                          <Rating value={review.rating} readOnly size="small" />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {review.date}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.85rem' }}>
                      {review.text}
                    </Typography>
                  </Paper>
                ))}
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
                onClick={() => {
                  onBook(guide);
                  onClose();
                }}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                  },
                }}
              >
                Book Now
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
