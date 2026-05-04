import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import itineraryService from '../../services/itineraryService.js';
import './itineraryPlanner.saas.css';

const NAV_ITEMS = ['Dashboard', 'New Trip', 'My Trips', 'Settings'];

const initialForm = {
  destination: '',
  startDate: new Date().toISOString().split('T')[0],
  days: 4,
  travelers: 2,
  budget: 25000,
  travelStyle: 'solo',
  preferences: '',
};

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const todayISO = () => new Date().toISOString().split('T')[0];

const fmt = (value, currency = 'INR') => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
};

const cleanText = (text) => String(text || '').replace(/```json/gi, '').replace(/```/g, '').replace(/\s{2,}/g, ' ').trim();

const safeTips = (tips, fallbackText) => {
  if (Array.isArray(tips) && tips.length) return tips.map((t) => cleanText(t)).filter(Boolean).slice(0, 8);
  const raw = String(fallbackText || '');
  return raw.split(/\b\d+\.\s*/).map((x) => cleanText(x)).filter((x) => x.length > 18).slice(0, 8);
};

const formatDate = (dateISO, addDays = 0) => {
  const date = new Date(dateISO || Date.now());
  if (!Number.isFinite(date.getTime())) return '';
  date.setDate(date.getDate() + addDays);
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const extractArrival = (notes) => {
  const m = String(notes || '').match(/Arrival:\s*([^|]+)/i);
  return m ? m[1].trim() : '';
};

const validCoords = (activity) => {
  const lon = Number(activity?.location?.coordinates?.[0]);
  const lat = Number(activity?.location?.coordinates?.[1]);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) > 0.001 && Math.abs(lon) > 0.001;
};

