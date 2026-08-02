import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';
import GVSpinner from '../components/GVSpinner';

// ─── OTP Input (6 split boxes auto-advance) ───────────────────────────────────
function OTPInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleKey = (i, e) => {
    const val = e.target.value.replace(/\D/, '');
    if (!val) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (i < 5) refs[i + 1].current?.focus();
    else {
      const code = next.join('');
      if (code.length === 6) onComplete(code);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  return (
    <div className="otp-input-row">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          className="otp-digit"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleKey(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ─── OTP Timer ────────────────────────────────────────────────────────────────
function OTPTimer({ startedAt, onExpire }) {
  const [remaining, setRemaining] = useState(300); // 5 min = 300s
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left    = Math.max(0, 300 - elapsed);
      setRemaining(left);
      if (left === 0) { clearInterval(interval); onExpire?.(); }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, onExpire]);

  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  return (
    <div className={`otp-timer${remaining === 0 ? ' expired' : ''}`}>
      {remaining > 0 ? `OTP expires in ${m}:${s}` : '⚠️ OTP expired — please resend'}
    </div>
  );
}

// ─── Rent Checkout Modal ────────────────────────────────────────────────────────
function RentalCheckoutModal({ listing, onClose, onSuccess }) {
  const token = localStorage.getItem('token');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    phone_number: '', email: '', street_address: '', city: '', state: '', zip_code: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePlaceOrder = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      const res = await fetch(`${API_BASE_URL}/rentals/checkout/${listing.id}/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rental request failed');
      
      // ── Razorpay popup for Rentals ──
      if (!window.Razorpay) { toast.error('Razorpay script not loaded.'); setBusy(false); return; }
      const rzp = new window.Razorpay({
        key:          data.key_id,
        amount:       data.amount,
        currency:     'INR',
        name:         'GameVault Rentals',
        description:  data.listing_title,
        order_id:     data.razorpay_order_id,
        prefill: { contact: form.phone_number, email: form.email },
        theme: { color: '#4361ee' },
        handler: async (resp) => {
          await fetch(`${API_BASE_URL}/rentals/verify-payment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
            body: JSON.stringify({
              order_id: data.order_id,
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
            }),
          });
          toast.success('💳 Payment verified! Item Escrowed.');
          onSuccess();
        },
      });
      rzp.open();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="checkout-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="checkout-modal" style={{ maxWidth: 500, width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>🎮 Rent Item</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{listing.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        {step === 1 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 12 }}>Contact Details</div>
            <div style={{ marginBottom: 12 }}>
              <label className="checkout-label">Phone (10 digits) *</label>
              <input type="tel" className="checkout-input" placeholder="9876543210" maxLength={10} value={form.phone_number} onChange={e => set('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="checkout-label">Email *</label>
              <input type="email" className="checkout-input" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <button className="btn-gv-primary btn-bounce" style={{ width: '100%', padding: 12 }} 
                    disabled={!/^\d{10}$/.test(form.phone_number) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)} 
                    onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 12 }}>Delivery Address</div>
            <div style={{ marginBottom: 12 }}><label className="checkout-label">Street Address *</label><input className="checkout-input" value={form.street_address} onChange={e => set('street_address', e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, marginBottom: 12 }}><label className="checkout-label">City *</label><input className="checkout-input" value={form.city} onChange={e => set('city', e.target.value)} /></div>
              <div style={{ flex: 1, marginBottom: 12 }}><label className="checkout-label">State *</label><input className="checkout-input" value={form.state} onChange={e => set('state', e.target.value)} /></div>
              <div style={{ flex: 1, marginBottom: 12 }}><label className="checkout-label">ZIP *</label><input className="checkout-input" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: 11 }} disabled={!form.street_address || !form.city || !form.state || !form.zip_code} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Confirm Request</h4>
            </div>
            <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Rent per week</span>
                <span style={{ color: 'var(--text-primary)' }}>₹{listing.rental_charges}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Security Deposit</span>
                <span style={{ color: 'var(--text-primary)' }}>₹{listing.security_deposit}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(2)}>← Back</button>
              <button className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: 12 }} disabled={busy} onClick={handlePlaceOrder}>{busy ? '⏳ Processing…' : '✅ Request Rental'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Checkout Modal ───────────────────────────────────────────────────────────
// 5 steps: 1=Payment Method, 2=Contact+OTP, 3=Shipping, 4=ID Verify, 5=Confirm
function CheckoutModal({ listing, onClose, onSuccess }) {
  const token     = localStorage.getItem('token');
  const [step, setStep]               = useState(1);
  const [busy, setBusy]               = useState(false);
  const [otpSent, setOtpSent]         = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSentAt, setOtpSentAt]     = useState(null);
  const [otpExpired, setOtpExpired]   = useState(false);

  const [form, setForm] = useState({
    payment_method: 'Razorpay',
    phone_number:   '',
    email:          '',
    street_address: '',
    city: '', state: '', zip_code: '',
    gov_id_number: '',
    gov_id_doc: null,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Phone validation: exactly 10 digits
  const isValidPhone = (p) => /^\d{10}$/.test(p.trim());

  // ── Step 2: Send OTP via Twilio ────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!isValidPhone(form.phone_number)) {
      toast.error('Mobile number must be exactly 10 digits. No spaces, dashes, or country code.');
      return;
    }
    setBusy(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/marketplace/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ phone_number: form.phone_number.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send OTP');
      setOtpSent(true);
      setOtpSentAt(Date.now());
      setOtpExpired(false);
      toast.success(
        data.simulated_otp
          ? `[DEV] Twilio not configured. OTP: ${data.simulated_otp}`
          : '📱 OTP sent to your mobile number!'
      );
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOTP = async (code) => {
    setBusy(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/marketplace/verify-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ phone_number: form.phone_number.trim(), otp_code: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setOtpVerified(true);
      toast.success('✅ Phone verified! Proceeding to shipping details.');
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  // ── Step 5: Place Order ────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== '') fd.append(k, v);
      });

      const res  = await fetch(`${API_BASE_URL}/marketplace/checkout/${listing.id}/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Object.values(data)[0] || 'Checkout failed');

      if (data.payment_method === 'COD') {
        toast.success('🎉 Order placed! Pay on delivery.');
        onSuccess();
        return;
      }

      // ── Razorpay popup ─────────────────────────────────────────────────────
      if (!window.Razorpay) { toast.error('Razorpay script not loaded.'); setBusy(false); return; }
      const rzp = new window.Razorpay({
        key:          data.key_id,
        amount:       data.amount,
        currency:     'INR',
        name:         'GameVault Marketplace',
        description:  listing.title,
        order_id:     data.razorpay_order_id,
        prefill: { contact: form.phone_number, email: form.email },
        theme: { color: '#4361ee' },
        handler: async (resp) => {
          await fetch(`${API_BASE_URL}/marketplace/verify-payment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
            body: JSON.stringify({
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
            }),
          });
          toast.success('💳 Payment verified! Order placed.');
          onSuccess();
        },
      });
      rzp.open();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  // ── Step labels ────────────────────────────────────────────────────────────
  const stepLabels = ['Payment', 'Verify Phone', 'Shipping', 'ID', 'Confirm'];

  return (
    <div className="checkout-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="checkout-modal" style={{ maxWidth: 500, width: '95%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem' }}>
              🛒 Checkout
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {listing.title} · ₹{listing.price}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
          {stepLabels.map((label, i) => {
            const s = i + 1;
            const done   = s < step;
            const active = s === step;
            return (
              <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 4, borderRadius: 2, marginBottom: 4,
                  background: done ? 'var(--accent-glow)' : active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  transition: 'background 0.3s',
                }} />
                <div style={{ fontSize: '0.6rem', color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Payment Method ────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 12 }}>How would you like to pay?</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {['Razorpay', 'COD'].map(m => (
                <button key={m} type="button"
                  onClick={() => set('payment_method', m)}
                  className={form.payment_method === m ? 'btn-gv-primary' : 'btn-gv-ghost'}
                  style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '1.4rem' }}>{m === 'Razorpay' ? '💳' : '🚚'}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m === 'Razorpay' ? 'Online Payment' : 'Cash on Delivery'}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>{m === 'Razorpay' ? 'UPI, Card, Net Banking' : 'Pay when item arrives'}</span>
                </button>
              ))}
            </div>
            <button className="btn-gv-primary btn-bounce" style={{ width: '100%', padding: 12 }}
                    onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Contact + OTP Verification ───────────────────────── */}
        {step === 2 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 12 }}>
              📱 Phone Verification (OTP via SMS)
            </div>

            {/* Phone Input */}
            <div style={{ marginBottom: 10 }}>
              <label className="checkout-label">Mobile Number *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  className="checkout-input"
                  placeholder="10-digit number (e.g., 9876543210)"
                  value={form.phone_number}
                  onChange={e => {
                    // Only allow digits, max 10
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    set('phone_number', v);
                    setOtpSent(false);    // reset OTP state on phone change
                    setOtpVerified(false);
                  }}
                  maxLength={10}
                  style={{ flex: 1 }}
                  disabled={otpVerified}
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={busy || otpVerified || !isValidPhone(form.phone_number)}
                  className={otpSent ? 'btn-gv-ghost' : 'btn-gv-primary'}
                  style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                >
                  {busy ? '⏳' : otpSent ? '↩ Resend' : '📤 Send OTP'}
                </button>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Exactly 10 digits · no spaces · no +91 prefix
              </div>
            </div>

            {/* OTP Entry */}
            {otpSent && !otpVerified && (
              <div style={{ margin: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Enter the 6-digit OTP sent to <strong>+91 {form.phone_number}</strong>
                </div>
                <OTPInput onComplete={handleVerifyOTP} />
                <OTPTimer startedAt={otpSentAt} onExpire={() => setOtpExpired(true)} />
              </div>
            )}

            {/* Verified badge */}
            {otpVerified && (
              <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12,
                            display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <div>
                  <strong style={{ color: '#22c55e' }}>Phone Verified!</strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+91 {form.phone_number} confirmed</div>
                </div>
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label className="checkout-label">Email *</label>
              <input type="email" className="checkout-input" placeholder="you@email.com"
                     value={form.email} onChange={e => set('email', e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: 11 }}
                      disabled={!otpVerified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)}
                      onClick={() => setStep(3)}>
                {!otpVerified ? '🔒 Verify Phone to Continue' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Shipping Address ──────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 12 }}>🏠 Shipping Address</div>
            {[
              { key: 'street_address', label: 'Street Address *', placeholder: '123 Main Road, Apt 4B' },
              { key: 'city',           label: 'City *',           placeholder: 'Mumbai' },
              { key: 'state',          label: 'State *',          placeholder: 'Maharashtra' },
              { key: 'zip_code',       label: 'PIN Code *',       placeholder: '400001' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label className="checkout-label">{f.label}</label>
                <input type="text" className="checkout-input" placeholder={f.placeholder}
                       value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(2)}>← Back</button>
              <button className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: 11 }}
                      disabled={!form.street_address || !form.city || !form.state || !form.zip_code}
                      onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: ID Verification ───────────────────────────────────── */}
        {step === 4 && (
          <div>
            <div className="checkout-label" style={{ marginBottom: 6 }}>🪪 Identity Verification (PAN Card)</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Required for high-value transactions. Only PAN Card is accepted.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label className="checkout-label">PAN Number *</label>
              <input type="text" className="checkout-input" placeholder="ABCDE1234F"
                     value={form.gov_id_number} onChange={e => set('gov_id_number', e.target.value.toUpperCase())} />
              {!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.gov_id_number) && form.gov_id_number.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-glow)', marginTop: 4 }}>
                  Invalid PAN format. Must be 5 letters, 4 digits, 1 letter.
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="checkout-label">Upload PAN Document *</label>
              <input type="file" accept="image/*,.pdf" className="checkout-input"
                     style={{ padding: '8px 12px' }}
                     onChange={e => set('gov_id_doc', e.target.files[0])} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(3)}>← Back</button>
              <button className="btn-gv-primary btn-bounce" style={{ flex: 2, padding: 11 }} 
                      disabled={!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.gov_id_number) || !form.gov_id_doc}
                      onClick={() => setStep(5)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Order Confirmation ────────────────────────────────── */}
        {step === 5 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
                {form.payment_method === 'COD' ? '🚚' : '💳'}
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Confirm Your Order</h4>
            </div>

            <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 16 }}>
              {[
                ['Item',    listing.title],
                ['Price',   `₹${listing.price}`],
                ['Payment', form.payment_method === 'COD' ? 'Cash on Delivery' : 'Razorpay (Online)'],
                ['Phone',   `+91 ${form.phone_number} ✅`],
                ['Deliver to', `${form.street_address}, ${form.city}, ${form.state} — ${form.zip_code}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                                      borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{k}</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gv-ghost btn-bounce" style={{ flex: 1, padding: 11 }} onClick={() => setStep(4)}>← Back</button>
              <button
                className="btn-gv-primary btn-bounce"
                style={{ flex: 2, padding: 12, fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                disabled={busy}
                onClick={handlePlaceOrder}
              >
                {busy ? '⏳ Processing…' : form.payment_method === 'COD' ? '✅ Confirm COD Order' : '💳 Pay Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ListingDetail Page ──────────────────────────────────────────────────
function ListingDetail() {
  const { id }       = useParams();
  const location     = useLocation();
  const navigate     = useNavigate();
  const token        = localStorage.getItem('token');
  const [listing, setListing]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal]= useState(false);
  const [orderDone, setOrderDone]= useState(false);

  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'buy';
  const isRent = type === 'rent';

  useEffect(() => {
    const endpoint = isRent ? `${API_BASE_URL}/rentals/${id}/` : `${API_BASE_URL}/listings/${id}/`;
    fetch(endpoint)
      .then(r => r.json())
      .then(d => { setListing(d); setLoading(false); setTimeout(() => window.AOS?.refresh(), 100); })
      .catch(() => setLoading(false));
  }, [id, isRent]);

  const img = listing?.image
    ? (listing.image.startsWith('http') ? listing.image : `${SERVER_BASE_URL}${listing.image}`)
    : 'https://placehold.co/600x400/111827/4361ee?text=No+Photo';

  if (loading) return <div style={{ padding: 40 }}><GVSpinner label="Loading listing…" /></div>;
  if (!listing) return <div style={{ padding: 40, textAlign: 'center' }}>Listing not found.</div>;

  const conditionCls = { New: 'gv-badge-green', 'Like New': 'gv-badge-cyan', Good: 'gv-badge-blue', Fair: 'gv-badge-amber' };

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 900, margin: '0 auto' }}>
      <button className="btn-gv-ghost btn-bounce" onClick={() => navigate('/marketplace')}
              style={{ marginBottom: 20, fontSize: '0.82rem', padding: '6px 14px' }}>
        ← Back to Marketplace
      </button>

      <div className="row g-4" data-aos="fade-up">
        {/* Image */}
        <div className="col-md-5">
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
            <img src={img} alt={listing.title} style={{ width: '100%', height: 320, objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span className={`gv-badge ${conditionCls[listing.condition] || 'gv-badge-dark'}`}>{listing.condition}</span>
            <span className="gv-badge gv-badge-dark">{listing.category}</span>
            <span className={`gv-badge ${listing.status === 'Active' || listing.status === 'Available' ? 'gv-badge-green' : 'gv-badge-amber'}`}>
              {listing.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="col-md-7">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900, marginBottom: 8 }}>
            {listing.title}
          </h1>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900,
                        color: 'var(--accent-glow)', textShadow: '0 0 16px rgba(0,212,255,0.4)', marginBottom: 16 }}>
            ₹{isRent ? listing.rental_charges : listing.price}
            {isRent && <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> / week</span>}
          </div>
          
          {isRent && (
            <div style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: 16 }}>
              Security Deposit: ₹{listing.security_deposit}
            </div>
          )}

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
            {listing.description}
          </p>

          <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 20 }}>
            {[
              [isRent ? 'Owner' : 'Seller', `@${listing.owner_username || listing.seller_username}`],
              ['Location', listing.location || 'Not specified'],
              ['Listed on', new Date(listing.created_at).toLocaleDateString('en-IN')],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                                    borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{k}</span>
                <span style={{ color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>

          {orderDone ? (
            <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: 'var(--radius-md)', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🎉</div>
              <h5 style={{ fontFamily: 'var(--font-display)', color: '#22c55e' }}>Request Sent!</h5>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Check My Dashboard for updates.</p>
              <button className="btn-gv-ghost btn-bounce" style={{ marginTop: 10, padding: '8px 20px' }}
                      onClick={() => navigate('/marketplace/orders')}>
                View My Dashboard
              </button>
            </div>
          ) : (listing.status !== 'Active' && listing.status !== 'Available') ? (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 'var(--radius-md)', padding: '14px 18px', textAlign: 'center', fontSize: '0.9rem' }}>
              This listing is no longer available.
            </div>
          ) : !token ? (
            <button className="btn-gv-primary btn-bounce" style={{ width: '100%', padding: 14, fontSize: '1rem' }}
                    onClick={() => navigate('/login')}>
              Login to {isRent ? 'Rent' : 'Buy'}
            </button>
          ) : (
            <button className="btn-gv-primary btn-bounce" style={{ width: '100%', padding: 14, fontSize: '1rem',
                             fontFamily: 'var(--font-display)', fontWeight: 700 }}
                    onClick={() => setShowModal(true)}>
              🛒 {isRent ? 'Request Rental' : 'Buy Now'}
            </button>
          )}
        </div>
      </div>

      {showModal && (
        isRent ? (
          <RentalCheckoutModal
            listing={listing}
            onClose={() => setShowModal(false)}
            onSuccess={() => { setShowModal(false); setOrderDone(true); }}
          />
        ) : (
          <CheckoutModal
            listing={listing}
            onClose={() => setShowModal(false)}
            onSuccess={() => { setShowModal(false); setOrderDone(true); }}
          />
        )
      )}
    </div>
  );
}

export default ListingDetail;
