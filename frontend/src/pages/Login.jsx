import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { GoogleLogin } from '@react-oauth/google'
import { API_BASE_URL } from '../utils/constants';

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLogin, setIsLogin]   = useState(location.pathname !== '/signup')

  // Keep state in sync if URL changes (e.g. clicking Signup in Navbar while on Login page)
  useEffect(() => {
    setIsLogin(location.pathname !== '/signup')
  }, [location.pathname])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    if (!isLogin) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/
      if (!usernameRegex.test(username)) {
        toast.warning("Username must be 3-15 characters: letters, numbers, or underscores only")
        return false
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(password)) {
        toast.warning("Password must be 8+ chars with uppercase, lowercase, number & special character")
        return false
      }
    }
    return true
  }

  const handleGoogleLogin = (credentialResponse) => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    })
    .then(res => {
      if (!res.ok) throw new Error('Google Login Failed');
      return res.json();
    })
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('user_id', data.user_id);
        
        const displayName = data.actual_name || data.username;
        toast.success(isLogin ? `🟢 Welcome back, ${displayName}!` : `🚀 Account created, ${displayName}!`);
        navigate('/');
      }
    })
    .catch(err => toast.error(err.message))
    .finally(() => setIsLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsLoading(true)
    const url = isLogin ? `${API_BASE_URL}/login/` : `${API_BASE_URL}/register/`
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })
    .then(res => {
      if (!res.ok) throw new Error(isLogin ? 'Invalid credentials' : 'Username already exists')
      return res.json()
    })
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.username)
        localStorage.setItem('user_id', data.user_id)
        if (data.is_staff) {
          localStorage.setItem('is_staff', 'true')
          toast.success('👑 Welcome, Admin!')
          navigate('/admin-dashboard')
        } else {
          toast.success(isLogin ? '🟢 Welcome back!' : '🚀 Account created!')
          navigate('/')
        }
      }
    })
    .catch(err => toast.error(err.message))
    .finally(() => setIsLoading(false))
  }

  return (
    <div data-aos="fade-up" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 62px)', padding: '20px',
    }}>
      <div className="glass-modal" style={{ width: '100%', maxWidth: 420, padding: '40px 36px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 8 }}>🎮</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.8rem', marginBottom: 4 }}>
            {isLogin ? 'Welcome Back' : 'Join GameVault'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isLogin ? 'Sign in to access your vault' : 'Create your free account'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="checkout-label">Username</label>
            <input
              type="text"
              className="checkout-input"
              placeholder="e.g., gamer_99"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="checkout-label">Password</label>
            <input
              type="password"
              className="checkout-input"
              placeholder="Enter secure password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-gv-primary btn-bounce"
            style={{ width: '100%', padding: '13px 0', fontSize: '1rem',
                     fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            {isLoading ? '⏳ Processing…' : isLogin ? '🔓 Enter Vault' : '🚀 Create Account'}
          </button>
        </form>

        <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => toast.error('Google Login Failed')}
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          {' '}
          <span
            style={{ color: 'var(--accent-glow)', cursor: isLoading ? 'not-allowed' : 'pointer',
                     fontWeight: 600, textDecoration: 'underline' }}
            onClick={() => !isLoading && setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign up here' : 'Login here'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Login