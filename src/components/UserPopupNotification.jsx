import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Bell, X, ChevronRight } from 'lucide-react';
import { formatServerTime } from '../utils/serverTimeEnforcement';

export default function UserPopupNotification({ notifications }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);

  const current = notifications[index];

  const markRead = useMutation({
    mutationFn: async (id) => {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    }
  });

  const handleDismiss = () => {
    markRead.mutate(current.id);
    if (index < notifications.length - 1) {
      setIndex(index + 1);
    }
  };

  const handleDismissAll = () => {
    notifications.forEach(n => markRead.mutate(n.id));
  };

  if (!current) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--ink-100)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--brand-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Bell size={18} color="var(--brand)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-900)' }}>
              {current.title}
            </div>
            {notifications.length > 1 && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>
                Notification {index + 1} of {notifications.length}
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleDismissAll}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>
            {current.message}
          </p>
          {current.created_at && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 12 }}>
              {formatServerTime(current.created_at, 'dd MMM yyyy, HH:mm')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--ink-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button className="btn btn-ghost btn-sm" onClick={handleDismissAll}>
            Dismiss All
          </button>
          <button className="btn btn-primary" onClick={handleDismiss}>
            {index < notifications.length - 1 ? (
              <>Next <ChevronRight size={15} /></>
            ) : (
              'Got It'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}