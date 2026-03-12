/**
 * Activity List Component
 * Display and manage activities in list format
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Divider,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';

const ActivityList = ({ itinerary, onActivityAdd, onActivityUpdate, onActivityRemove }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'sightseeing',
    dayNumber: 1,
    timeBlock: 'morning',
    startTime: '09:00',
    endTime: '11:00',
    estimatedCost: 0,
    duration: 120,
    importance: 'recommended',
  });

  const inferTimeBlock = (activity) => {
    if (activity?.timeBlock) return activity.timeBlock;
    const start = activity?.startTime || '09:00';
    const [h, m] = start.split(':').map(Number);
    const minutes = (h * 60) + (m || 0);
    if (minutes < 720) return 'morning';
    if (minutes < 840) return 'lunch';
    if (minutes < 1050) return 'afternoon';
    if (minutes < 1260) return 'evening';
    return 'night';
  };

  const handleOpenDialog = (activity = null) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        ...activity,
        timeBlock: inferTimeBlock(activity),
      });
    } else {
      setEditingActivity(null);
      setFormData({
        name: '',
        description: '',
        category: 'sightseeing',
        dayNumber: 1,
        timeBlock: 'morning',
        startTime: '09:00',
        endTime: '11:00',
        estimatedCost: 0,
        duration: 120,
        importance: 'recommended',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingActivity(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('Please enter activity name');
      return;
    }

    if (editingActivity) {
      onActivityUpdate(editingActivity._id, formData);
    } else {
      onActivityAdd(formData);
    }

    handleCloseDialog();
  };

  // Group activities by day
  const groupedActivities = {};
  itinerary?.activities?.forEach((activity) => {
    if (!groupedActivities[activity.dayNumber]) {
      groupedActivities[activity.dayNumber] = [];
    }
    groupedActivities[activity.dayNumber].push(activity);
  });

  const getCategoryColor = (category) => {
    const colors = {
      sightseeing: '#2196F3',
      food: '#FF6B6B',
      adventure: '#FFC300',
      culture: '#9C27B0',
      shopping: '#E91E63',
      relaxation: '#4CAF50',
      nature: '#2E7D32',
      entertainment: '#F97316',
    };
    return colors[category] || '#757575';
  };

  const getImportanceVariant = (importance) => {
    switch (importance) {
      case 'must-do':
        return 'error';
      case 'recommended':
        return 'default';
      case 'optional':
        return 'outlined';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h2>Activities ({itinerary?.activities?.length || 0})</h2>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Activity
        </Button>
      </Box>

      {/* Activities by Day */}
      {Object.entries(groupedActivities)
        .sort(([dayA], [dayB]) => parseInt(dayA) - parseInt(dayB))
        .map(([day, activities]) => (
          <Card key={day} sx={{ mb: 2 }}>
            <CardContent>
              <h3 style={{ marginTop: 0, color: '#1976d2' }}>Day {day}</h3>

              <List>
                {activities
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((activity, idx) => (
                    <React.Fragment key={activity._id || idx}>
                      <ListItem
                        sx={{
                          backgroundColor: '#f9f9f9',
                          borderRadius: 1,
                          mb: 1,
                          border: `2px solid ${getCategoryColor(activity.category)}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                        secondaryAction={
                          <Box>
                            <IconButton
                              edge="end"
                              onClick={() => handleOpenDialog(activity)}
                              title="Edit"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => onActivityRemove(activity._id)}
                              title="Delete"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={activity.name}
                          sx={{ mb: 1 }}
                        />
                        <Box sx={{ width: '100%', pl: 2 }}>
                          <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                            ⏰ {activity.startTime} - {activity.endTime} ({activity.duration} min)
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                            {activity.description}
                          </Typography>
                          <Box>
                            {activity.timeBlock && (
                              <Chip
                                label={activity.timeBlock}
                                size="small"
                                variant="outlined"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            )}
                            <Chip
                              label={activity.category}
                              size="small"
                              sx={{
                                backgroundColor: getCategoryColor(activity.category),
                                color: 'white',
                                mr: 0.5,
                                mb: 0.5,
                              }}
                            />
                            <Chip
                              label={`$${activity.estimatedCost}`}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                            <Chip
                              label={activity.importance}
                              size="small"
                              variant={getImportanceVariant(activity.importance)}
                              sx={{ mb: 0.5 }}
                            />
                          </Box>
                        </Box>
                      </ListItem>
                      {idx < activities.length - 1 && <Divider sx={{ my: 1 }} />}
                    </React.Fragment>
                  ))}
              </List>

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="body2">
                  <strong>Day Total:</strong> $
                  {activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0).toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}

      {(!itinerary?.activities || itinerary.activities.length === 0) && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <p>No activities added yet. Start by clicking "Add Activity"</p>
        </Paper>
      )}

      {/* Activity Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingActivity ? 'Edit Activity' : 'Add Activity'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Activity Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="sightseeing">Sightseeing</option>
              <option value="food">Food</option>
              <option value="adventure">Adventure</option>
              <option value="culture">Culture</option>
              <option value="shopping">Shopping</option>
              <option value="relaxation">Relaxation</option>
              <option value="nature">Nature</option>
              <option value="entertainment">Entertainment</option>
            </TextField>
            <TextField
              select
              label="Time Block"
              value={formData.timeBlock}
              onChange={(e) => setFormData({ ...formData, timeBlock: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="morning">Morning</option>
              <option value="lunch">Lunch</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </TextField>
            <TextField
              select
              label="Importance"
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="must-do">Must-Do</option>
              <option value="recommended">Recommended</option>
              <option value="optional">Optional</option>
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Day Number"
                  type="number"
                  value={formData.dayNumber}
                  onChange={(e) => setFormData({ ...formData, dayNumber: parseInt(e.target.value) })}
                  fullWidth
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Duration (min)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  fullWidth
                  inputProps={{ min: 15, step: 15 }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Estimated Cost ($)"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingActivity ? 'Update' : 'Add'} Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivityList;
