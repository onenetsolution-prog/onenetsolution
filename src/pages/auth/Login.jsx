import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, FileText, IndianRupee, BarChart3, Printer, Zap, Check, X } from 'lucide-react';
import './Login.css';

const FEATURES = [
  { icon: FileText,    color: '#818cf8', title: 'Service Entry Logging',   sub: 'Track customer service requests with custom fields per service type' },
  { icon: IndianRupee, color: '#34d399', title: 'Payment & Work Tracking', sub: 'Know exact payment status and work completion at all times' },
  { icon: Printer,     color: '#fbbf24', title: 'GST Invoice Generation',  sub: 'Create professional invoices with automatic GST calculation' },
  { icon: BarChart3,   color: '#38bdf8', title: 'Real-time Analytics',     sub: 'Daily collections, revenue trends, and service distribution breakdown' },
  { icon: Shield,      color: '#a78bfa', title: 'Bank-Grade Security',     sub: 'End-to-end encrypted. Only you can access your center data' },
];

const PARTICLES = [
  { left: '15%', delay: '0s',   dur: '12s' },
  { left: '28%', delay: '2.5s', dur: '16s' },
  { left: '42%', delay: '5s',   dur: '14s' },
  { left: '58%', delay: '1s',   dur: '18s' },
  { left: '72%', delay: '7s',   dur: '11s' },
  { left: '85%', delay: '3.5s', dur: '15s' },
];

