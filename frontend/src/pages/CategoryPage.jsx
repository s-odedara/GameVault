import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/constants';

// 🚀 ADVANCED RAWG CARD (Zoom + Video + Add to Vault)
const CategoryCard = memo(({ game, navigate, onAdd }) => {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isHovered && videoRef.current) {
      timer = setTimeout(() => {
        if (videoRef.current) videoRef.current.play().catch(e => console.log(e));
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [isHovered]);

  return (
    <div 
      className="card text-white h-100 shadow-lg" 
      style={{ 
        backgroundColor: '#1c1c1c', border: '1px solid rgba(255,255,255,0.05)', 
        borderRadius: '12px', cursor: 'pointer', willChange: 'transform',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)', 
        boxShadow: isHovered ? '0 15px 30px rgba(0,0,0,0.8)' : '0 4px 6px rgba(0,0,0,0.3)',
        zIndex: isHovered ? 10 : 1 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/global-game/${game.id}`)}
    >
      <div style={{ height: '200px', overflow: 'hidden', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', position: 'relative' }}>
        {isHovered ? (
          <video 
            ref={videoRef} src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
            poster={game.background_image || 'https://placehold.co/300x200?text=No+Image'} 
            muted loop playsInline className="w-100 h-100" style={{ objectFit: 'cover' }} 
          />
        ) : (
          <img src={game.background_image || 'https://placehold.co/300x200?text=No+Image'} className="w-100 h-100" alt={game.name} loading="lazy" style={{ objectFit: 'cover' }}/>
        )}
      </div>
      
      <div className="card-body d-flex flex-column p-3">
        <h5 className="fw-bold text-truncate mb-2" style={{ color: '#fff' }}>{game.name}</h5>
        <div className="d-flex justify-content-between text-muted small mt-auto mb-3">
          <span>{game.released ? game.released.substring(0,4) : 'N/A'}</span>
          <span>⭐ {game.rating > 5 ? (game.rating / 2).toFixed(1) : game.rating}</span>
        </div>
        
        <button 
          onClick={(e) => onAdd(e, game)} 
          className="btn btn-light btn-sm w-100 rounded-2 fw-bold text-dark mt-auto"
        >
          + Add to Vault
        </button>
      </div>
    </div>
  );
});

// 🚀 MAIN CATEGORY PAGE
function CategoryPage() {
  const { id } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platformName, setPlatformName] = useState('Games');
  const navigate = useNavigate();
  
  const token = localStorage.getItem('token');

  // 🔥 FIX: Pehle sirf 5 platforms (PC/PS5/Xbox/iOS/Android) ka hardcoded
  // naam pata tha — baaki sab "Games" generic heading dikhate the. Ab RAWG
  // se hi asli naam fetch hota hai, isliye koi bhi platform ID kaam karega.
  useEffect(() => {
    fetch(`${API_BASE_URL}/rawg/platforms/${id}`)
      .then(res => res.json())
      .then(data => { if (data.name) setPlatformName(data.name); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const fetchPlatformGames = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/rawg/games?platforms=${id}&ordering=-added&page_size=20`);
        const data = await response.json();
        setGames(data.results);
      } catch (error) {
        toast.error("Error loading games!");
      } finally {
        setLoading(false);
      }
    };
    fetchPlatformGames();
  }, [id]); 

  const handleAddToVault = (e, game) => {
    e.stopPropagation(); 
    if (!token) {
      toast.error("Please login to add games to your vault!");
      return;
    }

    const formData = new FormData();
    formData.append('title', game.name);
    formData.append('genre', game.genres?.[0]?.name || 'Unknown');
    formData.append('platform', platformName); // Ab hamesha real naam milega
    formData.append('release_date', game.released || '2000-01-01');
    
    let mappedRating = game.rating;
    if (mappedRating > 5) mappedRating = 5;
    if (mappedRating < 0) mappedRating = 0;
    formData.append('rating', mappedRating);
    formData.append('image_url', game.background_image || '');

    fetch(`${API_BASE_URL}/games/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` },
      body: formData,
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to add");
      toast.success(`${game.name} added to your Vault! 🎮`);
    })
    .catch(err => toast.error("Error adding game to vault."));
  };

  return (
    <div className="container mt-4 mb-5">
      <h1 className="text-white fw-bold mb-2 display-5" style={{ letterSpacing: '1px' }}>
        {platformName}
      </h1>
      <p className="text-muted mb-5">Showing top trending releases and highly-rated games.</p>
      
      {loading ? (
        <div className="row g-4">{[...Array(8)].map((_, i) => <div className="col-md-3 col-sm-6" key={i}><div className="skeleton-card" style={{ height: '300px', borderRadius: '12px' }}></div></div>)}</div>
      ) : (
        <div className="row g-4">
          {games.map(game => (
            <div key={game.id} className="col-md-3 col-sm-6">
              <CategoryCard game={game} navigate={navigate} onAdd={handleAddToVault} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryPage;