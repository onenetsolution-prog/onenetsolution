import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Email Verification Banner
 * Shows if user's email is not verified yet
 * Allows resending verification email
 */
export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Check verification status on mount and periodically
  useEffect(() => {
    if (!user) return;

    const checkVerification = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setIsVerified(!!data.user?.email_confirmed_at);
      } catch (err) {
        console.error('Verification check error:', err);
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerification();

    // Check every 10 seconds (user might verify in another tab)
    const interval = setInterval(checkVerification, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleResendEmail = async () => {
    if (!user) return;
    setIsResending(true);

    try {
      const { error } = await supabase.auth.resendIdentityConfirmationLink({
        email: user.email,
        type: 'email_change'
      });

      if (error) {
        toast.error('Failed to resend email: ' + error.message);
      } else {
        toast.success('Verification email sent to ' + user.email);
      }
    } catch (err) {
      toast.error('Error resending email');
    } finally {
      setIsResending(false);
    }
  };

  if (checkingVerification || isVerified || !user) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderBottom: '2px solid #f59e0b',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <Mail size={18} color="#d97706" />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
          <strong>Email not verified.</strong> Check your inbox at{' '}
          <strong>{user.email}</strong> and click the verification link.
        </div>
      </div>
      <button
        onClick={handleResendEmail}
        disabled={isResending}
        style={{
          padding: '8px 16px', background: '#f59e0b', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
          cursor: isResending ? 'not-allowed' : 'pointer',
          opacity: isResending ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: 4,
          flexShrink: 0, transition: 'all 0.15s'
        }}
        onMouseEnter={e => {
          if (!isResending) e.currentTarget.style.background = '#d97706';
        }}
        onMouseLeave={e => {
          if (!isResending) e.currentTarget.style.background = '#f59e0b';
        }}
      >
        {isResending && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
        {isResending ? 'Sending...' : 'Resend Email'}
      </button>
    </div>
  );
}
