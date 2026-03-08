import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [signupEmail, setSignupEmail] = useState(''); // Track email after signup for verification screen

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } }
    });
    if (err) { setError(err.message); setLoading(false); return; }
    // Show email verification screen instead of navigating immediately
    setSignupEmail(form.email);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '13px 14px 13px 40px',
    fontSize: 14, color: '#fff', outline: 'none',
    transition: 'all 0.2s', fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    color: 'rgba(255,255,255,0.55)', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.6,
  };

  const iconStyle = {
    position: 'absolute', left: 14, top: '50%',
    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)',
  };

  const onFocus = e => { e.target.style.border = '1px solid rgba(99,102,241,0.7)'; e.target.style.background = 'rgba(99,102,241,0.08)'; };
  const onBlur  = e => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; };

  const perks = ['50 free entries/month', 'No credit card required', 'Cancel anytime'];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      padding: '24px 16px',
    }}>

      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(79,70,229,0.16) 0%, transparent 70%)',
        top: '-150px', right: '-100px', borderRadius: '50%',
        animation: 'float1 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        bottom: '-100px', left: '-80px', borderRadius: '50%',
        animation: 'float2 11s ease-in-out infinite',
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 460,
        animation: 'slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
      }}>

        {/* Email Verification Screen */}
        {signupEmail ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
            padding: '60px 40px', textAlign: 'center',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
            }}>
              <Mail size={32} color="#fff" />
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: '#fff',
              marginBottom: 8, letterSpacing: '-0.5px',
            }}>
              Check Your Email
            </h1>
            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12,
            }}>
              We sent a verification link to:
            </p>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#818cf8',
              background: 'rgba(99,102,241,0.12)', padding: '12px 16px',
              borderRadius: 12, marginBottom: 24, wordBreak: 'break-all',
            }}>
              {signupEmail}
            </div>
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              padding: '14px 16px', borderRadius: 12, marginBottom: 24,
              fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
            }}>
              Click the link in the email to verify your account. This helps us protect your data and keep your account secure.
            </div>
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20,
            }}>
              Didn't receive the email? Check your spam folder or create a new account.
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              style={{
                width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                fontSize: 15, fontWeight: 700, color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: '0.2px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)';
              }}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
        {/* Perks strip */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20,
          marginBottom: 20, flexWrap: 'wrap',
        }}>
          {perks.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
              <CheckCircle2 size={13} color="#6366f1" />
              {p}
            </div>
          ))}
        </div>

        {/* Glass card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '40px 40px 36px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
              marginBottom: 18,
            }}>
              <Zap size={26} color="#fff" fill="#fff" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Create Your Account
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500 }}>
              One Net Solution · CSC Center Manager
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', padding: '11px 14px', borderRadius: 12,
              fontSize: 13, fontWeight: 600, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSignup}>

            {/* Full Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={iconStyle} />
                <input
                  type="text" name="fullName" required
                  placeholder="Your full name"
                  value={form.fullName} onChange={handleChange}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={iconStyle} />
                <input
                  type="email" name="email" required
                  placeholder="you@example.com"
                  value={form.email} onChange={handleChange}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            </div>

            {/* Password row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={iconStyle} />
                  <input
                    type={showPw ? 'text' : 'password'} name="password" required
                    placeholder="Min 6 chars"
                    value={form.password} onChange={handleChange}
                    style={{ ...inputStyle, paddingRight: 38 }}
                    onFocus={onFocus} onBlur={onBlur}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Confirm</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={iconStyle} />
                  <input
                    type={showPw ? 'text' : 'password'} name="confirm" required
                    placeholder="Repeat password"
                    value={form.confirm} onChange={handleChange}
                    style={inputStyle} onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 15, fontWeight: 700, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.4)',
                transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: '0.2px',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)'; }}
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Creating account...
                </>
              ) : (
                <> Create Free Account <ArrowRight size={16} /> </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#a5b4fc'}
              onMouseLeave={e => e.target.style.color = '#818cf8'}>
              Sign in
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
          Powered by One Net Solution ★
        </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes float1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.08); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #1a1a2e inset !important;
          -webkit-text-fill-color: #fff !important;
        }
      `}</style>
    </div>
  );
}