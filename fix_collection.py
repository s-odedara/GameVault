import os
import re

file_path = 'frontend/src/pages/CollectionPage.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add viewMode state
content = content.replace(
    "const [platformFilter, setPlatformFilter] = useState('');",
    "const [platformFilter, setPlatformFilter] = useState('');\n  const [viewMode, setViewMode] = useState('grid');"
)

# Update Display options icons
icons_original = """        <div className="d-none d-md-flex align-items-center gap-2 text-muted fs-5">
          <span className="fs-6 me-2">Display options:</span>
          <BsGrid3X3GapFill className="text-white cursor-pointer" />
          <BsUiRadiosGrid className="cursor-pointer" style={{ opacity: 0.5 }} />
        </div>"""

icons_new = """        <div className="d-none d-md-flex align-items-center gap-2 text-muted fs-5">
          <span className="fs-6 me-2">Display options:</span>
          <BsGrid3X3GapFill 
            className={`cursor-pointer ${viewMode === 'grid' ? 'text-white' : ''}`}
            style={{ opacity: viewMode === 'grid' ? 1 : 0.5 }}
            onClick={() => setViewMode('grid')}
          />
          <BsUiRadiosGrid 
            className={`cursor-pointer ${viewMode === 'list' ? 'text-white' : ''}`} 
            style={{ opacity: viewMode === 'list' ? 1 : 0.5 }} 
            onClick={() => setViewMode('list')}
          />
        </div>"""
content = content.replace(icons_original, icons_new)

# Update the grid layout
grid_original = """        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
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
                <div className="card-body p-3">"""

grid_new = """        <div className={viewMode === 'grid' ? "row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4" : "d-flex flex-column gap-3"}>
          {games.map(game => (
            <div key={game.id} className={viewMode === 'grid' ? "col" : "w-100"}>
              <div 
                className={`card border-0 ${viewMode === 'grid' ? 'h-100' : 'flex-row align-items-center'}`} 
                style={{ 
                  backgroundColor: '#202020', 
                  borderRadius: '12px',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = viewMode === 'grid' ? 'scale(1.03)' : 'scale(1.01)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Link to={`/global-game/${game.id}`} style={viewMode === 'grid' ? {} : { width: '280px', flexShrink: 0 }}>
                  <img 
                    src={game.background_image || 'https://placehold.co/600x400'} 
                    className="card-img-top" 
                    alt={game.name || 'Game Image'} 
                    style={{ 
                      height: '200px', 
                      objectFit: 'cover', 
                      borderRadius: viewMode === 'grid' ? '12px 12px 0 0' : '12px 0 0 12px' 
                    }}
                  />
                </Link>
                <div className="card-body p-3 d-flex flex-column h-100" style={viewMode === 'grid' ? {} : { flex: 1, padding: '24px' }}>"""
content = content.replace(grid_original, grid_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("CollectionPage.jsx updated.")
