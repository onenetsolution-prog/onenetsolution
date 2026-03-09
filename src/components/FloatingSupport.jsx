import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { MessageCircle, Phone, X, Headphones } from 'lucide-react';

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('settings_key', 'main')
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Failed to fetch app settings:', err);
        return null;
      }
    }
  });

  const waNumber   = settings?.whatsapp_number || '';
  const callNumber = settings?.call_number     || '';

  if (!waNumber && !callNumber) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {open && (
        <>
          {waNumber && (
            <button
              onClick={() => window.open(`https://wa.me/91${waNumber}`, '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#25d366', color: '#fff',
                border: 'none', borderRadius: 50, padding: '10px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
                animation: 'slideUp 0.2s ease',
              }}
            >
              <MessageCircle size={16} />
              WhatsApp Support
            </button>
          )}
          {callNumber && (
            <button
              onClick={() => window.open(`tel:${callNumber}`, '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#4f46e5', color: '#fff',
                border: 'none', borderRadius: 50, padding: '10px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
                animation: 'slideUp 0.2s ease',
              }}
            >
              <Phone size={16} />
              Call Support
            </button>
          )}
        </>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 52, height: 52,
          background: open ? 'var(--ink-700)' : 'linear-gradient(135deg, #4f46e5, #818cf8)',
          color: '#fff', border: 'none', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        {open ? <X size={20} /> : <Headphones size={20} />}
      </button>
    </div>
  );
}