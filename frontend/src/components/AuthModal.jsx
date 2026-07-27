import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, LogIn } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, API_BASE }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const endpoint = isSignUp ? `${API_BASE}/auth/signup` : `${API_BASE}/auth/login`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, name })
      });

      const data = await res.json();

      if (res.ok) {
        const userObj = {
          email: email,
          name: name || email.split('@')[0],
          role: role
        };
        onAuthSuccess(userObj, isSignUp ? 'Registered and logged in successfully!' : 'Signed in successfully!');
        onClose();
      } else {
        setErrorMsg(data.detail || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg('Could not connect to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: 'mock_google_id_token' })
      });

      const data = await res.json();
      if (res.ok) {
        const userObj = {
          email: 'user.google@gmail.com',
          name: 'Google User',
          role: role
        };
        onAuthSuccess(userObj, 'Signed in with Google successfully!');
        onClose();
      } else {
        setErrorMsg(data.detail || 'Google sign-in failed.');
      }
    } catch (err) {
      setErrorMsg('Google sign in endpoint unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-icon-badge">
            {role === 'admin' ? <Shield size={24} /> : <User size={24} />}
          </div>
          <h2>{isSignUp ? 'Create Aura Account' : 'Welcome Back'}</h2>
          <p className="auth-subtitle">
            {isSignUp ? 'Sign up to manage health bookings and preferences' : 'Sign in to access your Aura Health workspace'}
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="role-selector-tab">
          <button
            type="button"
            className={`role-tab-btn ${role === 'user' ? 'active' : ''}`}
            onClick={() => setRole('user')}
          >
            <User size={16} />
            <span>User Portal</span>
          </button>
          <button
            type="button"
            className={`role-tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            <Shield size={16} />
            <span>Admin Access</span>
          </button>
        </div>

        {errorMsg && <div className="auth-error-alert">{errorMsg}</div>}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-google-signin"
        >
          <svg className="google-svg-icon" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  required={isSignUp}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-auth-submit">
            <LogIn size={18} />
            <span>{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="auth-footer-toggle">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            type="button"
            className="toggle-auth-mode-btn"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
