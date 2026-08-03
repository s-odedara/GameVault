import os

file_path = 'd:/HOPE18/GameVault_Project_FIXED/GameVault_Project/frontend/src/pages/Profile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire right side column with a tabbed layout
old_right_side = """        {/* Right Side: Analytics Dashboard (Chart) */}
        <div className="col-md-8">
          <div className="card bg-black text-white shadow-lg border-0 border-top border-warning border-4 p-4 h-100" style={{ borderRadius: '15px' }}>
            <h3 className="text-warning fw-bold mb-4">📊 Gamer Analytics</h3>
            
            {games.length > 0 ? (
              <div className="row mt-3">
                <div className="col-md-12" style={{ height: '320px' }}>
                  <h5 className="text-center text-light mb-2">Library by Genre</h5>
                  
                  {/* Recharts ka jadoo yahan hai */}
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
              <div className="d-flex flex-column justify-content-center align-items-center h-100">
                <span className="fs-1 mb-3">🕸️</span>
                <h5 className="text-muted">No games yet! Add some games to see your stats.</h5>
              </div>
            )}
          </div>
        </div>"""

new_right_side = """        {/* Right Side: Tabs */}
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
                <h3 className="text-warning fw-bold mb-4">Payout Settings</h3>
                <p className="text-muted mb-4">Configure your bank details to receive payments for sales and rentals.</p>
                <form onSubmit={handlePayoutSubmit}>
                  <div className="mb-3">
                    <label className="form-label text-secondary">Bank Name</label>
                    <input 
                      type="text" 
                      className="form-control bg-dark text-light border-secondary" 
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
                      className="form-control bg-dark text-light border-secondary" 
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
                      className="form-control bg-dark text-light border-secondary" 
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
                      className="form-control bg-dark text-light border-secondary" 
                      value={payoutDetails.ifsc_code}
                      onChange={(e) => setPayoutDetails({...payoutDetails, ifsc_code: e.target.value.toUpperCase()})}
                      placeholder="e.g. SBIN0001234"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-warning fw-bold w-100 rounded-pill" disabled={isSavingPayout}>
                    {isSavingPayout ? 'Saving...' : 'Save Payout Details'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>"""

content = content.replace(old_right_side, new_right_side)

# Add states for tab and payout details
old_states = """  const [games, setGames] = useState([])
  const [genreData, setGenreData] = useState([])

  // Chart ke mast colors (Dark theme ke hisaab se)"""

new_states = """  const [games, setGames] = useState([])
  const [genreData, setGenreData] = useState([])
  const [activeTab, setActiveTab] = useState('analytics')
  const [isSavingPayout, setIsSavingPayout] = useState(false)
  const [payoutDetails, setPayoutDetails] = useState({
    bank_name: '',
    account_holder_name: '',
    bank_account_number: '',
    ifsc_code: ''
  })

  // Chart ke mast colors (Dark theme ke hisaab se)"""

content = content.replace(old_states, new_states)

# Fetch payout details inside useEffect
old_use_effect = """        setGenreData(chartData);
      })
      .catch(error => console.error("Error fetching stats:", error))
  }, [token, navigate])"""

new_use_effect = """        setGenreData(chartData);
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
  }, [token, navigate])"""

content = content.replace(old_use_effect, new_use_effect)

# Add submit handler
old_handle_logout = """  const handleLogout = () => {"""

new_handle_submit_and_logout = """  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
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

  const handleLogout = () => {"""

content = content.replace(old_handle_logout, new_handle_submit_and_logout)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Profile.jsx")
