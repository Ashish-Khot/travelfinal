import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button, Card, CardContent, Grid, TextField, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress, Checkbox, Tabs, Tab, useTheme, alpha } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RestoreIcon from '@mui/icons-material/Restore';
import FlagIcon from '@mui/icons-material/Flag';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { motion } from 'framer-motion';
import api from '../../src/api';
import { notificationManager } from '../services/notificationService';
import { exportToCSV } from '../services/exportService';
import BulkActionToolbar from '../components/BulkActionToolbar';

const ReviewManagement = () => {
  const theme = useTheme();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [reviewType, setReviewType] = useState('guide');
  const [selectedReview, setSelectedReview] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkApproveDialog, setBulkApproveDialog] = useState(false);
  const [bulkHideDialog, setBulkHideDialog] = useState(false);
  const [bulkFlagDialog, setBulkFlagDialog] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    hidden: '',
    flagged: '',
    search: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const apiBase = reviewType === 'hotel' ? '/adminHotelReview' : '/adminReview';
  const placeHeader = reviewType === 'hotel' ? 'Hotel' : 'Place';

  // Fetch reviews
  const fetchReviews = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.hidden !== '') params.append('hidden', filters.hidden);
      if (filters.flagged !== '') params.append('flagged', filters.flagged);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`${apiBase}/all-reviews?${params}`);
      setReviews(response.data.reviews || []);
      setPagination(prev => ({ ...prev, page }));
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get(`${apiBase}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReviews(1);
    fetchStats();
    setSelectedReviews(new Set());
    setSelectedReview(null);
  }, [reviewType]);

  // Apply filters
  useEffect(() => {
    fetchReviews(1);
  }, [filters]);

  // Scan all reviews
  const handleScanAll = async () => {
    setScanning(true);
    try {
      const response = await api.post(`${apiBase}/scan-all`);
      alert(`✅ Scanned ${response.data.scanned} reviews\n🚩 Flagged: ${response.data.flagged} reviews`);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error scanning reviews');
    } finally {
      setScanning(false);
    }
  };

  // Hide review
  const handleHide = async (reviewId) => {
    const reason = prompt('Enter reason for hiding:');
    if (!reason) return;
    try {
      await api.put(`${apiBase}/hide/${reviewId}`, { reason });
      alert('✅ Review hidden');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error hiding review');
    }
  };

  // Unhide review
  const handleUnhide = async (reviewId) => {
    try {
      await api.put(`${apiBase}/unhide/${reviewId}`);
      alert('✅ Review unhidden');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error unhiding review');
    }
  };

  // Delete review
  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure?')) return;
    const reason = prompt('Enter reason for deletion:');
    if (!reason) return;
    try {
      await api.delete(`${apiBase}/delete/${reviewId}`, { data: { reason } });
      alert('✅ Review deleted');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      alert('Error deleting review');
    }
  };

  // Restore review
  const handleRestore = async (reviewId) => {
    try {
      await api.put(`${apiBase}/restore/${reviewId}`);
      notificationManager.success('Review restored successfully');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error restoring review');
    }
  };

  // Bulk action handlers
  const handleSelectReview = (reviewId) => {
    const updated = new Set(selectedReviews);
    if (updated.has(reviewId)) {
      updated.delete(reviewId);
    } else {
      updated.add(reviewId);
    }
    setSelectedReviews(updated);
  };

  const handleSelectAll = () => {
    if (selectedReviews.size === reviews.length) {
      setSelectedReviews(new Set());
    } else {
      setSelectedReviews(new Set(reviews.map(r => r._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteReason.trim()) {
      notificationManager.error('Please provide a reason for deletion');
      return;
    }
    try {
      await api.post(`${apiBase}/bulk-delete`, {
        reviewIds: Array.from(selectedReviews),
        reason: bulkDeleteReason,
      });
      notificationManager.success(`${selectedReviews.size} reviews deleted`);
      setSelectedReviews(new Set());
      setBulkDeleteDialog(false);
      setBulkDeleteReason('');
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error deleting reviews');
    }
  };

  const handleBulkApprove = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'approve',
      });
      notificationManager.success(`${selectedReviews.size} reviews approved`);
      setSelectedReviews(new Set());
      setBulkApproveDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error approving reviews');
    }
  };

  const handleBulkHide = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'hide',
      });
      notificationManager.success(`${selectedReviews.size} reviews hidden`);
      setSelectedReviews(new Set());
      setBulkHideDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error hiding reviews');
    }
  };

  const handleBulkFlag = async () => {
    try {
      await api.post(`${apiBase}/bulk-action`, {
        reviewIds: Array.from(selectedReviews),
        action: 'flag',
      });
      notificationManager.success(`${selectedReviews.size} reviews flagged`);
      setSelectedReviews(new Set());
      setBulkFlagDialog(false);
      fetchReviews(pagination.page);
      fetchStats();
    } catch (error) {
      notificationManager.error('Error flagging reviews');
    }
  };

  const handleBulkExport = () => {
    if (selectedReviews.size === 0) {
      notificationManager.warning('Please select reviews to export');
      return;
    }
    const selectedData = reviews.filter(r => selectedReviews.has(r._id));
    const exportData = selectedData.map(r => ({
      'Type': reviewType === 'hotel' ? 'Hotel' : 'Guide',
      'Target': r.place || r.hotelId?.name || r.guideId?.name || 'Unknown',
      'Rating': r.rating,
      'Comment': r.comment,
      'Status': r.status,
      'Hidden': r.isHidden ? 'Yes' : 'No',
      'Flagged': r.aiModeration?.isFlagged ? 'Yes' : 'No',
      'Risk Score': r.aiModeration?.confidence || 'N/A',
      'Reviewer': r.userId?.name || r.touristId?.name || 'Unknown',
      'Date': new Date(r.createdAt).toLocaleDateString(),
    }));
    exportToCSV(exportData, 'reviews-export');
    notificationManager.success('Reviews exported successfully');
  };

  const clearSelection = () => {
    setSelectedReviews(new Set());
  };

  const getRiskBadgeColor = (confidence) => {
    if (confidence >= 80) return '#ef5350';
    if (confidence >= 50) return '#ff9800';
    if (confidence >= 30) return '#fbc02d';
    return '#66bb6a';
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
          📋 Review Management
        </Typography>
        <Tabs
          value={reviewType}
          onChange={(event, value) => setReviewType(value)}
          sx={{ mb: 2 }}
        >
          <Tab label="Guide Reviews" value="guide" />
          <Tab label="Hotel Reviews" value="hotel" />
        </Tabs>
      </motion.div>

      {/* Statistics */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.1)}, ${alpha('#3b82f6', 0.05)})` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Total Reviews</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.totalReviews}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha('#22c55e', 0.2)}`, background: `linear-gradient(135deg, ${alpha('#22c55e', 0.1)}, ${alpha('#22c55e', 0.05)})` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Visible</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.visibleReviews}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha('#ef4444', 0.2)}`, background: `linear-gradient(135deg, ${alpha('#ef4444', 0.1)}, ${alpha('#ef4444', 0.05)})` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Hidden</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.hiddenReviews}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha('#fbbf24', 0.2)}`, background: `linear-gradient(135deg, ${alpha('#fbbf24', 0.1)}, ${alpha('#fbbf24', 0.05)})` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Flagged</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.flaggedReviews}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${alpha('#a78bfa', 0.2)}`, background: `linear-gradient(135deg, ${alpha('#a78bfa', 0.1)}, ${alpha('#a78bfa', 0.05)})` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Deleted</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{stats.deletedReviews}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleScanAll}
          disabled={scanning}
          startIcon={scanning ? <CircularProgress size={20} /> : <RateReviewIcon />}
        >
          {scanning ? 'Scanning...' : '🤖 AI Scan All'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => { fetchReviews(pagination.page); fetchStats(); }}
        >
          🔄 Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>🔍 Filters</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder={`Search by ${placeHeader.toLowerCase()}/comment...`}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.hidden}
              onChange={(e) => setFilters({ ...filters, hidden: e.target.value })}
            >
              <MenuItem value="">All (Visibility)</MenuItem>
              <MenuItem value="true">Hidden Only</MenuItem>
              <MenuItem value="false">Visible Only</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Select
              fullWidth
              size="small"
              value={filters.flagged}
              onChange={(e) => setFilters({ ...filters, flagged: e.target.value })}
            >
              <MenuItem value="">All (Flags)</MenuItem>
              <MenuItem value="true">Flagged Only</MenuItem>
              <MenuItem value="false">Safe Only</MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Action Toolbar */}
      {selectedReviews.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedReviews.size}
          actions={[
            {
              label: 'Approve',
              icon: CheckCircleIcon,
              onClick: () => setBulkApproveDialog(true),
              color: 'success',
            },
            {
              label: 'Hide',
              icon: VisibilityOffIcon,
              onClick: () => setBulkHideDialog(true),
              color: 'warning',
            },
            {
              label: 'Flag',
              icon: FlagIcon,
              onClick: () => setBulkFlagDialog(true),
              color: 'error',
            },
            {
              label: 'Delete',
              icon: DeleteIcon,
              onClick: () => setBulkDeleteDialog(true),
              color: 'error',
            },
            {
              label: 'Export',
              icon: FileDownloadIcon,
              onClick: handleBulkExport,
              color: 'primary',
            },
          ]}
          onClear={clearSelection}
        />
      )}

      {/* Reviews Table */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : reviews.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>No reviews found</Box>
          ) : (
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedReviews.size > 0 && selectedReviews.size < reviews.length}
                      checked={selectedReviews.size === reviews.length && reviews.length > 0}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell><strong>{placeHeader}</strong></TableCell>
                  <TableCell align="center"><strong>Rating</strong></TableCell>
                  <TableCell><strong>Comment</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>AI Risk</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow
                    key={review._id}
                    sx={{
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      bgcolor: selectedReviews.has(review._id) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedReviews.has(review._id)}
                        onChange={() => handleSelectReview(review._id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {review.place || review.hotelId?.name || review.guideId?.name || 'Unknown'}
                    </TableCell>
                    <TableCell align="center">⭐ {review.rating}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {review.comment?.substring(0, 60)}...
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={review.status}
                        color={review.status === 'approved' ? 'success' : review.status === 'pending' ? 'warning' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {review.aiModeration?.isFlagged ? (
                        <Chip
                          icon={<FlagIcon />}
                          label={`${review.aiModeration.confidence}%`}
                          size="small"
                          sx={{ bgcolor: getRiskBadgeColor(review.aiModeration.confidence), color: '#fff' }}
                        />
                      ) : (
                        <Chip label="Safe" color="success" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedReview(review);
                          setOpenModal(true);
                        }}
                        variant="outlined"
                      >
                        View
                      </Button>
                      {!review.isHidden ? (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleHide(review._id)}
                          sx={{ ml: 1 }}
                          startIcon={<VisibilityOffIcon />}
                        >
                          Hide
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="success"
                          onClick={() => handleUnhide(review._id)}
                          sx={{ ml: 1 }}
                          startIcon={<RestoreIcon />}
                        >
                          Show
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDelete(review._id)}
                        sx={{ ml: 1 }}
                        startIcon={<DeleteIcon />}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </motion.div>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialog} onClose={() => setBulkDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete {selectedReviews.size} Reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Enter reason for deletion..."
            value={bulkDeleteReason}
            onChange={(e) => setBulkDeleteReason(e.target.value)}
            label="Deletion Reason"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkDelete}
            variant="contained"
            color="error"
            disabled={!bulkDeleteReason.trim()}
          >
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={bulkApproveDialog} onClose={() => setBulkApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve {selectedReviews.size} Reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>Are you sure you want to approve all selected reviews?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkApproveDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkApprove}
            variant="contained"
            color="success"
          >
            Approve All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Hide Dialog */}
      <Dialog open={bulkHideDialog} onClose={() => setBulkHideDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hide {selectedReviews.size} Reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>Are you sure you want to hide all selected reviews?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkHideDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkHide}
            variant="contained"
            color="warning"
          >
            Hide All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Flag Dialog */}
      <Dialog open={bulkFlagDialog} onClose={() => setBulkFlagDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flag {selectedReviews.size} Reviews?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>Are you sure you want to flag all selected reviews for review?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkFlagDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBulkFlag}
            variant="contained"
            color="error"
          >
            Flag All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Review Details</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedReview && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">{placeHeader}</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedReview.place || selectedReview.hotelId?.name || selectedReview.guideId?.name || 'Unknown'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Rating</Typography>
                <Typography variant="body1">⭐ {selectedReview.rating}/5</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Comment</Typography>
                <Typography variant="body2" sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  {selectedReview.comment}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Reviewer</Typography>
                <Typography variant="body2">{selectedReview.userId?.name || selectedReview.touristId?.name || 'Unknown'}</Typography>
              </Box>
              {reviewType === 'guide' ? (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Guide</Typography>
                  <Typography variant="body2">{selectedReview.guideId?.name || selectedReview.guideId?.email || 'Unknown'}</Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Hotel</Typography>
                  <Typography variant="body2">{selectedReview.hotelId?.name || 'Unknown'}</Typography>
                </Box>
              )}
              {selectedReview.aiModeration && (
                <Paper sx={{ p: 2, bgcolor: selectedReview.aiModeration.isFlagged ? '#fff3e0' : '#e8f5e9' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>🤖 AI Analysis</Typography>
                  <Typography variant="body2">Status: {selectedReview.aiModeration.isFlagged ? '🚩 FLAGGED' : '✅ SAFE'}</Typography>
                  <Typography variant="body2">Confidence: {selectedReview.aiModeration.confidence}%</Typography>
                  {selectedReview.aiModeration.reason && (
                    <Typography variant="body2">Reason: {selectedReview.aiModeration.reason}</Typography>
                  )}
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewManagement;
