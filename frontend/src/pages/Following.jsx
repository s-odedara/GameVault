import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';
import GVSpinner from '../components/GVSpinner';

function Following() {
  const [following, setFollowing] = useState([]);
  const [allPosts, setAllPosts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [unfollowingId, setUnfollowingId] = useState(null);
  const token    = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_BASE_URL}/follows/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/posts/`).then(r => r.json()),
    ])
      .then(([followData, postsData]) => {
        setFollowing(Array.isArray(followData) ? followData : []);
        setAllPosts(Array.isArray(postsData) ? postsData : []);
        setLoading(false);
        setTimeout(() => window.AOS?.refresh(), 100);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const handleUnfollow = async (userId, username) => {
    if (unfollowingId === userId) return;
    setUnfollowingId(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/follows/${userId}/toggle/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      setFollowing(prev => prev.filter(u => u.id !== userId));
      toast.info(`Unfollowed @${username}`);
    } catch { toast.error("Couldn't unfollow. Try again."); }
    finally  { setUnfollowingId(null); }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>👥</div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>
        Login to see who you follow
      </h3>
      <button className="btn-gv-primary" onClick={() => navigate('/login')}
              style={{ padding: '10px 28px' }}>
        Go to Login
      </button>
    </div>
  );

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 900, margin: '0 auto' }}>
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          👥 People You&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>
            Follow
          </span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Head to the{' '}
          <Link to="/community" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
            Community Hub
          </Link>{' '}
          and click "+ Follow" on any post to add someone here.
        </p>
      </div>

      {loading ? (
        <GVSpinner label="Loading your network…" />
      ) : following.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>👥</div>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
            You're not following anyone yet
          </h4>
          <Link to="/community" className="btn-gv-primary"
                style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block', marginTop: 8 }}>
            Explore Community
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {following.map((user, idx) => {
            const userPosts = allPosts.filter(p => p.user === user.id);
            const letter    = user.username.charAt(0).toUpperCase();
            return (
              <div key={user.id} className="col-md-6" data-aos="fade-up" data-aos-delay={idx * 50}>
                <div className="glass-card" style={{ padding: '18px 20px', height: '100%' }}>
                  {/* User header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="gv-sidebar-avatar" style={{ width: 42, height: 42, fontSize: '1.1rem' }}>
                        {letter}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                          @{user.username}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {userPosts.length} post{userPosts.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollow(user.id, user.username)}
                      disabled={unfollowingId === user.id}
                      className="btn-gv-danger btn-bounce"
                      style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                    >
                      {unfollowingId === user.id ? '…' : 'Unfollow'}
                    </button>
                  </div>

                  {/* Recent posts preview */}
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase',
                                letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>
                    Recent Posts
                  </div>
                  {userPosts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No posts yet.</p>
                  ) : (
                    userPosts.slice(0, 3).map(post => (
                      <div key={post.id} style={{ padding: '8px 12px', marginBottom: 6, borderRadius: 'var(--radius-md)',
                                                    background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                          {post.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden',
                                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Following;
