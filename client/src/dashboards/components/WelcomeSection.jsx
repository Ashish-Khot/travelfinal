// Welcome section with premium dashboard hero layout
import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { motion } from 'framer-motion';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const quotes = [
  "Travel is the only thing you buy that makes you richer.",
  "The world is a book, and those who do not travel read only one page.",
  "Adventure awaits. Go find it!",
  "Collect moments, not things.",
  "To travel is to live.",
  "Wanderlust is a curable disease.",
  "We travel not to escape life, but for life not to escape us.",
];

export default function WelcomeSection({ user }) {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const firstName = user?.name?.split(' ')[0] || 'Traveler';

  return (
    <Box sx={{ mb: 5, mt: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0b1f2a 0%, #0f3f4b 45%, #1f2937 100%)',
            borderRadius: '28px',
            p: { xs: 3, md: 4 },
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(12, 38, 51, 0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: 280,
              height: 280,
              background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
            },
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -120,
              left: -80,
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} sx={{ position: 'relative', zIndex: 2 }}>
            <Box sx={{ flex: '1 1 420px' }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Box
                  sx={{
                    p: 1.3,
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TravelExploreIcon sx={{ color: '#ffffff', fontSize: 26 }} />
                </Box>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ color: '#ffffff', letterSpacing: '-0.4px' }}
                >
                  Welcome back, {firstName}
                </Typography>
              </Stack>

              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.92)',
                  fontWeight: 500,
                  mb: 2.5,
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  maxWidth: 620,
                }}
              >
                "{quote}"
              </Typography>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={3}>
                {['Curated guides', 'Live updates', 'Hotel-ready chat'].map((label) => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: '#f8fafc',
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  sx={{
                    background: 'linear-gradient(120deg, #f8fafc 0%, #e2e8f0 100%)',
                    color: '#0f172a',
                    fontWeight: 700,
                    borderRadius: '12px',
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
                    '&:hover': {
                      background: '#ffffff',
                      transform: 'translateY(-2px)',
                    }
                  }}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                >
                  Start exploring
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.45)',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '12px',
                    px: 3,
                    py: 1.2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      borderColor: '#ffffff',
                      background: 'rgba(255,255,255,0.08)',
                    }
                  }}
                >
                  View my trips
                </Button>
              </Stack>
            </Box>

            <Box
              sx={{
                flex: '0 1 300px',
                bgcolor: 'rgba(255,255,255,0.12)',
                borderRadius: '20px',
                p: 2.5,
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                Trip readiness
              </Typography>
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
                Your next escape
              </Typography>
              <Stack spacing={1.2}>
                {[
                  { label: 'Trips synced', detail: 'Destination info ready in minutes' },
                  { label: 'Guides online', detail: 'Chat and book instantly' },
                  { label: 'Hotels verified', detail: 'Premium stays available' },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      bgcolor: 'rgba(15, 23, 42, 0.25)',
                      borderRadius: '12px',
                      px: 1.5,
                      py: 1,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ color: 'rgba(248,250,252,0.7)', fontSize: '0.8rem' }}>
                      {item.detail}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </motion.div>
    </Box>
  );
}