function ItineraryPlanner() {
  const [activeNav, setActiveNav] = useState('New Trip');
  const [form, setForm] = useState(initialForm);
  const [itinerary, setItinerary] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [okText, setOkText] = useState('');

  useEffect(() => {
    if (activeNav !== 'My Trips') return;
    let ignore = false;
    (async () => {
      try {
        const trips = await itineraryService.getUserItineraries();
        if (!ignore) setMyTrips(Array.isArray(trips) ? trips : []);
      } catch {
        if (!ignore) setMyTrips([]);
      }
    })();
    return () => { ignore = true; };
  }, [activeNav]);

  const dayGroups = useMemo(() => {
    if (!itinerary?.activities?.length) return [];
    const grouped = itinerary.activities.reduce((acc, item) => {
      const day = Number(item.dayNumber || 1);
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});

    return Object.keys(grouped).map(Number).sort((a, b) => a - b).map((day) => ({
      day,
      activities: grouped[day].sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))),
    }));
  }, [itinerary]);

  const tips = useMemo(() => safeTips(itinerary?.aiPlan?.localTips, itinerary?.aiPlan?.detailedPlan), [itinerary]);

  const generate = async () => {
    setOkText('');
    setErrorText('');
    setLoading(true);
    try {
      const generated = await itineraryService.generateItinerary({
        destination: form.destination,
        placesToVisit: [],
        days: Number(form.days),
        budget: Math.max(1, Number(form.budget)),
        currency: 'INR',
        numberOfTravelers: Number(form.travelers),
        travelStyle: form.travelStyle,
        interests: [],
        startDate: form.startDate,
        aiNotes: form.preferences,
      });
      setItinerary(generated);
      setActiveNav('Dashboard');
      setOkText('Itinerary generated successfully.');
    } catch (err) {
      const providerErrors = Array.isArray(err?.providerErrors) ? err.providerErrors.join(' | ') : '';
      setErrorText([err?.message, err?.error, providerErrors].filter(Boolean).join(' ') || 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  const currency = itinerary?.budget?.currency || 'INR';

  return (
    <div className="ip-app">
      <div className="ip-wrap">
        <aside className="ip-sidebar">
          <nav className="ip-nav">
            {NAV_ITEMS.map((item) => (
              <button key={item} className={`ip-nav-item ${activeNav === item ? 'is-active' : ''}`} onClick={() => setActiveNav(item)}>{item}</button>
            ))}
          </nav>
        </aside>

        <main className="ip-main">
          <header className="ip-topbar"><div><h1>{activeNav}</h1><p>Practical day-by-day itinerary with route visibility</p></div></header>
          {okText && <div className="ip-alert ok">{okText}</div>}
          {errorText && <div className="ip-alert err">{errorText}</div>}

          {(activeNav === 'New Trip' || (!itinerary && activeNav === 'Dashboard')) && (
            <section className="ip-card">
              <h2>Create New Trip</h2>
              <p>Generate real-place itinerary with timing, cost, map pins, and travel notes.</p>
              <div className="ip-grid">
                <label className="ip-field"><span>Destination</span><input value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))} placeholder="Goa, Jaipur, Munnar" /></label>
                <label className="ip-field"><span>Start Date</span><input type="date" min={todayISO()} value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></label>
                <label className="ip-field"><span>Days</span><input type="number" min={1} max={30} value={form.days} onChange={(e) => setForm((p) => ({ ...p, days: Number(e.target.value) || 1 }))} /></label>
                <label className="ip-field"><span>Travelers</span><input type="number" min={1} max={20} value={form.travelers} onChange={(e) => setForm((p) => ({ ...p, travelers: Number(e.target.value) || 1 }))} /></label>
                <label className="ip-field"><span>Budget {fmt(form.budget, 'INR')}</span><input type="number" min={1} value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: Number(e.target.value) || 1 }))} /></label>
                <label className="ip-field"><span>Travel Style</span><select value={form.travelStyle} onChange={(e) => setForm((p) => ({ ...p, travelStyle: e.target.value }))}><option value="solo">Solo</option><option value="budget">Budget</option><option value="family">Family</option><option value="group">Group</option><option value="luxury">Luxury</option></select></label>
                <label className="ip-field ip-span-2"><span>Preferences</span><textarea rows={4} value={form.preferences} onChange={(e) => setForm((p) => ({ ...p, preferences: e.target.value }))} placeholder="Prefer heritage, street food, less walking, child-friendly pace..." /></label>
              </div>
              <div className="ip-cta-wrap"><button className="ip-cta" onClick={generate}>Generate Itinerary</button></div>
            </section>
          )}

          {loading && <section className="ip-card ip-loading"><div className="ip-spinner" /><p>Generating your itinerary...</p></section>}

          {activeNav === 'Dashboard' && itinerary && !loading && (
            <section className="ip-results">
              <div className="ip-hero-card">
                <div>
                  <h3>{itinerary?.destination?.name}</h3>
                  <p>{itinerary?.numberOfDays} days for {itinerary?.numberOfTravelers || 1} traveler(s)</p>
                  <div className="ip-facts">
                    <div><span>Total Budget</span><strong>{fmt(itinerary?.budget?.totalBudget, currency)}</strong></div>
                    <div><span>Daily Target</span><strong>{fmt(itinerary?.budget?.suggestedDailyBudget || 0, currency)}</strong></div>
                    <div><span>Minimum Practical</span><strong>{fmt(itinerary?.budget?.minimumRecommended || 0, currency)}</strong></div>
                    <div><span>Start</span><strong>{formatDate(itinerary?.startDate)}</strong></div>
                  </div>
                  {!!itinerary?.budget?.adjustmentMessage && <div className="ip-note">{itinerary.budget.adjustmentMessage}</div>}
                  {!!itinerary?.aiPlan?.summary && <div className="ip-summary-text">{cleanText(itinerary.aiPlan.summary)}</div>}
                </div>
              </div>

              <div className="ip-results-grid">
                <div className="ip-day-stack">
                  {dayGroups.map((d) => {
                    const coords = d.activities.filter(validCoords).map((a) => [a.location.coordinates[1], a.location.coordinates[0]]);
                    const mapCenter = coords[0] || [20.5937, 78.9629];
                    return (
                      <div key={d.day} className="ip-card ip-day-card">
                        <h4>Day {d.day} <small>{formatDate(itinerary?.startDate, d.day - 1)}</small></h4>
                        {coords.length > 0 && (
                          <div className="ip-mini-map">
                            <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={false} style={{ height: '220px', width: '100%' }}>
                              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              {d.activities.filter(validCoords).map((a) => (
                                <Marker key={`m-${a._id}`} position={[a.location.coordinates[1], a.location.coordinates[0]]}>
                                  <Popup><strong>{a.name}</strong><br />{a.startTime} | {fmt(a.estimatedCost, currency)}</Popup>
                                </Marker>
                              ))}
                              {coords.length > 1 && <Polyline positions={coords} color="#0d9488" />}
                            </MapContainer>
                          </div>
                        )}
                        {d.activities.length === 0 && <div className="ip-empty">No activities parsed for this day.</div>}
                        {d.activities.map((a) => (
                          <div key={a._id} className="ip-activity">
                            <div className="ip-time">{a.startTime || '--:--'}</div>
                            <div>
                              <strong>{a.name}</strong>
                              <span>{a.category} | {a.duration} min | {fmt(a.estimatedCost, currency)}</span>
                              {!!extractArrival(a.notes) && <span>Arrival: {extractArrival(a.notes)}</span>}
                              {Array.isArray(a.reachOptions) && a.reachOptions.length > 0 && <span>How to reach: {a.reachOptions.join(' | ')}</span>}
                              {!!a.description && <em>{cleanText(a.description)}</em>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="ip-side-cards">
                  <div className="ip-card">
                    <h4>Budget Split</h4>
                    <div className="ip-budget-list">
                      <div><span>Stay</span><strong>{fmt(itinerary?.budget?.accommodation || 0, currency)}</strong></div>
                      <div><span>Transport</span><strong>{fmt(itinerary?.budget?.transportation || 0, currency)}</strong></div>
                      <div><span>Activities</span><strong>{fmt(itinerary?.budget?.activities || 0, currency)}</strong></div>
                      <div><span>Food</span><strong>{fmt(itinerary?.budget?.food || 0, currency)}</strong></div>
                    </div>
                  </div>

                  <div className="ip-card">
                    <h4>Local Tips</h4>
                    <div className="ip-bullet-list">
                      {tips.length === 0 && <div className="ip-empty">No tips extracted.</div>}
                      {tips.map((tip, idx) => <div key={`${idx}-${tip.slice(0, 20)}`} className="ip-bullet-item">{tip}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeNav === 'My Trips' && (
            <section className="ip-card">
              <h3>My Trips</h3>
              <div className="ip-trips">
                {myTrips.length === 0 && <div className="ip-empty">No trips found.</div>}
                {myTrips.map((trip) => (
                  <button key={trip._id} className="ip-trip-item" onClick={() => { setItinerary(trip); setActiveNav('Dashboard'); }}>
                    <strong>{trip?.destination?.name || trip.title}</strong>
                    <span>{trip.numberOfDays} days | {fmt(trip?.budget?.totalBudget, trip?.budget?.currency || 'INR')}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default ItineraryPlanner;
