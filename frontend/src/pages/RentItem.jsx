import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

function RentItem() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Physical Game',
    condition: 'Good',
    rental_period: '7',
    rental_charges: '',
    security_deposit: '0',
    location: '',
    owner_contact: '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleImageChange = e => {
    const files = Array.from(e.target.files).slice(0, 4); // max 4 photos
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { toast.warning('Please login to list an item for rent!'); return; }
    // Frontend validation: exactly 10 digits for contact
    if (!/^\d{10}$/.test(form.owner_contact.trim())) {
      toast.error('Contact number must be exactly 10 digits.');
      return;
    }
    if (images.length === 0) { toast.error('At least one photo is required.'); return; }
    setIsSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); });
    
    // Append images (image, image2, image3, image4)
    images.forEach((file, idx) => {
      const fieldName = idx === 0 ? 'image' : `image${idx + 1}`;
      fd.append(fieldName, file);
    });
    
    try {
      const res = await fetch(`${API_BASE_URL}/rentals/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` }, body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Object.values(err)[0] || 'Failed to create listing');
      }
      toast.success('Your item has been submitted successfully and is pending admin approval. It will appear on the marketplace once approved.');
      navigate('/marketplace');
    } catch (err) { toast.error(err.message); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 680, margin: '0 auto' }}>
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          🔄 Rent Out Your&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>Game</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Let other players borrow your physical games for a rental period. Earn while your game sits on the shelf!
        </p>
      </div>

      <div className="glass-card" data-aos="fade-up" style={{ padding: '28px 28px' }}>
        <form onSubmit={handleSubmit}>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label className="gv-form-label">Game/Item Title *</label>
            <input type="text" className="gv-form-input" required
              placeholder="e.g., The Last of Us Part II (PS5)"
              value={form.title} onChange={e => set('title', e.target.value)} disabled={isSubmitting} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label className="gv-form-label">Description *</label>
            <textarea className="gv-form-input" rows={3} required
              placeholder="Describe the game's condition, what's included, any rules…"
              value={form.description} onChange={e => set('description', e.target.value)}
              disabled={isSubmitting} style={{ resize: 'none' }} />
          </div>

          {/* Condition + Category */}
          <div className="row g-3" style={{ marginBottom: 16 }}>
            <div className="col-md-6">
              <label className="gv-form-label">Condition</label>
              <select className="gv-form-input" value={form.condition}
                      onChange={e => set('condition', e.target.value)} disabled={isSubmitting}>
                {['New', 'Like New', 'Good', 'Fair'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="gv-form-label">Category</label>
              <select className="gv-form-input" value={form.category}
                      onChange={e => set('category', e.target.value)} disabled={isSubmitting}>
                {['Physical Game', 'Console', 'Controller/Peripheral', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Rental Period + Charges */}
          <div style={{ marginBottom: 8 }}>
            <label className="gv-form-label">Rental Period & Charges *</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['7', '7 Days'], ['14', '14 Days'], ['30', '30 Days']].map(([v, label]) => (
                <button key={v} type="button"
                  onClick={() => set('rental_period', v)}
                  className={form.rental_period === v ? 'btn-gv-primary btn-bounce' : 'btn-gv-ghost btn-bounce'}
                  style={{ flex: 1, padding: 10, fontSize: '0.82rem' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3" style={{ marginBottom: 16 }}>
            <div className="col-md-6">
              <label className="gv-form-label">Rental Charge (₹) per period *</label>
              <input type="number" min="1" step="0.01" className="gv-form-input" required
                placeholder="e.g., 199"
                value={form.rental_charges} onChange={e => set('rental_charges', e.target.value)}
                disabled={isSubmitting} />
            </div>
            <div className="col-md-6">
              <label className="gv-form-label">Security Deposit (₹)</label>
              <input type="number" min="0" step="0.01" className="gv-form-input"
                placeholder="e.g., 500"
                value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)}
                disabled={isSubmitting} />
            </div>
          </div>

          {/* Contact + Location */}
          <div className="row g-3" style={{ marginBottom: 16 }}>
            <div className="col-md-6">
              <label className="gv-form-label">Your Contact Number * <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.72rem' }}>(10 digits)</span></label>
              <input type="tel" className="gv-form-input" required
                placeholder="9876543210"
                value={form.owner_contact}
                onChange={e => set('owner_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10} disabled={isSubmitting} />
            </div>
            <div className="col-md-6">
              <label className="gv-form-label">Location (optional)</label>
              <input type="text" className="gv-form-input"
                placeholder="e.g., Pune, Maharashtra"
                value={form.location} onChange={e => set('location', e.target.value)}
                disabled={isSubmitting} />
            </div>
          </div>

          {/* Photo (required) */}
          <div style={{ marginBottom: 24 }}>
            <label className="gv-form-label">
              Photos (Up to 4) *&nbsp;
              <span style={{ color: 'var(--accent-danger)', fontWeight: 400, fontSize: '0.72rem' }}>Required</span>
            </label>
            <input type="file" accept="image/*" multiple className="gv-form-input" required={images.length === 0}
              style={{ padding: '7px 12px' }} onChange={handleImageChange} disabled={isSubmitting} />
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12, marginTop: 12 }}>
                {previews.map((src, idx) => (
                  <img  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300?text=Image+Not+Found"; }} key={idx} src={src} alt={`Preview ${idx + 1}`} style={{ height: 100, width: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }} />
                ))}
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: '0.78rem',
                          color: 'var(--text-muted)', lineHeight: 1.6, border: '1px solid var(--border-glow)' }}>
            🛡️ <strong style={{ color: 'var(--text-secondary)' }}>Rental Terms</strong>: The renter must return the item within the agreed period.
            Your security deposit protects you in case of damage or non-return.
            GameVault is not liable for disputes — renters verify via OTP before checkout.
          </div>

          <button type="submit" disabled={isSubmitting}
            className="btn-gv-primary btn-bounce"
            style={{ width: '100%', padding: '13px 0', fontSize: '1rem',
                     fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {isSubmitting ? '⏳ Publishing…' : '🚀 List for Rent'}
          </button>

        </form>
      </div>
    </div>
  );
}

export default RentItem;
