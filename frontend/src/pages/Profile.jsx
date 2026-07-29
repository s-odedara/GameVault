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
  }, [token, navigate])

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
              <p className="text-muted mb-4">GameVault Pro Member</p>
              
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

        {/* Right Side: Analytics Dashboard (Chart) */}
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
        </div>

      </div>
    </div>
  )
}

export default Profile