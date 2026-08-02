import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

// ── Buy/Sell Order Status Stepper ──────────────────────────
function OrderStepper({ order }) {
  const isRazorpay = order.payment_method === 'Razorpay';
  const steps = isRazorpay
    ? ['Pending', 'Escrowed', 'Shipped', 'Delivered']
    : ['COD_Confirmed', 'Shipped', 'Delivered'];
  const labels = {
    Pending: 'Ordered', Escrowed: 'Escrowed', Paid: 'Paid', COD_Confirmed: 'Confirmed',
    Shipped: 'Shipped', Delivered: 'Delivered',
  };
  const icons = {
    Pending: '🛒', Escrowed: '🛡️', Paid: '✅', COD_Confirmed: '📋',
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

// ── Rent Order Status Stepper ──────────────────────────────
function RentalOrderStepper({ order }) {
  const steps = ['Requested', 'Escrowed', 'Handed Over', 'In Use', 'Return Initiated', 'Returned & Verified'];
  const icons = {
    'Requested': '🛒', 'Escrowed': '🛡️', 'Handed Over': '🤝', 'In Use': '🎮',
    'Return Initiated': '📦', 'Returned & Verified': '✅',
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
              {s}
            </div>
            {i < steps.length - 1 && <div className={`step-line ${isDone ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Buy/Sell Order Card ────────────────────────────────────
function OrderCard({ order, mode, onUpdateStatus, onRaiseDispute }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = {
    Pending:       'gv-badge-dark',
    COD_Confirmed: 'gv-badge-amber',
    Paid:          'gv-badge-blue',
    Escrowed:      'gv-badge-blue',
    Shipped:       'gv-badge-cyan',
    Delivered:     'gv-badge-green',
    Cancelled:     'gv-badge-red',
  };

  const [otpInput, setOtpInput] = useState('');
  const canMarkShipped = mode === 'seller' && ['Paid', 'COD_Confirmed', 'Escrowed'].includes(order.status);

  return (
    <div className="glass-card" data-aos="fade-up" style={{ marginBottom: 14, padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
            {order.listing_title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {mode === 'buyer' ? `Sold by @${order.seller_username}` : `Purchased by @${order.buyer_username}`}
            {' · '}{new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-glow)' }}>
            ₹{order.amount}
          </span>
          <span className={`gv-badge ${statusStyle[order.status] || 'gv-badge-dark'}`}>{order.status}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {order.payment_method === 'COD' ? '💵 COD' : '💳 Online'}
          </span>
        </div>
      </div>

      {['Pending','COD_Confirmed','Paid','Escrowed','Shipped','Delivered'].includes(order.status) && (
        <OrderStepper order={order} />
      )}

      {mode === 'buyer' && order.status === 'Shipped' && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--accent-glow)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Handover OTP to share with seller:</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 2 }}>{order.handover_otp}</div>
        </div>
      )}

      {mode === 'seller' && order.status === 'Shipped' && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Enter Buyer's OTP to mark as Delivered:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" className="gv-form-input" style={{ width: 100 }} placeholder="XXXX" maxLength={4} value={otpInput} onChange={e => setOtpInput(e.target.value)} />
            <button className="btn-gv-primary" onClick={() => onUpdateStatus('buy', order.id, 'Delivered', otpInput)}>Verify OTP</button>
          </div>
        </div>
      )}

      {order.tracking_number && (
        <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--accent-glow)' }}>
          📦 Tracking: <strong>{order.tracking_number}</strong>
        </div>
      )}

      {mode === 'seller' && order.status === 'Shipped' && (
        <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Waiting for Buyer to confirm delivery.
        </div>
      )}
      {mode === 'buyer' && order.status === 'Delivered' && (
        <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--accent-glow)', fontStyle: 'italic' }}>
          Order Completed.
        </div>
      )}

      <button onClick={() => setExpanded(e => !e)} className="btn-gv-ghost" style={{ marginTop: 12, padding: '5px 14px', fontSize: '0.75rem' }}>
        {expanded ? '▲ Hide Details' : '▼ Order Details'}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }} data-aos="fade-up">
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

          {canMarkShipped && (
            <button onClick={() => onUpdateStatus('buy', order.id, 'Shipped')} className="btn-gv-primary btn-bounce" style={{ marginTop: 14, padding: '8px 22px', fontSize: '0.82rem' }}>
              🚚 Mark as Shipped
            </button>
          )}

          {['Escrowed', 'Shipped'].includes(order.status) && (
            <button onClick={() => onRaiseDispute('buy', order.id)} className="btn-gv-ghost" style={{ marginTop: 14, padding: '8px 22px', fontSize: '0.82rem', color: 'var(--accent-danger)', marginLeft: 8 }}>
              ⚠️ Raise Dispute
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rent Order Card ────────────────────────────────────────
function RentalOrderCard({ order, mode, onUpdateStatus, onRaiseDispute }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = {
    'Requested': 'gv-badge-amber',
    'Escrowed': 'gv-badge-blue',
    'Handed Over': 'gv-badge-blue',
    'In Use': 'gv-badge-cyan',
    'Return Initiated': 'gv-badge-amber',
    'Returned & Verified': 'gv-badge-green',
  };

  const [otpInput, setOtpInput] = useState('');
  const showOwnerHandOver = mode === 'owner' && order.status === 'Requested';
  const showRenterReceive = mode === 'renter' && order.status === 'Handed Over';
  const showRenterReturn = mode === 'renter' && order.status === 'In Use';
  const showOwnerVerify = mode === 'owner' && order.status === 'Return Initiated';

  return (
    <div className="glass-card" data-aos="fade-up" style={{ marginBottom: 14, padding: '18px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
            {order.listing_title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {mode === 'renter' ? `Rented from @${order.owner_username}` : `Lent to @${order.renter_username}`}
            {' · '}{new Date(order.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-glow)' }}>
            ₹{order.total_amount}
          </span>
          <span className={`gv-badge ${statusStyle[order.status] || 'gv-badge-dark'}`}>{order.status}</span>
        </div>
      </div>

      <RentalOrderStepper order={order} />

      {mode === 'renter' && order.status === 'Escrowed' && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--accent-glow)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Handover OTP to share with owner:</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 2 }}>{order.handover_otp}</div>
        </div>
      )}

      {mode === 'owner' && order.status === 'Escrowed' && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Enter Renter's OTP to hand over item:</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" className="gv-form-input" style={{ width: 100 }} placeholder="XXXX" maxLength={4} value={otpInput} onChange={e => setOtpInput(e.target.value)} />
            <button className="btn-gv-primary" onClick={() => onUpdateStatus('rent', order.id, 'Handed Over', otpInput)}>Verify OTP</button>
          </div>
        </div>
      )}

      <button onClick={() => setExpanded(e => !e)} className="btn-gv-ghost" style={{ marginTop: 12, padding: '5px 14px', fontSize: '0.75rem' }}>
        {expanded ? '▲ Hide Details' : '▼ Rental Details'}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }} data-aos="fade-up">
          <div className="row g-3">
            <div className="col-md-6">
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Security Deposit</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>₹{order.security_deposit}</div>
            </div>
            {order.phone_number && (
              <div className="col-md-6">
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Contact Phone</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{order.phone_number}</div>
              </div>
            )}
            {order.street_address && (
              <div className="col-12">
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Address</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                  {order.street_address}, {order.city}, {order.state} {order.zip_code}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            {showOwnerHandOver && (
              <button onClick={() => onUpdateStatus('rent', order.id, 'Handed Over')} className="btn-gv-primary btn-bounce" style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                🤝 Mark as Handed Over
              </button>
            )}
            {showRenterReceive && (
              <button onClick={() => onUpdateStatus('rent', order.id, 'In Use')} className="btn-gv-primary btn-bounce" style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                🎮 I have received it
              </button>
            )}
            {showRenterReturn && (
              <button onClick={() => onUpdateStatus('rent', order.id, 'Return Initiated')} className="btn-gv-primary btn-bounce" style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                📦 Initiate Return
              </button>
            )}
            {showOwnerVerify && (
              <button onClick={() => onUpdateStatus('rent', order.id, 'Returned & Verified')} className="btn-gv-primary btn-bounce" style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                ✅ Item Returned & Verified
              </button>
            )}

            {['Escrowed', 'Handed Over', 'In Use'].includes(order.status) && (
              <button onClick={() => onRaiseDispute('rent', order.id)} className="btn-gv-ghost" style={{ marginTop: 14, padding: '8px 22px', fontSize: '0.82rem', color: 'var(--accent-danger)' }}>
                ⚠️ Raise Dispute
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Main MyOrders Page ─────────────────────────────────────
function MyOrders() {
  const [tab, setTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [lentItems, setLentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_BASE_URL}/marketplace/my-orders/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/marketplace/my-sales/`,  { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/rentals/my-rentals/`,    { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
      fetch(`${API_BASE_URL}/rentals/my-lent-items/`, { headers: { 'Authorization': `Token ${token}` } }).then(r => r.json()),
    ]).then(([p, s, r, l]) => {
      setPurchases(Array.isArray(p) ? p : []);
      setSales(Array.isArray(s) ? s : []);
      setRentals(Array.isArray(r) ? r : []);
      setLentItems(Array.isArray(l) ? l : []);
      setLoading(false);
      setTimeout(() => window.AOS?.refresh(), 100);
    }).catch(() => setLoading(false));
  }, [token]);

  const handleUpdateStatus = async (type, orderId, newStatus, otp = null) => {
    try {
      if (otp) {
        // Handover OTP Verification flow
        const res = await fetch(`${API_BASE_URL}/marketplace/verify-handover/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
          body: JSON.stringify({ order_type: type === 'buy' ? 'sale' : 'rent', order_id: orderId, otp }),
        });
        if (res.ok) {
          toast.success('Handover Verified! Item delivered successfully.');
          // Refresh data since status is changed on backend
          window.location.reload();
          return;
        } else {
          const err = await res.json();
          toast.error(err.error || 'Invalid OTP.');
          return;
        }
      }

      // Normal status update flow
      const endpoint = type === 'buy' 
        ? `${API_BASE_URL}/marketplace/orders/${orderId}/update-status/`
        : `${API_BASE_URL}/rentals/orders/${orderId}/update-status/`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (type === 'buy') {
          setPurchases(prev => prev.map(o => o.id === orderId ? updated : o));
          setSales(prev => prev.map(o => o.id === orderId ? updated : o));
        } else {
          setRentals(prev => prev.map(o => o.id === orderId ? updated : o));
          setLentItems(prev => prev.map(o => o.id === orderId ? updated : o));
        }
        toast.success(`Status updated to ${newStatus}!`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Couldn't update order.");
      }
    } catch { 
      toast.error('Server error.'); 
    }
  };

  const handleRaiseDispute = async (type, orderId) => {
    const reason = window.prompt("Please briefly explain why you are raising a dispute for this item:");
    if (!reason) return;
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/raise/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ order_type: type === 'buy' ? 'sale' : 'rent', order_id: orderId, reason })
      });
      if (res.ok) {
        toast.success("Dispute raised. Our team will review it shortly.");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to raise dispute.");
      }
    } catch {
      toast.error("Server error while raising dispute.");
    }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>Login to view your dashboard</h3>
      <button className="btn-gv-primary" onClick={() => navigate('/login')} style={{ padding: '10px 28px' }}>
        Go to Login
      </button>
    </div>
  );

  const getListData = () => {
    if (tab === 'purchases') return { list: purchases, type: 'buy', mode: 'buyer', icon: '🛍️', empty: "You haven't bought anything yet" };
    if (tab === 'sales') return { list: sales, type: 'buy', mode: 'seller', icon: '💰', empty: "You haven't sold anything yet" };
    if (tab === 'rentals') return { list: rentals, type: 'rent', mode: 'renter', icon: '🎮', empty: "You haven't rented any games" };
    if (tab === 'lent') return { list: lentItems, type: 'rent', mode: 'owner', icon: '🤝', empty: "You aren't lending any games" };
  };

  const { list, type, mode, icon, empty } = getListData();

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          📦 My&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>Dashboard</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Your complete marketplace and rental history
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'purchases', label: `Purchases (${purchases.length})` },
          { key: 'sales',     label: `Sales (${sales.length})` },
          { key: 'rentals',   label: `Rented Items (${rentals.length})` },
          { key: 'lent',      label: `Lent Items (${lentItems.length})` },
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
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>{icon}</div>
          <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{empty}</h4>
          <Link to="/marketplace" className="btn-gv-primary" style={{ textDecoration: 'none', padding: '10px 24px', display: 'inline-block', marginTop: 8 }}>
            Browse Marketplace
          </Link>
        </div>
      ) : (
        list.map(order => 
          type === 'buy' ? (
            <OrderCard key={order.id} order={order} mode={mode} onUpdateStatus={handleUpdateStatus} onRaiseDispute={handleRaiseDispute} />
          ) : (
            <RentalOrderCard key={order.id} order={order} mode={mode} onUpdateStatus={handleUpdateStatus} onRaiseDispute={handleRaiseDispute} />
          )
        )
      )}
    </div>
  );
}

export default MyOrders;
