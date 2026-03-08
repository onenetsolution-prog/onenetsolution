import { useState, useEffect } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Session Warning Modal
 * Shows 60 seconds before auto-logout
 */
export default function SessionWarningModal() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const { signOut } = useAuth();

  useEffect(() => {
    const handleSessionWarning = (e) => {
      setShowWarning(true);
      setCountdownSeconds(Math.ceil(e.detail.timeRemaining / 1000));
    };

    window.addEventListener('sessionWarning', handleSessionWarning);

    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning);
    };
  }, []);

  useEffect(() => {
    if (!showWarning) return;

    // Reset countdown to 60 when warning is shown
    setCountdownSeconds(60);

    const countdown = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setShowWarning(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [showWarning]);

  if (!showWarning) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        maxWidth: 420, width: '100%', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: '#fee2e2', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={28} color="#dc2626" />
        </div>

        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#1e1b4b',
          marginBottom: 8
        }}>
          Session Expiring Soon
        </h2>

        <p style={{
          fontSize: 14, color: '#6b7280', marginBottom: 24
        }}>
          You will be logged out in{' '}
          <strong style={{ color: '#dc2626', fontSize: 16 }}>
            {countdownSeconds}
          </strong>
          {' '}seconds due to inactivity.
        </p>

        <div style={{
          background: '#f9fafb', borderRadius: 12, padding: 12,
          marginBottom: 20, fontSize: 13, color: '#6b7280'
        }}>
          Click anywhere or move your mouse to stay logged in
        </div>

        <button
          onClick={() => signOut()}
          style={{
            width: '100%', padding: '12px 20px',
            background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#b91c1c';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#dc2626';
          }}
        >
          <LogOut size={16} /> Sign Out Now
        </button>
      </div>
    </div>
  );
}
