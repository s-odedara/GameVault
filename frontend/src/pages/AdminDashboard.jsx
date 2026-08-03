import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL, SERVER_BASE_URL } from '../utils/constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ total_users: 0, total_escrowed_orders: 0, total_platform_fees: 0 });
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState({ marketplace: [], rentals: [] });
  const [escrowedOrders, setEscrowedOrders] = useState({ sales: [], rentals: [] });
  const [disputes, setDisputes] = useState([]);
  const [processingDispute, setProcessingDispute] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
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
    fetchEscrowedOrders();
    fetchDisputes();
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

  const fetchEscrowedOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/escrow/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) setEscrowedOrders(await res.json());
    } catch (err) { console.error('Failed to fetch escrow orders'); }
  };

  const fetchDisputes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/disputes/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
      }
    } catch (err) { console.error('Failed to fetch disputes'); }
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

  const handleResolveDispute = async (disputeId, action) => {
    setProcessingDispute(disputeId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/disputes/${disputeId}/resolve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`
        },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        toast.success(`Dispute marked as ${action}!`);
        fetchDisputes();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to resolve dispute.');
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessingDispute(null);
    }
  };

  const handleUserClick = async (user) => {
    setSelectedUserDetails({ user, sell_list: null, buy_list: null });
    setLoadingUserDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/details/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserDetails({ user, ...data });
      } else {
        toast.error('Failed to load user details');
        setSelectedUserDetails(null);
      }
    } catch (e) {
      toast.error('Error loading user details');
      setSelectedUserDetails(null);
    } finally {
      setLoadingUserDetails(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', margin: 0, background: 'linear-gradient(90deg, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Platform Overview</h3>
              <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Live Statistics
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 40 }}>
              <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'var(--accent-primary)', filter: 'blur(50px)', opacity: 0.2 }}></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 8, fontWeight: 500 }}>Total Users</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff' }}>{stats.total_users}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-success)', marginTop: 8 }}>+ Active network</div>
              </div>

              <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'var(--accent-glow)', filter: 'blur(50px)', opacity: 0.2 }}></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 8, fontWeight: 500 }}>Items in Escrow</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff' }}>{stats.total_escrowed_orders}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-glow)', marginTop: 8 }}>Awaiting handover</div>
              </div>

              <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'var(--accent-success)', filter: 'blur(50px)', opacity: 0.2 }}></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 8, fontWeight: 500 }}>Platform Revenue</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--accent-success)' }}>
                  ₹{stats.total_platform_fees}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Total fees collected</div>
              </div>
            </div>

            {/* Revenue Graph Section */}
            {stats.revenue_graph && stats.revenue_graph.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h4 style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Revenue Trend</h4>
                <div className="glass-card" style={{ padding: '24px 24px 0 0', height: 350, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenue_graph}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--accent-success)', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="var(--accent-success)" strokeWidth={3} dot={{ fill: 'var(--accent-success)', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Activity Section */}
            <div style={{ marginTop: 40 }}>
              <h4 style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Recent Users Joined</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {users.slice(0, 4).map(u => (
                  <div key={u.id} style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>@{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(u.date_joined).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
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
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.2s' }} 
                      onClick={() => handleUserClick(u)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: 8 }}>{u.id}</td>
                    <td style={{ padding: 8 }}>{u.username}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>{u.is_staff ? 'Admin' : 'User'}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {listings.marketplace.filter(l => !l.is_approved).map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, alignItems: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 128, flexShrink: 0 }}>
                      {[l.image, l.image2, l.image3, l.image4].filter(Boolean).map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={`${l.title} - ${idx+1}`} 
                          onClick={() => setFullScreenImage(img)}
                          style={{ width: '100%', height: 62, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} 
                        />
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{l.title} - ₹{l.price}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {l.description}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Seller:</strong> @{l.seller__username} | <strong>Location:</strong> {l.location || 'N/A'} | <strong>Contact:</strong> {l.seller_contact || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Listed on: {new Date(l.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
                      <button className="btn-gv-primary" style={{ padding: '8px 16px' }} onClick={() => handleApprove('market', l.id, 'approve')}>Approve</button>
                      <button className="btn-gv-ghost" style={{ padding: '8px 16px', color: 'var(--accent-danger)' }} onClick={() => handleApprove('market', l.id, 'reject')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 style={{ color: 'var(--accent-primary)', marginTop: 24 }}>Rentals</h4>
            {listings.rentals.filter(l => !l.is_approved).length === 0 ? <p>No pending rentals.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {listings.rentals.filter(l => !l.is_approved).map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--bg-elevated)', borderRadius: 12, alignItems: 'center' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 128, flexShrink: 0 }}>
                      {[l.image, l.image2, l.image3, l.image4].filter(Boolean).map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={`${l.title} - ${idx+1}`} 
                          onClick={() => setFullScreenImage(img)}
                          style={{ width: '100%', height: 62, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} 
                        />
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{l.title} - ₹{l.rental_charges} / period</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {l.description}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Owner:</strong> @{l.owner__username} | <strong>Location:</strong> {l.location || 'N/A'} | <strong>Contact:</strong> {l.owner_contact || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Listed on: {new Date(l.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
                      <button className="btn-gv-primary" style={{ padding: '8px 16px' }} onClick={() => handleApprove('rental', l.id, 'approve')}>Approve</button>
                      <button className="btn-gv-ghost" style={{ padding: '8px 16px', color: 'var(--accent-danger)' }} onClick={() => handleApprove('rental', l.id, 'reject')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Escrow Management</h3>
            <p style={{ color: 'var(--text-muted)' }}>This section tracks all items currently held in escrow waiting for handover.</p>
            <p>Total items currently Escrowed: <strong>{stats.total_escrowed_orders}</strong></p>
            
            <h4 style={{ color: 'var(--accent-glow)', marginTop: 24 }}>Escrowed Sales</h4>
            {escrowedOrders.sales.length === 0 ? <p>No escrowed sales.</p> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: 8 }}>Order ID</th>
                    <th style={{ padding: 8 }}>Item</th>
                    <th style={{ padding: 8 }}>Buyer</th>
                    <th style={{ padding: 8 }}>Seller</th>
                    <th style={{ padding: 8 }}>Amount (₹)</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {escrowedOrders.sales.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 8 }}>{o.id}</td>
                      <td style={{ padding: 8 }}>{o.listing__title}</td>
                      <td style={{ padding: 8 }}>{o.buyer__username}</td>
                      <td style={{ padding: 8 }}>{o.seller__username}</td>
                      <td style={{ padding: 8 }}>{o.amount}</td>
                      <td style={{ padding: 8 }}>
                        <span className={`gv-badge ${o.status === 'Shipped' ? 'gv-badge-cyan' : 'gv-badge-amber'}`}>{o.status}</span>
                      </td>
                      <td style={{ padding: 8 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h4 style={{ color: 'var(--accent-primary)', marginTop: 24 }}>Escrowed Rentals</h4>
            {escrowedOrders.rentals.length === 0 ? <p>No escrowed rentals.</p> : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: 8 }}>Order ID</th>
                    <th style={{ padding: 8 }}>Item</th>
                    <th style={{ padding: 8 }}>Renter</th>
                    <th style={{ padding: 8 }}>Owner</th>
                    <th style={{ padding: 8 }}>Amount (₹)</th>
                    <th style={{ padding: 8 }}>Status</th>
                    <th style={{ padding: 8 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {escrowedOrders.rentals.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 8 }}>{o.id}</td>
                      <td style={{ padding: 8 }}>{o.listing__title}</td>
                      <td style={{ padding: 8 }}>{o.renter__username}</td>
                      <td style={{ padding: 8 }}>{o.owner__username}</td>
                      <td style={{ padding: 8 }}>{o.total_amount}</td>
                      <td style={{ padding: 8 }}>
                        <span className={`gv-badge ${o.status === 'Active' ? 'gv-badge-green' : 'gv-badge-amber'}`}>{o.status}</span>
                      </td>
                      <td style={{ padding: 8 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'disputes' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Disputes & Resolutions</h3>
            <p style={{ color: 'var(--text-muted)' }}>Users can file disputes here if items are not handed over correctly.</p>
            {disputes.length === 0 ? <p>No active disputes currently.</p> : (
              <div style={{ display: 'grid', gap: 12 }}>
                {disputes.map(d => (
                  <div key={d.id} style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: d.status === 'Open' ? '4px solid var(--accent-danger)' : '4px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>Dispute #{d.id} - {d.status}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>By: {d.user__username} on {new Date(d.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.9rem' }}>
                      <strong>Order:</strong> {d.order_type.toUpperCase()} #{d.order_id}
                    </div>
                    
                    {d.item_details && (
                      <div style={{ marginTop: 8, padding: 16, background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem', marginBottom: 12 }}>
                          <div style={{ gridColumn: '1 / -1', fontWeight: 600, color: 'var(--accent-glow)', fontSize: '1rem' }}>{d.item_details.listing_title}</div>
                          <div><strong>Buyer/Renter:</strong> @{d.item_details.buyer}</div>
                          <div><strong>Seller/Owner:</strong> @{d.item_details.seller}</div>
                          <div style={{ gridColumn: '1 / -1' }}><strong>Amount Held:</strong> <span style={{ color: 'var(--accent-success)' }}>₹{d.item_details.amount}</span></div>
                        </div>
                        
                        {d.item_details.images && d.item_details.images.filter(Boolean).length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Item Images</div>
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                              {d.item_details.images.filter(Boolean).map((imgUrl, i) => (
                                <img 
                                  key={i} 
                                  src={imgUrl} 
                                  alt="Item image" 
                                  onClick={() => setFullScreenImage(imgUrl)}
                                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-default)', borderRadius: 4, fontSize: '0.85rem' }}>
                      <strong>Reason:</strong> {d.reason}
                    </div>
                    {d.status === 'Open' && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => handleResolveDispute(d.id, 'Resolved')} 
                          className="btn-gv-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          disabled={processingDispute === d.id}
                        >
                          {processingDispute === d.id ? 'Processing...' : 'Mark Resolved'}
                        </button>
                        <button 
                          onClick={() => handleResolveDispute(d.id, 'Refunded')} 
                          className="btn-gv-ghost" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-glow)' }}
                          disabled={processingDispute === d.id}
                        >
                          {processingDispute === d.id ? 'Processing...' : 'Issue Refund'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {fullScreenImage && (
        <div 
          onClick={() => setFullScreenImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={fullScreenImage} 
            alt="Full screen preview" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} 
          />
        </div>
      )}

      {selectedUserDetails && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setSelectedUserDetails(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20
          }}
        >
          <div style={{ background: 'var(--bg-default)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Activity for @{selectedUserDetails.user.username}</h2>
              <button onClick={() => setSelectedUserDetails(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            
            {loadingUserDetails ? <div style={{ padding: 40, textAlign: 'center' }}>Loading user history...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Sell List */}
                <div>
                  <h4 style={{ color: 'var(--accent-glow)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 12 }}>Sell List (Items Listed)</h4>
                  {(!selectedUserDetails.sell_list?.marketplace?.length && !selectedUserDetails.sell_list?.rentals?.length) ? <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No items listed yet.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedUserDetails.sell_list.marketplace.map(item => (
                        <div key={`ms-${item.id}`} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.title} (Sell) - ₹{item.price}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listed on {new Date(item.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`gv-badge ${item.status === 'Available' || item.status === 'Active' ? 'gv-badge-green' : 'gv-badge-dark'}`}>{item.status}</span>
                            <div style={{ fontSize: '0.75rem', marginTop: 4, color: item.is_approved ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                              {item.is_approved ? 'Approved' : 'Pending Approval'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedUserDetails.sell_list.rentals.map(item => (
                        <div key={`mr-${item.id}`} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.title} (Rent) - ₹{item.rental_charges}/period</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listed on {new Date(item.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`gv-badge ${item.status === 'Available' || item.status === 'Active' ? 'gv-badge-green' : 'gv-badge-dark'}`}>{item.status}</span>
                            <div style={{ fontSize: '0.75rem', marginTop: 4, color: item.is_approved ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                              {item.is_approved ? 'Approved' : 'Pending Approval'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buy List */}
                <div>
                  <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 12 }}>Buy List (Orders Placed)</h4>
                  {(!selectedUserDetails.buy_list?.marketplace?.length && !selectedUserDetails.buy_list?.rentals?.length) ? <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No orders placed yet.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selectedUserDetails.buy_list.marketplace.map(order => (
                        <div key={`bm-${order.id}`} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{order.listing_title} (Buy)</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ordered on {new Date(order.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600 }}>₹{order.amount}</div>
                            <span className={`gv-badge ${order.status === 'Completed' || order.status === 'Delivered' ? 'gv-badge-green' : order.status === 'Escrowed' ? 'gv-badge-amber' : 'gv-badge-dark'}`} style={{ marginTop: 4, display: 'inline-block' }}>{order.status}</span>
                          </div>
                        </div>
                      ))}
                      {selectedUserDetails.buy_list.rentals.map(order => (
                        <div key={`br-${order.id}`} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{order.listing_title} (Rent)</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ordered on {new Date(order.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600 }}>₹{order.total_amount}</div>
                            <span className={`gv-badge ${order.status === 'Completed' || order.status === 'Active' ? 'gv-badge-green' : order.status === 'Escrowed' ? 'gv-badge-amber' : 'gv-badge-dark'}`} style={{ marginTop: 4, display: 'inline-block' }}>{order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
