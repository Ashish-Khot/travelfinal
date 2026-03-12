import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, useTheme as useMuiTheme, alpha, Avatar, Menu, MenuItem } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationBell from './NotificationBell';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTheme } from '../theme';

export default function Topbar() {
  const { mode, toggle } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <AppBar 
      position="static" 
      elevation={0} 
      sx={{ 
        background: muiTheme.palette.mode === 'light' 
          ? '#ffffff'
          : alpha('#000000', 0.5),
        color: muiTheme.palette.text.primary,
        borderBottom: `1px solid ${alpha(muiTheme.palette.divider, 0.3)}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, sm: 4 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
          Admin Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <IconButton 
            onClick={toggle} 
            color="inherit"
            sx={{ 
              '&:hover': { 
                bgcolor: alpha(muiTheme.palette.primary.main, 0.1)
              }
            }}
          >
            {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>

          {/* Settings */}
          <IconButton 
            color="inherit"
            sx={{ 
              '&:hover': { 
                bgcolor: alpha(muiTheme.palette.primary.main, 0.1)
              }
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* Profile Menu */}
          <Box 
            onClick={handleProfileMenu}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              cursor: 'pointer',
              ml: 1,
              p: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(muiTheme.palette.primary.main, 0.1),
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main',
                fontSize: '0.85rem',
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0) || 'A'}
            </Avatar>
            <Typography variant="caption" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
              {user?.name?.split(' ')[0] || 'Admin'}
            </Typography>
          </Box>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
            <MenuItem disabled>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user?.email || 'admin@example.com'}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
