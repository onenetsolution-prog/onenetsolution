import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Phone, MessageCircle, AlertTriangle } from 'lucide-react';

export default function SubscriptionBlock({ profile, entryCount }) {
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('settings_key', 'main')
        .single();
      return data;
    }
  });

  const amount  = settings?.subscription_amount || 999;
  const upiId   = settings?.upi_id || '';
  const adminName = settings?.admin_name || 'Admin';
  const waNumber  = settings?.whatsapp_number || '';
  const callNumber = settings?.call_number || '';

  const qrUrl = upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${adminName}&am=${amount}&cu=INR`)}&bgcolor=ffffff&color=000000&margin=10`
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(13,17,23,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        width: '100%', maxWidth: 480,
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <AlertTriangle size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
            Subscription Required
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            Your access has expired or reached its limit
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Plan Info */}
          <div style={{
            background: 'var(--ink-50)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 20,
            border: '1px solid var(--ink-200)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 8 }}>
              Subscription Details
            </div>
            {[
              ['Current Plan', profile?.plan || 'Trial'],
              ['Account Status', profile?.account_status || 'Inactive'],
              ['Entries Used', entryCount || 0],
              ['Subscription Amount', `Rs.${amount}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13.5 }}>
                <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontWeight: 700, color: 'var(--ink-800)', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-600)', marginBottom: 10 }}>
                Pay Rs.{amount} to activate
              </div>
              <img
                src={qrUrl}
                alt="UPI QR Code"
                style={{ width: 180, height: 180, borderRadius: 12, border: '2px solid var(--ink-200)' }}
              />
              {upiId && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 8 }}>
                  UPI ID: <strong>{upiId}</strong>
                </div>
              )}
            </div>
          )}

          {/* Contact Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {waNumber && (
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: '#25d366', boxShadow: 'none' }}
                onClick={() => window.open(`https://wa.me/91${waNumber}`, '_blank')}
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            )}
            {callNumber && (
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => window.open(`tel:${callNumber}`, '_blank')}
              >
                <Phone size={16} />
                Call Admin
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--ink-400)', textAlign: 'center', marginTop: 14 }}>
            After payment, contact admin to activate your account
          </div>
        </div>
      </div>
    </div>
  );
}