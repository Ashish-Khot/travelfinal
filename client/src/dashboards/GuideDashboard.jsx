// Real Earnings Page with Charts
function EarningsPage({ bookings }) {
  const [loading, setLoading] = React.useState(false);
  
  // Calculate earnings metrics
  const totalEarnings = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  
  const thisMonth = bookings.filter(b => {
    const bookingMonth = new Date(b.startDateTime).getMonth();
    const currentMonth = new Date().getMonth();
    return bookingMonth === currentMonth && (b.status === 'confirmed' || b.status === 'completed');
  }).reduce((sum, b) => sum + (b.price || 0), 0);
  
  const pendingPayments = bookings
    .filter(b => b.status === 'pending' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.price || 0), 0);
  
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  
  // Earnings by tour (destination)
  const earningsByDest = {};
  bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .forEach(b => {
      const dest = b.destination || 'Other';
      earningsByDest[dest] = (earningsByDest[dest] || 0) + (b.price || 0);
    });
  
  // Daily earnings for last 7 days
  const dailyEarnings = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyEarnings[dateStr] = 0;
  }
  
  bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .forEach(b => {
      const date = new Date(b.startDateTime);
      const today = new Date();
      const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 6 && daysDiff >= 0) {
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyEarnings[dateStr] = (dailyEarnings[dateStr] || 0) + (b.price || 0);
      }
    });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>💰 Earnings & Revenue</Typography>
      
      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 4 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>TOTAL EARNINGS</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#1976d2' }}>₹{totalEarnings.toFixed(2)}</Typography>
          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            📈 {completedBookings} completed tours
          </Typography>
        </Box>
        
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>THIS MONTH</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#10b981' }}>₹{thisMonth.toFixed(2)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            📅 {bookings.filter(b => new Date(b.startDateTime).getMonth() === new Date().getMonth()).length} bookings
          </Typography>
        </Box>
        
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>PENDING PAYMENTS</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#f59e0b' }}>₹{pendingPayments.toFixed(2)}</Typography>
          <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            ⏳ {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length} bookings
          </Typography>
        </Box>
        
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>AVG PER BOOKING</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#8b5cf6' }}>
            ₹{completedBookings > 0 ? (totalEarnings / completedBookings).toFixed(0) : '0'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            💵 Revenue per tour
          </Typography>
        </Box>
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, mb: 4 }}>
        {/* Daily Earnings Chart */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Last 7 Days Earnings</Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 200, justifyContent: 'space-around', pb: 2 }}>
            {Object.entries(dailyEarnings).map(([date, amount]) => (
              <Box key={date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: Math.max(amount / Math.max(...Object.values(dailyEarnings), 1) * 150, 4),
                    bgcolor: '#1976d2',
                    borderRadius: 1.5,
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: '#1565c0', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)' }
                  }}
                  title={`₹${amount.toFixed(2)}`}
                />
                <Typography variant="caption" sx={{ mt: 1, fontSize: 11, textAlign: 'center' }}>{date}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Earnings by Destination */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Top Destinations</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(earningsByDest).slice(0, 5).map(([dest, amount]) => (
              <Box key={dest} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{dest}</Typography>
                  <Box sx={{ width: '100%', height: 6, bgcolor: '#e5e7eb', borderRadius: 3, mt: 0.5, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      bgcolor: '#10b981',
                      width: `${Math.min((amount / Math.max(...Object.values(earningsByDest), 1)) * 100, 100)}%`
                    }} />
                  </Box>
                </Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ minWidth: 70, textAlign: 'right' }}>₹{amount.toFixed(0)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Earnings History */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Recent Earnings</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Destination</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#666' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .filter(b => b.status === 'confirmed' || b.status === 'completed')
                .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
                .slice(0, 10)
                .map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>📍 {b.destination || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{new Date(b.startDateTime).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        bgcolor: b.status === 'completed' ? '#d1fae5' : '#fef3c7',
                        color: b.status === 'completed' ? '#059669' : '#d97706'
                      }}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#1976d2' }}>₹{b.price.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

// Real Reviews Page
function ReviewsPage({ user, guideProfile }) {
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [averageRating, setAverageRating] = React.useState(0);
  const [ratingDistribution, setRatingDistribution] = React.useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyText, setReplyText] = React.useState('');
  const [savingReply, setSavingReply] = React.useState(false);

  React.useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // First try to fetch reviews for the guide
        let reviewsData = [];
        try {
          const res = await api.get(`/review/guide/${user._id}/reviews`);
          reviewsData = res.data.reviews || [];
        } catch (err) {
          // If guide ID pattern doesn't work, try with aggregation
          console.log('Could not fetch reviews:', err);
          reviewsData = [];
        }
        
        setReviews(reviewsData);
        
        // Calculate average rating and distribution
        if (reviewsData.length > 0) {
          const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
          setAverageRating(avg);
          
          const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          reviewsData.forEach(r => {
            if (dist.hasOwnProperty(r.rating)) {
              dist[r.rating]++;
            }
          });
          setRatingDistribution(dist);
        } else if (guideProfile?.ratings) {
          setAverageRating(guideProfile.ratings);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?._id) fetchReviews();
  }, [user, guideProfile]);

  const handleReplyClick = (review) => {
    setReplyingTo(review._id);
    setReplyText(review.guideReply || '');
  };

  const handleSaveReply = async () => {
    if (!replyText.trim()) {
      alert('Reply cannot be empty');
      return;
    }

    setSavingReply(true);
    try {
      const res = await api.put(`/review/${replyingTo}/reply`, { guideReply: replyText });
      
      // Update review in state
      setReviews(reviews.map(r => 
        r._id === replyingTo 
          ? { ...r, guideReply: res.data.review.guideReply, guideReplyDate: res.data.review.guideReplyDate }
          : r
      ));
      
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      alert('Error saving reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingReply(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  const totalReviews = reviews.length;
  const displayRating = averageRating || guideProfile?.ratings || 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>⭐ Reviews & Ratings</Typography>
      
      {/* Rating Summary */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, mb: 4 }}>
        {/* Overall Rating Card */}
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="h2" fontWeight={900} sx={{ color: '#fbbf24' }}>
              {displayRating.toFixed(1)}
            </Typography>
            <Box>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ color: i < Math.round(displayRating) ? '#fbbf24' : '#d1d5db', fontSize: 20 }}>★</span>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">{totalReviews} reviews</Typography>
            </Box>
          </Box>
        </Box>

        {/* Rating Distribution */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Rating Distribution</Typography>
          {[5, 4, 3, 2, 1].map(rating => (
            <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, minWidth: 80 }}>
                <Typography variant="caption" fontWeight={600}>{rating}★</Typography>
                {[...Array(5 - rating)].map((_, i) => (
                  <span key={i} style={{ color: '#d1d5db', fontSize: 12 }}>☆</span>
                ))}
              </Box>
              <Box sx={{ flex: 1, height: 8, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%',
                  bgcolor: rating >= 4 ? '#10b981' : rating >= 3 ? '#f59e0b' : '#ef4444',
                  width: totalReviews > 0 ? `${(ratingDistribution[rating] / totalReviews) * 100}%` : '0%'
                }} />
              </Box>
              <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
                {ratingDistribution[rating]} ({totalReviews > 0 ? ((ratingDistribution[rating] / totalReviews) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Reviews List */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={3}>All Reviews</Typography>
        {reviews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <ReviewsIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography variant="body2">No reviews yet. Complete more tours to receive feedback!</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reviews.map(review => (
              <Box
                key={review._id}
                sx={{
                  p: 3,
                  bgcolor: '#fafbfa',
                  borderRadius: 2,
                  border: '1px solid #e5e7eb',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
                }}
              >
                {/* Tourist Review */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < review.rating ? '#fbbf24' : '#d1d5db', fontSize: 14 }}>★</span>
                      ))}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>{review.place || 'Unnamed Location'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {review.userId?.name} • {new Date(review.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6, pl: 0 }}>
                  {review.comment || 'No comment provided'}
                </Typography>

                {/* Guide Reply Section */}
                {replyingTo === review._id ? (
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #c8e6c9' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Your Reply</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Write your reply to this review..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveReply}
                        disabled={savingReply}
                        sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                      >
                        {savingReply ? <CircularProgress size={20} /> : 'Save Reply'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setReplyingTo(null)}
                        disabled={savingReply}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    {review.guideReply && (
                      <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e40af', mb: 1 }}>
                          Your Reply
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.6 }}>
                          {review.guideReply}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Replied {new Date(review.guideReplyDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                    <Button
                      size="small"
                      variant={review.guideReply ? "outlined" : "contained"}
                      onClick={() => handleReplyClick(review)}
                      sx={{ 
                        bgcolor: review.guideReply ? 'transparent' : '#dbeafe',
                        color: review.guideReply ? '#1e40af' : '#1e40af',
                        border: '1px solid #bfdbfe',
                        '&:hover': { bgcolor: '#eff6ff' }
                      }}
                    >
                      {review.guideReply ? '✏️ Edit Reply' : '💬 Reply to Review'}
                    </Button>
                  </>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { styled, useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TourIcon from '@mui/icons-material/TravelExplore';
import BookingsIcon from '@mui/icons-material/BookOnline';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Chat';
import EarningsIcon from '@mui/icons-material/BarChart';
import ReviewsIcon from '@mui/icons-material/StarRate';
import ProfileIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { alpha } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

const drawerWidth = 240;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon /> },
  { label: 'My Tours', icon: <TourIcon /> },
  { label: 'Bookings', icon: <BookingsIcon /> },
  { label: 'Calendar', icon: <CalendarIcon /> },
  { label: 'Messages', icon: <MessageIcon /> },
  { label: 'Earnings', icon: <EarningsIcon /> },
  { label: 'Reviews', icon: <ReviewsIcon /> },
  { label: 'Profile', icon: <ProfileIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
];

const glassBg = theme => `
  linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.7)}, ${alpha(theme.palette.primary.light, 0.2)}),
  rgba(255,255,255,0.4)
`;

const GlassCard = styled(Box)(({ theme }) => ({
  background: glassBg(theme),
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.18)',
  backdropFilter: 'blur(12px)',
  padding: theme.spacing(3),
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px) scale(1.03)',
    boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.22)',
  },
}));

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(4),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: prop => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: prop => prop !== 'open' })
  (({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      background: glassBg(theme),
      borderRight: 'none',
      backdropFilter: 'blur(10px)',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      ...(open ? {} : {
        width: theme.spacing(8),
        overflowX: 'hidden',
      }),
    },
  }));

const metrics = [
  { title: 'Total Bookings', value: 128, icon: <BookingsIcon fontSize="large" color="primary" />, color: 'primary.main', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { title: 'Monthly Earnings', value: '₹2,340', icon: <EarningsIcon fontSize="large" color="success" />, color: 'success.main', gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' },
  { title: 'Upcoming Tours', value: 7, icon: <TourIcon fontSize="large" color="info" />, color: 'info.main', gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
  { title: 'Rating', value: '4.9', icon: <ReviewsIcon fontSize="large" color="warning" />, color: 'warning.main', gradient: 'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)' },
];

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#06b6d4' },
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#3b82f6' },
    background: { default: '#f9fafb', paper: '#fff' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Poppins', 'Inter', 'Segoe UI', 'Roboto', sans-serif",
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700, letterSpacing: '-0.5px' },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          }
        }
      }
    }
  }
});

