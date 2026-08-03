import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';

function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.VanillaTilt) return;
    window.VanillaTilt.init(el, { max: 7, speed: 350, glare: true, 'max-glare': 0.1, gyroscope: false });
    return () => el._tiltDestroy?.();
  }, [ref]);
}

function ListingCard({ item, navigate }) {
  const cardRef = useRef(null);
  useTilt(cardRef);

  const img = item.image
    ? (item.image.startsWith('http') ? item.image : `${SERVER_BASE_URL}${item.image}`)
    : 'https://placehold.co/300x200/111827/4361ee?text=No+Photo';

  const conditionCls = {
    New: 'gv-badge-green', 'Like New': 'gv-badge-cyan',
    Good: 'gv-badge-blue', Fair: 'gv-badge-amber',
  };

  return (
    <div ref={cardRef} className="gv-card" style={{ height: '100%', cursor: 'pointer' }}
         onClick={() => navigate(`/marketplace/listing/${item.id}`)}>
      <div style={{ height: 186, overflow: 'hidden', position: 'relative' }}>
        <img  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found"; }} src={img} alt={item.title} className="gv-card__image" />
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <span className={`gv-badge ${conditionCls[item.condition] || 'gv-badge-dark'}`}>{item.condition}</span>
        </div>
      </div>
      <div className="gv-card__body">
        <div className="gv-card__title">{item.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-glow)' }}>
            ₹{item.price}
          </span>
          <span className="gv-badge gv-badge-dark">{item.category}</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
          <span>@{item.seller_username}</span>
          {item.location && <span>📍 {item.location}</span>}
        </div>
        <button
          className="btn-gv-primary btn-bounce"
          style={{ width: '100%', marginTop: 10, padding: '7px 0', fontSize: '0.8rem' }}
          onClick={e => { e.stopPropagation(); navigate(`/marketplace/listing/${item.id}?type=${item.isRental ? 'rent' : 'buy'}`); }}
        >
          {item.isRental ? 'View & Rent' : 'View & Buy'}
        </button>
      </div>
    </div>
  );
}

function Marketplace() {
  const [mode, setMode]         = useState('buy'); // 'buy' or 'rent'
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');

  useEffect(() => {
    setLoading(true);
    const endpoint = mode === 'buy' ? `${API_BASE_URL}/listings/` : `${API_BASE_URL}/rentals/`;
    fetch(endpoint)
      .then(r => r.json())
      .then(data => { 
          const mappedData = Array.isArray(data) ? data.map(d => ({...d, isRental: mode === 'rent'})) : [];
          setListings(mappedData); 
          setLoading(false);
          setTimeout(() => window.AOS?.refresh(), 100); 
      })
      .catch(() => setLoading(false));
  }, [mode]);

  const categories = ['All', 'Physical Game', 'Console', 'Controller/Peripheral', 'Merchandise', 'Collectible', 'Other'];

  const filtered = listings.filter(l => {
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || l.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding: '32px 28px 80px' }}>
      {/* ── Hero Banner ── */}
      <div data-aos="fade-down" className="glass-card" style={{ padding: '32px 32px', marginBottom: 32,
            background: 'linear-gradient(135deg, rgba(67,97,238,0.15), rgba(0,212,255,0.08))',
            border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, marginBottom: 6 }}>
              🎮 P2P&nbsp;
              <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 16px rgba(0,212,255,0.4)' }}>Marketplace</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Buy & sell physical games, consoles, and gaming gear from the community
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {token ? (
              <>
                <Link to="/marketplace/sell" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 20px' }}>
                  + Sell Item
                </Link>
                <Link to="/marketplace/my-listings" className="btn-gv-ghost" style={{ textDecoration: 'none', padding: '10px 20px' }}>
                  My Listings
                </Link>
                <Link to="/marketplace/orders" className="btn-gv-ghost" style={{ textDecoration: 'none', padding: '10px 20px' }}>
                  My Orders
                </Link>
              </>
            ) : (
              <Link to="/login" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 24px' }}>
                Login to Trade
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div data-aos="fade-up" style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, marginRight: 16 }}>
          <button onClick={() => setMode('buy')} className={mode === 'buy' ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'} style={{ padding: '8px 20px' }}>Buy/Sell</button>
          <button onClick={() => setMode('rent')} className={mode === 'rent' ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'} style={{ padding: '8px 20px' }}>Rentals</button>
        </div>
        <input
          type="text"
          className="gv-form-input"
          placeholder="🔍 Search listings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280, flex: '0 0 auto' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setCategory(cat)}
              className={cat === category ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
              style={{ padding: '5px 14px', fontSize: '0.78rem' }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="row g-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="col-lg-3 col-md-4 col-sm-6">
              <div className="skeleton-card" style={{ height: 310 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🛒</div>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>No listings found</h4>
          <p style={{ color: 'var(--text-muted)' }}>Be the first to sell something!</p>
          <Link to="/marketplace/sell" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block', marginTop: 12 }}>
            + Sell an Item
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {filtered.map((item, idx) => (
            <div key={item.id} className="col-xl-3 col-lg-4 col-md-4 col-sm-6" data-aos="fade-up" data-aos-delay={Math.min(idx * 40, 200)}>
              <ListingCard item={item} navigate={navigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Marketplace;
