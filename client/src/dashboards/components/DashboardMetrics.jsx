// DashboardMetrics.jsx
// Dashboard metrics cards row for Tourist Dashboard with real data from API
import React, { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PublicIcon from '@mui/icons-material/Public';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';
import api from '../../api';

const metricsConfig = [
  {
    title: 'Upcoming Trips',
    key: 'upcomingTrips',
    icon: <EventAvailableIcon sx={{ color: '#0f766e', fontSize: 26 }} />,
    color: '#f1f7f6',
    subColor: '#0f766e',
    glow: 'rgba(15, 118, 110, 0.18)',
  },
  {
    title: 'Countries Visited',
    key: 'countriesVisited',
    icon: <PublicIcon sx={{ color: '#b45309', fontSize: 26 }} />,
    color: '#fef7ed',
    subColor: '#b45309',
    glow: 'rgba(180, 83, 9, 0.18)',
  },
  {
    title: 'Saved Destinations',
    key: 'savedDestinations',
    icon: <BookmarkIcon sx={{ color: '#1d4ed8', fontSize: 26 }} />,
    color: '#eff6ff',
    subColor: '#1d4ed8',
    glow: 'rgba(29, 78, 216, 0.16)',
  },
  {
    title: 'Reward Points',
    key: 'rewardPoints',
    icon: <EmojiEventsIcon sx={{ color: '#be185d', fontSize: 26 }} />,
    color: '#fdf2f8',
    subColor: '#be185d',
    glow: 'rgba(190, 24, 93, 0.16)',
  },
];

const normalizeCountryKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const extractCountryFromDestination = (destination = '') => {
  const parts = String(destination || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  // A single-token destination like "Goa" is usually a city/state, not a country.
  if (parts.length < 2) return '';

  const candidate = parts[parts.length - 1];
  if (!candidate || /\d/.test(candidate)) return '';
  return candidate;
};

const resolveBookingCountry = (booking = {}) => {
  const guideCountry = String(booking?.guideId?.country || '').trim();
  if (guideCountry) return guideCountry;
  return extractCountryFromDestination(booking?.destination || '');
};

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState({
    upcomingTrips: 0,
    upcomingSubtext: 'this month',
    countriesVisited: 0,
    countriesSubtext: 'total',
    savedDestinations: 0,
    savedSubtext: 'bookmarked',
    rewardPoints: 0,
    rewardSubtext: 'total points',
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const touristId = String(user?._id || user?.userId || '').trim();

      if (!touristId) {
        if (showLoader) setLoading(false);
        return;
      }

      const [bookingsRes, userRes] = await Promise.all([
        api.get(`/booking/tourist/${touristId}`).catch(() => ({ data: { bookings: [] } })),
        api.get(`/tourist/${touristId}`).catch(() => ({ data: {} })),
      ]);

      const bookingsData = bookingsRes?.data;
      const bookings = Array.isArray(bookingsData)
        ? bookingsData
        : Array.isArray(bookingsData?.bookings)
          ? bookingsData.bookings
          : [];
      const userData = userRes.data?.[0] || userRes.data || {};

      // Count upcoming trips (confirmed bookings with future dates)
      const now = new Date();
      const upcomingBookings = bookings.filter((b) =>
        b.status === 'confirmed' && new Date(b.startDateTime) > now
      );
      const thisMonthBookings = upcomingBookings.filter((b) => {
        const bookingDate = new Date(b.startDateTime);
        return bookingDate.getMonth() === now.getMonth() &&
               bookingDate.getFullYear() === now.getFullYear();
      });

      // Get unique countries from completed tours using reliable country sources.
      const completedBookings = bookings.filter((b) => b.status === 'completed');
      const visitedCountryKeys = new Set();
      completedBookings.forEach((booking) => {
        const country = resolveBookingCountry(booking);
        const key = normalizeCountryKey(country);
        if (key) visitedCountryKeys.add(key);
      });
      const countriesVisited = visitedCountryKeys.size;

      // Get saved destinations (from user profile or from a favorites endpoint)
      const savedDests = Array.isArray(userData.savedDestinations)
        ? userData.savedDestinations
        : Array.isArray(userData.favorites)
          ? userData.favorites
          : [];
      const newSavedThisMonth = savedDests.filter((d) => {
        if (!d.savedAt) return false;
        const savedDate = new Date(d.savedAt);
        return savedDate.getMonth() === now.getMonth() &&
               savedDate.getFullYear() === now.getFullYear();
      }).length;

      // Get reward points
      const rewardPoints = Number(userData.rewardPoints || 0);

      setMetrics({
        upcomingTrips: upcomingBookings.length,
        upcomingSubtext: `+${thisMonthBookings.length} this month`,
        countriesVisited,
        countriesSubtext:
          completedBookings.length === 0
            ? 'first trip'
            : countriesVisited > 0
              ? `${countriesVisited} unique countries`
              : 'location data incomplete',
        savedDestinations: savedDests.length,
        savedSubtext: `${newSavedThisMonth} new`,
        rewardPoints: rewardPoints.toLocaleString(),
        rewardSubtext: `+${Math.max(0, (rewardPoints - Math.floor(rewardPoints / 500) * 500))} earned`,
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
      // Fallback to default values
      setMetrics((m) => m);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(true);

    const intervalId = setInterval(() => {
      fetchMetrics(false);
    }, 60000);

    const handleWindowFocus = () => fetchMetrics(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(false);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchMetrics]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {metricsConfig.map((config, idx) => (
        <Grid item xs={12} sm={6} md={3} key={config.key}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: '20px',
                bgcolor: '#ffffff',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                p: 2.5,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
                transition: 'all 0.3s ease',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: -30,
                  right: -30,
                  width: 140,
                  height: 140,
                  background: config.color,
                  borderRadius: '50%',
                  opacity: 0.8,
                },
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${config.glow} 0%, transparent 55%)`,
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                },
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 24px 45px rgba(15, 23, 42, 0.12)',
                  '&:after': { opacity: 1 },
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: config.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${config.subColor}20`,
                    }}
                  >
                    {config.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#475569',
                      fontWeight: 600,
                      bgcolor: 'rgba(148, 163, 184, 0.12)',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '999px',
                    }}
                  >
                    {metrics[`${config.key}Subtext`]}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600, mb: 0.5 }}>
                  {config.title}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a' }}>
                  {metrics[config.key]}
                </Typography>
                <Typography variant="body2" sx={{ color: config.subColor, fontWeight: 600, mt: 0.5 }}>
                  Updated in real time
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
}
