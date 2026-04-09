import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Rating from '@mui/material/Rating';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttractionsIcon from '@mui/icons-material/Attractions';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import { motion } from 'framer-motion';
import PremiumDestinationMap from './PremiumDestinationMap';
import DestinationGallery from './DestinationGallery';
import OptimizedDestinationCard from './OptimizedDestinationCard';

const categories = ['All', 'Island', 'Mountain', 'City', 'Heritage', 'Beach', 'Temple', 'Fort'];
const filters = [
  'All',
  'Landmark',
  'Monument',
  'Nature',
  'Historic',
  'Museum',
  'Park',
  'Temple',
  'Beach',
  'Fort',
  'Wonder',
  'Popular',
  'Heritage Site',
  'Natural Wonder',
];

// Haversine formula for distance in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ExploreDestinations() {
  const olaConfigured = Boolean(
    import.meta.env.VITE_OLA_MAPS_TILE_URL && import.meta.env.VITE_OLA_MAPS_API_KEY
  );
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filter, setFilter] = useState('All');
  const [mapProvider, setMapProvider] = useState(
    (import.meta.env.VITE_MAP_PROVIDER || 'osm').toLowerCase() === 'ola' ? 'ola' : 'osm'
  );
  const [rating, setRating] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [crawledDestinations, setCrawledDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('favorites') || '[]'));
  const [isSearchResult, setIsSearchResult] = useState(false); // Track if showing search results

  useEffect(() => {
    setLoading(true);
    setError('');
    
    // Try to load from database first
    fetch('http://localhost:3001/api/destination/destinations')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setDestinations(data);
        } else {
          // Fallback to popular destinations
          return fetch('http://localhost:3001/api/opentripmap/popular')
            .then(res => res.json())
            .then(popData => {
              setDestinations(popData);
            });
        }
        setLoading(false);
      })
      .catch(err => {
        console.log('DB load failed, trying popular destinations fallback...', err);
        // Ultimate fallback - load popular destinations
        fetch('http://localhost:3001/api/opentripmap/popular')
          .then(res => res.json())
          .then(popData => {
            setDestinations(popData);
            setLoading(false);
          })
          .catch(popErr => {
            console.error('All fallbacks failed:', popErr);
            setError('⚠️ Could not load destinations. Try using the Search feature to look for specific cities.');
            setLoading(false);
          });
      });
  }, []);

  // Get user location for distance filter
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  // Search-triggered web crawling
  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setSearch(pendingSearch);
    setIsSearchResult(true); // Mark that we're showing search results
    try {
      const res = await fetch(`http://localhost:3001/api/opentripmap/search?query=${encodeURIComponent(pendingSearch)}&limit=12`);
      const data = await res.json();
      let places = [];
      if (data.features) {
        places = data.features.map(f => {
          if (f.properties.kinds === 'Wikipedia') {
            return {
              xid: null,
              name: f.properties.name,
              lat: null,
              lon: null,
              category: 'Wikipedia',
              image: f.properties.image || '/fallback-destination.jpg',
              description: f.properties.description || 'No description available.',
            };
          }
          return {
            xid: f.properties.xid,
            name: f.properties.name,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            category: f.properties.kinds,
            image: f.properties.image || '/fallback-destination.jpg',
            description: f.properties.description || '',
          };
        });
      }
      console.log('✅ Search completed, found', places.length, 'results');
      setDestinations(places);
      setLoading(false);
    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Failed to load destinations.');
      setLoading(false);
    }
  };

  // Filter logic - when showing search results, be more lenient
  const filteredDB = destinations.filter(dest => {
    // When showing search results, just show all of them (already filtered by location on backend)
    if (isSearchResult) {
      console.log('🎯 Showing search result:', dest.name);
      return true;
    }
    
    // For browsed destinations, apply full filtering
    const matchesCategory = category === 'All' || (dest.category || dest.details?.kinds || '').toLowerCase().includes(category.toLowerCase());
    const matchesFilter = filter === 'All' || (dest.details?.kinds || dest.category || '').toLowerCase().includes(filter.toLowerCase()) || (dest.details?.tags || []).map(t => t.toLowerCase()).includes(filter.toLowerCase());
    const matchesRating = (dest.rating || 0) >= rating;
    const matchesSearch =
      (dest.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (dest.city || '').toLowerCase().includes(search.toLowerCase()) ||
      (dest.country || '').toLowerCase().includes(search.toLowerCase());
    let matchesDistance = true;
    if (distance > 0 && userLocation && dest.lat && dest.lon) {
      const d = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, dest.lat, dest.lon);
      matchesDistance = d <= distance;
    }
    return matchesCategory && matchesFilter && matchesRating && matchesSearch && matchesDistance;
  });

  const filteredCrawled = crawledDestinations.filter(dest => {
    const matchesCategory = category === 'All' || (dest.category || '').toLowerCase().includes(category.toLowerCase());
    const matchesFilter = filter === 'All' || (dest.details?.kinds || dest.category || '').toLowerCase().includes(filter.toLowerCase()) || (dest.details?.tags || []).map(t => t.toLowerCase()).includes(filter.toLowerCase());
    const matchesRating = (dest.rating || 0) >= rating;
    let matchesDistance = true;
    if (distance > 0 && userLocation && dest.lat && dest.lon) {
      const d = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, dest.lat, dest.lon);
      matchesDistance = d <= distance;
    }
    return matchesCategory && matchesFilter && matchesRating && matchesDistance;
  });

  const filtered = [...filteredDB, ...filteredCrawled];

  const toggleFavorite = (dest) => {
    const destId = dest.xid || dest.name;
    const newFavorites = favorites.includes(destId)
      ? favorites.filter(f => f !== destId)
      : [...favorites, destId];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const isFavorite = (dest) => {
    return favorites.includes(dest.xid || dest.name);
  };

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '4px solid #f0f0f0',
              borderTop: '4px solid #4F8A8B',
            }}
          />
        </motion.div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 4,
            border: '2px solid #FFD700',
          }}
        >
          <Typography variant="h6" color="error" mb={2}>
            ⚠️ {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{
              background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
            }}
          >
            Retry
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(135deg, #F8FAFB 0%, #f0f4f5 100%)', pb: 6 }}>
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
            color: 'white',
            p: { xs: 3, md: 5 },
            mb: 4,
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(79, 138, 139, 0.25)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-1px' }}>
            🌍 Discover Amazing Destinations
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.95 }}>
            Explore {filtered.length} incredible places around the world
          </Typography>
        </Box>
      </motion.div>

      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Premium Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3.5 },
              mb: 4,
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 4px 20px rgba(79, 138, 139, 0.08)',
              border: '1px solid rgba(79, 138, 139, 0.1)',
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1a1a', minWidth: 100 }}>
                  🔍 Find Destinations
                </Typography>
                <TextField
                  placeholder="Search by name, city, or country..."
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <span style={{ fontSize: '18px' }}>🔍</span>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#f8f9fa',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#f0f2f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#fff',
                        boxShadow: '0 0 0 3px rgba(79, 138, 139, 0.1)',
                      },
                    },
                  }}
                />
              </Stack>

              <Divider />

              {/* Filters Row */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  select
                  label="Map Provider"
                  value={mapProvider}
                  onChange={e => setMapProvider(e.target.value)}
                  sx={{ minWidth: 170, flex: 1 }}
                >
                  <MenuItem value="osm">OpenStreetMap (Free)</MenuItem>
                  <MenuItem value="ola">Ola Maps (API key)</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  sx={{ minWidth: 140, flex: 1 }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Filter Type"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  sx={{ minWidth: 140, flex: 1 }}
                >
                  {filters.map(f => (
                    <MenuItem key={f} value={f}>
                      {f}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Min Rating"
                  type="number"
                  value={rating}
                  onChange={e => setRating(Number(e.target.value))}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  sx={{ minWidth: 130, flex: 1 }}
                />

                <TextField
                  label="Max Distance (km)"
                  type="number"
                  value={distance}
                  onChange={e => setDistance(Number(e.target.value))}
                  inputProps={{ min: 0, step: 1 }}
                  disabled={!userLocation}
                  helperText={!userLocation ? 'Enable location' : ''}
                  sx={{ minWidth: 160, flex: 1 }}
                />

                <Button
                  variant="contained"
                  onClick={handleSearch}
                  sx={{
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
                    px: 4,
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(79, 138, 139, 0.25)',
                    textTransform: 'none',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(79, 138, 139, 0.35)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Search
                </Button>

                {isSearchResult && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsSearchResult(false);
                      setPendingSearch('');
                      setSearch('');
                    }}
                    sx={{
                      borderColor: '#4F8A8B',
                      color: '#4F8A8B',
                      px: 3,
                      py: 1.5,
                      fontWeight: 700,
                      borderRadius: '10px',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(79, 138, 139, 0.05)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    ✕ Clear Search
                  </Button>
                )}
              </Stack>
              {mapProvider === 'ola' && !olaConfigured && (
                <Typography variant="caption" sx={{ color: '#8B5E00', fontWeight: 600 }}>
                  Ola Maps key/tile URL not configured, so map will automatically fall back to free OpenStreetMap tiles.
                </Typography>
              )}

              {/* View Mode Toggle */}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <IconButton
                  onClick={() => setViewMode('grid')}
                  sx={{
                    backgroundColor: viewMode === 'grid' ? 'rgba(79, 138, 139, 0.1)' : 'transparent',
                    color: viewMode === 'grid' ? '#4F8A8B' : '#999',
                  }}
                >
                  <GridViewIcon />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode('list')}
                  sx={{
                    backgroundColor: viewMode === 'list' ? 'rgba(79, 138, 139, 0.1)' : 'transparent',
                    color: viewMode === 'list' ? '#4F8A8B' : '#999',
                  }}
                >
                  <ListIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        </motion.div>

        {/* Destinations Grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: '16px',
                background: 'white',
                border: '2px dashed rgba(79, 138, 139, 0.2)',
              }}
            >
              <Typography variant="h6" color="#6B7280" mb={1}>
                🔍 No destinations found
              </Typography>
              <Typography variant="body2" color="#999">
                Try adjusting your filters or search terms
              </Typography>
            </Paper>
          </motion.div>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 
                viewMode === 'grid' 
                  ? { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }
                  : '1fr',
              gap: 3,
              mb: 5,
            }}
          >
            {filtered.map((dest) => (
              <OptimizedDestinationCard
                key={dest.xid || dest.name}
                dest={dest}
                viewMode={viewMode}
                isFavorite={isFavorite}
                onFavoriteClick={toggleFavorite}
                onCardClick={async () => {
                  if (dest.xid) {
                    try {
                      const detailRes = await fetch(`http://localhost:3001/api/opentripmap/place/${dest.xid}`);
                      const detail = await detailRes.json();
                      setSelected({
                        ...dest,
                        description: detail.wikipedia_extract || detail.info?.descr || '',
                        image: detail.preview?.source || '/fallback-destination.jpg',
                        city: detail.address?.city || '',
                        country: detail.address?.country || '',
                        rating: detail.rate || 0,
                        details: detail.kinds || '',
                      });
                    } catch {
                      setSelected(dest);
                    }
                  } else {
                    setSelected(dest);
                  }
                }}
              />
            ))}
          </Box>
        )}

        {/* Interactive Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Box
            sx={{
              mt: 5,
              mb: 4,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1a1a1a' }}>
              📍 Explore on Map
            </Typography>
            <PremiumDestinationMap
              destinations={filtered}
              center={{ lat: 36.3932, lng: 25.4615 }}
              zoom={2}
              mapProvider={mapProvider}
              onMarkerClick={dest => {
                setSelected(dest);
              }}
            />
          </Box>
        </motion.div>
      </Box>

      {/* Detail Modal */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              background: 'white',
            },
          },
        }}
      >
        {selected && (
          <>
            <DialogTitle
              sx={{
                background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
                color: 'white',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 3,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                {selected.name}
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={() => toggleFavorite(selected)}
                  sx={{ color: 'white' }}
                >
                  {isFavorite(selected) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.share?.({
                      title: selected.name,
                      text: selected.description,
                    });
                  }}
                  sx={{ color: 'white' }}
                >
                  <ShareIcon />
                </IconButton>
              </Stack>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Gallery */}
              <DestinationGallery
                images={[selected.image || '/fallback-destination.jpg']}
                title={selected.name}
              />

              {/* Location Info */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(79, 138, 139, 0.05) 0%, rgba(249, 237, 105, 0.05) 100%)',
                  border: '1px solid rgba(79, 138, 139, 0.1)',
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <LocationOnIcon sx={{ color: '#4F8A8B', mt: 0.5 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                        Location
                      </Typography>
                      <Typography variant="body2" color="#6B7280">
                        {[selected.city, selected.country].filter(Boolean).join(', ')} 
                        {selected.lat && selected.lon && ` (${selected.lat.toFixed(2)}, ${selected.lon.toFixed(2)})`}
                      </Typography>
                    </Box>
                  </Stack>

                  {selected.rating && (
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <AttractionsIcon sx={{ color: '#F9ED69', mt: 0.5 }} />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                          Rating
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Rating
                            value={selected.rating / 2}
                            readOnly
                            sx={{ color: '#F9ED69' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                            {selected.rating.toFixed(1)} / 10
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </Paper>

              {/* Category & Description */}
              {(selected.details || selected.category) && (
                <Box mb={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
                    Category
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {(selected.details?.kinds || selected.category || '')
                      .split(',')
                      .slice(0, 5)
                      .map((cat, i) => (
                        <Chip
                          key={i}
                          label={cat.trim()}
                          variant="outlined"
                          sx={{
                            borderColor: '#4F8A8B',
                            color: '#4F8A8B',
                            fontWeight: 600,
                          }}
                        />
                      ))}
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Description */}
              {selected.description && (
                <Box mb={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}>
                    About This Place
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4B5563', lineHeight: 1.8 }}>
                    {selected.description}
                  </Typography>
                </Box>
              )}

              {/* Additional Info */}
              {(selected.history || selected.visitingHours || selected.ticketInfo) && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    background: '#f8f9fa',
                    border: '1px solid rgba(79, 138, 139, 0.1)',
                  }}
                >
                  {selected.history && (
                    <Box mb={2}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B' }}>
                        HISTORY
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
                        {selected.history}
                      </Typography>
                    </Box>
                  )}
                  {selected.visitingHours && (
                    <Box mb={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B' }}>
                          VISITING HOURS
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
                        {selected.visitingHours}
                      </Typography>
                    </Box>
                  )}
                  {selected.ticketInfo && (
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#4F8A8B' }}>
                        TICKET INFO
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
                        {selected.ticketInfo}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Map in Modal */}
              {selected.lat && selected.lon && (
                <Box mt={3}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#1a1a1a' }}>
                    Location Map
                  </Typography>
                  <PremiumDestinationMap
                    destinations={[selected]}
                    center={{ lat: selected.lat, lng: selected.lon }}
                    zoom={13}
                    mapProvider={mapProvider}
                  />
                </Box>
              )}

              <Box mt={3} sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setSelected(null)}
                  sx={{
                    background: 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)',
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Close
                </Button>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
