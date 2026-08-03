import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';

// ── Tilt Helper ────────────────────────────────────────────
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.VanillaTilt) return;
    window.VanillaTilt.init(el, { max: 6, speed: 400, glare: true, 'max-glare': 0.1, gyroscope: false });
    return () => el._tiltDestroy?.();
  }, [ref]);
}

// ── Vault Game Card ────────────────────────────────────────
function VaultCard({ game, onDelete, onToggleWishlist }) {
  const navigate  = useNavigate();
  const cardRef   = useRef(null);
  useTilt(cardRef);

  const imageSrc = game.image
    ? (game.image.startsWith('http') ? game.image : `${SERVER_BASE_URL}${game.image}`)
    : game.image_url || 'https://placehold.co/300x190/111827/4361ee?text=GameVault';

  const statusColors = {
    Playing: 'gv-badge-blue', Completed: 'gv-badge-green',
    'Plan to Play': 'gv-badge-dark', Dropped: 'gv-badge-red',
  };

  return (
    <div ref={cardRef} className="gv-card" data-aos="fade-up" style={{ height: '100%' }}>
      {/* Cover */}
      <div
        style={{ height: 190, overflow: 'hidden', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
        onClick={() => navigate(`/game/${game.id}`)}
      >
        <img  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found"; }} src={imageSrc} alt={game.title} className="gv-card__image" />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span className={`gv-badge ${statusColors[game.status] || 'gv-badge-dark'}`}>{game.status}</span>
        </div>
        {game.is_wishlisted && (
          <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '1.2rem' }}>💜</div>
        )}
      </div>

      {/* Body */}
      <div className="gv-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          className="gv-card__title"
          onClick={() => navigate(`/game/${game.id}`)}
          style={{ cursor: 'pointer' }}
        >
          {game.title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{game.genre}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-glow)' }}>
            ⭐ {game.rating}
          </span>
        </div>
        {game.platform && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🎮 {game.platform}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <button
            onClick={() => onToggleWishlist(game)}
            className={`btn-wishlist btn-bounce ${game.is_wishlisted ? 'active' : ''}`}
            style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
          >
            {game.is_wishlisted ? '💜' : '♡'} Wish
          </button>
          <button
            onClick={() => navigate(`/game/${game.id}`)}
            className="btn-gv-ghost btn-bounce"
            style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
          >
            📝 Notes
          </button>
          <button
            onClick={() => onDelete(game.id)}
            className="btn-gv-danger btn-bounce"
            style={{ flex: 1, padding: '6px 0', fontSize: '0.75rem' }}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main GamesList Page ────────────────────────────────────
function GamesList() {
  const [games, setGames]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilter] = useState('All');
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    // ── CRITICAL FIX (Bug #1): Authorization header added to fetch
    // Without this header, get_queryset() saw an anonymous user and returned []
    // causing games to appear to "disappear on reload".
    fetch(`${API_BASE_URL}/games/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setGames(Array.isArray(data) ? data : []);
        setLoading(false);
        setTimeout(() => window.AOS?.refresh(), 100);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleDelete = async (gameId) => {
    if (!window.confirm('Remove this game from your Vault?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/games/${gameId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (res.ok || res.status === 204) {
        setGames(prev => prev.filter(g => g.id !== gameId));
        toast.info('Game removed from Vault.');
      }
    } catch { toast.error("Couldn't remove game."); }
  };

  const handleToggleWishlist = async (game) => {
    try {
      const res = await fetch(`${API_BASE_URL}/games/${game.id}/toggle_wishlist/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setGames(prev => prev.map(g => g.id === game.id ? updated : g));
        toast.success(updated.is_wishlisted ? '💜 Added to Wishlist!' : '✓ Removed from Wishlist');
      }
    } catch { toast.error("Couldn't update wishlist."); }
  };

  if (!token) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: '70vh', textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: '4rem', marginBottom: 20 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Your Vault awaits</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Sign in to access your personal game library</p>
      <Link to="/login" className="btn-gv-primary" style={{ padding: '12px 32px', fontSize: '0.95rem', textDecoration: 'none' }}>
        Login to GameVault
      </Link>
    </div>
  );

  const statuses = ['All', 'Playing', 'Completed', 'Plan to Play', 'Dropped'];
  const filtered  = filterStatus === 'All' ? games : games.filter(g => g.status === filterStatus);
  const wishlisted = games.filter(g => g.is_wishlisted).length;

  return (
    <div style={{ padding: '32px 28px 60px' }}>
      {/* ── Header ── */}
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
              My&nbsp;
              <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>
                Vault
              </span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {games.length} games · {wishlisted} wishlisted
            </p>
          </div>
          <Link to="/" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '9px 20px', fontSize: '0.85rem' }}>
            + Browse Games
          </Link>
        </div>

        {/* Stats Row */}
        {games.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', count: games.length, cls: 'gv-badge-dark' },
              { label: 'Playing', count: games.filter(g => g.status === 'Playing').length, cls: 'gv-badge-blue' },
              { label: 'Completed', count: games.filter(g => g.status === 'Completed').length, cls: 'gv-badge-green' },
              { label: 'Wishlisted', count: wishlisted, cls: 'gv-badge-purple' },
            ].map(({ label, count, cls }) => (
              <div key={label} className={`gv-badge ${cls}`} style={{ padding: '6px 14px', fontSize: '0.8rem', gap: 4 }}>
                <span style={{ fontWeight: 700 }}>{count}</span>
                <span style={{ opacity: 0.75 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Status Filter ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={s === filterStatus ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
            style={{ padding: '6px 16px', fontSize: '0.8rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="row g-4">
          {[...Array(8)].map((_, i) => (
            <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6" key={i}>
              <div className="skeleton-card" style={{ height: 290 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '3.5rem' }}>🎮</div>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>
            {filterStatus === 'All' ? 'Your Vault is empty!' : `No games with status "${filterStatus}"`}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {filterStatus === 'All' ? 'Browse the global library and click "Add to Vault"' : 'Try changing the filter'}
          </p>
          {filterStatus === 'All' && (
            <Link to="/" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 28px' }}>
              Explore Games
            </Link>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {filtered.map((game, idx) => (
            <div
              key={game.id}
              className="col-xl-2 col-lg-3 col-md-4 col-sm-6"
              data-aos="fade-up"
              data-aos-delay={Math.min(idx * 40, 250)}
            >
              <VaultCard game={game} onDelete={handleDelete} onToggleWishlist={handleToggleWishlist} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GamesList;