// PASSWORD VALIDATION
const validatePassword = (password) => {
  return {
    hasMinLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
};

const isPasswordValid = (password) => {
  const validation = validatePassword(password);
  return (
    validation.hasMinLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecialChar
  );
};

export default function Login() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [pwValidation, setPwValidation] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const rafRef = useRef(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkSession();
  }, [navigate]);

  // Mouse tracking for custom cursor
  useEffect(() => {
    let mx = -100, my = -100, rx = -100, ry = -100;
    let running = true;

    const dotEl = document.querySelector('.lg-cursor-dot');
    const ringEl = document.querySelector('.lg-cursor-ring');

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;

      // Check if hovering over interactive elements
      const target = document.elementFromPoint(mx, my);
      const isInteractive = target?.closest('a, button, input, label, .lg-inp, .lg-eye, [role="button"]');
      
      if (isInteractive) {
        dotEl?.classList.add('hover');
        ringEl?.classList.add('hover');
      } else {
        dotEl?.classList.remove('hover');
        ringEl?.classList.remove('hover');
      }
    };

    const animate = () => {
      if (!running) return;
      
      // Smooth interpolation for ring with easing
      rx += (mx - rx) * 0.06;
      ry += (my - ry) * 0.06;
      
      // Direct DOM updates for better performance
      if (dotEl) dotEl.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      if (ringEl) ringEl.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Validate password on change
  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPwValidation(validatePassword(pwd));
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password requirements
    if (!isPasswordValid(password)) {
      setError('Password must meet all requirements');
      return;
    }

    setLoading(true);

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (err) {
        // User-friendly error messages
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else if (err.message.includes('Too many')) {
          setError('Too many login attempts. Please try again later.');
        } else {
          setError(err.message || 'Login failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Redirect all authenticated users to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom cursor */}
      <div className="lg-cursor-dot" />
      <div className="lg-cursor-ring" />

      <div className="lg-root">

        {/* ══ LEFT ══ */}
        <div className="lg-left">
          <div className="lg-blob lg-blob-a"/>
          <div className="lg-blob lg-blob-b"/>
          <div className="lg-blob lg-blob-c"/>

          {/* Particles */}
          {PARTICLES.map((p, i) => (
            <div key={i} className="lg-particle" style={{
              left: p.left, animationDelay: p.delay, animationDuration: p.dur,
              width: i % 2 === 0 ? '2px' : '3px', height: i % 2 === 0 ? '2px' : '3px',
              opacity: 0.6 + (i * 0.06),
            }}/>
          ))}

          <div className="lg-hline" style={{ top: '28%', width: '75%', left: '8%' }}/>
          <div className="lg-hline" style={{ top: '66%', width: '55%', left: '16%', opacity: 0.35 }}/>
          <div className="lg-vline"/>
          <div className="lg-vline-dot"/>

          {/* Brand */}
          <div className="lg-top">
            <div className="lg-brand">
              <div className="lg-brand-ico">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="lg-brand-name">One Net Solution</div>
                <div className="lg-brand-tag">CSC Center Manager</div>
              </div>
            </div>
          </div>

          {/* Hero */}
          <div className="lg-hero">
            <div className="lg-badge"><span className="lg-badge-dot"/>Trusted by CSC Operators</div>
            <h1 className="lg-headline">
              Your entire center.<br/>
              <em>One</em> dashboard.<br/>
              Zero complexity.
            </h1>
            <p className="lg-desc">
              Manage everything your CSC does — entry logging, payment tracking,
              invoice generation with GST, and financial analytics. Simple enough
              for any operator. Powerful enough for 500+ centers.
            </p>
            <div className="lg-features">
              {FEATURES.map(({ icon: Icon, color, title, sub }) => (
                <div key={title} className="lg-feat">
                  <div className="lg-feat-ico"><Icon size={15} color={color} strokeWidth={2} aria-hidden="true"/></div>
                  <div>
                    <div className="lg-feat-title">{title}</div>
                    <div className="lg-feat-sub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="lg-bottom">
            <div className="lg-stat">
              <div className="lg-stat-val">500+</div>
              <div className="lg-stat-lbl">CSC Centers</div>
            </div>
            <div className="lg-stat-sep"/>
            <div className="lg-stat">
              <div className="lg-stat-val">50K+</div>
              <div className="lg-stat-lbl">Entries Logged</div>
            </div>
            <div className="lg-stat-sep"/>
            <div className="lg-govt">
              Designed for Aadhaar, PAN,<br/>
              Banking, Insurance &amp; Govt. Schemes
            </div>
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="lg-right">
          <div className="lg-right-blob-a"/>
          <div className="lg-right-blob-b"/>
          <div className="lg-right-grid"/>

          <div className="lg-card">
            <div className="lg-form-head">
              <div className="lg-eyebrow">Operator Login</div>
              <h2 className="lg-form-title">Sign in to your<br/>center account</h2>
              <p className="lg-form-sub">Enter your registered email and password to access your dashboard.</p>
            </div>

            {error && (
              <div className="lg-err" role="alert" aria-live="polite">
                <span className="lg-err-dot"/>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="lg-field">
                <label className="lg-lbl" htmlFor="email-input">Email Address</label>
                <div className="lg-inp-wrap">
                  <span className="lg-ico" aria-hidden="true"><Mail size={14}/></span>
                  <input
                    id="email-input"
                    className="lg-inp" 
                    type="email" 
                    required
                    placeholder="yourname@email.com"
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    aria-label="Email address"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="lg-field">
                <label className="lg-lbl" htmlFor="password-input">Password</label>
                <div className="lg-inp-wrap">
                  <span className="lg-ico" aria-hidden="true"><Lock size={14}/></span>
                  <input
                    id="password-input"
                    className="lg-inp"
                    type={showPw ? 'text' : 'password'} 
                    required
                    placeholder="Enter your password"
                    value={password} 
                    onChange={handlePasswordChange}
                    style={{ paddingRight: 42 }}
                    aria-label="Password"
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="lg-eye" 
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>

              {password && (
                <div className="lg-pw-feedback" role="status" aria-live="polite">
                  <div className={`lg-pw-check ${pwValidation.hasMinLength ? 'valid' : 'invalid'}`}>
                    <span className="lg-pw-check-icon">{pwValidation.hasMinLength ? '✓' : '✕'}</span>
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`lg-pw-check ${pwValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                    <span className="lg-pw-check-icon">{pwValidation.hasUppercase ? '✓' : '✕'}</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div className={`lg-pw-check ${pwValidation.hasLowercase ? 'valid' : 'invalid'}`}>
                    <span className="lg-pw-check-icon">{pwValidation.hasLowercase ? '✓' : '✕'}</span>
                    <span>One lowercase letter (a-z)</span>
                  </div>
                  <div className={`lg-pw-check ${pwValidation.hasNumber ? 'valid' : 'invalid'}`}>
                    <span className="lg-pw-check-icon">{pwValidation.hasNumber ? '✓' : '✕'}</span>
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`lg-pw-check ${pwValidation.hasSpecialChar ? 'valid' : 'invalid'}`}>
                    <span className="lg-pw-check-icon">{pwValidation.hasSpecialChar ? '✓' : '✕'}</span>
                    <span>One special character (!@#$%^&*)</span>
                  </div>
                </div>
              )}

              <div className="lg-forgot">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              <button 
                type="submit" 
                className="lg-submit" 
                disabled={loading || !isPasswordValid(password)}
                aria-busy={loading}
              >
                {loading
                  ? <><div className="lg-spin"/> Signing in…</>
                  : <>Sign In <ArrowRight size={14} aria-hidden="true"/></>
                }
              </button>
            </form>

            <div className="lg-secure" aria-label="Security information">
              <Shield size={11} color="#94a3b8" aria-hidden="true"/>
              Your data is encrypted and secure
            </div>

            <div className="lg-divider">New to the platform?</div>

            <div className="lg-foot">
              <Link to="/signup">Create a free account</Link>
              {' '}— No credit card required
            </div>
          </div>
        </div>

      </div>
    </>
  );
}