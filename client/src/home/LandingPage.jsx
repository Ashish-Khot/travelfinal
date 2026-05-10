import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const DESTINATIONS = [
  {
    title: 'Swiss Alps',
    location: 'Switzerland',
    price: '₹1,20,000 - ₹2,50,000',
    image: 'https://images.unsplash.com/photo-1508261305436-4b35c91f6d2f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Coastal Paradise',
    location: 'Mediterranean',
    price: '₹80,000 - ₹1,80,000',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Mountain Retreat',
    location: 'Norway',
    price: '₹1,00,000 - ₹2,20,000',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  },
];

const FEATURES = [
  {
    title: 'Smart Route Planner',
    copy: 'Plan realistic routes with live alternatives for road, flight, and local transfers.',
  },
  {
    title: 'Verified Local Experts',
    copy: 'Connect with trusted guides, hotels, and local operators directly in one dashboard.',
  },
  {
    title: 'Travelogue Timeline',
    copy: 'Capture, organize, and share your complete journey with rich media and notes.',
  },
];

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const normalizeSearchResult = (feature, index) => {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const kinds = properties.kinds || properties.category || '';
  const shortKinds = kinds
    ? kinds
        .split(',')
        .map((item) => item.replace(/_/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(' / ')
    : 'Explore destination';

  return {
    title: properties.name || `Destination ${index + 1}`,
    location: [properties.address?.city, properties.address?.country].filter(Boolean).join(', ') || shortKinds,
    price: shortKinds,
    description: properties.description || 'Explore attractions, local guides, and trip ideas for this destination.',
    image: properties.image,
    lat: coordinates[1],
    lon: coordinates[0],
  };
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const fallbackImage =
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  const visibleDestinations = searchedQuery ? searchResults : DESTINATIONS;

  const scrollToSection = (id) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSearch = async (event) => {
    event.preventDefault();
    const destination = query.trim();

    if (!destination) {
      setSearchedQuery('');
      setSearchResults([]);
      setSearchError('');
      scrollToSection('destinations');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchedQuery(destination);

    try {
      const response = await fetch(
        `${API_BASE_URL}/opentripmap/search?query=${encodeURIComponent(destination)}&limit=9`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const results = (data.features || []).map(normalizeSearchResult);

      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(`No destinations found for "${destination}".`);
      }
      scrollToSection('destinations');
    } catch (error) {
      console.error('Destination search failed:', error);
      setSearchResults([]);
      setSearchError('Could not search destinations right now. Please check that the backend is running.');
      scrollToSection('destinations');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchedQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  return (
    <div className="lp-shell">
      <header className="lp-header">
        <button type="button" className="lp-brand" onClick={() => scrollToSection('top')}>
          <span className="lp-brand-mark">Travelogue</span>
        </button>
        <nav className="lp-nav">
          <button type="button" onClick={() => scrollToSection('destinations')}>Destinations</button>
          <button type="button" onClick={() => scrollToSection('features')}>Features</button>
          <button type="button" onClick={() => scrollToSection('about')}>About</button>
        </nav>
        <button type="button" className="lp-login-btn" onClick={() => navigate('/login')}>
          Login / Sign Up
        </button>
      </header>

      <section id="top" className="lp-hero">
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <h1>
            Discover Your Next
            <span>Adventure</span>
          </h1>
          <p>
            Explore breathtaking destinations, connect with expert guides, and create unforgettable memories.
          </p>
          <form className="lp-search" onSubmit={handleHeroSearch}>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations..."
            />
            <button type="submit" disabled={isSearching}>{isSearching ? 'Searching...' : 'Search'}</button>
          </form>
        </div>
      </section>

      <section id="destinations" className="lp-section lp-destinations">
        <div className="lp-heading">
          <h2>{searchedQuery ? `Search Results for ${searchedQuery}` : 'Featured Destinations'}</h2>
          <p>
            {searchedQuery
              ? `${searchResults.length} destination${searchResults.length === 1 ? '' : 's'} found`
              : 'Handpicked locations for your next journey'}
          </p>
          {searchedQuery && (
            <button type="button" className="lp-clear-search" onClick={clearSearch}>
              Show featured destinations
            </button>
          )}
          {searchError && <p className="lp-search-status">{searchError}</p>}
        </div>
        <div className="lp-cards">
          {visibleDestinations.map((item) => (
            <article key={`${item.title}-${item.lat ?? item.location}`} className="lp-card">
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = fallbackImage;
                }}
              />
              <div className="lp-card-body">
                <h3>{item.title}</h3>
                <p className="lp-location">{item.location}</p>
                {item.description && <p className="lp-card-copy">{item.description}</p>}
                <div className="lp-card-row">
                  <strong>{item.price}</strong>
                  <button type="button" onClick={() => navigate('/login')}>View Details</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="lp-section lp-features">
        <div className="lp-heading">
          <h2>Built for Modern Travel</h2>
          <p>Everything you need to plan, navigate, and share your journey.</p>
        </div>
        <div className="lp-feature-grid">
          {FEATURES.map((item) => (
            <article key={item.title} className="lp-feature-card">
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="lp-section lp-cta">
        <h2>Ready to Start Your Journey?</h2>
        <p>Join thousands of travelers who trust Travelogue for their adventures</p>
        <button type="button" onClick={() => navigate('/register')}>Get Started Today</button>
      </section>

      <footer className="lp-footer">
        <h3>Travelogue</h3>
        <p>Your gateway to extraordinary adventures</p>
        <small>© 2026 Travelogue. All rights reserved.</small>
      </footer>
    </div>
  );
}


