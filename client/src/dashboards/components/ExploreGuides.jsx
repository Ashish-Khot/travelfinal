// ExploreGuides.jsx - Premium Explore Guides with hero, filters, favorites & details
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Snackbar,
  Alert,
  Container,
  Paper,
  Stack,
  IconButton,
  Skeleton,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';

import GuidesHeroSection from './GuidesHeroSection';
import GuideFiltersBar from './GuideFiltersBar';
import GuideCard from './GuideCard';
import BookGuideDialog from './BookGuideDialog';
import GuideDetailModal from './GuideDetailModal';

import api from '../../api';
import dayjs from 'dayjs';

export default function ExploreGuides({ refreshTrigger = 0 }) {
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [detailModalGuide, setDetailModalGuide] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('All Languages');
  const [minRating, setMinRating] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [rateTypeFilter, setRateTypeFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [agentBookingRequest, setAgentBookingRequest] = useState(null);
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem('favoriteGuides') || '[]')
  );

  useEffect(() => {
    const handleAgentPrefill = (event) => {
      const payload = event?.detail || {};
      if (payload.search) setSearch(payload.search);
      if (payload.language) setLanguage(payload.language);
      if (payload.minRating) setMinRating(String(payload.minRating));
      if (payload.maxPrice) setMaxPrice(String(payload.maxPrice));
      if (payload.rateType) setRateTypeFilter(payload.rateType);
      if (payload.availability) setAvailabilityFilter(payload.availability);
      if (payload.openBooking) {
        setAgentBookingRequest({
          guideUserId: payload.guideUserId || '',
          guideName: payload.guideName || payload.search || '',
        });
      }
    };

    window.addEventListener('agentExploreGuidesPrefill', handleAgentPrefill);
    return () => window.removeEventListener('agentExploreGuidesPrefill', handleAgentPrefill);
  }, []);

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/guide');
      let eligibleReviewByGuideId = {};
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser?._id) {
          const bookingsRes = await api.get(`/booking/tourist/${currentUser._id}`);
          eligibleReviewByGuideId = (bookingsRes.data.bookings || [])
            .filter((booking) =>
              booking.status === 'completed' &&
              booking.reviewRequestSent &&
              booking.reviewRequestStatus === 'accepted' &&
              !booking.reviewSubmitted
            )
            .reduce((acc, booking) => {
              const bookingGuideId = (booking.guideId?._id || booking.guideId || '').toString();
              if (bookingGuideId) {
                acc[bookingGuideId] = {
                  _id: booking._id,
                  destination: booking.destination || 'Tour',
                };
              }
              return acc;
            }, {});
        }
      } catch {
        eligibleReviewByGuideId = {};
      }

      const realGuides = await Promise.all(
        (res.data.guides || [])
          .filter((g) => g.approved && g.userId)
          .map(async (g) => {
            const guideUserId = g.userId._id || g.userId;
            let reviews = [];
            let averageRating = 0;

            try {
              const reviewRes = await api.get(`/review/guide/${guideUserId}/reviews`);
              reviews = (reviewRes.data.reviews || []).map((review) => ({
                _id: review._id,
                touristName: review.userId?.name || 'Tourist',
                touristAvatar: review.userId?.avatar || '',
                rating: Number(review.rating || 0),
                place: review.place || '',
                comment: review.comment || '',
                createdAt: review.createdAt,
                guideReply: review.guideReply || '',
                guideReplyDate: review.guideReplyDate || null,
              }));

              if (reviews.length > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                averageRating = parseFloat((totalRating / reviews.length).toFixed(1));
              }
            } catch {
              reviews = [];
            }

              // Calculate days since last booking
              let daysSinceBooking = null;
              if (g.lastBookingDate) {
                const lastDate = new Date(g.lastBookingDate);
                const today = new Date();
                const diffTime = Math.abs(today - lastDate);
                daysSinceBooking = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              }

              // Total tours guide has handled (current backend provides booking ids only)
              const completedBookings = g.bookings?.length || 0;
              const guestSatisfaction = reviews.length > 0
                ? Math.round((averageRating / 5) * 100)
                : null;

              // Format languages properly
              const languageList = Array.isArray(g.languages)
                ? g.languages.map((lang) =>
                    typeof lang === 'string'
                      ? { name: lang, level: 'Fluent' }
                      : lang
                  )
                : [];
              const languageNames = languageList
                .map((lang) => (typeof lang === 'string' ? lang : lang?.name))
                .filter(Boolean);
              const rawAvatar =
                g.userId?.avatar || g.userId?.profileImage || g.avatar || '';
              const eligibleReviewBooking = eligibleReviewByGuideId[String(guideUserId)] || null;

              return {
                _id: g._id,
                userId: guideUserId,
                name: g.userId?.name || 'Guide',
                avatar: rawAvatar,
                location: g.userId.country || 'Global',
                languages: languageList,
                languageNames,
                price: g.price || 0,
                currency: 'INR',
                rateType: g.rateType || 'daily',
                rating: averageRating,
                description: g.bio || 'Experienced local guide with passion for sharing culture',
                tags: g.tags || ['Local Expert', 'Friendly', 'Experienced'],
                experienceYears: g.experienceYears || 5,
                bookings: completedBookings,
                travelogues: g.travelogues?.length || 0,
                reviewCount: reviews.length,
                reviews,
                latestReview: reviews[0] || null,
                eligibleReviewBooking,
                // New fields
                guideVideo: g.guideVideo || '',
                tourMedia: Array.isArray(g.tourMedia) ? g.tourMedia : [],
                cancelPolicy: g.cancelPolicy || 'Moderate',
                tourTypes: g.tourTypes || ['Culture', 'Adventure'],
                averageResponseTime: g.averageResponseTime || 24,
                highlights: g.highlights || [],
                isAvailable: g.isAvailable !== false,
                verifiedPhone: g.verifiedPhone || false,
                verifiedID: g.verifiedID || false,
                verifiedPayment: g.verifiedPayment || false,
                lastBookingDate: g.lastBookingDate,
                daysSinceBooking: daysSinceBooking,
                guestSatisfaction,
              };
          })
      );
      setGuides(realGuides);
    } catch (err) {
      console.error(err);
      setSuccessMsg('Failed to load guides');
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch guides from backend
  useEffect(() => {
    fetchGuides();
  }, [fetchGuides, refreshTrigger]);

  useEffect(() => {
    window.addEventListener('guideReviewsUpdated', fetchGuides);
    return () => window.removeEventListener('guideReviewsUpdated', fetchGuides);
  }, [fetchGuides]);

  useEffect(() => {
    if (!detailModalGuide) return;
    const updatedGuide = guides.find((guide) => guide._id === detailModalGuide._id);
    if (updatedGuide) setDetailModalGuide(updatedGuide);
  }, [guides, detailModalGuide]);

  const allLanguages = Array.from(
    new Set(guides.flatMap((g) => g.languageNames || []))
  );

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      guide.name.toLowerCase().includes(search.toLowerCase()) ||
      guide.location.toLowerCase().includes(search.toLowerCase()) ||
      (guide.languageNames || []).some((lang) =>
        lang.toLowerCase().includes(search.toLowerCase())
      );

    const matchesLanguage =
      language === 'All Languages' || (guide.languageNames || []).includes(language);

    const matchesRating = !minRating || guide.rating >= parseFloat(minRating);
    const matchesPrice = !maxPrice || guide.price <= parseFloat(maxPrice);
    const matchesRateType = !rateTypeFilter || guide.rateType === rateTypeFilter;
    const matchesAvailability =
      availabilityFilter === 'all' ||
      (availabilityFilter === 'available' && guide.isAvailable) ||
      (availabilityFilter === 'unavailable' && !guide.isAvailable);

    return matchesSearch && matchesLanguage && matchesRating && matchesPrice && matchesRateType && matchesAvailability;
  });

  useEffect(() => {
    if (!agentBookingRequest || loading || !guides.length) return;

    const byUserId = agentBookingRequest.guideUserId
      ? guides.find((guide) => String(guide.userId) === String(agentBookingRequest.guideUserId))
      : null;

    const byName = !byUserId && agentBookingRequest.guideName
      ? guides.find((guide) =>
          guide.name?.toLowerCase().includes(agentBookingRequest.guideName.toLowerCase())
        )
      : null;

    const targetGuide = byUserId || byName;
    if (targetGuide) {
      setSelectedGuide(targetGuide);
      setDialogOpen(true);
    }
    setAgentBookingRequest(null);
  }, [agentBookingRequest, guides, loading]);

  const isFavorite = (guide) => {
    return favorites.some((fav) => fav._id === guide._id);
  };

  const toggleFavorite = (guide) => {
    setFavorites((prev) => {
      const isAlreadyFavorite = prev.some((fav) => fav._id === guide._id);
      let updated;
      if (isAlreadyFavorite) {
        updated = prev.filter((fav) => fav._id !== guide._id);
        setSuccessMsg('Removed from favorites');
      } else {
        updated = [...prev, guide];
        setSuccessMsg('Added to favorites');
      }
      localStorage.setItem('favoriteGuides', JSON.stringify(updated));
      return updated;
    });
    setSnackbarSeverity('success');
  };

  const handleBook = (guide) => {
    if (guide?.isAvailable === false) {
      setSuccessMsg('This guide is currently unavailable for booking.');
      setSnackbarSeverity('warning');
      return;
    }
    setSelectedGuide(guide);
    setDialogOpen(true);
  };

  const handleViewProfile = (guide) => {
    setDetailModalGuide(guide);
    setDetailModalOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedGuide(null);
  };

  const handleDetailModalClose = () => {
    setDetailModalOpen(false);
    setDetailModalGuide(null);
  };

  const handleConfirm = async ({
    destination,
    startDate,
    endDate,
    startTime,
    endTime,
    totalPrice,
  }) => {
    if (!selectedGuide || !startDate || !endDate || !startTime || !endTime)
      return;
    try {
      const guideId = selectedGuide.userId;
      const startDateTime = dayjs(startDate)
        .hour(dayjs(startTime).hour())
        .minute(dayjs(startTime).minute())
        .second(0)
        .toISOString();
      const endDateTime = dayjs(endDate)
        .hour(dayjs(endTime).hour())
        .minute(dayjs(endTime).minute())
        .second(0)
        .toISOString();
      const response = await api.post('/booking/book', {
        guideId,
        startDateTime,
        endDateTime,
        destination,
        price: totalPrice,
      });
      if (response.status === 201) {
        setSuccessMsg('Successfully booked guide!');
        setSnackbarSeverity('success');
      } else {
        const backendMsg =
          response?.data?.message || 'Booking failed. Please try again.';
        setSuccessMsg(`Booking failed: ${backendMsg}`);
        setSnackbarSeverity('error');
      }
    } catch (err) {
      const backendMsg =
        err?.response?.data?.message ||
        err.message ||
        'Booking failed. Please try again.';
      setSuccessMsg(`Booking failed: ${backendMsg}`);
      setSnackbarSeverity('error');
    } finally {
      setDialogOpen(false);
      setSelectedGuide(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#ffffff' }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ mb: 4 }}>
        <GuidesHeroSection onSearchClick={() => {}} />
      </Container>

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {/* Filters */}
        <GuideFiltersBar
          search={search}
          onSearchChange={setSearch}
          language={language}
          onLanguageChange={setLanguage}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          availabilityFilter={availabilityFilter}
          onAvailabilityFilterChange={setAvailabilityFilter}
          allLanguages={allLanguages}
          onClear={() => {
            setSearch('');
            setLanguage('All Languages');
            setMinRating('');
            setMaxPrice('');
            setRateTypeFilter('');
            setAvailabilityFilter('all');
          }}
          guideCount={filteredGuides.length}
        />

        {/* View Mode Toggle & Stats */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700} mb={1}>
              Browse Our Guides
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredGuides.length} expert guides available
            </Typography>
          </Box>

          <Stack direction="row" gap={1}>
            <Paper
              elevation={0}
              sx={{
                p: 0.5,
                bgcolor: '#f0f9f9',
                borderRadius: 2,
                display: 'flex',
                gap: 1,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                sx={{
                  bgcolor: viewMode === 'grid' ? '#4F8A8B' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : '#6B7280',
                  '&:hover': { bgcolor: '#4F8A8B', color: 'white' },
                }}
              >
                <GridViewIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                sx={{
                  bgcolor: viewMode === 'list' ? '#4F8A8B' : 'transparent',
                  color: viewMode === 'list' ? 'white' : '#6B7280',
                  '&:hover': { bgcolor: '#4F8A8B', color: 'white' },
                }}
              >
                <ListIcon />
              </IconButton>
            </Paper>
          </Stack>
        </Stack>

        {/* Empty State */}
        {!loading && filteredGuides.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: '#f9fafb',
              borderRadius: 3,
              border: '2px dashed #e5e7eb',
            }}
          >
            <Typography variant="h6" fontWeight={700} mb={1}>
              No guides found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters to see more guides
            </Typography>
          </Paper>
        )}

        {/* Guides Grid */}
        {!loading && filteredGuides.length > 0 && (
          <Grid
            container
            spacing={3.5}
            sx={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'list' 
                ? '1fr' 
                : { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(3, 1fr)' },
              gap: 3.5,
            }}
          >
            {filteredGuides.map((guide) => (
              <Box
                key={guide._id}
              >
                <GuideCard
                  guide={guide}
                  onBook={handleBook}
                  onViewReviews={handleViewProfile}
                  isFavorite={isFavorite(guide)}
                  onFavoriteToggle={toggleFavorite}
                />
              </Box>
            ))}
          </Grid>
        )}

        {/* Loading State */}
        {loading && (
          <Grid
            container
            spacing={3.5}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(3, 1fr)' },
              gap: 3.5,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <Box key={idx}>
                <Paper sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                  <Skeleton variant="rectangular" height={220} />
                  <Box sx={{ p: 1.8 }}>
                    <Skeleton height={22} sx={{ mb: 0.8 }} />
                    <Skeleton height={16} sx={{ mb: 1 }} />
                    <Skeleton height={16} sx={{ mb: 1.2 }} />
                    <Skeleton height={60} />
                  </Box>
                </Paper>
              </Box>
            ))}
          </Grid>
        )}
      </Container>

      {/* Modals */}
      <BookGuideDialog
        open={dialogOpen}
        guide={selectedGuide}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onViewReviews={() => {
          if (!selectedGuide) return;
          setDialogOpen(false);
          setDetailModalGuide(selectedGuide);
          setDetailModalOpen(true);
        }}
      />

      <GuideDetailModal
        open={detailModalOpen}
        guide={detailModalGuide}
        onClose={handleDetailModalClose}
        onBook={handleBook}
        onReviewSubmitted={fetchGuides}
        isFavorite={detailModalGuide ? isFavorite(detailModalGuide) : false}
        onFavoriteToggle={toggleFavorite}
      />

      {/* Snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMsg('')}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
