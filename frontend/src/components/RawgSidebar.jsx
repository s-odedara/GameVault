import { Link, useLocation } from 'react-router-dom';
import {
  FaStar, FaFire, FaTrophy, FaChartBar, FaCrown,
  FaGamepad, FaDownload, FaFolder, FaWindows,
  FaPlaystation, FaXbox, FaGift, FaFolderOpen, FaUsers,
  FaStore, FaUser,
} from 'react-icons/fa';
import { MdFastForward, MdCalendarMonth } from 'react-icons/md';

function SidebarLink({ icon, text, to, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`gv-sidebar-link${isActive ? ' active' : ''}`}
      style={isActive ? {
        background: 'rgba(67,97,238,0.15)',
        color: 'var(--text-primary)',
        borderLeft: '3px solid var(--accent-primary)',
        paddingLeft: 7,
      } : {}}
    >
      <div className="icon-wrap" style={isActive ? { background: 'rgba(67,97,238,0.25)' } : {}}>
        {icon}
      </div>
      <span>{text}</span>
    </Link>
  );
}

function SectionTitle({ children }) {
  return <div className="gv-sidebar-section-title">{children}</div>;
}

// FIX 1.2: Accepts `transparent` prop from App.jsx Layout component
// When true (on detail pages), the sidebar becomes transparent so the
// game's background image shows through underneath.
function RawgSidebar({ transparent = false, isOpen = false, onClose }) {
  const token    = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const letter   = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <aside className={`gv-sidebar d-flex flex-column${transparent ? ' transparent-mode' : ''}${isOpen ? ' open' : ''}`}>

      {/* ── User Profile Block ── */}
      <div className="gv-sidebar-user">
        {token && username ? (
          <>
            <div className="gv-sidebar-avatar">{letter}</div>
            <div>
              <Link to="/vault" style={{ textDecoration: 'none' }} onClick={onClose}>
                <div className="gv-sidebar-username">{username}</div>
              </Link>
              {/* FIX 1.6: "View Profile" is now a real working Link (was plain div text before) */}
              <Link to="/profile" style={{ textDecoration: 'none' }} onClick={onClose}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: 1 }}>
                  <FaUser style={{ fontSize: '0.6rem', marginRight: 3 }} />View Profile
                </div>
              </Link>
            </div>
          </>
        ) : (
          <Link to="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }} onClick={onClose}>
            <div className="gv-sidebar-avatar" style={{ background: 'rgba(255,255,255,0.08)' }}>?</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Login to GameVault
            </div>
          </Link>
        )}
      </div>

      {/* ── My Vault ── */}
      <SectionTitle>MY VAULT</SectionTitle>
      <SidebarLink icon={<FaGamepad />} text="My Library"   to="/vault" onClick={onClose} />
      <SidebarLink icon={<FaStar />}    text="Wishlist"      to="/wishlist" onClick={onClose} />
      <SidebarLink icon={<FaUsers />}   text="Following"     to="/following" onClick={onClose} />
      <SidebarLink icon={<FaChartBar />}text="My Profile"    to="/profile" onClick={onClose} />

      {/* ── Marketplace ── */}
      <SectionTitle>MARKETPLACE</SectionTitle>
      <SidebarLink icon={<FaStore />}   text="Browse Listings" to="/marketplace" onClick={onClose} />
      {token && <>
        <SidebarLink icon={<FaGift />}    text="Sell an Item"   to="/marketplace/sell" onClick={onClose} />
        <SidebarLink icon={<FaDownload />}text="Rent Out"       to="/marketplace/rent" onClick={onClose} />
        <SidebarLink icon={<FaFolder />}  text="My Listings"    to="/marketplace/my-listings" onClick={onClose} />
        <SidebarLink icon={<FaFolderOpen/>}text="My Orders"     to="/marketplace/orders" onClick={onClose} />
      </>}

      {/* ── Discover ── */}
      <SectionTitle>DISCOVER</SectionTitle>
      <SidebarLink icon={<FaFire />}    text="New & Trending"  to="/collection/new" onClick={onClose} />
      <SidebarLink icon={<FaStar />}    text="Top Rated"       to="/collection/top" onClick={onClose} />
      <SidebarLink icon={<FaTrophy />}  text="Best of 2024"    to="/collection/best2024" onClick={onClose} />
      <SidebarLink icon={<MdFastForward />} text="Coming Soon" to="/collection/upcoming" onClick={onClose} />
      <SidebarLink icon={<MdCalendarMonth />} text="Recently Added" to="/collection/recent" onClick={onClose} />

      {/* ── Platforms ── */}
      <SectionTitle>PLATFORMS</SectionTitle>
      <SidebarLink icon={<FaWindows />}     text="PC"          to="/collection/pc" onClick={onClose} />
      <SidebarLink icon={<FaPlaystation />} text="PlayStation" to="/collection/playstation" onClick={onClose} />
      <SidebarLink icon={<FaXbox />}        text="Xbox"        to="/collection/xbox" onClick={onClose} />

      {/* ── More ── */}
      <SectionTitle>MORE</SectionTitle>
      <SidebarLink icon={<FaCrown />}       text="Collections" to="/collections" onClick={onClose} />
      <SidebarLink icon={<FaFolderOpen />}  text="Platforms"   to="/platforms" onClick={onClose} />
      <SidebarLink icon={<FaStore />}       text="Stores"      to="/stores" onClick={onClose} />
      <SidebarLink icon={<FaUsers />}       text="Community"   to="/community" onClick={onClose} />
    </aside>
  );
}

export default RawgSidebar;