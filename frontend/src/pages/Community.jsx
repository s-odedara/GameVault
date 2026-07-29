import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';
import GVSpinner from '../components/GVSpinner';

// ── Time-ago helper ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Tag badge ───────────────────────────────────────────────────────────────
function TagBadge({ tag }) {
  const colors = {
    Discussion: 'gv-badge-blue', News: 'gv-badge-cyan', Review: 'gv-badge-green',
    Question: 'gv-badge-purple', Meme: 'gv-badge-amber', Other: 'gv-badge-dark',
  };
  return <span className={`gv-badge ${colors[tag] || 'gv-badge-dark'}`}>{tag}</span>;
}

// ── Trending sidebar panel ──────────────────────────────────────────────────
function TrendingPanel() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/rawg/games?ordering=-added&page_size=6`)
      .then(r => r.json())
      .then(d => { setTrending(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card" style={{ padding: '18px 18px', position: 'sticky', top: 80 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.82rem',
                    textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-glow)',
                    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        🔥 Trending in Gaming
      </div>
      {loading ? <GVSpinner size="sm" label="" center={false} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trending.map((g, i) => (
            <Link key={g.id} to={`/global-game/${g.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center',
                            padding: '8px 8px', borderRadius: 'var(--radius-md)',
                            transition: 'background var(--transition-fast)',
                            cursor: 'pointer' }}
                   onMouseEnter={e => e.currentTarget.style.background = 'rgba(67,97,238,0.1)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', width: 16 }}>
                  {i + 1}
                </div>
                <img
                  src={g.background_image || 'https://placehold.co/40x28/111827/4361ee?text=GV'}
                  alt={g.name}
                  style={{ width: 42, height: 30, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    ⭐ {g.rating} · {g.released?.split('-')[0] || 'TBA'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="divider" style={{ margin: '14px 0 10px' }} />
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Live data powered by <span style={{ color: 'var(--accent-primary)' }}>RAWG.io</span>
      </div>
    </div>
  );
}

// ── Community Page ──────────────────────────────────────────────────────────
function Community() {
  const [posts, setPosts]           = useState([]);
  const [comments, setComments]     = useState([]);
  const [newPost, setNewPost]       = useState({ title: '', content: '', tags: 'Discussion' });
  const [commentInputs, setCommentInputs] = useState({});
  const [followingIds, setFollowingIds]   = useState([]);
  const [followBusyId, setFollowBusyId]   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [sortBy, setSortBy]               = useState('new');
  const [composerOpen, setComposerOpen]   = useState(false);
  const token    = localStorage.getItem('token');
  const myUserId = localStorage.getItem('user_id');

  const TAGS = ['Discussion', 'News', 'Review', 'Question', 'Meme', 'Other'];

  useEffect(() => {
    const postsUrl = `${API_BASE_URL}/posts/?sort=${sortBy}`;
    Promise.all([
      fetch(postsUrl).then(r => r.json()),
      fetch(`${API_BASE_URL}/comments/`).then(r => r.json()),
      token
        ? fetch(`${API_BASE_URL}/follows/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([postsData, commentsData, followData]) => {
      setPosts(Array.isArray(postsData) ? postsData : []);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setFollowingIds(Array.isArray(followData) ? followData.map(f => f.id) : []);
      setLoading(false);
      setTimeout(() => window.AOS?.refresh(), 100);
    }).catch(() => setLoading(false));
  }, [token, sortBy]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!token) { toast.warning('Please login to post!'); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/posts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ title: newPost.title, content: newPost.content, tags: newPost.tags }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(prev => [data, ...prev]);
      setNewPost({ title: '', content: '', tags: 'Discussion' });
      setComposerOpen(false);
      toast.success('Post published! 🎉');
    } catch { toast.error("Couldn't publish post."); }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    if (!commentInputs[postId]?.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ post: postId, content: commentInputs[postId] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(prev => [...prev, data]);
      setCommentInputs(p => ({ ...p, [postId]: '' }));
    } catch { toast.error(!token ? 'Please login to comment!' : "Couldn't post comment."); }
  };

  const handleUpvote = async (postId) => {
    if (!token) { toast.warning('Login to upvote!'); return; }
    try {
      const res  = await fetch(`${API_BASE_URL}/posts/${postId}/upvote/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` },
      });
      const data = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: data.upvotes } : p));
    } catch { /* silent */ }
  };

  const handleToggleFollow = async (authorId) => {
    if (!token) { toast.warning('Please login to follow people!'); return; }
    if (followBusyId === authorId) return;
    setFollowBusyId(authorId);
    try {
      const res  = await fetch(`${API_BASE_URL}/follows/${authorId}/toggle/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFollowingIds(prev =>
        data.following ? [...prev, authorId] : prev.filter(id => id !== authorId)
      );
      toast.success(data.following ? `Following @${data.username}` : `Unfollowed @${data.username}`);
    } catch (err) {
      toast.error(err.message === "You can't follow yourself" ? "You can't follow yourself 🙂" : "Couldn't update follow status.");
    } finally { setFollowBusyId(null); }
  };

  return (
    <div style={{ padding: '28px 24px 80px' }}>
      <div className="row g-4">
        {/* ── Main Feed ── */}
        <div className="col-lg-8">
          {/* Header */}
          <div data-aos="fade-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, margin: 0 }}>
                💬 Community&nbsp;
                <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.35)' }}>Hub</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0' }}>
                Discuss, review, and connect with fellow gamers
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {token && (
                <Link to="/following" className="btn-gv-outline" style={{ textDecoration: 'none', padding: '6px 16px', fontSize: '0.8rem' }}>
                  👥 Following
                </Link>
              )}
              {token && (
                <button onClick={() => setComposerOpen(p => !p)} className="btn-gv-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                  {composerOpen ? '✕ Close' : '+ New Post'}
                </button>
              )}
            </div>
          </div>

          {/* Composer */}
          {composerOpen && token && (
            <div className="glass-card" data-aos="fade-down" style={{ padding: '20px 22px', marginBottom: 20 }}>
              <h5 style={{ fontFamily: 'var(--font-display)', marginBottom: 14, color: 'var(--text-primary)' }}>
                ✍️ Share something with the community
              </h5>
              <form onSubmit={handlePostSubmit}>
                <input
                  type="text"
                  className="gv-form-input"
                  placeholder="Post title…"
                  value={newPost.title}
                  onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  required style={{ marginBottom: 10 }}
                />
                <textarea
                  className="gv-form-input"
                  rows={4} placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                  required style={{ resize: 'none', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {TAGS.map(t => (
                      <button key={t} type="button"
                        onClick={() => setNewPost(p => ({ ...p, tags: t }))}
                        className={newPost.tags === t ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
                        style={{ padding: '4px 12px', fontSize: '0.74rem' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="btn-gv-primary btn-bounce" style={{ padding: '8px 24px' }}>
                    🚀 Post
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sort Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['new', 'top'].map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={sortBy === s ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
                style={{ padding: '5px 16px', fontSize: '0.78rem', textTransform: 'capitalize' }}>
                {s === 'new' ? '🆕 New' : '🔥 Top'}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              {posts.length} post{posts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Login CTA */}
          {!token && (
            <div className="glass-card" data-aos="fade-up" style={{ padding: '20px', marginBottom: 20, textAlign: 'center', border: '1px solid var(--border-glow)' }}>
              <h5 style={{ fontFamily: 'var(--font-display)', marginBottom: 10 }}>Join the discussion 🎮</h5>
              <Link to="/login" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '9px 28px' }}>
                Login to Post
              </Link>
            </div>
          )}

          {/* Posts Feed */}
          {loading ? (
            <GVSpinner label="Loading community posts…" />
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
              <h4 style={{ fontFamily: 'var(--font-display)' }}>No posts yet — be the first!</h4>
            </div>
          ) : (
            posts.map((post, idx) => {
              const isOwnPost  = myUserId && String(post.user) === String(myUserId);
              const isFollowing= followingIds.includes(post.user);
              const postComments = comments.filter(c => c.post === post.id);

              return (
                <div key={post.id} className="glass-card" data-aos="fade-up" data-aos-delay={Math.min(idx * 30, 150)}
                     style={{ marginBottom: 14, padding: '18px 20px' }}>

                  {/* Vote column + content */}
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Upvote column */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 38 }}>
                      <button
                        onClick={() => handleUpvote(post.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem',
                                 transition: 'transform 0.15s', padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Upvote"
                      >▲</button>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-glow)' }}>
                        {post.upvotes}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {post.tags && <TagBadge tag={post.tags} />}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Posted by <strong style={{ color: 'var(--text-secondary)' }}>@{post.username}</strong>
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          · {timeAgo(post.created_at)}
                        </span>
                        {token && !isOwnPost && (
                          <button
                            onClick={() => handleToggleFollow(post.user)}
                            disabled={followBusyId === post.user}
                            style={{
                              background: isFollowing ? 'rgba(100,116,139,0.15)' : 'rgba(67,97,238,0.15)',
                              border: `1px solid ${isFollowing ? 'rgba(100,116,139,0.4)' : 'rgba(67,97,238,0.4)'}`,
                              color: isFollowing ? 'var(--text-muted)' : 'var(--accent-primary)',
                              borderRadius: 50, padding: '2px 10px', fontSize: '0.68rem',
                              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            {followBusyId === post.user ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
                          </button>
                        )}
                      </div>

                      {/* Title & content */}
                      <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', marginBottom: 6, color: 'var(--text-primary)' }}>
                        {post.title}
                      </h5>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 14, whiteSpace: 'pre-wrap' }}>
                        {post.content}
                      </p>

                      {/* Action bar */}
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                        <span>💬 {postComments.length} {postComments.length === 1 ? 'reply' : 'replies'}</span>
                      </div>

                      {/* Comments */}
                      {postComments.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          {postComments.map(c => (
                            <div key={c.id} style={{ padding: '8px 12px', marginBottom: 6, borderRadius: 'var(--radius-md)',
                                                      background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid var(--border-subtle)' }}>
                              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.78rem', marginRight: 6 }}>
                                @{c.username}
                              </span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{c.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment input */}
                      {token && (
                        <form onSubmit={e => handleCommentSubmit(e, post.id)} style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            className="gv-form-input"
                            placeholder="Write a reply…"
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs(p => ({ ...p, [post.id]: e.target.value }))}
                            style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem' }}
                          />
                          <button type="submit" className="btn-gv-ghost btn-bounce" style={{ padding: '7px 16px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            Reply
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Trending Sidebar ── */}
        <div className="col-lg-4 d-none d-lg-block" data-aos="fade-left">
          <TrendingPanel />
        </div>
      </div>
    </div>
  );
}

export default Community;
