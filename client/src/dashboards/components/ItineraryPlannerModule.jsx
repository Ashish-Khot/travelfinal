import React, { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import TrainRoundedIcon from '@mui/icons-material/TrainRounded';
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ItineraryRouteMap from './ItineraryRouteMap';
import { jsPDF } from 'jspdf';

const itineraryMock = {
  tripTitle: 'Tokyo Adventure',
  city: 'Tokyo, Japan',
  dateLabel: 'Oct 15 - Oct 22, 2026',
  travelers: [
    { name: 'Aarav', avatar: 'https://i.pravatar.cc/120?img=11' },
    { name: 'Meera', avatar: 'https://i.pravatar.cc/120?img=32' },
    { name: 'Kaito', avatar: 'https://i.pravatar.cc/120?img=14' },
  ],
  weather: {
    currentTempC: 23,
    condition: 'Partly Cloudy',
    minTempC: 19,
    maxTempC: 26,
    humidity: 63,
    rainChance: 25,
  },
  budget: {
    total: 185000,
    spent: 114200,
    categories: [
      { label: 'Stay', amount: 52000, color: '#0f766e' },
      { label: 'Food', amount: 24600, color: '#f97316' },
      { label: 'Transport', amount: 18400, color: '#2563eb' },
      { label: 'Tickets', amount: 19200, color: '#7c3aed' },
    ],
  },
  checklist: [
    { id: 'passport', label: 'Passport + visa copy' },
    { id: 'sim', label: 'International SIM / eSIM' },
    { id: 'insurance', label: 'Travel insurance PDF' },
    { id: 'cards', label: 'Cards + 30,000 JPY cash' },
    { id: 'adapter', label: 'Universal adapter + power bank' },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1526481280695-3c4691f13b8d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=900&q=80',
  ],
  days: [
    {
      id: 'day-1',
      label: 'Day 1',
      date: 'Thu, Oct 15',
      summary: {
        distanceKm: 15.8,
        movingTime: '1h 45m',
        pace: 'Balanced',
      },
      stops: [
        {
          id: 'sensoji',
          name: 'Senso-ji Temple',
          category: 'Attraction',
          start: '09:00',
          end: '10:45',
          duration: '1h 45m',
          openingHours: '06:00 - 17:00',
          ticketCost: 0,
          estimatedSpend: 900,
          address: '2-3-1 Asakusa, Taito City',
          description:
            'Tokyo oldest Buddhist temple with a vibrant shopping street. Ideal for cultural walk, temple rituals, and early photography.',
          bestFor: ['Culture', 'Photography', 'Souvenirs'],
          crowdTip: 'Arrive before 09:00 for lighter crowd near main gate.',
          lat: 35.7148,
          lon: 139.7967,
          image: 'https://images.unsplash.com/photo-1532236204992-f5e85c024202?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Walk',
            time: '0m',
            distanceKm: 0,
          },
        },
        {
          id: 'tokyo-skytree',
          name: 'Tokyo Skytree',
          category: 'Viewpoint',
          start: '11:20',
          end: '13:00',
          duration: '1h 40m',
          openingHours: '10:00 - 21:00',
          ticketCost: 2100,
          estimatedSpend: 2800,
          address: '1-1-2 Oshiage, Sumida City',
          description:
            'Iconic observation tower with panoramic city views and river skyline. Great slot for midday visibility and lunch nearby.',
          bestFor: ['City View', 'Family', 'Photography'],
          crowdTip: 'Use online slot booking to skip queue.',
          lat: 35.7101,
          lon: 139.8107,
          image: 'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Metro',
            time: '18m',
            distanceKm: 3.2,
          },
        },
        {
          id: 'akihabara',
          name: 'Akihabara Electric Town',
          category: 'Shopping',
          start: '15:00',
          end: '18:00',
          duration: '3h 00m',
          openingHours: '11:00 - 20:00',
          ticketCost: 0,
          estimatedSpend: 6500,
          address: 'Sotokanda, Chiyoda City',
          description:
            'Anime, gaming, electronics, and themed cafes in one compact district. Flexible time block depending on shopping intensity.',
          bestFor: ['Shopping', 'Pop Culture', 'Food'],
          crowdTip: 'Weekday late afternoon is less packed than weekends.',
          lat: 35.6984,
          lon: 139.773,
          image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Train',
            time: '14m',
            distanceKm: 4.8,
          },
        },
      ],
    },
    {
      id: 'day-2',
      label: 'Day 2',
      date: 'Fri, Oct 16',
      summary: {
        distanceKm: 10.3,
        movingTime: '1h 15m',
        pace: 'Relaxed',
      },
      stops: [
        {
          id: 'meiji',
          name: 'Meiji Jingu Shrine',
          category: 'Nature',
          start: '08:30',
          end: '10:00',
          duration: '1h 30m',
          openingHours: 'Sunrise - Sunset',
          ticketCost: 0,
          estimatedSpend: 700,
          address: '1-1 Yoyogikamizonocho, Shibuya',
          description:
            'Forest shrine pathway gives a calm start to a city day. Good for morning reflections and slower walking pace.',
          bestFor: ['Spiritual', 'Nature', 'Quiet Walk'],
          crowdTip: 'Enter from South Gate for scenic walk route.',
          lat: 35.6764,
          lon: 139.6993,
          image: 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Taxi',
            time: '22m',
            distanceKm: 6.3,
          },
        },
        {
          id: 'shibuya',
          name: 'Shibuya Crossing',
          category: 'City Walk',
          start: '10:30',
          end: '12:00',
          duration: '1h 30m',
          openingHours: 'Open 24h',
          ticketCost: 0,
          estimatedSpend: 1600,
          address: 'Shibuya Scramble Crossing',
          description:
            'One of the busiest pedestrian crossings in the world with food and shopping clusters around every lane.',
          bestFor: ['Street Life', 'Short Walk', 'Cafe Stops'],
          crowdTip: 'Use Magnet rooftop for top crossing photo.',
          lat: 35.6595,
          lon: 139.7005,
          image: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Walk',
            time: '18m',
            distanceKm: 1.3,
          },
        },
        {
          id: 'teamlab',
          name: 'TeamLab Planets',
          category: 'Experience',
          start: '14:30',
          end: '16:30',
          duration: '2h 00m',
          openingHours: '09:00 - 21:00',
          ticketCost: 3800,
          estimatedSpend: 4700,
          address: '6 Chome-1-16 Toyosu, Koto City',
          description:
            'Immersive digital art museum with interactive sensory zones. Works best with pre-booked entry slots.',
          bestFor: ['Art', 'Indoor', 'Experience'],
          crowdTip: 'Carry shorts or quick-dry clothing for water section.',
          lat: 35.6492,
          lon: 139.7897,
          image: 'https://images.unsplash.com/photo-1489667897015-bf7a9e45c284?auto=format&fit=crop&w=900&q=80',
          transportFromPrev: {
            mode: 'Metro',
            time: '25m',
            distanceKm: 8.4,
          },
        },
      ],
    },
  ],
};

