import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from './utils/constants';

import RawgSidebar from './components/RawgSidebar';
import ExploreGames    from './pages/ExploreGames';
import GamesList       from './pages/GamesList';
import GameDetail      from './pages/GameDetail';
import CategoryPage    from './pages/CategoryPage';
import Login           from './pages/Login';
import Signup          from './pages/Signup';
import GlobalGameDetail from './pages/GlobalGameDetail';
import CollectionPage  from './pages/CollectionPage';
import Community       from './pages/Community';
import Profile         from './pages/Profile';
import Wishlist        from './pages/Wishlist';
import Following       from './pages/Following';
import PlatformsPage   from './pages/PlatformsPage';
import StoresPage      from './pages/StoresPage';
import StorePage       from './pages/StorePage';
import CollectionsPage from './pages/CollectionsPage';
import Marketplace     from './pages/Marketplace';
import SellItem        from './pages/SellItem';
import ListingDetail   from './pages/ListingDetail';
import MyListings      from './pages/MyListings';
import MyOrders        from './pages/MyOrders';
import RentItem        from './pages/RentItem';

// ─── Universal Search Bar ─────────────────────────────────
function UniversalSearch() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const navigate  = useNavigate();
  const wrapRef   = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/rawg/games?search=${encodeURIComponent(q)}&page_size=6`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 380);
  };

  const handleSelect = (game) => {
    setOpen(false);
    setQuery('');
    navigate(`/global-game/${game.id}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (results.length > 0) handleSelect(results[0]);
  };

  return (
    <div ref={wrapRef} className="gv-search-wrap" style={{ flex: 1, maxWidth: 380 }}>
      <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
        <span className="gv-search-icon">🔍</span>
        <input
          id="global-search"
          type="text"
          className="gv-search-input"
          placeholder="Search games…"
          value={query}
          onChange={handleChange}
          autoComplete="off"
        />
      </form>
      {open && results.length > 0 && (
        <div className="gv-search-results">
          {loading && (
            <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Searching…</div>
          )}
          {results.map(game => (
            <div key={game.id} className="gv-search-item" onClick={() => handleSelect(game)}>
              <img
                src={game.background_image || 'https://placehold.co/52x38/111827/4361ee?text=GV'}
                alt={game.name}
              />
              <div className="gv-search-item-info" style={{ overflow: 'hidden' }}>
                <div className="gv-search-item-name">{game.name}</div>
                <div className="gv-search-item-meta">
                  {game.released?.split('-')[0] || 'TBA'} · ⭐ {game.rating}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────
function Navbar() {
  const token    = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    window.location.href = '/login';
  };

  const navLinks = [
    { to: '/',            label: 'Explore' },
    { to: '/vault',       label: 'My Library' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/community',   label: 'Community' },
  ];

  return (
    <nav className="gv-navbar" style={{ backgroundColor: 'rgba(11,15,26,0.9)' }}>
      <Link to="/" className="gv-logo" style={{ textDecoration: 'none' }}>
        GAME<span>VAULT</span>
      </Link>

      <UniversalSearch />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="gv-nav-btn"
            style={{
              textDecoration: 'none',
              ...(location.pathname === to ? {
                borderColor: 'var(--accent-primary)',
                color: 'var(--text-primary)',
                background: 'rgba(67,97,238,0.12)',
              } : {}),
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
        {token ? (
          <>
            <span className="gv-nav-username d-none d-md-inline">👤 {username}</span>
            {/* FIX 1.6: "View Profile" is now a working Link, not dead text */}
            <Link to="/profile" className="gv-nav-btn" style={{ textDecoration: 'none' }}>Profile</Link>
            <button onClick={handleLogout} className="gv-nav-btn" style={{ border: '1px solid rgba(239,68,68,0.35)', color: 'var(--accent-danger)' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"  className="gv-nav-btn" style={{ textDecoration: 'none' }}>Login</Link>
            <Link to="/signup" className="gv-nav-btn-primary" style={{ textDecoration: 'none' }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Layout with sidebar + main content ──────────────────
// FIX 1.1: sidebar is position:fixed in CSS → main content has margin-left to compensate
function Layout() {
  const location = useLocation();
  // FIX 1.2: transparent sidebar when viewing a game detail page
  const isDetailPage = /^\/(global-game|game)\//.test(location.pathname);

  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--bg-primary)', minHeight: 'calc(100vh - 62px)' }}>
      <RawgSidebar transparent={isDetailPage} />
      {/* gv-main-content class applies margin-left: var(--sidebar-width) */}
      <div className="gv-main-content" style={{ flex: 1, overflowX: 'hidden' }}>
        <Routes>
          <Route path="/"                         element={<ExploreGames />} />
          <Route path="/vault"                    element={<GamesList />} />
          <Route path="/game/:id"                 element={<GameDetail />} />
          <Route path="/platform/:id"             element={<CategoryPage />} />
          <Route path="/login"                    element={<Login />} />
          <Route path="/signup"                   element={<Login />} />
          <Route path="/global-game/:id"          element={<GlobalGameDetail />} />
          <Route path="/collection/:type"         element={<CollectionPage />} />
          <Route path="/community"                element={<Community />} />
          <Route path="/profile"                  element={<Profile />} />
          <Route path="/wishlist"                 element={<Wishlist />} />
          <Route path="/following"                element={<Following />} />
          <Route path="/platforms"                element={<PlatformsPage />} />
          <Route path="/stores"                   element={<StoresPage />} />
          <Route path="/store/:id"                element={<StorePage />} />
          <Route path="/collections"              element={<CollectionsPage />} />
          {/* ── Marketplace ── */}
          <Route path="/marketplace"              element={<Marketplace />} />
          <Route path="/marketplace/sell"         element={<SellItem />} />
          <Route path="/marketplace/rent"         element={<RentItem />} />
          <Route path="/marketplace/listing/:id"  element={<ListingDetail />} />
          <Route path="/marketplace/my-listings"  element={<MyListings />} />
          <Route path="/marketplace/orders"       element={<MyOrders />} />
        </Routes>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────
function App() {
  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({ duration: 600, once: true, offset: 60 });
    }
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <Layout />
      <ToastContainer theme="dark" position="bottom-right" />
    </BrowserRouter>
  );
}

export default App;