import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/constants';
import { toast } from 'react-toastify';

function GlobalGameDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [game, setGame]         = useState(null);
  const [related, setRelated]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [isAdding, setIsAdding]   = useState(false);
  const [isAdded, setIsAdded]     = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);
  const [isWishlisted, setIsWishlisted]   = useState(false);
  const swiperRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch(`${API_BASE_URL}/rawg/games/${id}`)
      .then(r => r.json())
      .then(data => { setGame(data); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch recommended / related games by same genre
    fetch(`${API_BASE_URL}/rawg/games?page_size=10&ordering=-rating`)
      .then(r => r.json())
      .then(data => setRelated(data.results || []))
      .catch(() => {});
  }, [id]);

  // Init Swiper after related games load
  useEffect(() => {
    if (!related.length) return;
    const timer = setTimeout(() => {
      if (window.Swiper && document.getElementById('related-swiper')) {
        if (swiperRef.current) { swiperRef.current.destroy?.(true, true); }
        swiperRef.current = new window.Swiper('#related-swiper', {
          slidesPerView: 2,
          spaceBetween: 16,
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          pagination: { el: '.swiper-pagination', clickable: true },
          breakpoints: {
            640:  { slidesPerView: 3 },
            900:  { slidesPerView: 4 },
            1200: { slidesPerView: 5 },
          },
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [related]);

  const handleAddToVault = async () => {
    if (isAdding || isAdded) return;
    setIsAdding(true);
    const token = localStorage.getItem('token');
    if (!token) { toast.warning('Please login to add games!'); setIsAdding(false); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/games/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({
          title:        game.name,
          genre:        game.genres?.[0]?.name || 'Unknown',
          platform:     game.platforms?.map(p => p.platform.name).join(', ') || 'Unknown',
          release_date: game.released || '2000-01-01',
          rating:       Math.min(game.rating || 0, 5),
          image_url:    game.background_image || '',
          rawg_game_id: parseInt(id),   // ← FIX: store RAWG ID for precise detail lookup
          status:       'Plan to Play',
        }),
      });
      if (res.ok) {
        setIsAdded(true);
        toast.success(`🎮 ${game.name} added to your Vault!`);
      } else {
        toast.error('Failed to add game. It might already be in your Vault.');
      }
    } catch { toast.error('Server error. Please try again.'); }
    finally  { setIsAdding(false); }
  };

  const handleAddToWishlist = async () => {
    if (isWishlisting || isWishlisted) return;
    setIsWishlisting(true);
    const token = localStorage.getItem('token');
    if (!token) { toast.warning('Please login to use Wishlist!'); setIsWishlisting(false); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/games/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({
          title:        game.name,
          genre:        game.genres?.[0]?.name || 'Unknown',
          platform:     game.platforms?.map(p => p.platform.name).join(', ') || 'Unknown',
          release_date: game.released || '2000-01-01',
          rating:       Math.min(game.rating || 0, 5),
          image_url:    game.background_image || '',
          rawg_game_id: parseInt(id),
          status:       'Plan to Play',
          is_wishlisted: true,
        }),
      });
      if (res.ok) { setIsWishlisted(true); toast.success(`💜 ${game.name} added to Wishlist!`); }
      else { toast.error("Couldn't add to wishlist."); }
    } catch { toast.error('Server error.'); }
    finally  { setIsWishlisting(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border" style={{ color: 'var(--accent-glow)', width: 48, height: 48 }} role="status" />
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading Game Intel…</p>
      </div>
    </div>
  );

  if (!game) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-primary)' }}>
      <h2>Game not found</h2>
      <Link to="/" className="btn-gv-primary" style={{ marginTop: 16, display: 'inline-block' }}>Back to Explore</Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80 }}>

      {/* ── Full-Page Hero ─────────────────────────────────── */}
      <div className="gv-detail-hero-wrapper">
        <div className="gv-detail-hero" style={{ backgroundImage: `url(${game.background_image})` }}>
          <div className="gv-detail-hero-overlay" />
        </div>
        <div className="gv-detail-hero-content">
          {/* Breadcrumb */}
          <div style={{ fontSize: '0.72rem', letterSpacing: 2, color: 'rgba(255,255,255,0.55)',
                        textTransform: 'uppercase', marginBottom: 16, display: 'flex', gap: 8 }}>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{game.name}</span>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className="gv-badge gv-badge-dark">{game.released?.split('-')[0] || 'TBA'}</span>
            {game.playtime > 0 && (
              <span className="gv-badge gv-badge-blue">⏱ {game.playtime}h avg play</span>
            )}
            {game.metacritic && (
              <span className="gv-badge gv-badge-green">MC {game.metacritic}</span>
            )}
          </div>

          {/* Title */}
          <h1 className="gv-detail-title">{game.name}</h1>

          {/* Meta Row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
            {game.rating > 0 && (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Rating</div>
                <div style={{ color: 'var(--accent-glow)', fontWeight: 700, fontSize: '1.1rem' }}>
                  {'★'.repeat(Math.round(game.rating))} {game.rating}
                </div>
              </div>
            )}
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Genre</div>
              <div>{game.genres?.map(g => g.name).join(', ') || '—'}</div>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Developer</div>
              <div>{game.developers?.map(d => d.name).join(', ') || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px 0' }}>
        <div className="row g-5">
          {/* Left — Description */}
          <div className="col-lg-7" data-aos="fade-up">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-glow)', marginBottom: 16 }}>
              About the Game
            </h3>
            <div
              style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }}
              dangerouslySetInnerHTML={{ __html: game.description || '<p>No description available.</p>' }}
            />

            {/* Action Buttons (Restored & Moved Here) */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: '1.5rem' }}>
              <button
                onClick={handleAddToVault}
                disabled={isAdding || isAdded}
                className="btn-gv-primary btn-pulse-vault btn-bounce"
                style={{ padding: '10px 24px', fontSize: '0.9rem',
                         ...(isAdded ? { background: 'linear-gradient(135deg,#22c55e,#16a34a)' } : {}) }}
              >
                {isAdding ? '⏳ Adding…' : isAdded ? '✓ In Vault' : '+ Add to Vault'}
              </button>

              <button
                onClick={handleAddToWishlist}
                disabled={isWishlisting || isWishlisted}
                className="btn-wishlist btn-pulse-wish btn-bounce"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                {isWishlisting ? '⏳' : isWishlisted ? '💜 Wishlisted' : '♡ Wishlist'}
              </button>
            </div>
          </div>

          {/* Right — Visuals + Stats */}
          <div className="col-lg-5" data-aos="fade-up" data-aos-delay="100">
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <h5 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--text-primary)' }}>
                Quick Stats
              </h5>
              {[
                ['Platforms', game.platforms?.map(p => p.platform.name).join(', ')],
                ['Released',  game.released || 'TBA'],
                ['Developer', game.developers?.map(d => d.name).join(', ')],
                ['Publisher', game.publishers?.map(p => p.name).join(', ')],
                ['Ratings',   `${game.ratings_count?.toLocaleString()} reviews`],
              ].map(([label, value]) => value && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                          paddingBottom: 10, marginBottom: 10,
                                          borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Screenshots */}
            {game.background_image_additional && (
              <img
                src={game.background_image_additional}
                alt="Screenshot"
                style={{ width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', marginBottom: 12 }}
              />
            )}
            <img
              src={game.background_image}
              alt="Cover"
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', opacity: 0.85 }}
            />
          </div>
        </div>

        {/* ── Related Games — Swiper Carousel ───────────────── */}
        {related.length > 0 && (
          <div style={{ marginTop: 60 }} data-aos="fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
                🎮 You May Also Like
              </h3>
              <Link to="/" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>

            <div className="swiper" id="related-swiper">
              <div className="swiper-wrapper">
                {related.filter(g => g.id !== parseInt(id)).map(g => (
                  <div key={g.id} className="swiper-slide" style={{ paddingBottom: 20 }}>
                    <div
                      className="gv-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/global-game/${g.id}`)}
                    >
                      <img
                        src={g.background_image || 'https://placehold.co/280x158/111827/4361ee?text=GV'}
                        alt={g.name}
                        style={{ width: '100%', height: 130, objectFit: 'cover' }}
                      />
                      <div className="gv-card__body" style={{ padding: '10px 12px' }}>
                        <div className="gv-card__title" style={{ fontSize: '0.82rem' }}>{g.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ⭐ {g.rating} · {g.released?.split('-')[0] || 'TBA'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="swiper-button-next" />
              <div className="swiper-button-prev" />
              <div className="swiper-pagination" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalGameDetail;