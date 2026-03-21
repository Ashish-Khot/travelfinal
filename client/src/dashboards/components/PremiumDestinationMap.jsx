import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-markercluster/MarkerCluster.css';
import 'leaflet-markercluster/MarkerCluster.Default.css';
import 'leaflet-markercluster/leaflet.markercluster.js';
import { MAP_CONFIG } from '../../config/mapConfig';
import { autocompleteLocation } from '../../services/geocodingService';
import { getRoute } from '../../services/routingService';

const DEFAULT_CENTER = { lat: 36.3932, lng: 25.4615 };
const DEFAULT_ZOOM = 2;

const TILE_PRESETS = {
  light: { label: 'Light', source: MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light || MAP_CONFIG?.TILE_SERVERS?.OSM },
  streets: { label: 'Streets', source: MAP_CONFIG?.TILE_SERVERS?.OSM || MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light },
  satellite: { label: 'Satellite', source: MAP_CONFIG?.TILE_SERVERS?.Satellite || MAP_CONFIG?.TILE_SERVERS?.OSM },
  topo: { label: 'Topo', source: MAP_CONFIG?.TILE_SERVERS?.TopoMap || MAP_CONFIG?.TILE_SERVERS?.OSM },
};

const PLACE_TYPES = {
  hotel: { label: 'Hotel', color: '#2563eb', chip: 'bg-blue-100 text-blue-700' },
  restaurant: { label: 'Restaurant', color: '#f97316', chip: 'bg-orange-100 text-orange-700' },
  hospital: { label: 'Hospital', color: '#dc2626', chip: 'bg-rose-100 text-rose-700' },
  attraction: { label: 'Attraction', color: '#0f766e', chip: 'bg-teal-100 text-teal-700' },
};

const TRAVEL_MODES = [
  { key: 'driving-car', label: 'Drive' },
  { key: 'foot-walking', label: 'Walk' },
  { key: 'cycling-regular', label: 'Bike' },
];

const renderTravelModeIcon = (modeKey) => {
  if (modeKey === 'driving-car') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5.2 12.6h13.6l-1.5-4.1a1.6 1.6 0 0 0-1.5-1H8.7c-.7 0-1.3.4-1.5 1l-2 4.1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12.6v2.8c0 .9.7 1.6 1.6 1.6H7m10 0h1.4c.9 0 1.6-.7 1.6-1.6v-2.8M7 17v1.4m10-1.4v1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7.5" cy="14.4" r="1" fill="currentColor" />
        <circle cx="16.5" cy="14.4" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (modeKey === 'foot-walking') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="13.3" cy="4.8" r="2.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12.5 7.5l-2.8 3.2 2.1 2.2-1.6 5.4M12.6 10.1l3.4 2.2m-3.4-2.2l-2.3 4.1-4 1.5m6.3-1.5l3.6 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (modeKey === 'cycling-regular') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6.6" cy="16.6" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="16.6" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9h3.3l2.4 5.2h2.3m-4.7-5.2l2.2-2.2m-1.6 7.4l-2.5-5m8.3 0h-3l1.6 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
};

const markerIconCache = new Map();
const simpleIconCache = new Map();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toNumber = (value, fallback = null) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeRating = (rating) => {
  const parsed = toNumber(rating, 4.2);
  const scaled = parsed > 5 ? parsed / 2 : parsed;
  return Math.max(0, Math.min(5, scaled));
};

const detectPlaceType = (destination) => {
  const source = `${destination?.category || ''} ${destination?.kinds || ''} ${destination?.details || ''}`.toLowerCase();
  if (/(hotel|resort|hostel|lodging|accommodation)/.test(source)) return 'hotel';
  if (/(restaurant|food|cafe|dining|bar)/.test(source)) return 'restaurant';
  if (/(hospital|medical|health|clinic)/.test(source)) return 'hospital';
  return 'attraction';
};

const iconSvgForType = (type) => {
  if (type === 'hotel') {
    return '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="16" rx="2.5" fill="white"/><path d="M8 8h2M12 8h2M8 12h2M12 12h2M8 16h8" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  if (type === 'restaurant') {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M8 4v16M6 4v6M10 4v6M6 10h4M15 4v8c0 1.3 1 2.3 2.3 2.3H18V20" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  if (type === 'hospital') {
    return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" fill="white"/><path d="M12 8v8M8 12h8" stroke="#b91c1c" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.5l2.3 4.7 5.2.7-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.7L12 4.5z" fill="white"/></svg>';
};

const createMarkerIcon = (type) => {
  if (markerIconCache.has(type)) return markerIconCache.get(type);
  const style = PLACE_TYPES[type] || PLACE_TYPES.attraction;
  const icon = L.divIcon({
    className: '',
    iconSize: [44, 56],
    iconAnchor: [22, 46],
    popupAnchor: [0, -34],
    html: `<div class="travel-marker marker-${type}"><span class="travel-marker-ping"></span><div class="travel-marker-main" style="background:${style.color}"><span class="travel-marker-icon">${iconSvgForType(type)}</span></div></div>`,
  });
  markerIconCache.set(type, icon);
  return icon;
};

const createSimplePinIcon = (color, label, key) => {
  const cacheKey = `${key}-${color}-${label}`;
  if (simpleIconCache.has(cacheKey)) return simpleIconCache.get(cacheKey);
  const icon = L.divIcon({
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 34],
    popupAnchor: [0, -26],
    html: `<div class="travel-simple-pin" style="--pin-color:${color}"><div class="travel-simple-pin-core">${escapeHtml(label || '')}</div></div>`,
  });
  simpleIconCache.set(cacheKey, icon);
  return icon;
};

const createPopupMarkup = (place) => {
  const placeType = PLACE_TYPES[place.type] || PLACE_TYPES.attraction;
  const image = escapeHtml(place.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
  const title = escapeHtml(place.name || 'Unknown place');
  const location = escapeHtml([place.city, place.country].filter(Boolean).join(', ') || place.categoryLabel);
  const desc = escapeHtml((place.description || 'Discover this place on your journey.').slice(0, 120));
  const rating = place.rating.toFixed(1);
  return `<article class="travel-popup"><div class="travel-popup-media"><img src="${image}" alt="${title}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=800&q=80'" /><span class="travel-popup-badge" style="background:${placeType.color}">${escapeHtml(placeType.label)}</span></div><div class="travel-popup-body"><h4>${title}</h4><p class="travel-popup-location">${location}</p><div class="travel-popup-rating"><span>&#9733;</span><strong>${rating}</strong><small>/ 5.0</small></div><p class="travel-popup-desc">${desc}${place.description && place.description.length > 120 ? '...' : ''}</p><button type="button" class="js-map-action travel-popup-btn">View Details</button></div></article>`;
};

const hasCoords = (value) => value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lon));

const getDistanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon ?? from.lng);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon ?? to.lng);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getInstructionMeta = (step) => {
  const normalized = `${step?.text || ''} ${step?.type || ''} ${step?.modifier || ''}`.toLowerCase();
  if (normalized.includes('arrive')) return { symbol: 'ARR', tone: 'bg-emerald-100 text-emerald-700' };
  if (normalized.includes('depart') || normalized.includes('head')) return { symbol: 'GO', tone: 'bg-sky-100 text-sky-700' };
  if (normalized.includes('roundabout')) return { symbol: 'RDB', tone: 'bg-amber-100 text-amber-700' };
  if (normalized.includes('u-turn') || normalized.includes('uturn')) return { symbol: 'U', tone: 'bg-rose-100 text-rose-700' };
  if (normalized.includes('left')) return { symbol: 'L', tone: 'bg-indigo-100 text-indigo-700' };
  if (normalized.includes('right')) return { symbol: 'R', tone: 'bg-violet-100 text-violet-700' };
  return { symbol: 'FWD', tone: 'bg-slate-100 text-slate-700' };
};

const getNearestInstructionIndex = (instructions, currentLocation) => {
  if (!Array.isArray(instructions) || instructions.length === 0 || !hasCoords(currentLocation)) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  instructions.forEach((step, index) => {
    const target = step?.toCoord || step?.fromCoord;
    if (!Array.isArray(target) || target.length < 2) return;
    const distance = getDistanceMeters(currentLocation, { lat: target[0], lon: target[1] });
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const getTileCandidates = (activeTileKey) => {
  const primary = TILE_PRESETS[activeTileKey];
  const candidates = [
    primary?.source
      ? {
          ...primary.source,
          _label: primary.label || 'Primary',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.OSM
      ? {
          ...MAP_CONFIG.TILE_SERVERS.OSM,
          _label: 'OpenStreetMap',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.CartoDB_Light
      ? {
          ...MAP_CONFIG.TILE_SERVERS.CartoDB_Light,
          _label: 'Carto Light',
        }
      : null,
    MAP_CONFIG?.TILE_SERVERS?.TopoMap
      ? {
          ...MAP_CONFIG.TILE_SERVERS.TopoMap,
          _label: 'Topo',
        }
      : null,
  ].filter((item) => item?.url);

  const unique = [];
  const seen = new Set();
  candidates.forEach((item) => {
    if (seen.has(item.url)) return;
    seen.add(item.url);
    unique.push(item);
  });
  return unique;
};

const createPoiClusterLayer = () => {
  const clusterOptions = {
    maxClusterRadius: 56,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: false,
    spiderfyDistanceMultiplier: 1.18,
    iconCreateFunction: (cluster) =>
      L.divIcon({
        className: 'travel-cluster-shell',
        html: `<div class="travel-cluster"><span>${cluster.getChildCount()}</span></div>`,
        iconSize: [44, 44],
      }),
  };

  if (typeof L.markerClusterGroup === 'function') {
    return L.markerClusterGroup(clusterOptions);
  }

  // Avoid constructor-only cluster plugins (older builds) because they can freeze modern Leaflet maps.
  console.warn('[PremiumDestinationMap] Cluster factory unavailable. Falling back to layer group.');
  return L.layerGroup();
};

const PremiumDestinationMap = ({ destinations = [], center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, onMarkerClick = null }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const overlayLayerRef = useRef(null);
  const markerRefs = useRef(new Map());
  const fitBoundsDoneRef = useRef(false);
  const searchTimerRef = useRef(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const liveWatchRef = useRef(null);
  const lastLiveRouteRef = useRef({ at: 0, location: null });
  const hasLiveFixRef = useRef(false);
  const isRoutingRef = useRef(false);
  const routeDestinationRef = useRef(null);
  const routeSummaryRef = useRef(null);
  const routeCandidatesRef = useRef([]);

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);
  const [activeTile, setActiveTile] = useState('streets');
  const [activeTileSource, setActiveTileSource] = useState('Streets');
  const [mapViewMode, setMapViewMode] = useState('2d');
  const [tileLoadError, setTileLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTarget, setSearchTarget] = useState('destination');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [manualOrigin, setManualOrigin] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [routeMode, setRouteMode] = useState('driving-car');
  const [routePreference, setRoutePreference] = useState('recommended');
  const [trafficMode, setTrafficMode] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeCandidates, setRouteCandidates] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isLiveNavigation, setIsLiveNavigation] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState('');
  const [activeInstructionIndex, setActiveInstructionIndex] = useState(0);

  const normalizedDestinations = useMemo(() => (destinations || [])
    .map((destination, index) => {
      const lat = toNumber(destination?.lat ?? destination?.latitude, null);
      const lon = toNumber(destination?.lon ?? destination?.lng ?? destination?.longitude, null);
      if (lat === null || lon === null) return null;
      const type = detectPlaceType(destination);
      const id = destination?.xid || destination?._id || `${destination?.name || 'place'}-${index}`;
      const category = destination?.category || destination?.kinds || destination?.details?.kinds || 'Travel place';
      return {
        ...destination,
        id,
        lat,
        lon,
        type,
        rating: normalizeRating(destination?.rating),
        categoryLabel: category,
        name: destination?.name || 'Unknown place',
        description: destination?.description || destination?.details?.description || 'A beautiful place to explore.',
        city: destination?.city || destination?.address?.city || '',
        country: destination?.country || destination?.address?.country || '',
        image: destination?.image || destination?.details?.image || '',
      };
    })
    .filter(Boolean), [destinations]);

  const routeDestination = selectedPlace ? { name: selectedPlace.name, lat: selectedPlace.lat, lon: selectedPlace.lon } : searchedLocation;
  const routeOrigin = hasCoords(manualOrigin)
    ? manualOrigin
    : (hasCoords(userLocation)
      ? userLocation
      : {
          name: 'Map center',
          lat: mapRef.current?.getCenter()?.lat ?? toNumber(center?.lat, DEFAULT_CENTER.lat),
          lon: mapRef.current?.getCenter()?.lng ?? toNumber(center?.lng, DEFAULT_CENTER.lng),
        });

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    routeDestinationRef.current = routeDestination;
  }, [routeDestination]);

  useEffect(() => {
    routeSummaryRef.current = routeSummary;
  }, [routeSummary]);

  useEffect(() => {
    routeCandidatesRef.current = routeCandidates;
  }, [routeCandidates]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.classList.toggle('travel-map-3d', mapViewMode === '3d');
    if (mapViewMode === '3d' && activeTile !== 'satellite') {
      setActiveTile('satellite');
    }
    mapRef.current?.invalidateSize();
  }, [mapViewMode, activeTile]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const markerRefsSnapshot = markerRefs.current;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      preferCanvas: true,
      attributionControl: false,
      worldCopyJump: true,
    }).setView([toNumber(center?.lat, DEFAULT_CENTER.lat), toNumber(center?.lng, DEFAULT_CENTER.lng)], toNumber(zoom, DEFAULT_ZOOM));

    mapRef.current = map;
    poiLayerRef.current = createPoiClusterLayer().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    overlayLayerRef.current = L.layerGroup().addTo(map);
    L.control.attribution({ prefix: false }).addTo(map);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    setTimeout(() => map.invalidateSize(), 80);
    return () => {
      window.removeEventListener('resize', onResize);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (liveWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(liveWatchRef.current);
        liveWatchRef.current = null;
      }
      markerRefsSnapshot.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const candidates = getTileCandidates(activeTile);
    if (!candidates.length) return;

    let cancelled = false;
    let currentLayer = null;

    setTileLoadError('');
    setActiveTileSource(TILE_PRESETS[activeTile]?.label || 'Streets');

    const mountTileLayer = (candidateIndex) => {
      if (cancelled) return;
      if (candidateIndex >= candidates.length) {
        setTileLoadError('Unable to load map tiles. Please check network/firewall and try again.');
        return;
      }

      const source = candidates[candidateIndex];
      let tileErrors = 0;
      let switched = false;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      const layer = L.tileLayer(source.url, {
        attribution: source.attribution || 'OpenStreetMap contributors',
        maxZoom: source.maxZoom || 19,
        minZoom: source.minZoom || 2,
        opacity: 0.95,
      });

      layer.on('tileload', () => {
        if (cancelled) return;
        setTileLoadError('');
        setActiveTileSource(source._label || 'Map');
      });

      layer.on('tileerror', () => {
        if (cancelled) return;
        if (switched) return;
        tileErrors += 1;
        if (tileErrors < 6) return;
        switched = true;
        setTileLoadError(`Tile source blocked. Switching from ${source._label}...`);
        mountTileLayer(candidateIndex + 1);
      });

      layer.addTo(map);
      currentLayer = layer;
      tileLayerRef.current = layer;
    };

    mountTileLayer(0);

    return () => {
      cancelled = true;
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
      }
    };
  }, [activeTile]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([toNumber(center?.lat, DEFAULT_CENTER.lat), toNumber(center?.lng, DEFAULT_CENTER.lng)], toNumber(zoom, DEFAULT_ZOOM), { animate: true, duration: 0.6 });
  }, [center?.lat, center?.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = poiLayerRef.current;
    if (!map || !layer) return;
    let cancelled = false;

    const render = async () => {
      setIsLoadingMarkers(true);
      layer.clearLayers();
      markerRefs.current.clear();
      fitBoundsDoneRef.current = false;
      const chunkSize = 50;
      for (let i = 0; i < normalizedDestinations.length; i += chunkSize) {
        if (cancelled) return;
        normalizedDestinations.slice(i, i + chunkSize).forEach((place) => {
          const marker = L.marker([place.lat, place.lon], { icon: createMarkerIcon(place.type), riseOnHover: true, keyboard: false });
          marker.bindPopup(createPopupMarkup(place), { className: 'travel-popup-shell', closeButton: false, maxWidth: 320, offset: [0, -22] });
          marker.on('click', () => {
            setSelectedPlace(place);
            setPanelOpen(true);
            setActiveMarkerId(place.id);
          });
          marker.on('popupopen', (event) => {
            const detailsBtn = event?.popup?.getElement()?.querySelector('.js-map-action');
            if (detailsBtn) {
              detailsBtn.onclick = (buttonEvent) => {
                buttonEvent.preventDefault();
                setSelectedPlace(place);
                setPanelOpen(true);
                setActiveMarkerId(place.id);
                if (typeof onMarkerClickRef.current === 'function') onMarkerClickRef.current(place);
              };
            }
          });
          marker.addTo(layer);
          markerRefs.current.set(place.id, marker);
        });
        if (i + chunkSize < normalizedDestinations.length) await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (!cancelled && normalizedDestinations.length > 0 && !fitBoundsDoneRef.current) {
        const bounds = L.latLngBounds(normalizedDestinations.map((place) => [place.lat, place.lon]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 0.7 });
        fitBoundsDoneRef.current = true;
      }
      setTimeout(() => {
        if (!cancelled) setIsLoadingMarkers(false);
      }, 220);
    };

    render();
    return () => {
      cancelled = true;
      setIsLoadingMarkers(false);
    };
  }, [normalizedDestinations]);

  useEffect(() => {
    markerRefs.current.forEach((marker, id) => {
      const element = marker.getElement();
      if (element) element.classList.toggle('is-active', id === activeMarkerId);
    });
  }, [activeMarkerId, normalizedDestinations.length]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await autocompleteLocation(query, { limit: 6 });
        setSearchResults(response?.success ? response.suggestions || [] : []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 360);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const layer = overlayLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (hasCoords(searchedLocation)) {
      L.marker([searchedLocation.lat, searchedLocation.lon], { icon: createSimplePinIcon('#0f172a', 'S', 'search') }).addTo(layer);
    }
    if (hasCoords(userLocation)) {
      L.marker([userLocation.lat, userLocation.lon], { icon: createSimplePinIcon('#0ea5e9', 'ME', 'me') }).addTo(layer);
    }
  }, [searchedLocation, userLocation]);

  useEffect(() => {
    if (!routeSummary?.instructions?.length || !hasCoords(userLocation)) return;
    setActiveInstructionIndex(getNearestInstructionIndex(routeSummary.instructions, userLocation));
  }, [routeSummary, userLocation?.lat, userLocation?.lon]);

  const revealMarker = (marker, callback) => {
    const layer = poiLayerRef.current;
    if (layer && typeof layer.zoomToShowLayer === 'function') {
      layer.zoomToShowLayer(marker, callback);
      return;
    }
    if (typeof callback === 'function') callback();
  };

  const focusInstructionStep = (step) => {
    const target = step?.toCoord || step?.fromCoord;
    if (!Array.isArray(target) || target.length < 2 || !mapRef.current) return;
    mapRef.current.flyTo([target[0], target[1]], Math.max(15, mapRef.current.getZoom()), {
      animate: true,
      duration: 0.55,
    });
  };

  const clearRoute = () => {
    routeLayerRef.current?.clearLayers();
    if (liveWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }
    setRouteSummary(null);
    setRouteCandidates([]);
    setSelectedRouteId(0);
    setRouteError('');
    setIsLiveNavigation(false);
    setNavigationStatus('');
    setActiveInstructionIndex(0);
    hasLiveFixRef.current = false;
    lastLiveRouteRef.current = { at: 0, location: null };
    setShowInstructions(true);
  };

  const handleSearchSelect = (suggestion) => {
    const lat = toNumber(suggestion?.lat, null);
    const lon = toNumber(suggestion?.lng, null);
    if (lat === null || lon === null) return;
    const selected = { name: suggestion?.name || suggestion?.label || 'Search result', lat, lon };
    setSearchQuery(suggestion?.label || suggestion?.name || '');
    setSearchResults([]);
    if (searchTarget === 'origin') {
      setManualOrigin(selected);
      setNavigationStatus('Start point set from search');
    } else {
      setSearchedLocation(selected);
      setNavigationStatus('Destination set from search');
    }
    setRouteError('');
    mapRef.current?.flyTo([lat, lon], Math.max(12, mapRef.current.getZoom()), { animate: true, duration: 0.6 });
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { name: 'Your location', lat: Number(position.coords.latitude), lon: Number(position.coords.longitude) };
        setUserLocation(loc);
        setManualOrigin(null);
        setRouteError('');
        setNavigationStatus('Using current location as start');
        mapRef.current?.flyTo([loc.lat, loc.lon], Math.max(12, mapRef.current.getZoom()), { animate: true, duration: 0.6 });
      },
      () => setRouteError('Unable to detect current location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const drawRouteOnMap = (routes, selectedId, fitToRoute = true) => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer || !Array.isArray(routes) || routes.length === 0) return;

    routeLayer.clearLayers();
    const selectedRoute = routes.find((route) => route.id === selectedId) || routes[0];
    if (!selectedRoute?.waypoints?.length) return;

    routes
      .filter((route) => route.id !== selectedRoute.id)
      .forEach((route) => {
        if (!route?.waypoints?.length) return;
        L.polyline(route.waypoints, {
          color: '#64748b',
          weight: 4,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '10 10',
        }).addTo(routeLayer);
      });

    const activeCoordinates = selectedRoute.waypoints;
    const outerLine = L.polyline(activeCoordinates, { color: '#0f172a', weight: 8, opacity: 0.22, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    L.polyline(activeCoordinates, { color: '#14b8a6', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);
    L.polyline(activeCoordinates, { color: '#ffffff', weight: 2, opacity: 0.48, dashArray: '10 10' }).addTo(routeLayer);
    L.marker(activeCoordinates[0], { icon: createSimplePinIcon('#16a34a', 'A', 'origin') }).addTo(routeLayer);
    L.marker(activeCoordinates[activeCoordinates.length - 1], { icon: createSimplePinIcon('#dc2626', 'B', 'destination') }).addTo(routeLayer);

    if (fitToRoute) {
      mapRef.current?.fitBounds(outerLine.getBounds(), { padding: [60, 60], maxZoom: 14, animate: true, duration: 0.7 });
    }
  };

  const selectAlternativeRoute = (routeId, options = {}) => {
    const { fitToRoute = false } = options;
    const routes = routeCandidatesRef.current;
    const selectedRoute = routes.find((route) => route.id === routeId);
    const currentSummary = routeSummaryRef.current;
    if (!selectedRoute || !currentSummary) return;

    drawRouteOnMap(routes, routeId, fitToRoute);
    setSelectedRouteId(routeId);
    const instructions = selectedRoute.instructions || [];
    setActiveInstructionIndex(getNearestInstructionIndex(instructions, routeOrigin));
    setRouteSummary({
      ...currentSummary,
      distanceKM: selectedRoute.distanceKM,
      durationHM: selectedRoute.durationHM,
      instructions,
      selectedRouteId: routeId,
      lastUpdatedAt: Date.now(),
    });
  };

  const calculateRoute = async (destinationOverride = null, originOverride = null, options = {}) => {
    const { fitToRoute = true } = options;
    const target = destinationOverride || routeDestination;
    if (!hasCoords(target)) {
      setRouteError('Select a destination from map marker or search first.');
      return false;
    }

    const origin = originOverride || routeOrigin;

    setIsRouting(true);
    isRoutingRef.current = true;
    setRouteError('');
    try {
      const effectivePreference = trafficMode ? 'fastest' : routePreference;
      const routeResponse = await getRoute(
        [[origin.lat, origin.lon], [target.lat, target.lon]],
        {
          profile: routeMode,
          noAlternatives: false,
          color: '#0f766e',
          provider: 'auto',
          routeOptions: { preference: effectivePreference },
        }
      );
      const routes = routeResponse?.routes || [];
      const mainRoute = routes[0];
      if (!mainRoute?.waypoints?.length) {
        setRouteError('No route found for this selection.');
        return false;
      }

      setRouteCandidates(routes);
      setSelectedRouteId(mainRoute.id);
      drawRouteOnMap(routes, mainRoute.id, fitToRoute);

      const instructions = mainRoute.instructions || [];
      const instructionIndex = getNearestInstructionIndex(instructions, origin);
      setActiveInstructionIndex(instructionIndex);
      setRouteSummary({
        distanceKM: mainRoute.distanceKM,
        durationHM: mainRoute.durationHM,
        origin,
        destination: target,
        instructions,
        provider: routeResponse?.provider || 'routing',
        preference: effectivePreference,
        alternativesCount: routes.length,
        selectedRouteId: mainRoute.id,
        lastUpdatedAt: Date.now(),
      });
      setShowInstructions(true);
      return true;
    } catch (error) {
      setRouteError(error?.error || error?.message || 'Route calculation failed. Please check your network.');
      return false;
    } finally {
      setIsRouting(false);
      isRoutingRef.current = false;
    }
  };

  const stopLiveNavigation = () => {
    if (liveWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }
    hasLiveFixRef.current = false;
    setIsLiveNavigation(false);
    setNavigationStatus('Live navigation stopped');
  };

  const startLiveNavigation = () => {
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported in this browser.');
      return;
    }

    const target = routeDestinationRef.current;
    if (!hasCoords(target)) {
      setRouteError('Select destination first, then start live navigation.');
      return;
    }

    if (liveWatchRef.current !== null) {
      navigator.geolocation.clearWatch(liveWatchRef.current);
      liveWatchRef.current = null;
    }

    lastLiveRouteRef.current = { at: 0, location: null };
    hasLiveFixRef.current = false;
    setIsLiveNavigation(true);
    setNavigationStatus('Connecting to GPS...');
    setRouteError('');

    liveWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const currentLoc = {
          name: 'Your location',
          lat: Number(position.coords.latitude),
          lon: Number(position.coords.longitude),
        };

        setUserLocation(currentLoc);

        if (!hasLiveFixRef.current) {
          hasLiveFixRef.current = true;
          mapRef.current?.flyTo([currentLoc.lat, currentLoc.lon], Math.max(14, mapRef.current?.getZoom() || 14), { animate: true, duration: 0.7 });
        }

        const now = Date.now();
        const last = lastLiveRouteRef.current;
        const movedMeters = last?.location ? getDistanceMeters(last.location, currentLoc) : Number.POSITIVE_INFINITY;
        const shouldReroute = now - (last?.at || 0) > 12000 || movedMeters > 35 || !routeSummaryRef.current;

        if (shouldReroute && !isRoutingRef.current) {
          lastLiveRouteRef.current = { at: now, location: currentLoc };
          const liveTarget = routeDestinationRef.current;
          if (!hasCoords(liveTarget)) return;
          const success = await calculateRoute(liveTarget, currentLoc, { fitToRoute: false });
          if (success) {
            setNavigationStatus('Live navigation active');
          }
        }
      },
      () => {
        stopLiveNavigation();
        setRouteError('Unable to track live location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  };

  const activeInstruction = routeSummary?.instructions?.[activeInstructionIndex] || null;

  return (
    <div className="relative h-[640px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
      <style>{`
        .travel-marker{position:relative;width:44px;height:56px;display:flex;align-items:center;justify-content:center}
        .travel-marker-main{width:38px;height:38px;border-radius:9999px;border:3px solid #fff;box-shadow:0 12px 24px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;transition:transform .22s ease,box-shadow .22s ease}
        .travel-marker-icon{width:19px;height:19px;display:inline-flex}.travel-marker-icon svg{width:100%;height:100%;display:block}
        .travel-marker-ping{position:absolute;top:9px;width:38px;height:38px;border-radius:9999px;opacity:.28;background:rgba(15,23,42,.25);animation:travel-ping 2s cubic-bezier(0,0,.2,1) infinite}
        .travel-marker:hover .travel-marker-main,.travel-marker.is-active .travel-marker-main{transform:translateY(-6px) scale(1.08);box-shadow:0 16px 30px rgba(15,23,42,.34)}
        .travel-simple-pin{position:relative;width:28px;height:38px;display:flex;align-items:flex-start;justify-content:center}
        .travel-simple-pin::before{content:'';position:absolute;top:0;width:24px;height:24px;border-radius:999px;background:var(--pin-color);border:2px solid #fff;box-shadow:0 8px 16px rgba(2,6,23,.28)}
        .travel-simple-pin::after{content:'';position:absolute;bottom:0;width:12px;height:12px;background:var(--pin-color);transform:rotate(45deg);border-bottom-right-radius:3px}
        .travel-simple-pin-core{position:relative;z-index:1;margin-top:5px;font-size:9px;color:#fff;font-weight:800}
        .travel-popup-shell .leaflet-popup-content-wrapper{border-radius:18px !important;padding:0 !important;overflow:hidden;box-shadow:0 24px 50px rgba(15,23,42,.28) !important}
        .travel-popup-shell .leaflet-popup-content{margin:0 !important;width:300px !important}.travel-popup{background:#fff}.travel-popup-media{position:relative;height:140px;background:#e2e8f0}
        .travel-popup-media img{width:100%;height:100%;object-fit:cover;display:block}.travel-popup-badge{position:absolute;left:10px;top:10px;color:#fff;font-size:11px;font-weight:700;border-radius:9999px;padding:4px 10px}
        .travel-popup-body{padding:12px}.travel-popup h4{margin:0 0 4px;font-size:15px;color:#0f172a;font-weight:700}.travel-popup-location{margin:0;color:#64748b;font-size:12px}
        .travel-popup-rating{margin-top:8px;display:inline-flex;align-items:baseline;gap:6px}.travel-popup-rating span{color:#f59e0b}.travel-popup-desc{margin:8px 0 12px;color:#334155;font-size:12px}
        .travel-popup-btn{border:0;width:100%;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#0f766e,#0f172a)}
        .travel-cluster-shell{background:transparent;border:0}
        .travel-cluster{width:44px;height:44px;border-radius:9999px;border:3px solid #fff;background:radial-gradient(circle at 30% 30%,#14b8a6,#0f766e);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 22px rgba(15,118,110,.38)}
        .travel-cluster span{color:#fff;font-size:12px;font-weight:800;line-height:1}
        .travel-map-3d .leaflet-tile-pane,.travel-map-3d .leaflet-overlay-pane{transform-origin:center bottom;transform:perspective(1400px) rotateX(56deg) scale(1.18) translateY(-90px)}
        .travel-map-3d .leaflet-marker-pane,.travel-map-3d .leaflet-popup-pane{transform:none !important}
        .travel-map-3d .leaflet-control-container{opacity:.96}
        @keyframes travel-ping{0%{transform:scale(1);opacity:.25}80%,100%{transform:scale(1.65);opacity:0}}
        .travel-map-left-panel{width:min(470px,calc(100% - 290px));display:flex;flex-direction:column;gap:12px}
        .travel-ui-card{border-radius:22px;border:1px solid rgba(255,255,255,.72);background:linear-gradient(145deg,rgba(255,255,255,.96) 0%,rgba(247,250,252,.93) 55%,rgba(241,245,249,.9) 100%);padding:14px;box-shadow:0 26px 50px rgba(15,23,42,.3);backdrop-filter:blur(14px)}
        .travel-ui-header{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .travel-ui-stat{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:rgba(15,23,42,.08);padding:6px 11px;font-size:11px;font-weight:700;color:#334155;letter-spacing:.02em}
        .travel-ui-locate{border:1px solid rgba(148,163,184,.5);background:#fff;color:#0f172a;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-ui-locate:hover{background:#f8fafc;transform:translateY(-1px)}
        .travel-ui-toggle{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
        .travel-ui-toggle-btn{border:1px solid transparent;background:rgba(148,163,184,.14);border-radius:12px;padding:8px 10px;font-size:11px;font-weight:700;color:#334155;cursor:pointer;transition:all .2s ease}
        .travel-ui-toggle-btn.is-active{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;box-shadow:0 10px 22px rgba(15,23,42,.28)}
        .travel-ui-search-wrap{position:relative;margin-top:10px}
        .travel-ui-search-input{width:100%;border-radius:14px;border:1px solid rgba(148,163,184,.46);background:#fff;padding:11px 86px 11px 36px;font-size:14px;color:#0f172a;outline:none;transition:all .2s ease}
        .travel-ui-search-input:focus{border-color:#0f766e;box-shadow:0 0 0 3px rgba(20,184,166,.16)}
        .travel-ui-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:#64748b}
        .travel-ui-search-icon svg{width:100%;height:100%;display:block}
        .travel-ui-search-state{pointer-events:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);border-radius:999px;padding:3px 9px;font-size:10px;font-weight:700;color:#0f766e;background:rgba(20,184,166,.12)}
        .travel-ui-search-state.is-searching{background:rgba(15,23,42,.13);color:#334155}
        .travel-ui-results{margin-top:10px;max-height:220px;overflow:auto;border-radius:14px;border:1px solid rgba(148,163,184,.36);background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.12)}
        .travel-ui-result-item{display:flex;width:100%;flex-direction:column;gap:2px;padding:10px 12px;text-align:left;border:0;border-bottom:1px solid rgba(226,232,240,.92);background:#fff;cursor:pointer;transition:background .16s ease}
        .travel-ui-result-item:last-child{border-bottom:0}
        .travel-ui-result-item:hover{background:#f8fafc}
        .travel-ui-result-name{font-size:13px;font-weight:700;color:#0f172a;line-height:1.25}
        .travel-ui-result-label{font-size:11px;color:#64748b;line-height:1.35}
        .travel-ui-route-card{margin-top:12px;border-radius:18px;border:1px solid rgba(226,232,240,.9);background:linear-gradient(180deg,rgba(255,255,255,.98) 0%,rgba(248,250,252,.95) 100%);padding:11px}
        .travel-ui-route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}
        .travel-ui-route-label{margin:0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.12em;text-transform:uppercase}
        .travel-ui-route-title{margin:1px 0 0;font-size:15px;font-weight:800;color:#0f172a}
        .travel-ui-route-chip{border-radius:999px;background:rgba(15,118,110,.12);color:#0f766e;padding:4px 9px;font-size:10px;font-weight:700;white-space:nowrap}
        .travel-ui-mode-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
        .travel-ui-mode-btn{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;border:1px solid rgba(148,163,184,.35);padding:8px 9px;background:#fff;color:#334155;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-ui-mode-btn:hover{transform:translateY(-1px);border-color:rgba(15,23,42,.2)}
        .travel-ui-mode-btn.is-active{background:linear-gradient(130deg,#0f172a,#115e59);border-color:transparent;color:#fff;box-shadow:0 10px 20px rgba(15,23,42,.34)}
        .travel-ui-mode-icon{width:15px;height:15px;display:inline-flex}
        .travel-ui-mode-icon svg{width:100%;height:100%;display:block}
        .travel-ui-waypoint-grid{display:grid;grid-template-columns:1fr;gap:7px;margin-top:10px}
        .travel-ui-waypoint{border-radius:12px;border:1px solid rgba(226,232,240,.95);background:#fff;padding:7px 10px}
        .travel-ui-waypoint strong{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:3px}
        .travel-ui-waypoint span{display:block;font-size:12px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .travel-ui-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}
        .travel-ui-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px}
        .travel-ui-soft-btn{border-radius:11px;border:1px solid rgba(148,163,184,.42);padding:8px 9px;font-size:11px;font-weight:700;color:#334155;background:#fff;cursor:pointer;transition:all .18s ease}
        .travel-ui-soft-btn:hover{background:#f8fafc}
        .travel-ui-soft-btn:disabled{opacity:.45;cursor:not-allowed}
        .travel-ui-soft-btn.is-active{background:linear-gradient(135deg,#0f766e,#0f172a);border-color:transparent;color:#fff}
        .travel-ui-traffic-btn{border-radius:11px;border:1px solid rgba(148,163,184,.42);padding:8px 10px;font-size:11px;font-weight:700;background:#fff;color:#334155;cursor:pointer;transition:all .2s ease}
        .travel-ui-traffic-btn:hover{background:#f8fafc}
        .travel-ui-traffic-btn.is-active{background:linear-gradient(135deg,#f59e0b,#ea580c);border-color:transparent;color:#fff}
        .travel-ui-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
        .travel-ui-main-btn{border:0;border-radius:12px;padding:9px 10px;font-size:12px;font-weight:700;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s ease,color .2s ease}
        .travel-ui-main-btn:hover{transform:translateY(-1px)}
        .travel-ui-main-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .travel-ui-main-btn.build{background:linear-gradient(135deg,#0f766e,#0f172a);color:#fff;box-shadow:0 12px 24px rgba(15,23,42,.26)}
        .travel-ui-main-btn.clear{border:1px solid rgba(148,163,184,.45);background:#fff;color:#334155}
        .travel-ui-main-btn.live{background:#0f172a;color:#fff}
        .travel-ui-main-btn.live.is-active{background:linear-gradient(135deg,#dc2626,#be123c)}
        .travel-ui-alert{margin-top:9px;border-radius:11px;padding:8px 10px;font-size:11px;font-weight:700}
        .travel-ui-alert.info{background:rgba(14,165,233,.13);color:#0369a1}
        .travel-ui-alert.error{background:rgba(244,63,94,.12);color:#be123c}
        .travel-map-tools{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
        .travel-tool-card{border-radius:18px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.94);padding:9px;box-shadow:0 20px 40px rgba(15,23,42,.23);backdrop-filter:blur(12px)}
        .travel-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
        .travel-tool-btn{border:1px solid transparent;border-radius:10px;padding:7px 10px;background:rgba(148,163,184,.14);color:#334155;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s ease}
        .travel-tool-btn:hover{background:rgba(148,163,184,.22)}
        .travel-tool-btn.is-active{background:linear-gradient(140deg,#0f172a,#1e293b);color:#fff;box-shadow:0 8px 18px rgba(15,23,42,.28)}
        .travel-tool-status{border-radius:999px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.94);padding:6px 12px;font-size:11px;font-weight:700;color:#334155;box-shadow:0 14px 28px rgba(15,23,42,.18)}
        .travel-type-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 10px;background:rgba(255,255,255,.94);font-size:11px;font-weight:700;color:#334155;box-shadow:0 10px 20px rgba(15,23,42,.16)}
        @media (max-width: 1180px){.travel-map-left-panel{width:min(440px,calc(100% - 260px))}}
        @media (max-width: 980px){.travel-map-left-panel{width:min(460px,calc(100% - 2rem))}.travel-map-tools{transform:scale(.96);transform-origin:top right}}
        @media (max-width: 720px){.travel-map-left-panel{width:calc(100% - 2rem)}.travel-map-tools{display:none}}
      `}</style>

      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900/35 via-slate-900/10 to-transparent" />

      <div
        className="travel-map-left-panel"
        style={{
          position: 'absolute',
          left: '16px',
          top: '16px',
          zIndex: 5000,
          pointerEvents: 'auto',
        }}
      >
        <div className="travel-ui-card">
          <div className="travel-ui-header">
            <div className="travel-ui-stat">{normalizedDestinations.length} places</div>
            <button type="button" onClick={handleLocateUser} className="travel-ui-locate">Locate Me</button>
          </div>

          <div className="travel-ui-toggle">
            <button
              type="button"
              onClick={() => setSearchTarget('destination')}
              className={`travel-ui-toggle-btn ${searchTarget === 'destination' ? 'is-active' : ''}`}
            >
              Search Destination
            </button>
            <button
              type="button"
              onClick={() => setSearchTarget('origin')}
              className={`travel-ui-toggle-btn ${searchTarget === 'origin' ? 'is-active' : ''}`}
            >
              Search Start
            </button>
          </div>

          <div className="travel-ui-search-wrap">
            <span className="travel-ui-search-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={searchTarget === 'origin' ? 'Search starting point' : 'Search destination'}
              className="travel-ui-search-input"
            />
            <span className={`travel-ui-search-state ${isSearching ? 'is-searching' : ''}`}>
              {isSearching ? 'Searching' : 'Ready'}
            </span>
          </div>

          {searchResults.length > 0 && (
            <div className="travel-ui-results">
              {searchResults.map((item) => (
                <button
                  key={`${item.id}-${item.lat}-${item.lng}`}
                  type="button"
                  onClick={() => handleSearchSelect(item)}
                  className="travel-ui-result-item"
                >
                  <span className="travel-ui-result-name">{item.name || 'Location'}</span>
                  <span className="travel-ui-result-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="travel-ui-route-card">
            <div className="travel-ui-route-head">
              <div>
                <p className="travel-ui-route-label">Route Planner</p>
                <h4 className="travel-ui-route-title">Smart Navigation</h4>
              </div>
              <span className="travel-ui-route-chip">{trafficMode ? 'Traffic aware' : 'Standard flow'}</span>
            </div>

            <div className="travel-ui-mode-grid">
              {TRAVEL_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setRouteMode(mode.key)}
                  className={`travel-ui-mode-btn ${routeMode === mode.key ? 'is-active' : ''}`}
                >
                  <span className="travel-ui-mode-icon">{renderTravelModeIcon(mode.key)}</span>
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>

            <div className="travel-ui-waypoint-grid">
              <div className="travel-ui-waypoint">
                <strong>From</strong>
                <span>{routeOrigin?.name || 'Map center'}</span>
              </div>
              <div className="travel-ui-waypoint">
                <strong>To</strong>
                <span>{routeDestination?.name || 'Select marker or search result'}</span>
              </div>
            </div>

            <div className="travel-ui-grid-3">
              <button type="button" onClick={handleLocateUser} className="travel-ui-soft-btn">Use Current</button>
              <button
                type="button"
                onClick={() => {
                  setManualOrigin({
                    name: 'Map center',
                    lat: mapRef.current?.getCenter()?.lat ?? toNumber(center?.lat, DEFAULT_CENTER.lat),
                    lon: mapRef.current?.getCenter()?.lng ?? toNumber(center?.lng, DEFAULT_CENTER.lng),
                  });
                  setNavigationStatus('Start point set to map center');
                }}
                className="travel-ui-soft-btn"
              >
                Use Center
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasCoords(searchedLocation)) return;
                  setManualOrigin({ ...searchedLocation });
                  setNavigationStatus('Start point set from searched location');
                }}
                disabled={!hasCoords(searchedLocation)}
                className="travel-ui-soft-btn"
              >
                Use Search
              </button>
            </div>

            <div className="travel-ui-grid-3">
              {[
                { key: 'recommended', label: 'Balanced' },
                { key: 'fastest', label: 'Fastest' },
                { key: 'shortest', label: 'Shortest' },
              ].map((pref) => (
                <button
                  key={pref.key}
                  type="button"
                  onClick={() => setRoutePreference(pref.key)}
                  className={`travel-ui-soft-btn ${routePreference === pref.key ? 'is-active' : ''}`}
                >
                  {pref.label}
                </button>
              ))}
            </div>

            <div className="travel-ui-grid-2">
              <button
                type="button"
                onClick={() => setTrafficMode((prev) => !prev)}
                className={`travel-ui-traffic-btn ${trafficMode ? 'is-active' : ''}`}
              >
                {trafficMode ? 'Traffic ON' : 'Traffic OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!hasCoords(routeDestination)) return;
                  calculateRoute(routeDestination, routeOrigin, { fitToRoute: false });
                }}
                disabled={isRouting || !hasCoords(routeDestination)}
                className="travel-ui-soft-btn"
              >
                Refresh Route
              </button>
            </div>

            <div className="travel-ui-action-grid">
              <button type="button" onClick={() => calculateRoute()} disabled={isRouting} className="travel-ui-main-btn build">
                {isRouting ? 'Routing...' : 'Build Route'}
              </button>
              <button type="button" onClick={clearRoute} className="travel-ui-main-btn clear">Clear</button>
              <button
                type="button"
                onClick={isLiveNavigation ? stopLiveNavigation : startLiveNavigation}
                className={`travel-ui-main-btn live ${isLiveNavigation ? 'is-active' : ''}`}
              >
                {isLiveNavigation ? 'Stop Live' : 'Start Live'}
              </button>
            </div>

            {navigationStatus && <div className="travel-ui-alert info">{navigationStatus}</div>}
            {routeError && <div className="travel-ui-alert error">{routeError}</div>}
          </div>
        </div>
      </div>

      <div
        className="travel-map-tools"
        style={{
          position: 'absolute',
          right: '16px',
          top: '16px',
          zIndex: 5000,
          pointerEvents: 'auto',
        }}
      >
        <div className="travel-tool-card">
          <div className="travel-tool-grid">
            <button type="button" onClick={() => setMapViewMode('2d')} className={`travel-tool-btn ${mapViewMode === '2d' ? 'is-active' : ''}`}>2D</button>
            <button type="button" onClick={() => setMapViewMode('3d')} className={`travel-tool-btn ${mapViewMode === '3d' ? 'is-active' : ''}`}>3D</button>
          </div>
          <div className="travel-tool-grid" style={{ marginTop: '6px' }}>
            {Object.entries(TILE_PRESETS).map(([key, tile]) => (
              <button key={key} type="button" onClick={() => setActiveTile(key)} className={`travel-tool-btn ${activeTile === key ? 'is-active' : ''}`}>{tile.label}</button>
            ))}
          </div>
        </div>
        <div className="travel-tool-status">Tiles: {activeTileSource}</div>
        {tileLoadError && (
          <div style={{ maxWidth: '260px', borderRadius: '12px', border: '1px solid #facc15', background: '#fef9c3', color: '#854d0e', padding: '8px 10px', fontSize: '11px', fontWeight: 700, boxShadow: '0 12px 24px rgba(15,23,42,.14)' }}>
            {tileLoadError}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '6px', maxWidth: '290px' }}>
          {Object.entries(PLACE_TYPES).map(([key, item]) => (
            <span key={key} className="travel-type-pill">{item.label}</span>
          ))}
        </div>
      </div>

      {routeSummary && (
        <div
          className="space-y-2"
          style={{
            position: 'absolute',
            bottom: '112px',
            right: '16px',
            width: 'min(340px, calc(100% - 2rem))',
            zIndex: 5000,
            pointerEvents: 'auto',
          }}
        >
          <div className="rounded-2xl border border-white/55 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Route Summary</div>
              <button
                type="button"
                onClick={() => setShowInstructions((prev) => !prev)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showInstructions ? 'Hide Steps' : 'Show Steps'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="font-semibold text-slate-900">{routeSummary.distanceKM} km</div>
                <div className="text-slate-500">Distance</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="font-semibold text-slate-900">{routeSummary.durationHM}</div>
                <div className="text-slate-500">Duration</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>{routeSummary.origin?.name || 'Start'} to {routeSummary.destination?.name || 'Destination'}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                Engine: {routeSummary.provider === 'osrm' ? 'OSRM' : 'OpenRouteService'}
              </span>
            </div>
            {routeSummary.lastUpdatedAt && (
              <div className="mt-1 text-[10px] text-slate-500">
                Updated {new Date(routeSummary.lastUpdatedAt).toLocaleTimeString()}
              </div>
            )}
            {routeCandidates.length > 1 && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-1 text-[11px] font-semibold text-slate-700">Select road option</div>
                <div className="space-y-1">
                  {routeCandidates.map((route, index) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => selectAlternativeRoute(route.id, { fitToRoute: false })}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${selectedRouteId === route.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>Road {index + 1}</span>
                      <span>{route.distanceKM} km / {route.durationHM}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeInstruction && (
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-2.5 shadow-lg">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-700">Next turn</div>
              <div className="text-sm font-semibold text-teal-900">{activeInstruction.text}</div>
              <div className="mt-0.5 text-xs text-teal-700">
                {activeInstruction.distanceText} | {activeInstruction.durationText}
              </div>
            </div>
          )}

          {showInstructions && (routeSummary.instructions || []).length > 0 && (
            <div className="max-h-56 overflow-auto rounded-2xl border border-white/55 bg-white/95 p-2 shadow-xl backdrop-blur">
              <div className="mb-1 px-1 text-xs font-semibold text-slate-700">Turn-by-turn</div>
              <div className="space-y-1">
                {(routeSummary.instructions || []).map((step, index) => {
                  const instructionMeta = getInstructionMeta(step);
                  const isActive = index === activeInstructionIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => focusInstructionStep(step)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition ${isActive ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-slate-50'}`}
                    >
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-bold ${instructionMeta.tone}`}>
                        {instructionMeta.symbol}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-[12px] font-semibold text-slate-800">
                          {step.text}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {step.distanceText} | {step.durationText}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoadingMarkers && (
        <div className="absolute inset-0 z-[950] bg-white/70 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex h-full w-full items-center justify-center px-4">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl">
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 z-[1000] px-4 pb-4 transition-all duration-500 ${panelOpen && selectedPlace ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0'}`}>
        {selectedPlace && (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(2,6,23,0.34)]">
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
              <div className="relative h-48 md:h-full">
                <img src={selectedPlace.image || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80'} alt={selectedPlace.name} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{(PLACE_TYPES[selectedPlace.type] || PLACE_TYPES.attraction).label}</span>
              </div>
              <div className="flex flex-col gap-3 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{selectedPlace.name}</h3>
                    <p className="text-sm text-slate-500">{[selectedPlace.city, selectedPlace.country].filter(Boolean).join(', ') || selectedPlace.categoryLabel}</p>
                  </div>
                  <button type="button" onClick={() => setPanelOpen(false)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Close</button>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700"><span>{selectedPlace.rating.toFixed(1)} / 5.0</span></div>
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{selectedPlace.description || 'A wonderful destination to add to your travel plan.'}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      mapRef.current?.flyTo(
                        [selectedPlace.lat, selectedPlace.lon],
                        Math.max(11, mapRef.current.getZoom()),
                        { animate: true, duration: 0.7 }
                      );
                      const marker = markerRefs.current.get(selectedPlace.id);
                      if (marker) {
                        revealMarker(marker, () => marker.openPopup());
                      }
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Center on map
                  </button>
                  <button type="button" onClick={() => calculateRoute({ name: selectedPlace.name, lat: selectedPlace.lat, lon: selectedPlace.lon })} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-500">Get directions</button>
                  <button type="button" onClick={() => { if (typeof onMarkerClickRef.current === 'function') onMarkerClickRef.current(selectedPlace); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">Open full details</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumDestinationMap;