function DashboardPage({ user, bookings, guideProfile, tours }) {
  // Calculate metrics
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const upcomingTours = bookings.filter(b => new Date(b.startDateTime) > new Date()).length;
  const completedTours = bookings.filter(b => b.status === 'completed').length;
  const totalEarnings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + (b.price || 0), 0);
  
  const thisMonthBookings = bookings.filter(b => {
    const bookingMonth = new Date(b.startDateTime).getMonth();
    const currentMonth = new Date().getMonth();
    return bookingMonth === currentMonth && (b.status === 'confirmed' || b.status === 'completed');
  }).length;
  
  const responseRate = totalBookings > 0 ? 95 : 0; // Placeholder, should come from backend
  const completionRate = totalBookings > 0 ? Math.round((completedTours / totalBookings) * 100) : 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        👋 Welcome back, {user?.name || 'Guide'}!
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Here's your performance overview for today
      </Typography>

      {/* Primary Metrics - 2x2 Grid */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, mb: 4 }}>
        {/* Total Bookings */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>TOTAL BOOKINGS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#1976d2' }}>{totalBookings}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: 2 }}>
              <BookingsIcon sx={{ color: '#1976d2', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            📈 {thisMonthBookings} this month
          </Typography>
        </Box>

        {/* Monthly Earnings */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>TOTAL EARNINGS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#10b981' }}>₹{totalEarnings.toFixed(0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#dcfce7', borderRadius: 2 }}>
              <EarningsIcon sx={{ color: '#10b981', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            💰 {confirmedBookings} confirmed
          </Typography>
        </Box>

        {/* Upcoming Tours */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>UPCOMING TOURS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#06b6d4' }}>{upcomingTours}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#cffafe', borderRadius: 2 }}>
              <TourIcon sx={{ color: '#06b6d4', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#0891b2', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            📅 Next {Math.min(upcomingTours, 2)} coming up
          </Typography>
        </Box>

        {/* Rating */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>RATING</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#fbbf24' }}>{guideProfile?.ratings?.toFixed(1) || '4.9'}</Typography>
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < Math.round(guideProfile?.ratings || 4.9) ? '#fbbf24' : '#d1d5db', fontSize: 14 }}>★</span>
                  ))}
                </Box>
              </Box>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: 2 }}>
              <ReviewsIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            ⭐ {completedTours} completed tours
          </Typography>
        </Box>
      </Box>

      {/* Secondary Metrics */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 4 }}>
        {/* Response Rate */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>RESPONSE RATE</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#06b6d4', mb: 1 }}>{responseRate}%</Typography>
            <Box sx={{ width: '100%', height: 4, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${responseRate}%`, bgcolor: '#06b6d4' }} />
            </Box>
            <Typography variant="caption" color="text.secondary">Quick replies to inquiries</Typography>
          </Box>
        </Box>

        {/* Completion Rate */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>COMPLETION RATE</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981', mb: 1 }}>{completionRate}%</Typography>
            <Box sx={{ width: '100%', height: 4, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${completionRate}%`, bgcolor: '#10b981' }} />
            </Box>
            <Typography variant="caption" color="text.secondary">Tours completed successfully</Typography>
          </Box>
        </Box>

        {/* Pending Approval */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>PENDING BOOKINGS</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b', mb: 1 }}>{pendingBookings}</Typography>
            <Typography variant="caption" color="text.secondary">Awaiting your response</Typography>
          </Box>
        </Box>
      </Box>

      {/* Pricing Card */}
      <Box sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 3, boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)', border: 'none', mb: 4, color: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={2} sx={{ opacity: 0.9 }}>YOUR PRICING</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
              <Typography variant="h3" fontWeight={900} sx={{ color: '#fff' }}>
                {guideProfile?.currency === 'INR' ? '₹' : '$'}{guideProfile?.price || '0'}
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ opacity: 0.9 }}>
                /{guideProfile?.rateType === 'hourly' ? 'hour' : 'day'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Currency: ${guideProfile?.currency || 'USD'}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
              />
              <Chip 
                label={`${guideProfile?.rateType === 'hourly' ? 'Hourly' : 'Daily'} Rate`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
              />
            </Box>
          </Box>
          <Box sx={{ fontSize: '3rem' }}>💰</Box>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={3}>📋 Recent Activity</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bookings.slice(0, 5).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No recent activity. Start accepting bookings!
            </Typography>
          ) : (
            bookings
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map(booking => (
                <Box key={booking._id} sx={{ display: 'flex', gap: 3, pb: 2, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' } }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: booking.status === 'confirmed' ? '#dbeafe' : booking.status === 'completed' ? '#dcfce7' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {booking.status === 'confirmed' ? '📅' : booking.status === 'completed' ? '✓' : '⏳'}
                    </span>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {booking.status === 'confirmed' ? 'Booking Confirmed' : booking.status === 'completed' ? 'Tour Completed' : 'New Booking Request'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.destination || 'Unknown destination'} • {new Date(booking.startDateTime).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: booking.status === 'confirmed' ? '#dbeafe' : booking.status === 'completed' ? '#dcfce7' : '#fef3c7',
                      color: booking.status === 'confirmed' ? '#0369a1' : booking.status === 'completed' ? '#047857' : '#b45309'
                    }}>
                      {booking.status.toUpperCase()}
                    </span>
                  </Box>
                </Box>
              ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Enhanced Tour Card Component
function TourCard({ tour, onEdit, onDelete }) {
  const bookingCount = tour.bookings?.length || 0;
  const revenue = tour.bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
  
  return (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          borderColor: '#1976d2'
        },
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Image Placeholder */}
      <Box
        sx={{
          width: '100%',
          height: 180,
          bgcolor: '#f3f4f6',
          borderRadius: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          color: '#d1d5db'
        }}
      >
        {tour.image ? (
          <img src={tour.image} alt={tour.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <TourIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
        )}
      </Box>

      {/* Tour Info */}
      <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ lineHeight: 1.3 }}>
        {tour.title || 'Untitled Tour'}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {tour.description || 'No description available'}
      </Typography>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, pb: 3, borderBottom: '1px solid #f0f0f0' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>BOOKINGS</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1976d2' }}>{bookingCount}</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>REVENUE</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#10b981' }}>₹{revenue.toFixed(0)}</Typography>
        </Box>
      </Box>

      {/* Price */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>PRICE PER DAY</Typography>
        <Typography variant="h5" fontWeight={800} sx={{ color: '#1976d2' }}>
          ₹{tour.price || '0'}
        </Typography>
      </Box>

      {/* Actions - Flex grow to push to bottom */}
      <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={onEdit}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { bgcolor: '#dbeafe' }
          }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          fullWidth
          onClick={onDelete}
          sx={{
            borderRadius: 2,
            fontWeight: 600
          }}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

// Enhanced My Tours Page
const MyToursPage = ({ tours, onCreateTour }) => {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', price: '', duration: '', description: '', image: '' });
  const [editingId, setEditingId] = React.useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'duration' ? Number(value) : value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.title || !form.price) {
      alert('Please fill in title and price');
      return;
    }
    onCreateTour(form);
    setOpen(false);
    setForm({ title: '', price: '', duration: '', description: '', image: '' });
    setEditingId(null);
  };

  const handleOpenEdit = (tour) => {
    setForm({
      title: tour.title || '',
      price: tour.price || '',
      duration: tour.duration || '',
      description: tour.description || '',
      image: tour.image || ''
    });
    setEditingId(tour._id);
    setOpen(true);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={700} mb={0.5}>My Tours</Typography>
          <Typography variant="body2" color="text.secondary">Manage and create your tour experiences</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditingId(null);
            setForm({ title: '', price: '', duration: '', description: '', image: '' });
            setOpen(true);
          }}
          sx={{ borderRadius: 2, fontWeight: 700 }}
          size="large"
        >
          + Create Tour
        </Button>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          {editingId ? 'Edit Tour' : 'Create New Tour'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Tour Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., Morning City Tour"
            />
            <TextField
              label="Price per Day (₹)"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              fullWidth
              type="number"
              placeholder="e.g., 150"
            />
            <TextField
              label="Duration (days)"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              fullWidth
              type="number"
              placeholder="e.g., 5"
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe your tour experience..."
            />
            <TextField
              label="Image URL"
              name="image"
              value={form.image}
              onChange={handleChange}
              fullWidth
              placeholder="https://example.com/image.jpg"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingId ? 'Update Tour' : 'Create Tour'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Tours Grid */}
      {tours.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: '#f9fafb', borderRadius: 3, border: '2px dashed #e5e7eb' }}>
          <TourIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={1}>No tours yet</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first tour to start accepting bookings from tourists
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setEditingId(null);
              setForm({ title: '', price: '', duration: '', description: '', image: '' });
              setOpen(true);
            }}
          >
            Create Your First Tour
          </Button>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          }
        }}>
          {tours.map(tour => (
            <TourCard
              key={tour._id || tour.id}
              tour={tour}
              onEdit={() => handleOpenEdit(tour)}
              onDelete={() => {
                if (confirm('Are you sure?')) {
                  // Call delete API
                }
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
import BookingsDataGrid from '../components/BookingsDataGrid';
const BookingsPage = ({ bookings, refreshBookings }) => (
  <Box>
    <Typography variant="h5" fontWeight={700} mb={3}>Bookings</Typography>
    <BookingsDataGrid bookings={bookings} onStatusChange={refreshBookings} />
  </Box>
);
import BookingCalendar from '../components/BookingCalendar';
const CalendarPage = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} mb={3}>Calendar</Typography>
    <BookingCalendar />
  </Box>
);

import GuideChatPanel from './components/GuideChatPanel';

// Placeholder for MessagesPage
function MessagesPage({ user }) {
  return user ? <GuideChatPanel guideId={user._id} /> : null;
}



export default function GuideDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [guideProfile, setGuideProfile] = useState(null);
  const [tours, setTours] = useState([]);
  const [selected, setSelected] = useState('Dashboard');
  const [open, setOpen] = useState(true);
  const socketRef = useRef(null);
// ...existing code...

  // Move fetchGuideData to top-level so it's available in JSX
  const fetchGuideData = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;
      const userObj = JSON.parse(storedUser);
      // Fetch guide profile
      const profileRes = await api.get(`/guide/profile/${userObj._id}`);
      setGuideProfile(profileRes.data.guide);
      // Fetch bookings for this guide
      const bookingsRes = await api.get(`/booking/guide/${userObj._id}`);
      console.log('[DEBUG] GuideDashboard fetched bookings:', bookingsRes.data.bookings);
      if (Array.isArray(bookingsRes.data.bookings)) {
        bookingsRes.data.bookings.forEach((b, i) => {
          console.log(`[DEBUG] Booking #${i}: status="${b.status}", destination="${b.destination}"`);
        });
      }
      setBookings(bookingsRes.data.bookings || []);
      // Fetch tours for this guide
      const toursRes = await api.get(`/tour/guide/${userObj._id}`);
      setTours(toursRes.data.tours || []);
    } catch (err) {
      console.log('[DEBUG] GuideDashboard fetch error:', err);
    }
  };

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login', { replace: true });
      return;
    }
    const userObj = JSON.parse(storedUser);
    if ((userObj.role || '').toLowerCase() !== 'guide') {
      navigate('/login', { replace: true });
      return;
    }
    setUser(userObj);
    fetchGuideData();

    // Setup socket connection for real-time booking updates
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:3001');
    }
    const socket = socketRef.current;
    
    // Emit guide online status
    socket.emit('guideOnline', { guideId: userObj._id });
    
    // Join guide room for real-time updates
    socket.emit('joinGuideRoom', { guideId: userObj._id });
    // Listen for booking updates
    socket.on('bookingUpdate', (data) => {
      // Only refresh if the update is for this guide
      if (data && data.guideId === userObj._id) {
        console.log('[DEBUG] Received bookingUpdate event:', data);
        fetchGuideData();
      }
    });
    return () => {
      if (socket) {
        socket.off('bookingUpdate');
        socket.disconnect();
      }
    };
  }, [navigate]);

  // ProfilePage now uses guideProfile
  const ProfilePage = () => {
    const languageOptions = [
      'English',
      'Hindi',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Chinese (Mandarin)',
      'Chinese (Cantonese)',
      'Japanese',
      'Russian',
      'Arabic',
      'Other (please specify)'
    ];

    const [edit, setEdit] = useState(false);
    const [form, setForm] = useState({
      name: user?.name || '',
      email: user?.email || '',
      phone: guideProfile?.phone || user?.phone || '',
      language: guideProfile?.languages?.[0] || '',
      customLanguage: '',
      bio: guideProfile?.bio || '',
      price: guideProfile?.price ?? 0,
      currency: guideProfile?.currency || 'USD',
      rateType: guideProfile?.rateType || 'daily',
      avatar: user?.avatar || '',
    });
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = React.useRef();

    useEffect(() => {
      // Prefer avatar from user, fallback to guideProfile.userId.avatar if available
      const avatar = user?.avatar || guideProfile?.userId?.avatar || '';
      
      // Handle languages - extract name if it's an object array
      let languageName = '';
      if (guideProfile?.languages && Array.isArray(guideProfile.languages)) {
        if (guideProfile.languages[0]) {
          languageName = typeof guideProfile.languages[0] === 'string' 
            ? guideProfile.languages[0]
            : guideProfile.languages[0].name || '';
        }
      }
      
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: guideProfile?.phone || user?.phone || '',
        language: languageName,
        customLanguage: '',
        bio: guideProfile?.bio || '',
        price: guideProfile?.price ?? 0,
        currency: guideProfile?.currency || 'USD',
        rateType: guideProfile?.rateType || 'daily',
        avatar,
      });
      setAvatarPreview(avatar);
    }, [user, guideProfile]);

    const handleChange = e => {
      const { name, value } = e.target;
      setForm({ ...form, [name]: name === 'price' ? Number(value) : value });
    };

    const handleAvatarChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await api.post('/guideAvatar/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setForm(f => ({ ...f, avatar: res.data.avatar }));
        setAvatarPreview(res.data.avatar);
        setSuccessMsg('Photo updated!');
        // Update user in localStorage so avatar persists after refresh
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar = res.data.avatar;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (err) {
        setErrorMsg('Failed to upload avatar');
      } finally {
        setUploading(false);
      }
    };

    const handleSubmit = async e => {
      e.preventDefault();
      setErrorMsg('');
      setSuccessMsg('');
      try {
        // Use customLanguage if "Other" is selected, otherwise use selected language
        const selectedLanguage = form.language === 'Other (please specify)' 
          ? form.customLanguage 
          : form.language;
        
        if (!selectedLanguage) {
          setErrorMsg('Please select or specify a language');
          return;
        }
        
        const payload = {
          bio: form.bio,
          languages: [selectedLanguage],
          phone: form.phone,
          price: Number(form.price) || 0,
          currency: form.currency,
          rateType: form.rateType,
        };
        console.log('Sending payload:', payload);
        const response = await api.put('/guide/profile', payload);
        console.log('Update response:', response.data);
        setSuccessMsg('Profile updated!');
      } catch (err) {
        console.error('Update error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to update profile');
      }
    };

    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', bgcolor: '#fafaf6', p: 4, borderRadius: 4, boxShadow: 2 }}>
        <Typography variant="h4" fontWeight={700} mb={1} sx={{ fontFamily: 'serif' }}>My Profile</Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={3}>
          Manage your account settings and preferences
        </Typography>
        {successMsg && (
          <Box mb={2}>
            <span style={{ color: 'green', fontWeight: 600 }}>{successMsg}</span>
          </Box>
        )}
        {errorMsg && (
          <Box mb={2}>
            <span style={{ color: 'red', fontWeight: 600 }}>{errorMsg}</span>
          </Box>
        )}
        <form onSubmit={handleSubmit}>
          <Box mb={2} display="flex" alignItems="center" gap={2}>
            <img
              src={avatarPreview ? (avatarPreview.startsWith('http') ? avatarPreview : `http://localhost:3001${avatarPreview}`) : '/avatar.png'}
              alt="Avatar"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ccc' }}
            />
            <Button
              variant="outlined"
              component="label"
              disabled={uploading}
              sx={{ height: 40 }}
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handleAvatarChange}
              />
            </Button>
          </Box>
          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><ProfileIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Full Name</Typography>
            <TextField fullWidth name="name" value={form.name} onChange={handleChange} disabled sx={{ bgcolor: '#f8f8f2' }} />
          </Box>
          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><ProfileIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Email Address</Typography>
            <TextField fullWidth name="email" value={form.email} disabled sx={{ bgcolor: '#f8f8f2' }} />
            <Typography variant="caption" color="text.secondary">Email cannot be changed</Typography>
          </Box>
          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><span role="img" aria-label="phone">📞</span> Phone Number</Typography>
            <TextField fullWidth name="phone" value={form.phone} onChange={handleChange} sx={{ bgcolor: '#f8f8f2' }} />
          </Box>
          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><span role="img" aria-label="language">🌐</span> Preferred Language</Typography>
            <TextField
              select
              fullWidth
              name="language"
              value={form.language}
              onChange={handleChange}
              sx={{ bgcolor: '#f8f8f2' }}
            >
              <MenuItem value="">Select a language</MenuItem>
              {languageOptions.map((lang) => (
                <MenuItem key={lang} value={lang}>{lang}</MenuItem>
              ))}
            </TextField>
            {form.language === 'Other (please specify)' && (
              <TextField
                fullWidth
                label="Please specify your language"
                name="customLanguage"
                value={form.customLanguage}
                onChange={handleChange}
                placeholder="e.g., Korean, Dutch, Swedish"
                sx={{ bgcolor: '#f8f8f2', mt: 1.5 }}
              />
            )}
          </Box>

          {/* PRICING SETTINGS */}
          <Box sx={{ bgcolor: '#f3f7fb', p: 3, borderRadius: 2, border: '2px solid #e0e7ff', mb: 2 }}>
            <Typography fontWeight={700} mb={2.5} sx={{ fontSize: '1.1rem', color: '#1f2937' }}>💰 Pricing Settings</Typography>
            
            {/* Price Input */}
            <Box mb={2}>
              <Typography fontWeight={600} mb={0.8} sx={{ fontSize: '0.95rem' }}>Set Your Rate</Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="Amount"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  type="number"
                  inputProps={{ step: "0.01", min: "0" }}
                  sx={{ flex: 1, bgcolor: '#fff' }}
                  placeholder="e.g., 50"
                />
                
                {/* Currency Selector */}
                <TextField
                  select
                  label="Currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  sx={{ width: 110, bgcolor: '#fff' }}
                >
                  <MenuItem value="USD">$ USD</MenuItem>
                  <MenuItem value="INR">₹ INR</MenuItem>
                </TextField>

                {/* Rate Type Selector */}
                <TextField
                  select
                  label="Rate Type"
                  name="rateType"
                  value={form.rateType}
                  onChange={handleChange}
                  sx={{ width: 110, bgcolor: '#fff' }}
                >
                  <MenuItem value="hourly">/Hour</MenuItem>
                  <MenuItem value="daily">/Day</MenuItem>
                </TextField>
              </Stack>
            </Box>

            {/* Rate Preview */}
            <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, borderRadius: 1.5, border: '1px solid #81c784', mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                📊 Your Rate: <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1b5e20' }}>
                  {form.currency === 'USD' ? '$' : '₹'}{form.price}
                </span> per {form.rateType === 'hourly' ? 'hour' : 'day'}
              </Typography>
            </Box>

            {/* Currency Conversion Info */}
            <Box sx={{ bgcolor: '#fff3cd', p: 1.5, borderRadius: 1.5, border: '1px solid #ffc107' }}>
              <Typography variant="caption" sx={{ color: '#856404', fontWeight: 600 }}>
                💡 {form.currency === 'USD' 
                  ? `Equivalent: ₹${(form.price * 83).toFixed(2)}/day (approx. @83 INR/USD)`
                  : `Equivalent: $${(form.price / 83).toFixed(2)}/day (approx. @83 INR/USD)`
                }
              </Typography>
            </Box>

            {/* Pricing Tiers Info */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e7ff' }}>
              <Typography fontWeight={600} sx={{ fontSize: '0.95rem', mb: 1.5, color: '#4f46e5' }}>📈 Pricing Recommendations</Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #ddd' }}>
                  <Box>
                    <Typography variant="caption" fontWeight={600}>Budget Guide</Typography>
                    <Typography variant="caption" color="text.secondary">Good for starting out</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#10b981' }}>₹1,600-4,000</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe', background: form.price >= 50 && form.price <= 100 ? '#dbeafe' : '#ffffff' }}>
                  <Box>
                    <Typography variant="caption" fontWeight={600}>Standard Guide</Typography>
                    <Typography variant="caption" color="text.secondary">Most popular choice</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#1976d2' }}>₹4,000-8,000</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#faf5ff', borderRadius: 1, border: '1px solid #e9d5ff' }}>
                  <Box>
                    <Typography variant="caption" fontWeight={600}>Premium Guide</Typography>
                    <Typography variant="caption" color="text.secondary">Expert with high ratings</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#9333ea' }}>₹8,000+</Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Box mb={2}>
            <Typography fontWeight={600} mb={0.5}><span role="img" aria-label="bio">📝</span> Bio</Typography>
            <TextField fullWidth name="bio" value={form.bio} onChange={handleChange} multiline rows={2} sx={{ bgcolor: '#f8f8f2' }} />
          </Box>
          <Button type="submit" variant="contained" color="success" fullWidth sx={{ borderRadius: 8, py: 1.5, fontWeight: 700, fontSize: 18, mt: 2 }}>
            Save Changes
          </Button>
        </form>
      </Box>
    );
  };

  const SettingsPage = () => (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>⚙️ Settings</Typography>
      <Box sx={{ maxWidth: 600 }}>
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={3}>Account Settings</Typography>
          
          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Notifications</Typography>
            <Typography variant="body2" color="text.secondary">Manage how we communicate with you</Typography>
          </Box>

          <Box mb={3} pb={3} borderBottom="1px solid #e5e7eb">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>Email Notifications</Typography>
                <Typography variant="caption" color="text.secondary">Receive updates about bookings</Typography>
              </Box>
              <Button size="small" variant="outlined">Enable</Button>
            </Box>
          </Box>

          <Box mb={3} pb={3} borderBottom="1px solid #e5e7eb">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>SMS Alerts</Typography>
                <Typography variant="caption" color="text.secondary">Get instant alerts on your phone</Typography>
              </Box>
              <Button size="small" variant="outlined">Configure</Button>
            </Box>
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={700} mb={3}>Security</Typography>
            <Button fullWidth variant="outlined" sx={{ mb: 2, justifyContent: 'flex-start' }}>
              🔐 Change Password
            </Button>
            <Button fullWidth variant="outlined" sx={{ justifyContent: 'flex-start' }}>
              🔑 Two-Factor Authentication
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // Handle create tour
  const handleCreateTour = async (tourData) => {
    try {
      const res = await api.post(`/travelogue/submit`, {
        ...tourData,
        guideId: user._id
      });
      setTours(prev => [...prev, res.data.travelogue]);
      alert('Tour created successfully!');
    } catch (err) {
      alert('Failed to create tour: ' + (err.response?.data?.message || err.message));
    }
  };

  const pageMap = {
    Dashboard: <DashboardPage user={user} bookings={bookings} guideProfile={guideProfile} tours={tours} />,
    'My Tours': <MyToursPage tours={tours} onCreateTour={handleCreateTour} />,
    Bookings: <BookingsPage bookings={bookings} refreshBookings={fetchGuideData} />,
    Calendar: <CalendarPage />,
    Messages: <MessagesPage user={user} />,
    Earnings: <EarningsPage bookings={bookings} />,
    Reviews: <ReviewsPage user={user} guideProfile={guideProfile} />,
    Profile: <ProfilePage />,
    Settings: <SettingsPage />,
  };

  // Debug logging
  console.log('GuideDashboard user:', user);
  console.log('GuideDashboard guideProfile:', guideProfile);
  console.log('GuideDashboard selected:', selected);

  // Loading state
  if (!user) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h5">Loading user...</Typography>
      </Box>
    );
  }

  // Error/fallback state
  if (!pageMap[selected]) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h5" color="error">Invalid dashboard section: {selected}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
        <CssBaseline />
        {/* Sidebar */}
        <Drawer variant="permanent" open={open} sx={{ position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 1200 }}>
          <Toolbar />
          <Divider />
          <List>
            {navItems.map((item) => (
              <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    borderRadius: 2,
                    my: 0.5,
                    background: selected === item.label ? alpha(theme.palette.primary.main, 0.08) : 'none',
                    transition: 'background 0.2s',
                  }}
                  selected={selected === item.label}
                  onClick={() => setSelected(item.label)}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: selected === item.label ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        {/* Main Content */}
        <Box sx={{ flex: 1, marginLeft: `${drawerWidth}px`, width: `calc(100% - ${drawerWidth}px)`, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <AppBar position="fixed" open={open} elevation={0} color="inherit" sx={{ left: `${drawerWidth}px`, width: `calc(100% - ${drawerWidth}px)`, backdropFilter: 'blur(8px)', background: glassBg(theme) }}>
            <Toolbar>
              <IconButton color="inherit" aria-label="open drawer" onClick={() => setOpen(!open)} edge="start" sx={{ mr: 2 }}>
                {open ? <ChevronLeftIcon /> : <MenuIcon />}
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                Guide Dashboard
              </Typography>
              <Tooltip title="Profile">
                <Avatar sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>G</Avatar>
              </Tooltip>
            </Toolbar>
          </AppBar>
          <Main open={open} sx={{ pt: 10 }}>
            {/* Add top padding to avoid AppBar overlap */}
            {pageMap[selected]}
          </Main>
        </Box>
      </Box>
    </ThemeProvider>
  );
}




