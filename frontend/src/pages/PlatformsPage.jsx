import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/constants';

// 🔥 NAYA PAGE: Sidebar > Browse > "Platforms" pehle sirf "/" (homepage)
// khol deta tha. Ab ye RAWG ke saare platforms ka ek proper grid hai.
function PlatformsPage() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE_URL}/rawg/platforms?page_size=40`)
      .then(res => res.json())
      .then(data => {
        setPlatforms(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mt-4 mb-5">
      <h1 className="text-white fw-bold mb-2 display-5" style={{ letterSpacing: '1px' }}>Platforms</h1>
      <p className="text-muted mb-5">Browse games by console, PC, or mobile platform.</p>

      {loading ? (
        <div className="row g-4">
          {[...Array(8)].map((_, i) => (
            <div className="col-md-3 col-sm-6" key={i}><div className="skeleton-card" style={{ height: '140px', borderRadius: '12px', backgroundColor: '#1c1c1e' }}></div></div>
          ))}
        </div>
      ) : (
        <div className="row g-4">
          {platforms.map(platform => (
            <div className="col-md-3 col-sm-6" key={platform.id}>
              <div
                onClick={() => navigate(`/platform/${platform.id}`)}
                className="card text-white h-100 shadow-lg p-4 text-center justify-content-center"
                style={{
                  backgroundColor: '#1c1c1c', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px', cursor: 'pointer', minHeight: '140px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#facc15'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <h5 className="fw-bold mb-1">{platform.name}</h5>
                <small className="text-muted">{platform.games_count?.toLocaleString()} games</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlatformsPage;
