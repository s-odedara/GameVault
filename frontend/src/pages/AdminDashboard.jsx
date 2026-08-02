import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ total_users: 0, total_escrowed_orders: 0, total_platform_fees: 0 });
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState({ marketplace: [], rentals: [] });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const is_staff = localStorage.getItem('is_staff');

  useEffect(() => {
    if (!token || is_staff !== 'true') {
      toast.error('Access Denied. Admins only.');
      navigate('/');
      return;
    }
    fetchStats();
    fetchUsers();
    fetchListings();
  }, [navigate, token, is_staff]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/stats/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error('Failed to fetch stats'); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) { console.error('Failed to fetch users'); }
  };

  const fetchListings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listings/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) setListings(await res.json());
    } catch (err) { console.error('Failed to fetch listings'); }
  };

  const handleApprove = async (type, id, action) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/listings/${type}/${id}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast.success(`Listing ${action}d!`);
        fetchListings();
      } else {
        toast.error(`Failed to ${action} listing.`);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this user?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        toast.success('User deactivated successfully.');
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const errData = await res.json();
        toast.error(`Failed to delete user: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.5rem', marginBottom: 24 }}>
        Admin Dashboard
      </h1>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
        {['overview', 'users', 'items', 'orders', 'disputes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-primary)',
              border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)',
              fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>Total Users</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_users}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>Items in Escrow</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_escrowed_orders}</div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8 }}>Platform Revenue</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-success)' }}>
                  ₹{stats.total_platform_fees}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Registered Users</h3>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>Username</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Joined</th>
                  <th style={{ padding: 8 }}>Role</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 8 }}>{u.id}</td>
                    <td style={{ padding: 8 }}>{u.username}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>{u.is_staff ? 'Admin' : 'User'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="btn-gv-ghost" 
                        style={{ color: 'var(--accent-danger)', padding: '4px 8px', fontSize: '0.8rem' }}
                        disabled={u.is_staff}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Pending Listings</h3>
            
            <h4 style={{ color: 'var(--accent-glow)' }}>Marketplace (Sell)</h4>
            {listings.marketplace.filter(l => !l.is_approved).length === 0 ? <p>No pending sales.</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {listings.marketplace.filter(l => !l.is_approved).map(l => (
                  <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-elevated)', marginBottom: 8, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.title} - ₹{l.price}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>By: {l.seller__username} | {new Date(l.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <button className="btn-gv-primary" style={{ padding: '6px 12px', marginRight: 8 }} onClick={() => handleApprove('market', l.id, 'approve')}>Approve</button>
                      <button className="btn-gv-ghost" style={{ padding: '6px 12px', color: 'var(--accent-danger)' }} onClick={() => handleApprove('market', l.id, 'reject')}>Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ color: 'var(--accent-primary)', marginTop: 24 }}>Rentals</h4>
            {listings.rentals.filter(l => !l.is_approved).length === 0 ? <p>No pending rentals.</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {listings.rentals.filter(l => !l.is_approved).map(l => (
                  <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-elevated)', marginBottom: 8, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.title} - ₹{l.rental_charges} / period</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>By: {l.owner__username} | {new Date(l.created_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <button className="btn-gv-primary" style={{ padding: '6px 12px', marginRight: 8 }} onClick={() => handleApprove('rental', l.id, 'approve')}>Approve</button>
                      <button className="btn-gv-ghost" style={{ padding: '6px 12px', color: 'var(--accent-danger)' }} onClick={() => handleApprove('rental', l.id, 'reject')}>Reject</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Escrow Management</h3>
            <p style={{ color: 'var(--text-muted)' }}>This section tracks all items currently held in escrow waiting for handover.</p>
            <p>Total items currently Escrowed: <strong>{stats.total_escrowed_orders}</strong></p>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Disputes & Resolutions</h3>
            <p style={{ color: 'var(--text-muted)' }}>No active disputes currently. Users can file disputes here if items are not handed over correctly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
