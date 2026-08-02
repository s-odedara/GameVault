import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/constants';

// ── Tilt helper ────────────────────────────────────────────
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.VanillaTilt) return;
    window.VanillaTilt.init(el, {
      max: 8, speed: 400, glare: true, 'max-glare': 0.12,
      gyroscope: false,
    });
    return () => el._tiltDestroy?.();
  }, [ref]);
}

// ── Explore Card ───────────────────────────────────────────
const ExploreCard = memo(({ game, navigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  useTilt(cardRef);

  useEffect(() => {
    let timer;
    if (isHovered && videoRef.current) {
      timer = setTimeout(() => {
        videoRef.current?.play().catch(() => {});
      }, 350);
    }
    return () => clearTimeout(timer);
  }, [isHovered]);

  return (
    <div
      ref={cardRef}
      className="gv-card"
      data-aos="fade-up"
      data-aos-delay="50"
      style={{ height: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/global-game/${game.id}`)}
    >
      {/* Image / Video */}
      <div style={{ height: '190px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {isHovered ? (
          <video
            ref={videoRef}
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
            poster={game.background_image || 'https://placehold.co/300x190/111827/4361ee?text=No+Image'}
            muted loop playsInline
            className="w-100 h-100"
            style={{ objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <img
            src={game.background_image || 'https://placehold.co/300x190/111827/4361ee?text=No+Image'}
            className="gv-card__image"
            alt={game.name}
            loading="lazy"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        {/* Rating badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(11,15,26,0.8)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(67,97,238,0.3)',
          borderRadius: 50, padding: '2px 8px',
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-glow)',
        }}>
          ⭐ {game.rating > 5 ? (game.rating / 2).toFixed(1) : game.rating}
        </div>
      </div>

      {/* Body */}
      <div className="gv-card__body">
        <div className="gv-card__title">{game.name}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {game.released ? game.released.substring(0, 4) : 'TBA'}
          </span>
          <span style={{ fontSize: '0.72rem' }} className="gv-badge gv-badge-blue">
            {game.genres?.[0]?.name || 'Game'}
          </span>
        </div>
        {/* Hover hint */}
        <div style={{
          marginTop: 10, fontSize: '0.75rem', color: 'var(--accent-primary)',
          fontWeight: 600, opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s',
          textAlign: 'center',
        }}>
          Click to view details →
        </div>
      </div>
    </div>
  );
});

// ── Explore Games Page ─────────────────────────────────────
function ExploreGames() {
  const [globalGames, setGlobalGames] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const navigate = useNavigate();

  const fetchGlobalGames = useCallback(async (search) => {
    setLoading(true);

    try {
      const url = search
        ? `${API_BASE_URL}/rawg/games?search=${search}&page_size=40`
        : `${API_BASE_URL}/rawg/games?page_size=40&ordering=-rating&metacritic=80,100`;
      const res  = await fetch(url);
      const data = await res.json();
      
      setGlobalGames(data.results || []);
    } catch (err) {
      console.error('ExploreGames fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchGlobalGames(''); 
  }, [fetchGlobalGames]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGlobalGames(searchTerm);
  };

  return (
    <div style={{ padding: '32px 28px 60px' }}>
      {/* Header */}
      <div
        style={{ marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 16,
                 justifyContent: 'space-between', alignItems: 'center', animation: 'fadeInDown 0.6s ease-out' }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
            Global&nbsp;
            <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>
              Trending
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Discover top-rated games from the global database
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          style={{ display: 'flex', gap: 0, maxWidth: 380, width: '100%' }}
        >
          <input
            type="text"
            className="gv-form-input"
            style={{ borderRadius: '10px 0 0 10px', flex: 1, borderRight: 'none' }}
            placeholder="Search global database…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            className="btn-gv-primary"
            style={{ borderRadius: '0 10px 10px 0', padding: '10px 20px' }}
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="row g-4">
          {[...Array(40)].map((_, i) => (
            <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6" key={i}>
              <div className="skeleton-card" style={{ height: 280 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="row g-4">
            {globalGames.map((game, idx) => {
              const delay = Math.min((idx % 40) * 0.03, 0.2);
              
              return (
                <div
                  key={`${game.id}-${idx}`}
                  className="col-xl-2 col-lg-3 col-md-4 col-sm-6"
                  style={{ opacity: 1, visibility: 'visible', transition: 'none' }}
                >
                  <ExploreCard game={game} navigate={navigate} />
                </div>
              );
            })}
          </div>
          
          {globalGames.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>
              No games found. Try a different search.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ExploreGames;