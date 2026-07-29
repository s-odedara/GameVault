import { Link } from 'react-router-dom';

// 🔥 NAYA PAGE: Sidebar > Browse > "Collections" pehle sirf "/" (homepage)
// khol deta tha. Ab ye ek hub page hai jo saare mौjooda collection views
// (jo pehle sidebar mein bikhre hue the) ek jagah, browsable cards mein dikhata hai.
const collections = [
  { type: 'last-30-days', title: 'Last 30 Days', desc: 'Everything released in the past month', icon: '⭐' },
  { type: 'this-week', title: 'This Week', desc: "This week's freshest releases", icon: '🔥' },
  { type: 'next-week', title: 'Next Week', desc: 'Coming up in the next 7 days', icon: '⏩' },
  { type: 'calendar', title: 'Release Calendar', desc: 'Upcoming releases over the next 2 months', icon: '📅' },
  { type: 'best-of-year', title: 'Best of the Year', desc: "This year's top rated games", icon: '🏆' },
  { type: 'popular', title: 'Popular', desc: 'Most played and talked-about games', icon: '📊' },
  { type: 'top-250', title: 'All Time Top 250', desc: 'The highest rated games of all time', icon: '👑' },
];

function CollectionsPage() {
  return (
    <div className="container mt-4 mb-5">
      <h1 className="text-white fw-bold mb-2 display-5" style={{ letterSpacing: '1px' }}>Collections</h1>
      <p className="text-muted mb-5">Curated lists to help you find your next game.</p>

      <div className="row g-4">
        {collections.map(col => (
          <div className="col-md-4 col-sm-6" key={col.type}>
            <Link
              to={`/collection/${col.type}`}
              className="card text-white h-100 shadow-lg p-4 text-decoration-none"
              style={{
                backgroundColor: '#1c1c1c', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', transition: 'transform 0.2s ease, border-color 0.2s ease',
                display: 'block'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#facc15'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              <div style={{ fontSize: '1.8rem' }} className="mb-2">{col.icon}</div>
              <h5 className="fw-bold text-white mb-1">{col.title}</h5>
              <small className="text-muted">{col.desc}</small>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CollectionsPage;
