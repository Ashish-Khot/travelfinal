import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Toolbar, Typography, Box, alpha, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BookIcon from '@mui/icons-material/Book';
import PlaceIcon from '@mui/icons-material/Place';
import CategoryIcon from '@mui/icons-material/Category';
import CommentIcon from '@mui/icons-material/Comment';
import BarChartIcon from '@mui/icons-material/BarChart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import RateReviewIcon from '@mui/icons-material/RateReview';
import HistoryIcon from '@mui/icons-material/History';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
  { label: 'Overview', path: '/admin', icon: <DashboardIcon /> },
  { label: 'Users', path: '/admin/users', icon: <PeopleIcon /> },
  { label: 'Reviews', path: '/admin/reviews', icon: <RateReviewIcon /> },
  { label: 'Travelogues', path: '/admin/travelogues', icon: <BookIcon /> },
  { label: 'Destinations', path: '/admin/destinations', icon: <PlaceIcon /> },
  { label: 'Categories', path: '/admin/categories', icon: <CategoryIcon /> },
  { label: 'Comments', path: '/admin/comments', icon: <CommentIcon /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChartIcon /> },
  { label: 'Activity Log', path: '/admin/activity-log', icon: <HistoryIcon /> },
  { label: 'Notifications', path: '/admin/notifications', icon: <NotificationsIcon /> },
  { label: 'Settings', path: '/admin/settings', icon: <SettingsIcon /> },
];

export default function Sidebar() {
  const theme = useTheme();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: 240,
          boxSizing: 'border-box',
          background: theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'
            : 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          color: theme.palette.text.primary,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        },
      }}
    >
      <Toolbar />
      <Box sx={{ p: 2 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 900,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, #6366f1)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.1rem',
              letterSpacing: '-0.5px',
            }}
          >
            🚀 Admin Panel
          </Typography>
        </motion.div>
      </Box>
      <List sx={{ px: 1, flex: 1 }}>
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <NavLink to={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
              {({ isActive }) => (
                <ListItem disablePadding>
                  <ListItemButton
                    selected={isActive}
                    sx={{
                      borderRadius: 2,
                      mb: 0.75,
                      transition: 'all 0.2s ease',
                      background: isActive
                        ? alpha(theme.palette.primary.main, 0.15)
                        : 'transparent',
                      borderLeft: isActive
                        ? `3px solid ${theme.palette.primary.main}`
                        : `3px solid transparent`,
                      color: isActive
                        ? theme.palette.primary.main
                        : theme.palette.text.primary,
                      '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.1),
                        borderLeftColor: theme.palette.primary.main,
                      },
                      '& .MuiListItemIcon-root': {
                        color: isActive
                          ? theme.palette.primary.main
                          : 'inherit',
                        minWidth: 40,
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </NavLink>
          </motion.div>
        ))}
      </List>
    </Drawer>
  );
}
