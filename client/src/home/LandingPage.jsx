import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const DESTINATIONS = [
  {
    title: 'Swiss Alps',
    location: 'Switzerland',
    price: '$1200 - $2500',
    image: 'https://images.unsplash.com/photo-1508261305436-4b35c91f6d2f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Coastal Paradise',
    location: 'Mediterranean',
    price: '$800 - $1800',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Mountain Retreat',
    location: 'Norway',
    price: '$1000 - $2200',
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

export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const fallbackImage =
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

  const scrollToSection = (id) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSearch = () => {
    if (!query.trim()) {
      scrollToSection('destinations');
      return;
    }
    navigate('/login');
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
          <div className="lp-search">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations..."
            />
            <button type="button" onClick={handleHeroSearch}>Search</button>
          </div>
        </div>
      </section>

      <section id="destinations" className="lp-section lp-destinations">
        <div className="lp-heading">
          <h2>Featured Destinations</h2>
          <p>Handpicked locations for your next journey</p>
        </div>
        <div className="lp-cards">
          {DESTINATIONS.map((item) => (
            <article key={item.title} className="lp-card">
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
