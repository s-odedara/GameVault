/**
 * GVSpinner — Universal GameVault loading animation.
 * Replaces ALL plain "Loading..." text across the app.
 *
 * Usage:
 *   <GVSpinner />                  — centered, large
 *   <GVSpinner size="sm" />        — inline small (24px)
 *   <GVSpinner label="Loading games…" />
 */
function GVSpinner({ size = 'md', label = 'Loading…', center = true }) {
  const dim = { sm: 24, md: 48, lg: 72 }[size] || 48;
  const border = { sm: 3, md: 4, lg: 5 }[size] || 4;
  const fontSize = { sm: '0.72rem', md: '0.85rem', lg: '1rem' }[size] || '0.85rem';

  const ring = {
    width:  dim,
    height: dim,
    borderRadius: '50%',
    border: `${border}px solid rgba(67, 97, 238, 0.15)`,
    borderTopColor: 'var(--accent-glow)',
    borderRightColor: 'var(--accent-primary)',
    animation: 'gv-spin 0.9s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  };

  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...(center ? { minHeight: size === 'sm' ? 'auto' : '160px' } : {}),
  };

  return (
    <>
      {/* Inject keyframes once (harmless if duplicated) */}
      <style>{`
        @keyframes gv-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gv-pulse-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={wrap}>
        <div style={{ position: 'relative', width: dim, height: dim }}>
          {/* Outer spinning ring */}
          <div style={ring} />
          {/* Inner pulsing dot */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: dim * 0.28,
            height: dim * 0.28,
            borderRadius: '50%',
            background: 'var(--accent-glow)',
            animation: 'gv-pulse-dot 1.4s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(0,212,255,0.6)',
          }} />
        </div>
        {label && size !== 'sm' && (
          <span style={{
            fontSize,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.5px',
          }}>
            {label}
          </span>
        )}
      </div>
    </>
  );
}

export default GVSpinner;
