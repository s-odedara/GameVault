import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';

// ── Ship Modal ─────────────────────────────────────────────
function ShipModal({ order, onClose, onShipped }) {
  const [tracking, setTracking] = useState('');
  const [loading, setLoading]   = useState(false);
  const token = localStorage.getItem('token');

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/orders/${order.id}/update-status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ status: 'Shipped', tracking_number: tracking }),
      });
      if (res.ok) {
        toast.success('🚚 Order marked as Shipped!');
        onShipped();
      } else { toast.error("Couldn't update order status."); }
    } catch { toast.error('Server error.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="checkout-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="checkout-modal" style={{ maxWidth: 420 }}>
        <div className="checkout-modal-header">
          <div>
            <h5 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>🚚 Mark as Shipped</h5>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Order #{order.id} · {order.listing_title}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>
        <div className="checkout-modal-body">
          <label className="checkout-label">Tracking Number (optional)</label>
          <input
            type="text"
            className="checkout-input"
            placeholder="e.g. DT12345678IN"
            value={tracking}
            onChange={e => setTracking(e.target.value)}
          />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
            Buyer will be notified and can mark the order as Delivered once they receive the item.
          </p>
        </div>
        <div className="checkout-modal-footer" style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-gv-ghost" style={{ flex: 1, padding: '10px 0' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: '10px 0' }}>
            {loading ? 'Updating…' : '✓ Confirm Shipped'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── My Listings Page ───────────────────────────────────────
function MyListings() {
  const [tab, setTab]               = useState('listings'); // 'listings' | 'orders'
  const [listings, setListings]     = useState([]);
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [shipOrder, setShipOrder]   = useState(null); // order being shipped
  const token    = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_BASE_URL}/listings/?mine=true`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/marketplace/my-sales/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
    ]).then(([l, s]) => {
      setListings(Array.isArray(l) ? l : []);
      setSales(Array.isArray(s) ? s : []);
      setLoading(false);
      setTimeout(() => window.AOS?.refresh(), 100);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleRemove = async (listingId) => {
    if (removingId === listingId) return;
    if (!window.confirm('Remove this listing from the Marketplace?')) return;
    setRemovingId(listingId);
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${listingId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!res.ok) throw new Error();
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: 'Removed' } : l));
      toast.info('Listing removed.');
    } catch { toast.error("Couldn't remove listing."); }
    finally  { setRemovingId(null); }
  };

  const handleShipped = () => {
    const orderId = shipOrder.id;
    setSales(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Shipped' } : o));
    setShipOrder(null);
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>Login to manage your listings</h3>
      <button className="btn-gv-primary" onClick={() => navigate('/login')} style={{ padding: '10px 28px' }}>
        Go to Login
      </button>
    </div>
  );

  const statusColors = { Active: 'gv-badge-green', Sold: 'gv-badge-blue', Removed: 'gv-badge-dark' };
  const orderStatusColors = {
    Pending: 'gv-badge-dark', COD_Confirmed: 'gv-badge-amber', Paid: 'gv-badge-blue',
    Shipped: 'gv-badge-cyan', Delivered: 'gv-badge-green', Cancelled: 'gv-badge-red',
  };

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div data-aos="fade-down" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
            🏪 My&nbsp;<span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>Listings</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{listings.length} listings · {sales.length} orders received</p>
        </div>
        <Link to="/marketplace/sell" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '9px 20px', fontSize: '0.85rem' }}>
          + Sell an Item
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'listings', label: `My Listings (${listings.length})` },
          { key: 'orders',   label: `Incoming Orders (${sales.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={tab === key ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div className="spinner-border" style={{ color: 'var(--accent-glow)' }} />
        </div>
      ) : tab === 'listings' ? (
        /* ── Listings Grid ── */
        listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📦</div>
            <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>No listings yet</h4>
            <Link to="/marketplace/sell" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block', marginTop: 8 }}>
              Sell your first item
            </Link>
          </div>
        ) : (
          <div className="row g-4">
            {listings.map((item, idx) => {
              const img = item.image
                ? (item.image.startsWith('http') ? item.image : `${SERVER_BASE_URL}${item.image}`)
                : 'https://placehold.co/300x200/111827/4361ee?text=No+Photo';
              return (
                <div key={item.id} className="col-lg-3 col-md-4 col-sm-6" data-aos="fade-up" data-aos-delay={idx * 40}>
                  <div className="gv-card" style={{ height: '100%' }}>
                    <div style={{ height: 160, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                         onClick={() => navigate(`/marketplace/listing/${item.id}`)}>
                      <img src={img} alt={item.title} className="gv-card__image" />
                      <div style={{ position: 'absolute', top: 8, left: 8 }}>
                        <span className={`gv-badge ${statusColors[item.status] || 'gv-badge-dark'}`}>{item.status}</span>
                      </div>
                    </div>
                    <div className="gv-card__body">
                      <div className="gv-card__title">{item.title}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-glow)', marginBottom: 10 }}>
                        ₹{item.price}
                      </div>
                      {item.status === 'Active' && (
                        <button onClick={() => handleRemove(item.id)} disabled={removingId === item.id}
                          className="btn-gv-danger btn-bounce"
                          style={{ width: '100%', padding: '7px 0', fontSize: '0.78rem' }}>
                          {removingId === item.id ? 'Removing…' : '🗑 Remove Listing'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Seller's Incoming Orders ── */
        sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📬</div>
            <h4 style={{ fontFamily: 'var(--font-display)' }}>No orders yet</h4>
          </div>
        ) : (
          <div>
            {sales.map(order => {
              const canShip = ['Paid','COD_Confirmed'].includes(order.status);
              return (
                <div key={order.id} className="glass-card" data-aos="fade-up" style={{ marginBottom: 14, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
                        {order.listing_title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Buyer: @{order.buyer_username} · {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </div>
                      {order.phone_number && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          📞 {order.phone_number}
                          {order.street_address && ` · 📍 ${order.city}, ${order.state}`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-glow)' }}>
                        ₹{order.amount}
                      </span>
                      <span className={`gv-badge ${orderStatusColors[order.status] || 'gv-badge-dark'}`}>{order.status}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {order.payment_method === 'COD' ? '💵 COD' : '💳 Online'}
                      </span>
                      {canShip && (
                        <button
                          onClick={() => setShipOrder(order)}
                          className="btn-gv-primary btn-bounce"
                          style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                        >
                          🚚 Mark Shipped
                        </button>
                      )}
                    </div>
                  </div>
                  {order.tracking_number && (
                    <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--accent-glow)' }}>
                      📦 Tracking: <strong>{order.tracking_number}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Ship Modal */}
      {shipOrder && (
        <ShipModal order={shipOrder} onClose={() => setShipOrder(null)} onShipped={handleShipped} />
      )}
    </div>
  );
}

export default MyListings;
