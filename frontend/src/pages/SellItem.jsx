import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

function SellItem() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('token');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Physical Game',
    condition: 'Good', price: '', location: '',
    seller_contact: '',   // PART 4.1: required 10-digit mobile
    image: null,
  });
  const [preview, setPreview] = useState(null);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { set('image', file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!token) { toast.warning('Please login to sell an item!'); return; }
    // PART 4.1 — validate 10-digit contact
    if (!/^\d{10}$/.test(form.seller_contact.trim())) {
      toast.error('Contact number must be exactly 10 digits.'); return;
    }
    if (!form.location.trim()) {
      toast.error('Location is required.'); return;
    }
    if (!form.image) { toast.error('A photo is required for all listings.'); return; }
    setIsSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null) fd.append(k, v); });
    try {
      const res = await fetch(`${API_BASE_URL}/listings/`, {
        method: 'POST', headers: { 'Authorization': `Token ${token}` }, body: fd,
      });
      if (!res.ok) throw new Error();
      toast.success('🎉 Your item is live on the Marketplace!');
      navigate('/marketplace');
    } catch { toast.error("Couldn't publish listing. Please check your details."); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 680, margin: '0 auto' }}>
      <div data-aos="fade-down" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>
          📦 Sell an&nbsp;
          <span style={{ color: 'var(--accent-glow)', textShadow: '0 0 14px rgba(0,212,255,0.4)' }}>Item</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          List a physical game, console, controller, or gaming merch for sale.
        </p>
      </div>

      <div className="glass-card" data-aos="fade-up" style={{ padding: '28px 28px' }}>
        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: 18 }}>
            <label className="gv-form-label">Title *</label>
            <input type="text" className="gv-form-input" placeholder="e.g., PS5 DualSense Controller — Midnight Black"
              value={form.title} onChange={e => set('title', e.target.value)} required disabled={isSubmitting} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="gv-form-label">Description *</label>
            <textarea className="gv-form-input" rows={4} placeholder="Describe condition, what's included, reason for selling…"
              value={form.description} onChange={e => set('description', e.target.value)} required disabled={isSubmitting}
              style={{ resize: 'none' }} />
          </div>

          <div className="row g-3" style={{ marginBottom: 18 }}>
            <div className="col-md-6">
              <label className="gv-form-label">Category</label>
              <select className="gv-form-input" value={form.category} onChange={e => set('category', e.target.value)} disabled={isSubmitting}>
                {['Physical Game','Console','Controller/Peripheral','Merchandise','Collectible','Other'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="gv-form-label">Condition</label>
              <select className="gv-form-input" value={form.condition} onChange={e => set('condition', e.target.value)} disabled={isSubmitting}>
                {['New','Like New','Good','Fair'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="row g-3" style={{ marginBottom: 18 }}>
            <div className="col-md-6">
              <label className="gv-form-label">Price (₹) *</label>
              <input type="number" min="1" step="0.01" className="gv-form-input" placeholder="999"
                value={form.price} onChange={e => set('price', e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="col-md-6">
              <label className="gv-form-label">Location *</label>
              <input type="text" className="gv-form-input" placeholder="e.g., Ahmedabad, Gujarat"
                value={form.location} onChange={e => set('location', e.target.value)} required disabled={isSubmitting} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="gv-form-label">Your Contact Number * <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.72rem' }}>(10 digits — required)</span></label>
            <input type="tel" className="gv-form-input" required
              placeholder="9876543210"
              value={form.seller_contact}
              onChange={e => set('seller_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10} disabled={isSubmitting} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="gv-form-label">Photo * <span style={{ color: 'var(--accent-danger)', fontWeight: 400, fontSize: '0.72rem' }}>Required</span></label>
            <input type="file" accept="image/*" className="gv-form-input" style={{ padding: '7px 12px' }}
              onChange={handleImageChange} disabled={isSubmitting} />
            {preview && (
              <img src={preview} alt="Preview" style={{ marginTop: 12, maxHeight: 180, borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-card)', width: '100%', objectFit: 'cover' }} />
            )}
          </div>

          <button type="submit" disabled={isSubmitting}
            className="btn-gv-primary btn-bounce"
            style={{ width: '100%', padding: '13px 0', fontSize: '1rem',
                     fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.3px' }}>
            {isSubmitting ? '⏳ Publishing…' : '🚀 Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SellItem;
