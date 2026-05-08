// Collapsible Sidebar Navigation for Tourist Dashboard
// Layout logic: Uses MUI Drawer for a permanent sidebar. Navigation items are mapped with icons and labels. Collapsible with a toggle button. Responsive width for mobile/desktop.
import React from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExploreIcon from '@mui/icons-material/TravelExplore';
import HotelIcon from '@mui/icons-material/Hotel';
import PeopleAltIcon from '@mui/icons-material/Groups';
import BookingsIcon from '@mui/icons-material/EventAvailable';
import ChatIcon from '@mui/icons-material/Chat';
import ReviewsIcon from '@mui/icons-material/Reviews';
import TipsIcon from '@mui/icons-material/TipsAndUpdates';
import EmergencyIcon from '@mui/icons-material/ReportProblem';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { alpha, styled } from '@mui/material/styles';

const drawerWidth = 252;
const collapsedWidth = 72;

// Icons for each tab
const iconMap = {
  Dashboard: <DashboardIcon sx={{ color: 'primary.main' }} />,
  'Explore Destinations': <ExploreIcon sx={{ color: 'primary.main' }} />,
  'Explore Guides': <PeopleAltIcon sx={{ color: 'primary.main' }} />,
  'Virtual Guide': <SupportAgentIcon sx={{ color: 'primary.main' }} />,
  'Itinerary Planner': <EventNoteIcon sx={{ color: 'primary.main' }} />,
  'Hotel Booking': <HotelIcon sx={{ color: 'primary.main' }} />,
  'My Bookings': <BookingsIcon sx={{ color: 'primary.main' }} />,
  Chat: <ChatIcon sx={{ color: 'primary.main' }} />,
  Reviews: <ReviewsIcon sx={{ color: 'primary.main' }} />,
  'Travel Tips': <TipsIcon sx={{ color: 'primary.main' }} />,
  Travelogue: <MenuBookIcon sx={{ color: 'primary.main' }} />,
  Emergency: <EmergencyIcon sx={{ color: 'error.main' }} />,
};

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    borderRight: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.88))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
    boxShadow: theme.shadows[2],
    transition: theme.transitions.create(['width', 'box-shadow'], {
      duration: theme.transitions.duration.shortest,
    }),
  },
}));

export default function SidebarNav({
  open,
  hidden = false,
  onToggle,
  onHide = () => {},
  navItems = [],
  selectedTab,
  onSelect,
  chatUnreadCount = 0
}) {
  if (hidden) {
    return null;
  }

  return (
    <StyledDrawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidth : collapsedWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : collapsedWidth,
          overflowX: 'hidden',
          bgcolor: 'background.paper',
        },
      }}
    >
      <List sx={{ pt: 2 }}>
        <ListItem
          disablePadding
          sx={{
            justifyContent: 'center',
            py: 1,
            px: 1,
            gap: 0.5,
            flexDirection: open ? 'row' : 'column',
          }}
        >
          <Tooltip title={open ? 'Collapse' : 'Expand'} placement="right">
            <IconButton onClick={onToggle} size="large">
              {open ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Hide sidebar" placement="right">
            <IconButton onClick={onHide} size="large">
              <VisibilityOffIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
        <Divider sx={{ mb: 1 }} />
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <Tooltip title={open ? '' : item.label} placement="right" disableHoverListener={open}>
              <ListItemButton
                selected={selectedTab === item.value}
                onClick={() => onSelect && onSelect(item.value)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  borderRadius: 3,
                  my: 0.5,
                  transition: 'all 0.2s ease',
                  bgcolor: selectedTab === item.value ? 'rgba(15,118,110,0.12)' : undefined,
                  boxShadow: selectedTab === item.value ? '0 8px 18px rgba(15, 118, 110, 0.12)' : undefined,
                  '&:hover': {
                    bgcolor: 'rgba(15,118,110,0.16)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.label === 'Chat' ? (
                    <Badge badgeContent={chatUnreadCount} color="error" overlap="circular">
                      {iconMap[item.label]}
                    </Badge>
                  ) : (
                    iconMap[item.label]
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    opacity: open ? 1 : 0,
                    transition: 'opacity 0.2s',
                    fontWeight: selectedTab === item.value ? 700 : 500,
                    color: selectedTab === item.value ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </StyledDrawer>
  );
}
