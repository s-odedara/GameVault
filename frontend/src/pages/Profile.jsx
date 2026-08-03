import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { API_BASE_URL } from '../utils/constants';
import { toast } from 'react-toastify'

function Profile() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [games, setGames] = useState([])
  const [genreData, setGenreData] = useState([])
  const [activeTab, setActiveTab] = useState('analytics')
  const [isSavingPayout, setIsSavingPayout] = useState(false)
  const [payoutDetails, setPayoutDetails] = useState({
    bank_name: '',
    account_holder_name: '',
    bank_account_number: '',
    ifsc_code: ''
  })

  // Chart ke mast colors (Dark theme ke hisaab se)
  const COLORS = ['#ffc107', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    // Backend se saari games fetch kar rahe hain
    fetch(`${API_BASE_URL}/games/`, {
       headers: { 'Authorization': `Token ${token}` }
    })
      .then(response => response.json())
      .then(data => {
        setGames(data)
        
        // 🧠 Chart ka logic: Har genre ki games count karna
        const genreCounts = {};
        data.forEach(game => {
          const genre = game.genre || 'Unknown';
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });

        // Object ko Chart ke data format (Array) mein convert karna
        const chartData = Object.keys(genreCounts).map(key => ({
          name: key,
          value: genreCounts[key]
        }));
        
        setGenreData(chartData);
      })
      .catch(error => console.error("Error fetching stats:", error))

    // Fetch payout details
    fetch(`${API_BASE_URL}/users/profile/payout-details/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(response => response.json())
      .then(data => {
        if (!data.error) {
          setPayoutDetails(data)
        }
      })
      .catch(error => console.error("Error fetching payout details:", error))
  }, [token, navigate])

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    
    if (!/^\d{9,18}$/.test(payoutDetails.bank_account_number)) {
      toast.error('Account number must be 9-18 digits.');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payoutDetails.ifsc_code)) {
      toast.error('Invalid IFSC Code format (e.g. SBIN0001234).');
      return;
    }
    if (payoutDetails.account_holder_name.trim().length < 3) {
      toast.error('Enter a valid Account Holder Name.');
      return;
    }

    setIsSavingPayout(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile/payout-details/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payoutDetails)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Payout details saved!');
        setActiveTab('analytics');
      } else {
        toast.error(data.error || 'Failed to save payout details');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    } finally {
      setIsSavingPayout(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('user_id') // 🔥 user_id bhi clear karo
    toast.success("Logged out successfully! See you next time. 🎮")
    navigate('/login')
  }

  return (
    <div className="container mt-5">
      <div className="row">
        
        {/* Left Side: Gamer Profile Card */}
        <div className="col-md-4 mb-4">
          <div className="card bg-black text-white shadow-lg border-warning border-2" style={{ borderRadius: '15px' }}>
            <div className="card-img-top bg-secondary" style={{ height: '120px', borderTopLeftRadius: '13px', borderTopRightRadius: '13px', backgroundImage: 'url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="card-body text-center mt-n5">
              <div className="bg-dark rounded-circle border border-warning border-3 d-inline-flex justify-content-center align-items-center mb-3" style={{ width: '100px', height: '100px', marginTop: '-60px', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
                <span className="fs-1">👾</span>
              </div>
              
              <h3 className="card-title text-warning fw-bold mb-1">{localStorage.getItem('username') || 'Player'}</h3>
              <p className="text-muted mb-4">GameVault Member</p>
              
              <div className="row text-center mb-4">
                <div className="col-6 border-end border-secondary">
                  <h4 className="text-light fw-bold">{games.length}</h4>
                  <span className="text-muted small">Games in Vault</span>
                </div>
                <div className="col-6">
                  <h4 className="text-light fw-bold">Active</h4>
                  <span className="text-muted small">Status</span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-outline-danger w-100 fw-bold rounded-pill">Sign Out</button>
            </div>
          </div>
        </div>

        {/* Right Side: Tabs */}
        <div className="col-md-8">
          <div className="card bg-black text-white shadow-lg border-0 border-top border-warning border-4 p-4 h-100" style={{ borderRadius: '15px' }}>
            
            <ul className="nav nav-pills mb-4" style={{ gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'analytics' ? 'bg-warning text-dark fw-bold' : 'text-white border border-secondary'}`} 
                  onClick={() => setActiveTab('analytics')}
                  style={{ borderRadius: '25px' }}
                >
                  📊 Analytics
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'payout' ? 'bg-warning text-dark fw-bold' : 'text-white border border-secondary'}`} 
                  onClick={() => setActiveTab('payout')}
                  style={{ borderRadius: '25px' }}
                >
                  🏦 Payout Details
                </button>
              </li>
            </ul>
            
            {activeTab === 'analytics' && (
              <>
                <h3 className="text-warning fw-bold mb-4">Gamer Analytics</h3>
                {games.length > 0 ? (
                  <div className="row mt-3">
                    <div className="col-md-12" style={{ height: '320px' }}>
                      <h5 className="text-center text-light mb-2">Library by Genre</h5>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={genreData} 
                            cx="50%" cy="50%" 
                            innerRadius={70} outerRadius={110} 
                            paddingAngle={5} 
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {genreData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #ffc107', borderRadius: '10px', color: '#fff' }} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column justify-content-center align-items-center h-100" style={{ minHeight: '300px' }}>
                    <span className="fs-1 mb-3">🕸️</span>
                    <h5 className="text-muted">No games yet! Add some games to see your stats.</h5>
                  </div>
                )}
              </>
            )}

            {activeTab === 'payout' && (
              <>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-glow)' }} className="mb-2">Payout Settings</h3>
                <p style={{ color: 'var(--text-muted)' }} className="mb-4">Configure your bank details to receive payments for sales and rentals.</p>
                <form onSubmit={handlePayoutSubmit} className="glass-card" style={{ padding: '24px', background: 'rgba(255,193,7,0.03)', border: '1px solid rgba(255,193,7,0.1)' }}>
                  <div className="mb-3">
                    <label className="form-label text-secondary">Bank Name</label>
                    <input 
                      type="text" 
                      className="gv-form-input" 
                      value={payoutDetails.bank_name}
                      onChange={(e) => setPayoutDetails({...payoutDetails, bank_name: e.target.value})}
                      placeholder="e.g. State Bank of India"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary">Account Holder Name</label>
                    <input 
                      type="text" 
                      className="gv-form-input" 
                      value={payoutDetails.account_holder_name}
                      onChange={(e) => setPayoutDetails({...payoutDetails, account_holder_name: e.target.value})}
                      placeholder="As per bank records"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary">Account Number</label>
                    <input 
                      type="text" 
                      className="gv-form-input" 
                      value={payoutDetails.bank_account_number}
                      onChange={(e) => setPayoutDetails({...payoutDetails, bank_account_number: e.target.value})}
                      placeholder={payoutDetails.bank_account_number ? (payoutDetails.bank_account_number.length > 4 ? `**** **** ${payoutDetails.bank_account_number.slice(-4)}` : payoutDetails.bank_account_number) : "Enter account number"}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary">IFSC Code</label>
                    <input 
                      type="text" 
                      className="gv-form-input" 
                      value={payoutDetails.ifsc_code}
                      onChange={(e) => setPayoutDetails({...payoutDetails, ifsc_code: e.target.value.toUpperCase()})}
                      placeholder="e.g. SBIN0001234"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-gv-primary w-100" disabled={isSavingPayout}>
                    {isSavingPayout ? 'Saving...' : 'Save Payout Details'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Profile