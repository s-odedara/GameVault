import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/constants';

// 🔥 FIX: Yahan S capital hai (SiNintendoSwitch)
import { FaWindows, FaPlaystation, FaXbox, FaApple, FaLinux, FaGamepad } from 'react-icons/fa';
import { BsGrid3X3GapFill, BsUiRadiosGrid } from 'react-icons/bs';
    const getPlatformIcon = (slug) => {
  if (!slug) return null; 
  const s = slug.toLowerCase();
  if (s.includes('pc') || s.includes('windows')) return <FaWindows key={slug} />;
  if (s.includes('playstation')) return <FaPlaystation key={slug} />;
  if (s.includes('xbox')) return <FaXbox key={slug} />;
  if (s.includes('mac') || s.includes('apple')) return <FaApple key={slug} />;
  if (s.includes('linux')) return <FaLinux key={slug} />;
  // 🔥 FIX: Yahan bhi S capital hai
  if (s.includes('nintendo')) return <FaGamepad key={slug} title="Nintendo" />;
  return null;
};

function CollectionPage() {
  const { type } = useParams();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  // 🔥 FIX: Ye dropdowns pehle sirf dikhawti thi, kuch karti nahi thi.
  const [orderBy, setOrderBy] = useState('-added');
  const [platformFilter, setPlatformFilter] = useState('');

  // 🔥 FIX: Har collection type ka apna sensible default sort order set
  // karta hai (e.g. "Top 250" ko rating se sort hona chahiye, "Popular" ko
  // metacritic se) — dropdown se user ise phir bhi manually badal sakta hai.
  useEffect(() => {
    const defaultOrderByType = {
      'top-250': '-rating',
      'popular': '-metacritic',
      'best-of-year': '-added',
      'calendar': 'released',
      'new': '-added',
      'top': '-rating',
      'best2024': '-rating',
      'upcoming': 'released',
      'recent': '-added',
    };
    setOrderBy(defaultOrderByType[type] || '-added');
    setPlatformFilter('');
  }, [type]);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const currentYear = today.getFullYear();
    
    let dateParam = '';
    let orderingParam = orderBy;
    let pageTitle = '';

    switch (type) {
      case 'last-30-days': {
        const last30 = new Date();
        last30.setDate(today.getDate() - 30);
        dateParam = `${formatDate(last30)},${formatDate(today)}`;
        pageTitle = 'Last 30 days';
        break;
      }
      case 'this-week': {
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        dateParam = `${formatDate(lastWeek)},${formatDate(today)}`;
        pageTitle = 'This week';
        break;
      }
      // 🔥 FIX: Ye 4 cases pehle exist nahi karte the, isliye sidebar ke
      // "Next week", "Release calendar", "Popular in 2026", "All time top 250"
      // links generic "Awesome Games" fallback par chale jaate the.
      case 'next-week': {
        const nextWeekEnd = new Date();
        nextWeekEnd.setDate(today.getDate() + 7);
        dateParam = `${formatDate(today)},${formatDate(nextWeekEnd)}`;
        pageTitle = 'Next week';
        break;
      }
      case 'calendar': {
        const twoMonthsAhead = new Date();
        twoMonthsAhead.setDate(today.getDate() + 60);
        dateParam = `${formatDate(today)},${formatDate(twoMonthsAhead)}`;
        pageTitle = 'Release calendar';
        break;
      }
      case 'popular': {
        dateParam = `${currentYear}-01-01,${currentYear}-12-31`;
        pageTitle = `Popular in ${currentYear}`;
        break;
      }
      case 'top-250': {
        pageTitle = 'All time top 250';
        break;
      }
            case 'best-of-year': {
        dateParam = `${currentYear}-01-01,${currentYear}-12-31`;
        pageTitle = `Best of ${currentYear}`;
        break;
      }
      case 'new': {
        const last6Months = new Date();
        last6Months.setMonth(today.getMonth() - 6);
        dateParam = `${formatDate(last6Months)},${formatDate(today)}`;
        pageTitle = 'New & Trending';
        break;
      }
      case 'top': {
        pageTitle = 'Top Rated';
        break;
      }
      case 'best2024': {
        dateParam = `2024-01-01,2024-12-31`;
        pageTitle = 'Best of 2024';
        break;
      }
      case 'upcoming': {
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);
        dateParam = `${formatDate(today)},${formatDate(nextYear)}`;
        pageTitle = 'Coming Soon';
        break;
      }
      case 'recent': {
        pageTitle = 'Recently Added';
        break;
      }
      default: {
        pageTitle = 'Awesome Games';
      }
    }

    setTitle(pageTitle);

    let apiUrl = `${API_BASE_URL}/rawg/games?page_size=24`;
    if (dateParam) apiUrl += `&dates=${dateParam}`;
    if (orderingParam) apiUrl += `&ordering=${orderingParam}`;
    if (platformFilter) apiUrl += `&platforms=${platformFilter}`;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data && data.results) {
          setGames(data.results);
        } else {
          setGames([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch:", err);
        setLoading(false);
      });
  }, [type, orderBy, platformFilter]);

  return (
    <div className="container-fluid px-4 py-5" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      <h1 className="text-white fw-bold mb-4" style={{ fontSize: '4.5rem', letterSpacing: '-2px' }}>
        {title}
      </h1>
      
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
        <div className="d-flex gap-2">
          <select 
            className="form-select bg-dark text-white border-0 shadow-none fw-bold" 
            style={{ width: 'auto', backgroundColor: '#2b2b2b' }}
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
          >
            <option value="-added">Order by: Popularity</option>
            <option value="released">Order by: Upcoming release</option>
            <option value="-released">Order by: Release date</option>
            <option value="name">Order by: Name</option>
            <option value="-rating">Order by: Rating</option>
            <option value="-metacritic">Order by: Metacritic</option>
          </select>
          <select 
            className="form-select bg-dark text-white border-0 shadow-none fw-bold" 
            style={{ width: 'auto', backgroundColor: '#2b2b2b' }}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">Platforms: All</option>
            <option value="4">PC</option>
            <option value="187">PlayStation 5</option>
            <option value="1">Xbox One</option>
            <option value="7">Nintendo Switch</option>
            <option value="3">iOS</option>
            <option value="21">Android</option>
          </select>
        </div>
        
        <div className="d-none d-md-flex align-items-center gap-2 text-muted fs-5">
          <span className="fs-6 me-2">Display options:</span>
          <BsGrid3X3GapFill className="text-white cursor-pointer" />
          <BsUiRadiosGrid className="cursor-pointer" style={{ opacity: 0.5 }} />
        </div>
      </div>

      {loading ? (
        <div className="text-white fs-4 mt-5 text-center">Loading Data... ⏳</div>
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
          {games.map(game => (
            <div key={game.id} className="col">
              <div 
                className="card h-100 border-0" 
                style={{ 
                  backgroundColor: '#202020', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Link to={`/global-game/${game.id}`}>
                  <img 
                    src={game.background_image || 'https://placehold.co/600x400'} 
                    className="card-img-top" 
                    alt={game.name || 'Game Image'} 
                    style={{ height: '200px', objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                  />
                </Link>
                <div className="card-body p-3">
                  
                  <div className="d-flex gap-2 mb-2 text-white" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {game.parent_platforms?.map(p => getPlatformIcon(p.platform?.slug))}
                  </div>
                  
                  <Link to={`/global-game/${game.id}`} className="text-decoration-none text-white fs-4 fw-bold d-block mb-3" style={{ lineHeight: '1.2' }}>
                    {game.name}
                  </Link>

                  <div className="mt-auto">
                    <button 
                      className="btn btn-sm text-white fw-bold border-0" 
                      style={{ backgroundColor: '#ffffff1a', borderRadius: '4px', fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      + {game.added || 0}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CollectionPage;