const transportIcons = {
  Walk: DirectionsWalkRoundedIcon,
  Metro: TrainRoundedIcon,
  Train: TrainRoundedIcon,
  Taxi: LocalTaxiRoundedIcon,
  Car: DirectionsCarRoundedIcon,
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatINR = (value) => currency.format(value || 0);

export default function ItineraryPlannerModule() {
  const [selectedDayId, setSelectedDayId] = useState(itineraryMock.days[0].id);
  const [selectedStop, setSelectedStop] = useState(itineraryMock.days[0].stops[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('Book TeamLab slots at least 1 week before travel date.');
  const [checklistState, setChecklistState] = useState({
    passport: true,
    sim: false,
    insurance: true,
    cards: false,
    adapter: false,
  });
  const [notification, setNotification] = useState('');
  const [showGallery, setShowGallery] = useState(false);

  const selectedDay = useMemo(
    () => itineraryMock.days.find((day) => day.id === selectedDayId) || itineraryMock.days[0],
    [selectedDayId]
  );

  const totalChecklist = itineraryMock.checklist.length;
  const completedChecklist = Object.values(checklistState).filter(Boolean).length;
  const budgetPct = Math.min(
    100,
    Math.round((itineraryMock.budget.spent / itineraryMock.budget.total) * 100)
  );

  const openStopDetails = (stop) => {
    setSelectedStop(stop);
    setDetailsOpen(true);
  };

  const onMapMarkerClick = (stop) => {
    setSelectedStop(stop);
    setDetailsOpen(true);
  };

  const toggleChecklist = (id) => {
    setChecklistState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = async () => {
    const shareText = `${itineraryMock.tripTitle} | ${itineraryMock.city} | ${itineraryMock.dateLabel}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: itineraryMock.tripTitle,
          text: shareText,
          url: window.location.href,
        });
        setNotification('Trip shared successfully.');
        return;
      } catch (error) {
        // Ignore cancellation and fall back to copy below.
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} | ${window.location.href}`);
      setNotification('Share link copied to clipboard.');
    } catch (error) {
      setNotification('Unable to copy link. Please copy manually.');
    }
  };

  const handleCopyDayPlan = async () => {
    const summary = [
      `${selectedDay.label} - ${selectedDay.date}`,
      ...selectedDay.stops.map(
        (stop) => `${stop.start}-${stop.end} | ${stop.name} | ${stop.category}`
      ),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setNotification('Day plan copied to clipboard.');
    } catch (error) {
      setNotification('Unable to copy plan right now.');
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 42;
    let cursorY = 52;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(itineraryMock.tripTitle, marginX, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    cursorY += 18;
    doc.text(`${itineraryMock.city} | ${itineraryMock.dateLabel}`, marginX, cursorY);

    cursorY += 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Trip Snapshot', marginX, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    cursorY += 16;
    doc.text(`Weather: ${itineraryMock.weather.currentTempC} C, ${itineraryMock.weather.condition}`, marginX, cursorY);
    cursorY += 14;
    doc.text(`Budget: ${formatINR(itineraryMock.budget.spent)} used of ${formatINR(itineraryMock.budget.total)}`, marginX, cursorY);

    itineraryMock.days.forEach((day) => {
      cursorY += 24;
      if (cursorY > 760) {
        doc.addPage();
        cursorY = 52;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${day.label} - ${day.date}`, marginX, cursorY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      day.stops.forEach((stop) => {
        cursorY += 14;
        if (cursorY > 780) {
          doc.addPage();
          cursorY = 52;
        }
        const line = `${stop.start}-${stop.end} | ${stop.name} | ${stop.category} | Est. ${formatINR(stop.estimatedSpend)}`;
        doc.text(line, marginX + 8, cursorY);
      });
    });

    doc.save(`${itineraryMock.tripTitle.replace(/\s+/g, '-').toLowerCase()}-plan.pdf`);
    setNotification('PDF downloaded.');
  };

  const weatherIcon = itineraryMock.weather.condition.toLowerCase().includes('cloud')
    ? CloudRoundedIcon
    : WbSunnyRoundedIcon;
  const WeatherConditionIcon = weatherIcon;

  return (
    <Box>
      <Card
        sx={{
          borderRadius: '24px',
          background:
            'radial-gradient(circle at 20% 30%, rgba(56,189,248,0.22), transparent 42%), radial-gradient(circle at 80% 0%, rgba(79,70,229,0.22), transparent 38%), linear-gradient(135deg, #0f172a 0%, #164e63 55%, #0f766e 100%)',
          color: '#e2e8f0',
          mb: 2.5,
          border: '1px solid rgba(255,255,255,0.14)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={1.1}>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 800, color: '#ffffff' }}
              >
                {itineraryMock.tripTitle}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  icon={<PlaceRoundedIcon />}
                  label={itineraryMock.city}
                  sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#f8fafc' }}
                />
                <Chip
                  icon={<CalendarMonthRoundedIcon />}
                  label={itineraryMock.dateLabel}
                  sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#f8fafc' }}
                />
                <Chip
                  icon={<RouteRoundedIcon />}
                  label={`${itineraryMock.days.length} planned days`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#f8fafc' }}
                />
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <AvatarGroup max={4}>
                {itineraryMock.travelers.map((person) => (
                  <Tooltip key={person.name} title={person.name}>
                    <Avatar src={person.avatar} alt={person.name} />
                  </Tooltip>
                ))}
              </AvatarGroup>
              <Button
                variant="contained"
                onClick={handleShare}
                startIcon={<ShareRoundedIcon />}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#0f172a',
                  '&:hover': { bgcolor: '#dbeafe' },
                }}
              >
                Share
              </Button>
              <Button
                variant="outlined"
                onClick={handleDownloadPdf}
                startIcon={<DownloadRoundedIcon />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.34)',
                  color: '#ffffff',
                  '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Download
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1.1fr 1.35fr 0.9fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6" fontWeight={800}>
                Day Plan
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={handleCopyDayPlan}
                startIcon={<ContentCopyRoundedIcon fontSize="small" />}
              >
                Copy
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1.5}>
              {itineraryMock.days.map((day) => (
                <Chip
                  key={day.id}
                  label={`${day.label} | ${day.date}`}
                  clickable
                  onClick={() => {
                    setSelectedDayId(day.id);
                    setSelectedStop(day.stops[0]);
                  }}
                  sx={{
                    fontWeight: 700,
                    bgcolor:
                      selectedDay.id === day.id ? 'rgba(15,118,110,0.15)' : 'rgba(15,23,42,0.06)',
                    color: selectedDay.id === day.id ? '#115e59' : '#334155',
                  }}
                />
              ))}
            </Stack>

            <Stack spacing={1.2}>
              {selectedDay.stops.map((stop, index) => {
                const mode = stop.transportFromPrev?.mode || 'Walk';
                const TransportIcon = transportIcons[mode] || DirectionsWalkRoundedIcon;

                return (
                  <Paper
                    key={stop.id}
                    elevation={0}
                    onClick={() => openStopDetails(stop)}
                    sx={{
                      p: 1.4,
                      borderRadius: '14px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'rgba(15,118,110,0.35)',
                        boxShadow: '0 10px 28px rgba(15,23,42,0.08)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {stop.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stop.address}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={stop.category}
                        sx={{ bgcolor: 'rgba(15,118,110,0.12)', color: '#0f766e', fontWeight: 700 }}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1.3} flexWrap="wrap" useFlexGap mt={1.1}>
                      <Chip
                        size="small"
                        icon={<AccessTimeRoundedIcon />}
                        label={`${stop.start} - ${stop.end}`}
                        sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }}
                      />
                      <Chip
                        size="small"
                        icon={<TransportIcon />}
                        label={`${mode} ${stop.transportFromPrev?.time || ''}`}
                        sx={{ bgcolor: 'rgba(15,23,42,0.06)', color: '#0f172a' }}
                      />
                      <Chip
                        size="small"
                        label={`Est. ${formatINR(stop.estimatedSpend)}`}
                        sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#b45309' }}
                      />
                    </Stack>

                    {index < selectedDay.stops.length - 1 && (
                      <Typography variant="caption" sx={{ color: '#64748b', mt: 0.8, display: 'block' }}>
                        Next stop in {selectedDay.stops[index + 1].transportFromPrev?.time || '15m'}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#ffffff',
            }}
          >
            <Typography variant="h6" fontWeight={800} mb={1.4}>
              Notes
            </Typography>
            <TextField
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              placeholder="Add reminders, booking notes, emergency contacts..."
            />
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.4,
                borderBottom: '1px solid rgba(15,23,42,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background:
                  'linear-gradient(90deg, rgba(15,118,110,0.06) 0%, rgba(14,165,233,0.08) 100%)',
              }}
            >
              <Box>
                <Typography fontWeight={800}>Route Map</Typography>
                <Typography variant="caption" color="text.secondary">
                  Click any marker to open place details
                </Typography>
              </Box>
              <Chip
                size="small"
                icon={<RouteRoundedIcon />}
                label={`${selectedDay.summary.distanceKm} km | ${selectedDay.summary.movingTime}`}
              />
            </Box>

            <ItineraryRouteMap
              stops={selectedDay.stops}
              selectedStopId={selectedStop?.id}
              onStopClick={onMapMarkerClick}
              height={640}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#ffffff',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.2}>
              <Typography variant="h6" fontWeight={800}>
                Transport Snapshot
              </Typography>
              <Chip label={selectedDay.summary.pace} size="small" />
            </Stack>

            <Stack spacing={1.1}>
              {selectedDay.stops.slice(1).map((stop) => {
                const leg = stop.transportFromPrev;
                const TransportIcon = transportIcons[leg.mode] || DirectionsWalkRoundedIcon;
                return (
                  <Box
                    key={`${stop.id}-leg`}
                    sx={{
                      p: 1.2,
                      borderRadius: '12px',
                      border: '1px dashed rgba(148,163,184,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: '10px',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'rgba(14,116,144,0.12)',
                          color: '#0c4a6e',
                        }}
                      >
                        <TransportIcon fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {leg.mode} to {stop.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {leg.distanceKm} km
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" fontWeight={800} color="#0f766e">
                      {leg.time}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <Card
            sx={{
              borderRadius: '22px',
              color: '#ffffff',
              background:
                'radial-gradient(circle at 80% 20%, rgba(249,115,22,0.35), transparent 36%), linear-gradient(145deg, #1d4ed8 0%, #4338ca 60%, #312e81 100%)',
              border: '1px solid rgba(255,255,255,0.22)',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Weather
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.88 }}>
                    {itineraryMock.city}
                  </Typography>
                </Box>
                <WeatherConditionIcon sx={{ fontSize: 34 }} />
              </Stack>

              <Typography variant="h2" sx={{ mt: 1, mb: 0.6, fontSize: '2.5rem', color: '#ffffff' }}>
                {itineraryMock.weather.currentTempC} C
              </Typography>
              <Typography sx={{ opacity: 0.9 }}>
                {itineraryMock.weather.condition}
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={2}>
                <Chip
                  size="small"
                  icon={<WbSunnyRoundedIcon />}
                  label={`H ${itineraryMock.weather.maxTempC} C`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
                />
                <Chip
                  size="small"
                  icon={<CloudRoundedIcon />}
                  label={`L ${itineraryMock.weather.minTempC} C`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
                />
                <Chip
                  size="small"
                  icon={<WaterDropRoundedIcon />}
                  label={`${itineraryMock.weather.rainChance}% rain`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#ffffff',
            }}
          >
            <Typography variant="h6" fontWeight={800} mb={1.2}>
              Budget Tracker
            </Typography>

            <Stack spacing={0.4} mb={1}>
              <Typography variant="body2" color="text.secondary">
                {formatINR(itineraryMock.budget.spent)} used of {formatINR(itineraryMock.budget.total)}
              </Typography>
              <Typography variant="body2" fontWeight={700} color="#0f766e">
                {budgetPct}% utilized
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={budgetPct}
              sx={{
                height: 9,
                borderRadius: 999,
                mb: 1.5,
                bgcolor: 'rgba(148,163,184,0.24)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #0f766e 0%, #0ea5e9 100%)',
                },
              }}
            />

            <Stack spacing={1}>
              {itineraryMock.budget.categories.map((item) => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                    <Typography variant="body2">{item.label}</Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={700}>
                    {formatINR(item.amount)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: '20px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#ffffff',
            }}
          >
            <Typography variant="h6" fontWeight={800} mb={1}>
              Trip Checklist
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completedChecklist} / {totalChecklist} completed
            </Typography>

            <List dense sx={{ mt: 0.6 }}>
              {itineraryMock.checklist.map((item) => (
                <ListItem
                  key={item.id}
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={Boolean(checklistState[item.id])}
                      onChange={() => toggleChecklist(item.id)}
                    />
                  }
                  disablePadding
                  sx={{ py: 0.2 }}
                >
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <Checkbox
                      checked={Boolean(checklistState[item.id])}
                      onChange={() => toggleChecklist(item.id)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: {
                        textDecoration: checklistState[item.id] ? 'line-through' : 'none',
                        color: checklistState[item.id] ? 'text.secondary' : 'text.primary',
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 1 }} />

            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="outlined" onClick={() => setShowGallery(true)}>
                Gallery
              </Button>
              <Button fullWidth variant="contained" onClick={handleShare}>
                Share Plan
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            p: 0,
            borderTopLeftRadius: { sm: 18 },
            borderBottomLeftRadius: { sm: 18 },
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: 230,
            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.6) 100%), url(${selectedStop?.image || ''})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'flex-end',
            p: 2,
            color: '#ffffff',
          }}
        >
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{
              position: 'absolute',
              right: 10,
              top: 10,
              bgcolor: 'rgba(255,255,255,0.85)',
              '&:hover': { bgcolor: '#ffffff' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>

          <Box>
            <Typography variant="h6" fontWeight={800}>
              {selectedStop?.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {selectedStop?.address}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={1.5}>
            <Chip
              icon={<AccessTimeRoundedIcon />}
              label={`${selectedStop?.start || '--'} - ${selectedStop?.end || '--'}`}
            />
            <Chip
              icon={<CalendarMonthRoundedIcon />}
              label={selectedDay.date}
            />
            <Chip label={`Ticket ${formatINR(selectedStop?.ticketCost || 0)}`} />
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {selectedStop?.description}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" fontWeight={700} mb={0.8}>
            Practical Info
          </Typography>
          <Stack spacing={0.6}>
            <Typography variant="body2">Opening hours: {selectedStop?.openingHours}</Typography>
            <Typography variant="body2">Planned duration: {selectedStop?.duration}</Typography>
            <Typography variant="body2">Estimated spend: {formatINR(selectedStop?.estimatedSpend || 0)}</Typography>
            <Typography variant="body2">
              Travel from previous stop: {selectedStop?.transportFromPrev?.mode || 'Walk'} ({selectedStop?.transportFromPrev?.time || '0m'})
            </Typography>
            <Typography variant="body2">
              Crowd tip: {selectedStop?.crowdTip}
            </Typography>
          </Stack>

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" fontWeight={700} mb={0.8}>
            Best For
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(selectedStop?.bestFor || []).map((tag) => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </Stack>
        </Box>
      </Drawer>

      <Dialog open={showGallery} onClose={() => setShowGallery(false)} maxWidth="md" fullWidth>
        <DialogTitle>Trip Gallery</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.2,
            }}
          >
            {itineraryMock.gallery.map((src) => (
              <Box
                key={src}
                component="img"
                src={src}
                alt="Trip visual"
                sx={{ width: '100%', borderRadius: '12px', minHeight: 170, objectFit: 'cover' }}
              />
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={2600}
        onClose={() => setNotification('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setNotification('')}>
          {notification}
        </Alert>
      </Snackbar>
    </Box>
  );
}
