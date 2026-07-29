import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';
import GVSpinner from '../components/GVSpinner';

function Wishlist() {
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const token    = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE_URL}/games/`, { headers: { 'Authorization': `Token ${token}` } })
      .then(r => r.json())
      .then(data => {
        setGames(Array.isArray(data) ? data.filter(g => g.is_wishlisted) : []);
        setLoading(false);
        setTimeout(() => window.AOS?.refresh(), 100);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleRemove = async (id) => {
    if (removingId === id) return;
    setRemovingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/games/${id}/toggle_wishlist/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      setGames(prev => prev.filter(g => g.id !== id));
      toast.info('Removed from Wishlist');
    } catch { toast.error("Couldn't remove. Try again."); }
    finally  { setRemovingId(null); }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>⭐</div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Login to see your Wishlist</h3>
      <button className="btn-gv-primary" onClick={() => navigate('/login')} style={{ padding: '10px 28px' }}>
        Go to Login
      </button>
    </div>
  );

  return (
    <div style={{ padding: '32px 28px 80px' }}>
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          ⭐ Your&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>Wishlist</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Games you're planning to get — starred from any page in GameVault.
        </p>
      </div>

      {loading ? (
        <GVSpinner label="Loading your wishlist…" />
      ) : games.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>☆</div>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Your wishlist is empty</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Tap ⭐ on any game in My Library or a game's detail page to save it here.
          </p>
          <button className="btn-gv-primary" onClick={() => navigate('/')} style={{ padding: '10px 24px' }}>
            Explore Games
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {games.map((game, idx) => {
            const imageSrc = game.image
              ? (game.image.startsWith('http') ? game.image : `${SERVER_BASE_URL}${game.image}`)
              : (game.image_url || 'https://placehold.co/300x200/111827/4361ee?text=No+Cover');

            return (
              <div className="col-lg-3 col-md-4 col-sm-6" key={game.id} data-aos="fade-up" data-aos-delay={Math.min(idx * 50, 200)}>
                {/* FIX 1.8: gv-wishlist-card class adds hover scale + purple glow */}
                <div className="gv-card gv-wishlist-card" style={{ height: '100%' }}>
                  <div style={{ position: 'relative', height: 165, cursor: 'pointer' }} onClick={() => navigate(`/game/${game.id}`)}>
                    <img src={imageSrc} alt={game.title} className="gv-card__image" style={{ height: '100%' }} loading="lazy" />
                    {/* Wishlist remove button — purple, no yellow */}
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(game.id); }}
                      disabled={removingId === game.id}
                      title="Remove from Wishlist"
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'rgba(168,85,247,0.8)',
                        border: '1px solid rgba(168,85,247,0.4)',
                        color: '#fff', fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {removingId === game.id ? '…' : '★'}
                    </button>
                  </div>
                  <div className="gv-card__body">
                    <div className="gv-card__title" style={{ cursor: 'pointer' }} onClick={() => navigate(`/game/${game.id}`)}>
                      {game.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {game.release_date ? game.release_date.substring(0, 4) : 'N/A'}
                      </span>
                      <span className="gv-badge gv-badge-dark">{game.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Wishlist;
