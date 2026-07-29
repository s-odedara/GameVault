import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';

function GameDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [game, setGame]           = useState(null);
  const [rawgDetails, setRawg]    = useState(null);
  const [screenshots, setShots]   = useState([]);
  const [related, setRelated]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [note, setNote]           = useState('');
  const [isSavingNote, setSaving] = useState(false);
  const token   = localStorage.getItem('token');
  const swiperRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const run = async () => {
      try {
        // 1) Fetch vault game record (needs auth header — Bug #1 fix)
        const localRes = await fetch(`${API_BASE_URL}/games/${id}/`, {
          headers: token ? { 'Authorization': `Token ${token}` } : {},
        });
        const localData = await localRes.json();
        setGame(localData);
        setNote(localData.notes || '');

        // 2) ── CRITICAL FIX for Bug #3 ──────────────────────────────
        // If we have the stored rawg_game_id, use it directly (exact match).
        // Otherwise fall back to text search as a best-effort.
        let rawgId = localData.rawg_game_id;

        if (!rawgId) {
          // fallback: search by title, then verify the result title matches closely
          const searchRes  = await fetch(`${API_BASE_URL}/rawg/games?search=${encodeURIComponent(localData.title)}&page_size=5`);
          const searchData = await searchRes.json();
          const match = (searchData.results || []).find(
            r => r.name.toLowerCase() === localData.title.toLowerCase()
          ) || searchData.results?.[0];
          rawgId = match?.id;
        }

        if (rawgId) {
          const [detailRes, screenRes, relatedRes] = await Promise.all([
            fetch(`${API_BASE_URL}/rawg/games/${rawgId}`),
            fetch(`${API_BASE_URL}/rawg/games/${rawgId}/screenshots`),
            fetch(`${API_BASE_URL}/rawg/games?page_size=10&ordering=-rating`),
          ]);
          setRawg(await detailRes.json());
          const screenData = await screenRes.json();
          setShots((screenData.results || []).slice(0, 6));
          const relatedData = await relatedRes.json();
          setRelated(relatedData.results || []);
        }
      } catch (err) {
        console.error('GameDetail fetch error:', err);
      } finally {
        setLoading(false);
        setTimeout(() => window.AOS?.refresh(), 100);
      }
    };
    run();
  }, [id, token]);

  // Init Swiper for related games
  useEffect(() => {
    if (!related.length) return;
    const timer = setTimeout(() => {
      if (window.Swiper && document.getElementById('vault-related-swiper')) {
        swiperRef.current?.destroy?.(true, true);
        swiperRef.current = new window.Swiper('#vault-related-swiper', {
          slidesPerView: 2, spaceBetween: 14,
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          pagination: { el: '.swiper-pagination', clickable: true },
          breakpoints: { 640: { slidesPerView: 3 }, 900: { slidesPerView: 4 }, 1100: { slidesPerView: 5 } },
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [related]);

  const handleSaveNote = async () => {
    if (!token) { toast.warning('Please login to save notes!'); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append('title',        game.title  || 'Unknown');
    fd.append('genre',        game.genre  || 'Unknown');
    fd.append('platform',     game.platform || 'PC');
    fd.append('release_date', game.release_date || '2000-01-01');
    fd.append('rating',       game.rating || 0);
    fd.append('status',       game.status || 'Plan to Play');
    fd.append('notes',        note || '');
    try {
      const res = await fetch(`${API_BASE_URL}/games/${id}/`, {
        method: 'PUT',
        headers: { 'Authorization': `Token ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error();
      setGame(await res.json());
      toast.success('Note saved! 📝');
    } catch { toast.error("Couldn't save note."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border" style={{ color: 'var(--accent-glow)', width: 48, height: 48 }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading…</p>
      </div>
    </div>
  );

  if (!game) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h2 style={{ color: 'var(--text-primary)' }}>Game not found in your Vault.</h2>
      <Link to="/vault" className="btn-gv-primary" style={{ marginTop: 16, display: 'inline-block' }}>Back to Vault</Link>
    </div>
  );

  const heroImg = rawgDetails?.background_image_additional
    || (game.image ? (game.image.startsWith('http') ? game.image : `${SERVER_BASE_URL}${game.image}`) : game.image_url)
    || rawgDetails?.background_image;

  const statusColors = {
    Playing: 'gv-badge-blue', Completed: 'gv-badge-green',
    'Plan to Play': 'gv-badge-dark', Dropped: 'gv-badge-red',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80 }}>

      {/* ── Immersive Hero ─────────────────────────────────── */}
      <div
        className="gv-detail-hero"
        style={{ backgroundImage: heroImg ? `url(${heroImg})` : undefined,
                 backgroundColor: heroImg ? undefined : 'var(--bg-elevated)' }}
      >
        <div className="gv-detail-hero-overlay" />
        <div className="gv-detail-hero-content">
          <Link to="/vault" style={{ display: 'inline-block', marginBottom: 16 }}>
            <span className="gv-badge gv-badge-dark" style={{ cursor: 'pointer', fontSize: '0.78rem' }}>
              ← Back to Vault
            </span>
          </Link>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span className={`gv-badge ${statusColors[game.status] || 'gv-badge-dark'}`}>{game.status}</span>
            <span className="gv-badge gv-badge-dark">{game.genre}</span>
            {rawgDetails?.metacritic && (
              <span className="gv-badge gv-badge-green">MC {rawgDetails.metacritic}</span>
            )}
          </div>

          <h1 className="gv-detail-title">{game.title}</h1>

          {/* Add to Vault / Wishlist toggle (on vault game detail page) */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/global-game/${game.rawg_game_id || ''}`)}
              className="btn-gv-outline btn-bounce"
              style={{ padding: '8px 20px' }}
            >
              🌐 View on Global DB
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px 0' }}>
        <div className="row g-5">

          {/* Left — Description & Notes */}
          <div className="col-lg-8" data-aos="fade-up">
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-glow)', marginBottom: 16 }}>
              About the Game
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.85, fontSize: '0.95rem', marginBottom: 32 }}>
              {rawgDetails?.description_raw || 'Description not available from the global database.'}
            </p>

            {/* ── Personal Notes ── */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h5 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>✏️ Personal Notes</h5>
                <span className="gv-badge gv-badge-dark" style={{ fontSize: '0.7rem' }}>Private</span>
              </div>
              <textarea
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add your private notes, tips, or reminders…"
                className="gv-form-input"
                style={{ resize: 'none', lineHeight: 1.6 }}
              />
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="btn-gv-primary btn-bounce"
                  style={{ padding: '8px 22px', fontSize: '0.85rem' }}
                >
                  {isSavingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Screenshots Grid */}
            {screenshots.length > 0 && (
              <div data-aos="fade-up">
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>📸 In-Game Gallery</h4>
                <div className="row g-3">
                  {screenshots.map(snap => (
                    <div key={snap.id} className="col-md-6">
                      <img
                        src={snap.image}
                        alt="Screenshot"
                        style={{ width: '100%', height: 200, objectFit: 'cover',
                                 borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Tech Info */}
          <div className="col-lg-4" data-aos="fade-up" data-aos-delay="100">
            <div className="glass-card" style={{ padding: 22 }}>
              <h5 style={{ fontFamily: 'var(--font-display)', marginBottom: 20,
                           paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                🎮 Game Info
              </h5>
              {[
                ['Released',  game.release_date],
                ['Platform',  game.platform],
                ['Rating',    `${game.rating} / 5 ⭐`],
                ['Developer', rawgDetails?.developers?.[0]?.name],
                ['Publisher', rawgDetails?.publishers?.[0]?.name],
                ['Genre',     game.genre],
              ].map(([label, value]) => value && (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Related Games — Swiper ─────────────────────── */}
        {related.length > 0 && (
          <div style={{ marginTop: 60 }} data-aos="fade-up">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 20 }}>
              🎮 Recommended Games
            </h3>
            <div className="swiper" id="vault-related-swiper">
              <div className="swiper-wrapper">
                {related.map(g => (
                  <div key={g.id} className="swiper-slide" style={{ paddingBottom: 20 }}>
                    <div
                      className="gv-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/global-game/${g.id}`)}
                    >
                      <img
                        src={g.background_image || 'https://placehold.co/260x140/111827/4361ee?text=GV'}
                        alt={g.name}
                        style={{ width: '100%', height: 120, objectFit: 'cover' }}
                      />
                      <div className="gv-card__body" style={{ padding: '10px 12px' }}>
                        <div className="gv-card__title" style={{ fontSize: '0.8rem' }}>{g.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
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

export default GameDetail;