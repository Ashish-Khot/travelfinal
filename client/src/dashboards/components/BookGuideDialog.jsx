// BookGuideDialog.jsx - Premium booking form with guide preview, guests, requests, and price breakdown
import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VerifiedIcon from '@mui/icons-material/Verified';
import SecurityIcon from '@mui/icons-material/Security';
import CancelIcon from '@mui/icons-material/Cancel';
import GuideAvailabilityCalendar from './GuideAvailabilityCalendar';
import SlotPicker from './SlotPicker';
import axios from 'axios';

export default function BookGuideDialog({ open, guide, onClose, onConfirm }) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [slotPickerDate, setSlotPickerDate] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookings, setBookings] = useState([]);

  // Fetch busy dates when guide changes
  React.useEffect(() => {
    if (!guide?.id && !guide?._id) return;
    axios.get(`/api/booking/guide/${guide.id || guide._id}`)
      .then(res => {
        const bookings = res.data.bookings || [];
        setBookings(bookings);
      })
      .catch(err => console.error('Error fetching bookings:', err));
  }, [guide]);

  React.useEffect(() => {
    if (open) {
      setDestination('');
      setStartDate(null);
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setGuestCount(1);
      setSpecialRequests('');
      setShowConfirmation(false);
    }
  }, [open]);

  // Calculate total price
  let totalPrice = 0;
  let duration = 0;
  if (guide && startDate && endDate && startTime && endTime) {
    const start = dayjs(startDate).hour(dayjs(startTime).hour()).minute(dayjs(startTime).minute());
    const end = dayjs(endDate).hour(dayjs(endTime).hour()).minute(dayjs(endTime).minute());
    if (end.isAfter(start)) {
      const diffDays = end.startOf('day').diff(start.startOf('day'), 'day');
      if (diffDays === 0) {
        duration = Math.ceil(end.diff(start, 'hour', true));
        totalPrice = duration * guide.price;
      } else {
        duration = (diffDays + 1) * 24;
        totalPrice = (diffDays + 1) * guide.price;
      }
    }
  }

  const serviceFee = Math.round(totalPrice * 0.05);
  const finalTotal = totalPrice + serviceFee;
  const today = dayjs().startOf('day');

  const isEndDateValid = !startDate || !endDate || dayjs(endDate).isAfter(dayjs(startDate)) || dayjs(endDate).isSame(dayjs(startDate));
  const isEndTimeValid = !startDate || !endDate || !startTime || !endTime || dayjs(endDate).isAfter(dayjs(startDate)) || (dayjs(endDate).isSame(dayjs(startDate)) ? (!startTime || !endTime || dayjs(endTime, 'HH:mm').isAfter(dayjs(startTime, 'HH:mm'))) : true);

  const getDayStatus = (date) => {
    const dayStart = dayjs(date).startOf('day');
    const dayEnd = dayjs(date).endOf('day');
    let busyHours = Array(24).fill(false);
    bookings.forEach(b => {
      const bStart = dayjs(b.startDateTime);
      const bEnd = dayjs(b.endDateTime);
      if (bEnd.isBefore(dayStart) || bStart.isAfter(dayEnd)) return;
      let startHour = Math.max(0, bStart.isBefore(dayStart) ? 0 : bStart.hour());
      let endHour = Math.min(23, bEnd.isAfter(dayEnd) ? 23 : bEnd.hour() - (bEnd.minute() === 0 && bEnd.second() === 0 ? 1 : 0));
      for (let h = startHour; h <= endHour; h++) busyHours[h] = true;
    });
    const busyCount = busyHours.filter(Boolean).length;
    if (busyCount === 24) return 'full';
    if (busyCount > 0) return 'partial';
    return 'free';
  };

  const isDateBusy = date => getDayStatus(date) === 'full';
  const disableStartDate = date => isDateBusy(date);
  const disableEndDate = date => isDateBusy(date);

  const isFormComplete = destination && startDate && endDate && startTime && endTime && isEndDateValid && isEndTimeValid && guestCount > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 700, py: 2 }}>
        {showConfirmation ? '✓ Confirm Your Booking' : 'Book Your Experience'}
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Guide Preview Card */}
          {!showConfirmation && (
            <Card sx={{ m: 2, mb: 1, background: 'linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%)', border: '1px solid #e5e7eb' }}>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', pb: 2 }}>
                <Avatar
                  src={guide?.avatar}
                  sx={{ width: 70, height: 70, border: '3px solid #667eea' }}
                  alt={guide?.name}
                />
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1F2937' }}>
                      {guide?.name}
                    </Typography>
                    {guide?.verifiedID && <VerifiedIcon sx={{ fontSize: 18, color: '#667eea' }} />}
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                    <Rating value={guide?.rating || 0} readOnly size="small" />
                    <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                      {guide?.reviewCount > 0 
                        ? `${guide?.rating?.toFixed(1)} (${guide?.reviewCount})`
                        : 'No reviews yet'
                      }
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#667eea' }}>
                    {guide?.currency === 'INR' ? '₹' : '$'}{guide?.price}/{guide?.rateType === 'hourly' ? 'hour' : 'day'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <Box sx={{ px: 2 }}>
            {/* Main Booking Form */}
            {!showConfirmation && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Destination */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <LocationOnIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Where?</Typography>
                  </Stack>
                  <TextField
                    placeholder="Destination or tour location"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                      },
                    }}
                  />
                </Box>

                {/* Availability Calendar Toggle */}
                <Button
                  variant="outlined"
                  onClick={() => setShowCalendar(v => !v)}
                  sx={{
                    textTransform: 'none',
                    borderColor: '#e5e7eb',
                    color: '#667eea',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#667eea', bgcolor: '#f0f4ff' },
                  }}
                >
                  {showCalendar ? '✓ Hide Calendar' : '📅 View Availability'}
                </Button>

                {showCalendar && (guide?.id || guide?._id) && (
                  <Box sx={{ mb: 1, p: 1.5, bgcolor: '#f9fafb', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <GuideAvailabilityCalendar
                      guideId={guide.id || guide._id}
                      onSelectDate={date => {
                        const status = getDayStatus(date);
                        if (status === 'free') setStartDate(date);
                        else if (status === 'partial') {
                          setSlotPickerDate(date);
                          setShowSlotPicker(true);
                        }
                      }}
                      selectedDate={startDate}
                      bookings={bookings}
                    />
                  </Box>
                )}

                {showSlotPicker && slotPickerDate && (
                  <Box sx={{ mb: 1, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #d1fae5' }}>
                    <SlotPicker
                      bookings={bookings}
                      date={slotPickerDate}
                      onSelectSlot={hour => {
                        setStartDate(dayjs(slotPickerDate).hour(hour).minute(0).second(0));
                        setStartTime(dayjs(slotPickerDate).hour(hour).minute(0).second(0));
                        setShowSlotPicker(false);
                      }}
                    />
                  </Box>
                )}

                {/* Date & Time Section */}
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <Box>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <AccessTimeIcon sx={{ color: '#667eea', fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>When?</Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                      <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={date => {
                          if (!isDateBusy(date)) {
                            setStartDate(date);
                            if (endDate && date && dayjs(endDate).isBefore(date)) setEndDate(null);
                          }
                        }}
                        shouldDisableDate={disableStartDate}
                        format="DD-MM-YYYY"
                        minDate={today}
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                      <TimePicker
                        label="Start Time"
                        value={startTime}
                        onChange={setStartTime}
                        ampm={false}
                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                      />
                    </Stack>
                  </Box>

                  <Box>
                    <Stack direction="row" gap={1} sx={{ mb: 1 }}>
                      <DatePicker
                        label="End Date"
                        value={endDate}
                        onChange={date => {
                          if (!isDateBusy(date)) {
                            setEndDate(date);
                            if (startDate && date && dayjs(date).isBefore(startDate)) setStartDate(null);
                          }
                        }}
                        shouldDisableDate={disableEndDate}
                        format="DD-MM-YYYY"
                        minDate={startDate || today}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !isEndDateValid && Boolean(endDate),
                            helperText: !isEndDateValid && Boolean(endDate) ? 'End date invalid' : '',
                          },
                        }}
                      />
                      <TimePicker
                        label="End Time"
                        value={endTime}
                        onChange={setEndTime}
                        ampm={false}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !isEndTimeValid && Boolean(endTime),
                            helperText: !isEndTimeValid && Boolean(endTime) ? 'Invalid time' : '',
                          },
                        }}
                      />
                    </Stack>
                  </Box>
                </LocalizationProvider>

                {/* Guest Count */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <PeopleIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Guests</Typography>
                  </Stack>
                  <TextField
                    type="number"
                    label="Number of people"
                    value={guestCount}
                    onChange={e => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                {/* Special Requests */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <EditNoteIcon sx={{ color: '#667eea', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>Special Requests</Typography>
                  </Stack>
                  <TextField
                    placeholder="Any special interests or preferences? (Optional)"
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Box>

                {/* Price Breakdown */}
                {isFormComplete && (
                  <Card sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%)', border: '1px solid #e5e7eb', mt: 1 }}>
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#1F2937', fontSize: '0.95rem' }}>
                        Price Breakdown
                      </Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            {guide?.currency === 'INR' ? '₹' : '$'}{guide?.price} × {duration} {guide?.rateType === 'hourly' ? 'hours' : 'days'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937' }}>
                            {guide?.currency === 'INR' ? '₹' : '$'}{totalPrice}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            Service fee (5%)
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937' }}>
                            {guide?.currency === 'INR' ? '₹' : '$'}{serviceFee}
                          </Typography>
                        </Stack>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontWeight: 700, color: '#1F2937' }}>
                            Total
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: '#667eea', fontSize: '1.1rem' }}>
                            {guide?.currency === 'INR' ? '₹' : '$'}{finalTotal}
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {/* Trust & Safety Info */}
                <Alert
                  severity="success"
                  icon={<SecurityIcon />}
                  sx={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #d1fae5',
                    color: '#065f46',
                    '& .MuiAlert-icon': { color: '#10b981' },
                  }}
                >
                  <Stack gap={0.5}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>100% Secure Booking</Typography>
                    <Typography sx={{ fontSize: '0.8rem' }}>✓ Free cancellation (48h before tour) • ✓ Money-back guarantee • ✓ {guide?.averageResponseTime ? `Responds within ${guide.averageResponseTime} hours` : 'Fast response'}</Typography>
                  </Stack>
                </Alert>
              </Box>
            )}

            {/* Confirmation Preview */}
            {showConfirmation && (
              <Box sx={{ py: 2, px: 0 }}>
                <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', border: '1px solid #667eea' }}>
                  <CardContent>
                    <Typography sx={{ fontWeight: 700, mb: 1.5, color: '#1F2937' }}>
                      Booking Details
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>Guide</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{guide?.name} {guide?.rating > 0 ? `⭐ ${guide?.rating?.toFixed(1)}` : '(No reviews yet)'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>📍 Destination</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{destination}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>📅 Schedule</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>
                          {dayjs(startDate).format('MMM DD')} {dayjs(startTime).format('HH:mm')} - {dayjs(endDate).format('MMM DD')} {dayjs(endTime).format('HH:mm')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>👥 Guests</Typography>
                        <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{guestCount} {guestCount === 1 ? 'person' : 'people'}</Typography>
                      </Box>
                      {specialRequests && (
                        <Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', mb: 0.3 }}>📝 Requests</Typography>
                          <Typography sx={{ fontWeight: 600, color: '#1F2937' }}>{specialRequests}</Typography>
                        </Box>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>
                          Total Amount
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#667eea' }}>
                          {guide?.currency === 'INR' ? '₹' : '$'}{finalTotal}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Alert severity="info" sx={{ mb: 2 }}>
                  By confirming, you agree to pay this amount. {guide?.name} will respond within {guide?.averageResponseTime || 24} hours.
                </Alert>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            borderColor: '#e5e7eb',
            color: '#6B7280',
            '&:hover': { borderColor: '#667eea', bgcolor: '#f0f4ff' },
          }}
        >
          Cancel
        </Button>

        {showConfirmation && (
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              borderColor: '#e5e7eb',
              color: '#667eea',
              '&:hover': { borderColor: '#667eea', bgcolor: '#f0f4ff' },
            }}
          >
            Back
          </Button>
        )}

        {!showConfirmation && (
          <Button
            onClick={() => setShowConfirmation(true)}
            variant="contained"
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
            disabled={!isFormComplete}
          >
            Review Booking
          </Button>
        )}

        {showConfirmation && (
          <Button
            onClick={() => onConfirm({ destination, startDate, endDate, startTime, endTime, guestCount, specialRequests, totalPrice: finalTotal })}
            variant="contained"
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': {
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Confirm & Book
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
