import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');
  const [validSession, setValidSession] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Disable any auth redirects while on reset password page
    window.__isResettingPassword = true;

    const handleAuthCallback = async () => {
      try {
        // Check for ?code= in URL (newer Supabase PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        // Check for #access_token in hash (older Supabase flow)
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (code) {
          // Handle PKCE code flow
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setSessionError('This reset link is invalid or has expired. Please request a new one.');
          } else {
            setValidSession(true);
          }
        } else if (accessToken && type === 'recovery') {
          // Handle legacy hash flow
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) {
            setSessionError('This reset link is invalid or has expired. Please request a new one.');
          } else {
            setValidSession(true);
          }
        } else {
          // Check if already has valid session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setValidSession(true);
          } else {
            setSessionError('Invalid or expired reset link. Please request a new one.');
          }
        }
      } catch (err) {
        setSessionError('Something went wrong. Please request a new reset link.');
      } finally {
        setCheckingSession(false);
      }
    };

    handleAuthCallback();

    return () => {
      window.__isResettingPassword = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(password)) { setError('Must contain at least one uppercase letter.'); return; }
    if (!/[a-z]/.test(password)) { setError('Must contain at least one lowercase letter.'); return; }
    if (!/[0-9]/.test(password)) { setError('Must contain at least one number.'); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError('Must contain at least one special character (!@#$%^&*).'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true); setLoading(false);
    setTimeout(() => navigate('/login', { replace: true }), 3000);
  };

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasLength = password.length >= 8;
  const metCount = [hasUpper, hasLower, hasNumber, hasSpecial, hasLength].filter(Boolean).length;
  const strength = password.length === 0 ? 0 : metCount <= 2 ? 1 : metCount === 3 ? 2 : metCount === 4 ? 3 : 4;
  const strengthColor = strength <= 1 ? '#ef4444' : strength === 2 ? '#f59e0b' : strength === 3 ? '#6366f1' : '#22c55e';
  const strengthLabel = password.length === 0 ? 'Enter a password' : strength <= 1 ? 'Too weak' : strength === 2 ? 'Weak' : strength === 3 ? 'Good' : 'Strong';

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden', padding: '24px 16px' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top: '-100px', left: '-100px', borderRadius: '50%', animation: 'float1 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom: '-80px', right: '-80px', borderRadius: '50%', animation: 'float2 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, animation: 'slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 40px 36px', boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 32px rgba(99,102,241,0.5)', marginBottom: 18 }}>
              <Zap size={26} color="#fff" fill="#fff" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {done ? 'Password Updated!' : 'Set New Password'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500 }}>
              {done ? 'Redirecting to login in 3 seconds...' : 'Choose a strong new password'}
            </p>
          </div>

          {checkingSession ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Verifying reset link...</p>
            </div>
          ) : sessionError ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
                ⚠ {sessionError}
              </div>
              <a href="/forgot-password" style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                Request a new reset link
              </a>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={28} color="#4ade80" />
              </div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                Your password has been updated successfully.<br />
                You'll be redirected to login shortly.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠</span> {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>

                {/* New password */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px 44px 13px 40px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit' }}
                      onFocus={e => { e.target.style.border = '1px solid rgba(99,102,241,0.7)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                      onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }} />
                    <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0 }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Strength bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'all 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: password.length > 0 ? strengthColor : 'rgba(255,255,255,0.3)' }}>{strengthLabel}</div>
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type={showPw ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: `1px solid ${confirm && confirm !== password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, padding: '13px 14px 13px 40px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit' }}
                      onFocus={e => { e.target.style.border = '1px solid rgba(99,102,241,0.7)'; e.target.style.background = 'rgba(99,102,241,0.08)'; }}
                      onBlur={e => { e.target.style.border = confirm && confirm !== password ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }} />
                  </div>
                  {confirm && confirm !== password && (
                    <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 5 }}>Passwords don't match</div>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '14px', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.4)', fontFamily: 'inherit' }}>
                  {loading
                    ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Updating...</>
                    : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>Powered by One Net Solution ★</div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-40px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1a1a2e inset !important; -webkit-text-fill-color: #fff !important; }
      `}</style>
    </div>
  );
}