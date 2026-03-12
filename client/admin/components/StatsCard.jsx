import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Avatar,
  LinearProgress,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { motion } from 'framer-motion';

export default function StatsCard({
  label,
  value,
  icon: Icon,
  color = '#3b82f6',
  bgColor,
  trend = null,
  trendValue = null,
  percentage = null,
  subtitle = null,
  onClick = null,
  loading = false,
}) {
  const theme = useTheme();
  const calculatedBgColor = bgColor || alpha(color, 0.1);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    hover: {
      y: -8,
      boxShadow:
        theme.palette.mode === 'light'
          ? '0 20px 40px rgba(0, 0, 0, 0.1)'
          : '0 20px 40px rgba(0, 0, 0, 0.5)',
    },
  };

  const content = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }}
    >
      <Paper
        elevation={2}
        sx={{
          borderRadius: 3,
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            theme.palette.mode === 'light'
              ? '#ffffff'
              : alpha('#ffffff', 0.05),
          border: `1px solid ${alpha(color, 0.2)}`,
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.5)})`,
          },
        }}
        onClick={onClick}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {label}
            </Typography>
          </Box>
          <Avatar
            sx={{
              bgcolor: calculatedBgColor,
              color,
              width: 40,
              height: 40,
              fontSize: '1.25rem',
            }}
          >
            {Icon && <Icon />}
          </Avatar>
        </Box>

        <Box sx={{ flex: 1, my: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
            }}
          >
            {loading ? '...' : value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {percentage !== null && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Progress
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color,
                }}
              >
                {percentage}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha(color, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.6)})`,
                },
              }}
            />
          </Box>
        )}

        {trend !== null && trendValue !== null && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              pt: 1,
              borderTop: `1px solid ${alpha(color, 0.2)}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                color: trend === 'up' ? '#22c55e' : '#ef4444',
              }}
            >
              {trend === 'up' ? <TrendingUpIcon sx={{ fontSize: '1rem' }} /> : <TrendingDownIcon sx={{ fontSize: '1rem' }} />}
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {Math.abs(trendValue)}%
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              from last month
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );

  if (onClick) {
    return content;
  }

  return content;
}
