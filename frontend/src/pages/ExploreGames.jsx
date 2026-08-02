import { useState, useEffect, useRef, memo } from 'react';
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
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  const fetchGlobalGames = async (search, pageNum = 1, isNewSearch = false) => {
    if (isNewSearch) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const url = search
        ? `${API_BASE_URL}/rawg/games?search=${search}&page_size=40&page=${pageNum}`
        : `${API_BASE_URL}/rawg/games?page_size=40&ordering=-rating&metacritic=80,100&page=${pageNum}`;
      const res  = await fetch(url);
      const data = await res.json();
      
      const newResults = data.results || [];
      
      // Rely on the API telling us if there's a next page, rather than hardcoded length
      if (data.next) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }

      setGlobalGames(prev => isNewSearch ? newResults : [...prev, ...newResults]);
    } catch (err) {
      console.error('ExploreGames fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const observer = useRef();
  const lastGameElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => {
          const next = prevPage + 1;
          // We call fetchGlobalGames immediately with the updated page
          fetchGlobalGames(searchTerm, next, false);
          return next;
        });
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, searchTerm]);

  useEffect(() => { 
    fetchGlobalGames('', 1, true); 
  }, []);

  useEffect(() => {
    // Only refresh AOS for the initial load
    if (globalGames.length > 0 && page === 1) {
      setTimeout(() => {
        if (window.AOS) {
          window.AOS.refreshHard();
        }
      }, 150);
    }
  }, [globalGames, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGlobalGames(searchTerm, 1, true);
  };

  return (
    <div style={{ padding: '32px 28px 60px' }}>
      {/* Header */}
      <div
        data-aos="fade-down"
        style={{ marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 16,
                 justifyContent: 'space-between', alignItems: 'center' }}
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
          {[...Array(24)].map((_, i) => (
            <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6" key={i}>
              <div className="skeleton-card" style={{ height: 280 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="row g-4">
            {globalGames.map((game, idx) => {
              const isLastElement = globalGames.length === idx + 1;
              // Only apply AOS to the first page to prevent dynamically appended cards from getting stuck in opacity:0
              const useAOS = idx < 40; 
              
              return (
                <div
                  ref={isLastElement ? lastGameElementRef : null}
                  key={`${game.id}-${idx}`}
                  className="col-xl-2 col-lg-3 col-md-4 col-sm-6"
                  data-aos={useAOS ? "fade-up" : undefined}
                  data-aos-delay={useAOS ? Math.min((idx % 40) * 30, 200) : undefined}
                  style={!useAOS ? { animation: 'fadeIn 0.5s ease-in-out' } : {}}
                >
                  <ExploreCard game={game} navigate={navigate} />
                </div>
              );
            })}
          </div>
          
          <div style={{ height: '40px', marginTop: '30px', textAlign: 'center', width: '100%' }}>
            {loadingMore && (
              <div style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Loading more games...
              </div>
            )}
            {!hasMore && globalGames.length > 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                End of results.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ExploreGames;