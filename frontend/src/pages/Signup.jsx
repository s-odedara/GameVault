import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { GoogleLogin } from '@react-oauth/google'
import { API_BASE_URL } from '../utils/constants'

function Signup() {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      // Response ko JSON mein convert karo chahe success ho ya fail
      const data = await response.json();

      if (!response.ok) {
        // Django ka asli error pakdo
        // Django usually errors aise bhejta hai: {"username": ["already exists"]} ya {"password": ["too short"]}
        let errorMessage = "Signup failed! Please check your details.";

        if (data.username) errorMessage = `Username Error: ${data.username[0]}`;
        else if (data.password) errorMessage = `Password Error: ${data.password[0]}`;
        else if (data.error) errorMessage = data.error;

        throw new Error(errorMessage);
      }

      // Agar sab theek hai toh token save karo aur aage badho
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username); // 🔥 username bhi save karo
        localStorage.setItem('user_id', data.user_id);   // 🔥 apne khud ke posts pe Follow button chhupane ke liye
        // 🔥 FIX: alert() ki jagah ab toast() use ho raha hai, taaki pura
        // app consistent lage (baaki har jagah toast hi use hota hai)
        toast.success("Account Created Successfully! Welcome to GameVault 🎮");
        navigate('/');
      }

    } catch (error) {
      // Ab ye wahi error dikhayega jo sach mein backend se aaya hai
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
        toast.success('🚀 Account created with Google!');
        navigate('/');
      }
    })
    .catch(err => toast.error(err.message))
    .finally(() => setIsLoading(false));
  };

  return (
    <div className="container mt-5 d-flex justify-content-center">
      <div className="card bg-secondary text-white shadow border-0" style={{ width: '400px' }}>
        <div className="card-body p-4">
          <h2 className="text-warning text-center fw-bold mb-4">Create Account</h2>
          <form onSubmit={handleSignup}>
            <div className="mb-3">
              <label className="form-label text-light">Choose a Username</label>
              <input
                type="text"
                className="form-control bg-dark text-light border-0"
                placeholder="e.g., Kratos99"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="mb-4">
              <label className="form-label text-light">Create a Password</label>
              <input
                type="password"
                className="form-control bg-dark text-light border-0"
                placeholder="Enter secure password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn btn-warning w-100 fw-bold fs-5 mb-3" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => toast.error('Google Login Failed')}
            />
          </div>

          <div className="text-center">
            <span className="text-light">Already have an account? </span>
            <Link to="/login" className="text-warning text-decoration-none fw-bold">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
