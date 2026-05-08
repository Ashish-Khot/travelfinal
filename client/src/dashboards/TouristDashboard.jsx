
// Modern, premium Tourist Dashboard using MUI v5 and Framer Motion
import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider } from '@mui/material/styles';
import { io } from 'socket.io-client';
import theme from '../theme';
import AppBarTop from './components/AppBarTop';
import SidebarNav from './components/SidebarNav';

import ExploreGuides from './components/ExploreGuides';
import ExploreHotels from './components/ExploreHotels';
import ExploreDestinations from './components/ExploreDestinations';
import MyBookings from './components/MyBookings';
import ChatPanel from './components/ChatPanel';
import ReviewsPanel from './components/ReviewsPanel';
import TravelTipsPanel from './components/TravelTipsPanel';
import EmergencySupportPanel from './components/EmergencySupportPanel';
import TouristProfile from './components/TouristProfile';
import TouristSettings from './components/TouristSettings';
import CreateTravelogue from './components/CreateTravelogue';
import MyTravelogues from './components/MyTravelogues';
import TravelogueStories from './components/TravelogueStories';
import WelcomeSection from './components/WelcomeSection';
import DashboardMetrics from './components/DashboardMetrics';
import AIRecommendations from './components/AIRecommendations';
import WeatherForecastCard from './components/WeatherForecastCard';
import WeatherSearch from './components/WeatherSearch';
import VirtualGuide from './components/VirtualGuide';
import ItineraryPlannerModule from './components/ItineraryPlannerModule';
import { Tabs, Tab } from '@mui/material';

function TouristDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    const saved = localStorage.getItem('travelogue_sidebar_compact');
    return saved ? JSON.parse(saved) : false;
  });
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    const saved = localStorage.getItem('travelogue_sidebar_hidden');
    return saved ? JSON.parse(saved) : false;
  });
  const isMobile = useMediaQuery('(max-width:900px)');
  const [selectedTab, setSelectedTab] = useState('Dashboard');
  const [weatherModal, setWeatherModal] = useState(false);
  const [travelogueSubTab, setTravelogueSubTab] = useState('create');
  const [reviewsRefreshTrigger, setReviewsRefreshTrigger] = useState(0);
  const [chatTarget, setChatTarget] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('travelogue_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Chat notifications state - tracks unread messages from guides
  const [chatNotifications, setChatNotifications] = useState({});
  const socketRef = useRef(null);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('travelogue_dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Initialize Socket.io connection and listen for incoming chat messages
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:3001', {
        query: {
          userId: user._id || user.userId,
          userType: 'tourist'
        }
      });

      // Listen for new incoming messages
      socketRef.current.on('chat.message', (message) => {
        console.log('[TouristDashboard] Received chat message:', message);
        
        // Only add notification if sender is a guide and recipient is this tourist
        if (message.senderId && message.senderName) {
          setChatNotifications((prev) => {
            const guideId = message.senderId;
            const current = prev[guideId] || { name: message.senderName, unreadCount: 0, messages: [] };
            return {
              ...prev,
              [guideId]: {
                name: message.senderName,
                unreadCount: current.unreadCount + 1,
                preview: message.content || message.text || '...',
                timestamp: new Date(message.timestamp).getTime(),
                chatId: message.chatId || '',
                avatar: message.senderAvatar || ''
              }
            };
          });
        }
      });

      // Clean up on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.off('chat.message');
        }
      };
    }
  }, [user._id, user.userId]);

  // Clear chat notifications when navigating to Chat
  useEffect(() => {
    if (selectedTab === 'Chat') {
      setChatNotifications({});
    }
  }, [selectedTab]);

  // Save sidebar preferences
  useEffect(() => {
    localStorage.setItem('travelogue_sidebar_compact', JSON.stringify(sidebarCompact));
  }, [sidebarCompact]);

  useEffect(() => {
    localStorage.setItem('travelogue_sidebar_hidden', JSON.stringify(sidebarHidden));
  }, [sidebarHidden]);

  // Responsive sidebar toggle
  const handleSidebarToggle = () => setSidebarCompact((compact) => !compact);

  const handleSidebarVisibilityToggle = () => {
    setSidebarHidden((hidden) => {
      const nextHidden = !hidden;
      if (!nextHidden && isMobile) {
        setSidebarCompact(true);
      }
      return nextHidden;
    });
  };

  useEffect(() => {
    if (isMobile) {
      setSidebarHidden(true);
    }
  }, [isMobile]);

  // Theme toggle handler
  const handleThemeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Callback to refresh ReviewsPanel after tourist accepts review request
  const handleReviewsRefresh = () => {
    setReviewsRefreshTrigger(prev => prev + 1);
  };

  const dispatchAgentEvent = (eventName, detail) => {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: detail || {},
      })
    );
  };

  const handleAgentAction = (action) => {
    if (!action || typeof action !== 'object') return;
    const actionType = action.type || '';
    const targetTab = action.tab || '';
    const payload = action.payload || {};

    if (actionType === 'open_chat') {
      if (payload.chatTarget) {
        setChatTarget(payload.chatTarget);
      }
      setSelectedTab('Chat');
      return;
    }

    if (actionType === 'open_guide_booking') {
      setSelectedTab('Explore Guides');
      dispatchAgentEvent('agentExploreGuidesPrefill', payload);
      return;
    }

    if (actionType === 'prefill_review') {
      setSelectedTab('Reviews');
      dispatchAgentEvent('agentReviewPrefill', payload);
      return;
    }

    if (targetTab) {
      setSelectedTab(targetTab);
      if (targetTab === 'Explore Guides' && payload) {
        dispatchAgentEvent('agentExploreGuidesPrefill', payload);
      }
      return;
    }
  };

  // VOICE NAVIGATION: Listen for voice commands to navigate sections
  useEffect(() => {
    const handleVoiceNavigation = (event) => {
      const section = event.detail.section;
      const navigationMap = {
        MyBookings: 'My Bookings',
        MyReviews: 'Reviews',
        MyTravelogues: 'Travelogue',
        ExploreHotels: 'Hotel Booking',
        HotelBooking: 'Hotel Booking',
        Hotels: 'Hotel Booking',
        Profile: 'Profile',
        ExploreDestinations: 'Explore Destinations',
        Dashboard: 'Dashboard',
        VirtualGuide: 'Virtual Guide',
        GuideAI: 'Virtual Guide',
        ItineraryPlanner: 'Itinerary Planner',
      };

      const tabName = navigationMap[section] || section;
      console.log('🎤 Voice Navigation:', section, '→', tabName);
      setSelectedTab(tabName);

      // Close sidebar on mobile after navigation
      if (isMobile) {
        setSidebarHidden(true);
      }
    };

    const handleNavigateTab = (event) => {
      setSelectedTab(event.detail.tab);
      if (isMobile) {
        setSidebarHidden(true);
      }
    };

    // Listen for both voice navigation and profile menu navigation
    window.addEventListener('voiceNavigate', handleVoiceNavigation);
    window.addEventListener('navigateTab', handleNavigateTab);

    return () => {
      window.removeEventListener('voiceNavigate', handleVoiceNavigation);
      window.removeEventListener('navigateTab', handleNavigateTab);
    };
  }, [isMobile]);

  // Travelogue sub-tab navigation from child components
  useEffect(() => {
    const handleTravelogueSubTab = (event) => {
      if (event?.detail?.tab) {
        setSelectedTab('Travelogue');
        setTravelogueSubTab(event.detail.tab);
      }
    };
    window.addEventListener('travelogueSubTab', handleTravelogueSubTab);
    return () => window.removeEventListener('travelogueSubTab', handleTravelogueSubTab);
  }, []);

  // Sidebar navigation items (Profile and Settings removed - now in top-right profile menu)
  const navItems = [
    { label: 'Dashboard', value: 'Dashboard' },
    { label: 'Explore Destinations', value: 'Explore Destinations' },
    { label: 'Explore Guides', value: 'Explore Guides' },
    { label: 'Virtual Guide', value: 'Virtual Guide' },
    { label: 'Itinerary Planner', value: 'Itinerary Planner' },
    { label: 'Hotel Booking', value: 'Hotel Booking' },
    { label: 'My Bookings', value: 'My Bookings' },
    { label: 'Chat', value: 'Chat' },
    { label: 'Reviews', value: 'Reviews' },
    { label: 'Travelogue', value: 'Travelogue' },
    { label: 'Travel Tips', value: 'Travel Tips' },
    { label: 'Emergency', value: 'Emergency' },
  ];

  return (
    <ThemeProvider theme={theme(isDarkMode ? 'dark' : 'light')}>
      <CssBaseline />
      {/* AppBar */}
      <AppBarTop 
        user={user} 
        onActionComplete={handleReviewsRefresh}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
        chatNotifications={chatNotifications}
        onChatClick={() => setSelectedTab('Chat')}
        sidebarHidden={sidebarHidden}
        sidebarCompact={sidebarCompact}
        onSidebarToggle={handleSidebarToggle}
        onSidebarVisibilityToggle={handleSidebarVisibilityToggle}
      />
      <Box
        sx={(theme) => ({
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'background.default',
          backgroundImage:
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 10% 10%, rgba(15,118,110,0.15), transparent 35%), radial-gradient(circle at 90% 20%, rgba(148,163,184,0.08), transparent 40%)'
              : 'radial-gradient(circle at 10% 10%, rgba(14,116,144,0.12), transparent 35%), radial-gradient(circle at 90% 20%, rgba(15,118,110,0.12), transparent 40%)',
        })}
      >
        {/* Sidebar Navigation */}
        <SidebarNav
          open={!sidebarCompact}
          hidden={sidebarHidden}
          onToggle={handleSidebarToggle}
          onHide={handleSidebarVisibilityToggle}
          navItems={navItems}
          selectedTab={selectedTab}
          onSelect={setSelectedTab}
          chatUnreadCount={Object.values(chatNotifications).reduce((sum, n) => sum + n.unreadCount, 0)}
        />
        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 4 },
            pt: { xs: 9, sm: 11 }, // Add top padding for fixed AppBar
            maxWidth: '1600px',
            mx: 'auto',
            width: '100%',
            transition: 'padding 0.2s ease, max-width 0.2s ease',
          }}
        >
          {selectedTab === 'Dashboard' && (
            <Box>
              {/* Welcome Section */}
              <WelcomeSection user={user} />
              {/* Metrics Row */}
              <DashboardMetrics />
              {/* Recommendations + Weather Row */}
              <Box display={{ xs: 'block', md: 'flex' }} gap={3}>
                <Box flex={2} minWidth={0}>
                  <AIRecommendations />
                </Box>
                <Box flex={1} minWidth={260} maxWidth={420}>
                  <WeatherForecastCard onClick={() => setWeatherModal(true)} clickable />
                </Box>
                <WeatherSearch open={weatherModal} onClose={() => setWeatherModal(false)} />
              </Box>
            </Box>
          )}
          {selectedTab === 'Explore Destinations' && <ExploreDestinations />}
          {selectedTab === 'Explore Guides' && <ExploreGuides />}
          {selectedTab === 'Virtual Guide' && <VirtualGuide />}
          {selectedTab === 'Itinerary Planner' && <ItineraryPlannerModule />}
          {selectedTab === 'Hotel Booking' && (
            <ExploreHotels
              onOpenChat={(target) => {
                setChatTarget(target);
                setSelectedTab('Chat');
              }}
            />
          )}
          {selectedTab === 'My Bookings' && <MyBookings />}
          {selectedTab === 'Chat' && (
            <ChatPanel
              chatTarget={chatTarget}
              onChatHandled={() => setChatTarget(null)}
            />
          )}
          {selectedTab === 'Reviews' && <ReviewsPanel refreshTrigger={reviewsRefreshTrigger} />}
          {selectedTab === 'Travelogue' && (
            <Box>
              {/* Travelogue Hero */}
              <Box
                sx={{
                  borderRadius: '20px',
                  p: { xs: 2.5, md: 3.5 },
                  mb: 3,
                  color: '#0F172A',
                  background: 'linear-gradient(135deg, rgba(79,138,139,0.12) 0%, rgba(249,237,105,0.12) 100%)',
                  border: '1px solid rgba(79,138,139,0.12)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    right: -40,
                    top: -40,
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(79,138,139,0.2), transparent 70%)'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: -60,
                    bottom: -60,
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(15,23,42,0.18), transparent 70%)'
                  }}
                />
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Box sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '2rem' }, mb: 1 }}>
                    Travelogue Studio
                  </Box>
                  <Box sx={{ color: '#475569', fontWeight: 500, maxWidth: 520 }}>
                    Share cinematic travel stories, discover authentic experiences, and keep your travel memory vault in one place.
                  </Box>
                </Box>
              </Box>

              {/* Travelogue Sub-tabs */}
              <Box sx={{
                bgcolor: '#ffffff',
                borderRadius: '16px',
                mb: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                overflow: 'hidden'
              }}>
                <Tabs
                  value={travelogueSubTab}
                  onChange={(e, newValue) => setTravelogueSubTab(newValue)}
                  sx={{
                    borderBottom: '1px solid rgba(79,138,139,0.1)',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#6B7280',
                      minWidth: 120,
                      '&.Mui-selected': {
                        color: '#4F8A8B'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                      height: 3
                    }
                  }}
                >
                  <Tab value="create" label="Create Travelogue" />
                  <Tab value="my" label="My Travelogues" />
                  <Tab value="explore" label="Stories & Feed" />
                </Tabs>
              </Box>

              {/* Sub-tab Content */}
              {travelogueSubTab === 'create' && <CreateTravelogue />}
              {travelogueSubTab === 'my' && <MyTravelogues />}
              {travelogueSubTab === 'explore' && <TravelogueStories />}
            </Box>
          )}
          {selectedTab === 'Travel Tips' && <TravelTipsPanel />}
          {selectedTab === 'Emergency' && <EmergencySupportPanel />}
          {selectedTab === 'Profile' && <TouristProfile user={user} />}
          {selectedTab === 'Settings' && <TouristSettings />}
          {/* Add other tab content as needed */}
        </Box>
      </Box>

    </ThemeProvider>
  );
}

export default TouristDashboard;
