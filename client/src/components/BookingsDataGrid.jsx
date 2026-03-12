
import * as React from 'react';
import { Box, Button, Chip, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, Tabs, Tab, Grid, Avatar } from '@mui/material';
import api from '../api';

const getStatusConfig = (status) => {
  const configs = {
    pending: { color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳', label: 'Pending' },
    confirmed: { color: '#f59e0b', bgColor: '#fef3c7', icon: '⏳', label: 'Confirmed' },
    accepted: { color: '#10b981', bgColor: '#d1fae5', icon: '✅', label: 'Accepted' },
    completed: { color: '#06b6d4', bgColor: '#cffafe', icon: '✓', label: 'Completed' },
    rejected: { color: '#ef4444', bgColor: '#fee2e2', icon: '❌', label: 'Rejected' },
    cancelled: { color: '#ef4444', bgColor: '#fee2e2', icon: '✕', label: 'Cancelled' },
  };
  return configs[status?.toLowerCase()] || configs.pending;
};

const BookingCard = ({ booking, isLoading, onAccept, onReject, onChat, onMessage, onCompleteTour }) => {
  const status = booking.status?.toLowerCase() || 'pending';
  const statusConfig = getStatusConfig(status);
  
  let dateRange = '';
  if (booking.startDateTime && booking.endDateTime) {
    const start = new Date(booking.startDateTime);
    const end = new Date(booking.endDateTime);
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      dateRange = `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  }

  const canAccept = status === 'pending';
  const canReject = status === 'pending';
  const canCompleteTour = status === 'confirmed' || status === 'accepted';

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 3,
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          transform: 'translateY(-4px)',
          borderColor: '#1976d2'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2.5 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ bgcolor: '#dbeafe', color: '#1976d2', fontWeight: 700 }}>
              {booking.touristId?.name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1 }}>
                {booking.touristId?.name || 'Unknown Tourist'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {booking.touristId?.email || 'No email'}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Status Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: statusConfig.bgColor,
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: 16 }}>{statusConfig.icon}</span>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: statusConfig.color }}>
            {statusConfig.label}
          </Typography>
        </Box>
      </Box>

      {/* Details Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Tour/Destination */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              📍 DESTINATION
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {booking.destination || 'Not specified'}
            </Typography>
          </Box>
        </Grid>

        {/* Date & Time */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              📅 DATE & TIME
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {dateRange || 'Not set'}
            </Typography>
          </Box>
        </Grid>

        {/* Amount */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              💰 AMOUNT
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#1976d2' }}>
              ${booking.price || 0}
            </Typography>
          </Box>
        </Grid>

        {/* Booking Date */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
              📌 BOOKED ON
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {new Date(booking.createdAt || booking.startDateTime).toLocaleDateString()}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Accept Button */}
        {canAccept && (
          <Button
            variant="contained"
            sx={{
              flex: 1,
              minWidth: 120,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#10b981',
              padding: '10px 20px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              '&:hover': {
                bgcolor: '#059669',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
              },
              '&:disabled': {
                bgcolor: '#d1d5db'
              }
            }}
            onClick={onAccept}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            ✅ Accept
          </Button>
        )}

        {/* Reject Button */}
        {canReject && (
          <Button
            variant="outlined"
            sx={{
              flex: 1,
              minWidth: 120,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              borderColor: '#ef4444',
              color: '#ef4444',
              borderWidth: 2,
              padding: '10px 20px',
              '&:hover': {
                bgcolor: '#fee2e2',
                borderColor: '#ef4444'
              },
              '&:disabled': {
                borderColor: '#d1d5db',
                color: '#d1d5db'
              }
            }}
            onClick={onReject}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            ❌ Reject
          </Button>
        )}

        {/* Complete Tour Button - Only for confirmed/accepted */}
        {canCompleteTour && (
          <Button
            variant="contained"
            sx={{
              flex: 1,
              minWidth: 120,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#06b6d4',
              padding: '10px 20px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              '&:hover': {
                bgcolor: '#0891b2',
                boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)'
              },
              '&:disabled': {
                bgcolor: '#d1d5db'
              }
            }}
            onClick={() => onCompleteTour && onCompleteTour(booking)}
            disabled={isLoading}
          >
            ✓ Complete Tour
          </Button>
        )}

        {/* Chat Button */}
        <Button
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 120,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            borderColor: '#1976d2',
            color: '#1976d2',
            borderWidth: 2,
            padding: '10px 20px',
            '&:hover': {
              bgcolor: '#dbeafe'
            }
          }}
          onClick={onChat}
        >
          💬 Chat
        </Button>

        {/* Send Message Button - Only show for confirmed/accepted */}
        {(status === 'confirmed' || status === 'accepted' || status === 'completed') && (
          <Button
            variant="contained"
            sx={{
              flex: 1,
              minWidth: 120,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: '#06b6d4',
              padding: '10px 20px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
              '&:hover': {
                bgcolor: '#0891b2',
                boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)'
              }
            }}
            onClick={onMessage}
          >
            📧 Message
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default function BookingsDataGrid({ bookings = [], onStatusChange, onChat }) {
  const [msgDialogOpen, setMsgDialogOpen] = React.useState(false);
  const [msgText, setMsgText] = React.useState('');
  const [msgLoading, setMsgLoading] = React.useState(false);
  const [msgSuccess, setMsgSuccess] = React.useState(false);
  const [msgError, setMsgError] = React.useState('');
  const [msgBooking, setMsgBooking] = React.useState(null);
  const [completeTourDialogOpen, setCompleteTourDialogOpen] = React.useState(false);
  const [completionMessage, setCompletionMessage] = React.useState('');
  const [completionLoading, setCompletionLoading] = React.useState(false);
  const [completionError, setCompletionError] = React.useState('');
  const [loadingIds, setLoadingIds] = React.useState([]);
  const [filterTab, setFilterTab] = React.useState('all');

  // Log when bookings change for debugging
  React.useEffect(() => {
    console.log('[BookingsDataGrid] Bookings updated:', bookings.map(b => ({
      id: b._id,
      status: b.status,
      destination: b.destination
    })));
  }, [bookings]);

  const handleStatus = async (id, status) => {
    setLoadingIds((prev) => [...prev, id]);
    try {
      await api.patch(`/booking/status/${id}`, { status });
      // Add a small delay to allow backend to process the change
      await new Promise(res => setTimeout(res, 300));
      if (onStatusChange) onStatusChange();
    } catch (err) {
      alert('Failed to update booking status: ' + (err.response?.data?.message || err.message));
    }
    setLoadingIds((prev) => prev.filter((x) => x !== id));
  };

  const handleOpenMsgDialog = (booking) => {
    setMsgBooking(booking);
    setMsgText('');
    setMsgDialogOpen(true);
    setMsgError('');
  };

  const handleSendMsg = async () => {
    if (!msgText.trim()) {
      setMsgError('Message cannot be empty.');
      return;
    }
    setMsgLoading(true);
    setMsgError('');
    try {
      console.log('[BookingsDataGrid] Sending notification:', {
        bookingId: msgBooking._id,
        message: msgText
      });
      
      // Send notification to tourist (not chat message)
      const response = await api.post('/notifications/guide/complete-tour', {
        bookingId: msgBooking._id,
        message: msgText
      });
      
      console.log('[BookingsDataGrid] Notification sent successfully:', response.data);
      
      setMsgSuccess(true);
      setMsgDialogOpen(false);
      setMsgText('');
      
      console.log('[DEBUG] Notification sent successfully to tourist');
    } catch (e) {
      console.error('[BookingsDataGrid] Failed to send notification:', e);
      setMsgError('Failed to send notification: ' + (e.response?.data?.error || e.message));
    }
    setMsgLoading(false);
  };

  const handleOpenCompleteTourDialog = (booking) => {
    setMsgBooking(booking);
    setCompletionMessage('Thank you for booking my tour! I hope you enjoyed the experience. Please leave a review.');
    setCompletionError('');
    setCompleteTourDialogOpen(true);
  };

  const handleCompleteTour = async () => {
    if (!completionMessage.trim()) {
      setCompletionError('Please write a completion message for the tourist.');
      return;
    }
    setCompletionLoading(true);
    setCompletionError('');
    try {
      console.log('[BookingsDataGrid] Completing tour:', {
        bookingId: msgBooking._id,
        message: completionMessage
      });
      
      // Get the current user/token info from localStorage
      const userStr = localStorage.getItem('user');
      const tokenStr = localStorage.getItem('token');
      console.log('[BookingsDataGrid] User info:', { user: userStr ? JSON.parse(userStr) : 'none', hasToken: !!tokenStr });
      
      // Mark the booking as completed - this endpoint creates the notification internally
      const completeRes = await api.post(`/booking/complete/${msgBooking._id}`, {
        message: completionMessage
      });
      
      console.log('[BookingsDataGrid] Booking marked as completed and notification sent:', completeRes.data);
      
      setMsgSuccess(true);
      setCompleteTourDialogOpen(false);
      setCompletionMessage('');
      setMsgBooking(null);
      
      // Refresh bookings to reflect the change
      if (onStatusChange) {
        onStatusChange();
      }
      
      console.log('[DEBUG] Tour completion flow completed successfully');
    } catch (e) {
      console.error('[BookingsDataGrid] Failed to complete tour:', e);
      const errorMsg = e.response?.data?.message || e.response?.data?.error || e.message;
      setCompletionError('Failed to complete tour: ' + errorMsg);
    }
    setCompletionLoading(false);
  };
  const filteredBookings = filterTab === 'all' 
    ? bookings 
    : bookings.filter(b => b.status?.toLowerCase() === filterTab);

  // Calculate counts for all status types
  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status?.toLowerCase() === 'pending').length,
    confirmed: bookings.filter(b => b.status?.toLowerCase() === 'confirmed').length,
    completed: bookings.filter(b => b.status?.toLowerCase() === 'completed').length,
    cancelled: bookings.filter(b => b.status?.toLowerCase() === 'cancelled').length,
  };

  // Loading/empty state
  if (!bookings) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <CircularProgress size={40} color="primary" />
      </Box>
    );
  }

  if (bookings.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, p: 4, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: '#9ca3af' }}>
          📭 No Bookings Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          When tourists book your tours, they'll appear here
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Filter Tabs */}
      <Box sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, border: '1px solid #e5e7eb', p: 2 }}>
        <Tabs
          value={filterTab}
          onChange={(e, val) => setFilterTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              color: '#6b7280',
              '&.Mui-selected': {
                color: '#1976d2',
              }
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#1976d2',
              height: 3
            }
          }}
        >
          <Tab label={`All (${counts.all})`} value="all" />
          <Tab label={`⏳ Pending (${counts.pending})`} value="pending" />
          <Tab label={`⏳ Confirmed (${counts.confirmed})`} value="confirmed" />
          <Tab label={`✓ Completed (${counts.completed})`} value="completed" />
          <Tab label={`✕ Cancelled (${counts.cancelled})`} value="cancelled" />
        </Tabs>
      </Box>

      {/* Bookings Grid */}
      <Grid container spacing={3}>
        {filteredBookings.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">No bookings in this category yet</Typography>
            </Box>
          </Grid>
        ) : (
          filteredBookings.map((booking, idx) => (
            <Grid item xs={12} md={6} lg={4} key={booking._id || idx}>
              <BookingCard
                booking={booking}
                isLoading={loadingIds.includes(booking._id)}
                onAccept={() => handleStatus(booking._id, 'accepted')}
                onReject={() => handleStatus(booking._id, 'rejected')}
                onChat={() => onChat && onChat(booking)}
                onMessage={() => handleOpenMsgDialog(booking)}
                onCompleteTour={() => handleOpenCompleteTourDialog(booking)}
              />
            </Grid>
          ))
        )}
      </Grid>

      {/* Message Dialog */}
      <Dialog open={msgDialogOpen} onClose={() => setMsgDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          📧 Send Message
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
            To: {msgBooking?.touristId?.name || 'Tourist'}
          </Typography>
          <TextField
            autoFocus
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            placeholder="Write your message..."
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            disabled={msgLoading}
            error={!!msgError}
            helperText={msgError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setMsgDialogOpen(false)} disabled={msgLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSendMsg}
            variant="contained"
            disabled={msgLoading}
            sx={{ minWidth: 100 }}
          >
            {msgLoading ? <CircularProgress size={18} color="inherit" /> : '📧 Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Tour Dialog */}
      <Dialog open={completeTourDialogOpen} onClose={() => setCompleteTourDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          ✓ Complete Tour
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
            Tourist: {msgBooking?.touristId?.name || 'Tourist'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Write a message to send with the tour completion request. The tourist will receive this notification and can then leave a review.
          </Typography>
          <TextField
            autoFocus
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            placeholder="Thank you for booking my tour! I hope you enjoyed the experience. Please leave a review."
            value={completionMessage}
            onChange={e => setCompletionMessage(e.target.value)}
            disabled={completionLoading}
            error={!!completionError}
            helperText={completionError}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCompleteTourDialogOpen(false)} disabled={completionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteTour}
            variant="contained"
            disabled={completionLoading}
            sx={{ 
              minWidth: 100,
              bgcolor: '#06b6d4',
              '&:hover': {
                bgcolor: '#0891b2'
              }
            }}
          >
            {completionLoading ? <CircularProgress size={18} color="inherit" /> : '✓ Complete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar open={msgSuccess} autoHideDuration={3000} onClose={() => setMsgSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setMsgSuccess(false)} severity="success" variant="filled" sx={{ fontWeight: 600 }}>
          ✅ Message sent successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
