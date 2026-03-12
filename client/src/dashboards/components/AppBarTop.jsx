// Top AppBar with logo, search, notifications, and user avatar menu
// Layout logic: Uses MUI AppBar and Toolbar for a sticky top navigation bar. Includes logo, search bar, notifications, and user avatar menu. Responsive and styled with custom theme.
import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Tooltip from '@mui/material/Tooltip';
import { alpha, styled } from '@mui/material/styles';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import NotificationPanel from './NotificationPanel';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(2),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '32ch',
    },
  },
}));

export default function AppBarTop({ 
  user, 
  onActionComplete, 
  isDarkMode = false, 
  onThemeToggle = () => {},
  chatNotifications = {},
  onChatClick = () => {}
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    // Dispatch event to navigate to Profile
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Profile' } }));
    handleClose();
  };

  const handleSettingsClick = () => {
    // Dispatch event to navigate to Settings
    window.dispatchEvent(new CustomEvent('navigateTab', { detail: { tab: 'Settings' } }));
    handleClose();
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <AppBar position="fixed" color="inherit" elevation={1} sx={{ zIndex: 1201 }}>
      <Toolbar>
        <TravelExploreIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" noWrap sx={{ color: 'primary.main', fontWeight: 700 }}>
          Travelogue
        </Typography>
        <Search>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search destinations, guides, travelogues..."
            inputProps={{ 'aria-label': 'search' }}
          />
        </Search>
        <div style={{ flexGrow: 1 }} />
        
        {/* Theme Toggle Button */}
        <Tooltip title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
          <IconButton 
            onClick={onThemeToggle}
            sx={{ mr: 1 }}
          >
            {isDarkMode ? (
              <Brightness7Icon sx={{ color: '#FDB813' }} />
            ) : (
              <Brightness4Icon sx={{ color: '#667eea' }} />
            )}
          </IconButton>
        </Tooltip>

        <NotificationPanel 
          onActionComplete={onActionComplete}
          chatNotifications={chatNotifications}
          onChatClick={onChatClick}
        />
        <IconButton onClick={handleMenu} sx={{ ml: 2 }}>
          <Avatar alt={user?.name || 'User'} src={user?.avatar} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2,
              mt: 1,
            }
          }}
        >
          <MenuItem disabled sx={{ color: '#666', fontWeight: 600, pb: 1 }}>
            {user?.name || 'User'}
          </MenuItem>
          <MenuItem sx={{ borderTop: '1px solid #eee' }}>
            <Box sx={{ pt: 1 }} />
          </MenuItem>
          <MenuItem onClick={handleProfileClick} sx={{ fontWeight: 500 }}>
            👤 My Profile
          </MenuItem>
          <MenuItem onClick={handleSettingsClick} sx={{ fontWeight: 500 }}>
            ⚙️ Settings
          </MenuItem>
          <MenuItem sx={{ borderTop: '1px solid #eee', mt: 1 }}>
            <Box sx={{ pt: 1 }} />
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: '#d32f2f', fontWeight: 500 }}>
            🚪 Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
