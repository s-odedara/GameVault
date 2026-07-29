import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

// ── Order Status Stepper ───────────────────────────────────
function OrderStepper({ order }) {
  const isRazorpay = order.payment_method === 'Razorpay';

  const steps = isRazorpay
    ? ['Pending', 'Paid', 'Shipped', 'Delivered']
    : ['COD_Confirmed', 'Shipped', 'Delivered'];

  const labels = {
    Pending: 'Ordered', Paid: 'Paid', COD_Confirmed: 'Confirmed',
    Shipped: 'Shipped', Delivered: 'Delivered',
  };

  const icons = {
    Pending: '🛒', Paid: '✅', COD_Confirmed: '📋',
    Shipped: '🚚', Delivered: '🎉',
  };

  const currentIdx = steps.indexOf(order.status);

  return (
    <div className="order-stepper" style={{ margin: '16px 0 8px' }}>
      {steps.map((s, i) => {
        const isDone   = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={s} className="step-node" style={{ flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div className={`step-circle ${isDone ? 'done' : isActive ? 'active' : ''}`}>
              {isDone ? '✓' : icons[s]}
            </div>
            <div className={`step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>
              {labels[s] || s}
            </div>
            {i < steps.length - 1 && <div className={`step-line ${isDone ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────
function OrderCard({ order, mode, onMarkDelivered }) {
  const [expanded, setExpanded] = useState(false);

  const statusStyle = {
    Pending:       'gv-badge-dark',
    COD_Confirmed: 'gv-badge-amber',
    Paid:          'gv-badge-blue',
    Shipped:       'gv-badge-cyan',
    Delivered:     'gv-badge-green',
    Cancelled:     'gv-badge-red',
  };

  const canMarkDelivered = mode === 'buyer' && order.status === 'Shipped';

  return (
    <div className="glass-card" data-aos="fade-up" style={{ marginBottom: 14, padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem',
                        color: 'var(--text-primary)', marginBottom: 4 }}>
            {order.listing_title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {mode === 'buyer'
              ? `Sold by @${order.seller_username}`
              : `Purchased by @${order.buyer_username}`}
            {' · '}{new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-glow)' }}>
            ₹{order.amount}
          </span>
          <span className={`gv-badge ${statusStyle[order.status] || 'gv-badge-dark'}`}>
            {order.status}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {order.payment_method === 'COD' ? '💵 COD' : '💳 Online'}
          </span>
        </div>
      </div>

      {/* Delivery Stepper */}
      {['Pending','COD_Confirmed','Paid','Shipped','Delivered'].includes(order.status) && (
        <OrderStepper order={order} />
      )}

      {/* Tracking number */}
      {order.tracking_number && (
        <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--accent-glow)' }}>
          📦 Tracking: <strong>{order.tracking_number}</strong>
        </div>
      )}

      {/* Expand for details */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="btn-gv-ghost"
        style={{ marginTop: 12, padding: '5px 14px', fontSize: '0.75rem' }}
      >
        {expanded ? '▲ Hide Details' : '▼ Order Details'}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}
             data-aos="fade-up">
          <div className="row g-3">
            {order.phone_number && (
              <div className="col-md-4">
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Phone</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{order.phone_number}</div>
              </div>
            )}
            {order.email && (
              <div className="col-md-8">
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Email</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{order.email}</div>
              </div>
            )}
            {order.street_address && (
              <div className="col-12">
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Shipping Address</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                  {order.street_address}, {order.city}, {order.state} {order.zip_code}
                </div>
              </div>
            )}
          </div>

          {/* Mark as Delivered (buyer) */}
          {canMarkDelivered && (
            <button
              onClick={() => onMarkDelivered(order.id)}
              className="btn-gv-primary btn-bounce"
              style={{ marginTop: 14, padding: '8px 22px', fontSize: '0.82rem' }}
            >
              🎉 Mark as Received / Delivered
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main MyOrders Page ─────────────────────────────────────
function MyOrders() {
  const [tab, setTab]           = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const token    = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_BASE_URL}/marketplace/my-orders/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/marketplace/my-sales/`,  { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
    ]).then(([p, s]) => {
      setPurchases(Array.isArray(p) ? p : []);
      setSales(Array.isArray(s) ? s : []);
      setLoading(false);
      setTimeout(() => window.AOS?.refresh(), 100);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleMarkDelivered = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/marketplace/orders/${orderId}/update-status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ status: 'Delivered' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPurchases(prev => prev.map(o => o.id === orderId ? updated : o));
        toast.success('🎉 Order marked as Delivered!');
      } else { toast.error("Couldn't update order."); }
    } catch { toast.error('Server error.'); }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Login to view your orders</h3>
      <button className="btn-gv-primary" onClick={() => navigate('/login')} style={{ padding: '10px 28px' }}>
        Go to Login
      </button>
    </div>
  );

  const list = tab === 'purchases' ? purchases : sales;

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          📦 My&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>
            Orders
          </span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Your marketplace purchase and sales history
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'purchases', label: `Purchases (${purchases.length})` },
          { key: 'sales',     label: `Sales (${sales.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={tab === key ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div className="spinner-border" style={{ color: 'var(--accent-glow)' }} />
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>
            {tab === 'purchases' ? '🛍️' : '💰'}
          </div>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
            {tab === 'purchases' ? "You haven't bought anything yet" : "You haven't sold anything yet"}
          </h4>
          <Link to="/marketplace" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block', marginTop: 8 }}>
            Browse Marketplace
          </Link>
        </div>
      ) : (
        list.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            mode={tab === 'purchases' ? 'buyer' : 'seller'}
            onMarkDelivered={handleMarkDelivered}
          />
        ))
      )}
    </div>
  );
}

export default MyOrders;
