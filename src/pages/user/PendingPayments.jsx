import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getServerTimestamp } from '../../hooks/useServerTime';
import { toast } from 'sonner';
import { CreditCard, MessageCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingPayments() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [editId,      setEditId]      = useState(null);
  const [receivedAmt, setReceivedAmt] = useState('');

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-payments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('*')
        .eq('user_id', user.id)
        .neq('payment_status', 'paid')
        .order('entry_date', { ascending: true });
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payment_status, received_payment, total_cost, service_cost }) => {
      const pending = Math.max(0, total_cost - received_payment);
      const profit  = Math.max(0, received_payment - service_cost);
      const { error } = await supabase
        .from('service_entries')
        .update({ payment_status, received_payment, pending_payment: pending, profit, updated_at: getServerTimestamp() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-entries'] });
      setEditId(null);
      toast.success('Payment updated');
    },
    onError: () => toast.error('Failed to update payment')
  });

const handleWhatsApp = useCallback((entry) => {
  const mobile = (entry.mobile || '').replace(/\D/g, '').slice(-10);
  if (!mobile) { toast.error('No mobile number for this customer'); return; }

  const pendingAmt = entry.pending_payment || 0;
  const upiId      = profile?.upi_id || '';
  const upiName    = profile?.upi_name || profile?.full_name || '';
  const bizName    = profile?.business_name || 'Our CSC Center';
  const entryDate  = entry.entry_date ? format(new Date(entry.entry_date), 'dd MMM yyyy') : '';

  let msg = `*Payment Reminder*\n\n`;
  msg += `Dear *${entry.customer_name}* \n\n`;
  msg += `You have a pending payment at *${bizName}*.\n\n`;
  msg += `*Service:* ${entry.service_name}\n`;
  msg += `*Date:* ${entryDate}\n\n`;
  msg += `*Payment Summary:*\n`;
  msg += `- Total: ₹${(entry.total_cost || 0).toLocaleString('en-IN')}\n`;
  msg += `- Paid: ₹${(entry.received_payment || 0).toLocaleString('en-IN')}\n`;
  msg += `- Due: ₹${pendingAmt.toLocaleString('en-IN')}\n`;

  if (upiId) {
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}%26pn=${encodeURIComponent(upiName)}%26am=${pendingAmt}%26tn=${encodeURIComponent(entry.service_name)}`;
    msg += `\n *Pay Now via UPI:*\n`;
    msg += `${qrLink}\n`;
  }

  msg += `\nPlease clear the due amount at your earliest convenience.\n`;
  msg += `_Thank you!_ \n`;
  msg += `*${bizName}*`;
  if (profile?.mobile) msg += `\n${profile.mobile}`;

  window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
}, [profile]);

const totalPending = useMemo(() => entries.reduce((s, e) => s + (e.pending_payment || 0), 0), [entries]);
const hasUpi = !!(profile?.upi_id);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Payments</h1>
          <p className="page-subtitle">{entries.length} entries with outstanding payments</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--danger)', letterSpacing: 0.5 }}>Total Pending</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>Rs.{totalPending.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {!hasUpi && entries.length > 0 && (
        <div style={{ marginBottom: 16, background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>
            Add your UPI ID in <strong>Profile → My UPI Payment Details</strong> to include UPI info in reminders.
          </div>
        </div>
      )}

      <div className="table-wrap">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[2,1,1,1,1,1,1].map((f, j) => <div key={j} className="skeleton" style={{ flex: f, height: 18 }} />)}
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={40} />
            <p>No pending payments</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>All payments have been collected</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Pending</th>
                  <th>Update</th>
                  <th>Remind</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{entry.customer_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{entry.mobile}</div>
                    </td>
                    <td>{entry.service_name}</td>
                    <td style={{ color: 'var(--ink-500)' }}>
                      {entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs.{(entry.total_cost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Rs.{(entry.received_payment || 0).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 700 }}>Rs.{(entry.pending_payment || 0).toLocaleString('en-IN')}</td>

                    <td>
                      {editId === entry.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number" className="form-input"
                            style={{ width: 90, padding: '5px 8px', fontSize: 13 }}
                            placeholder="Amount" value={receivedAmt}
                            onChange={e => setReceivedAmt(e.target.value)}
                          />
                          <button className="btn btn-primary btn-sm"
                            onClick={() => updateMutation.mutate({
                              id: entry.id,
                              payment_status: parseFloat(receivedAmt) >= entry.total_cost ? 'paid' : 'partially paid',
                              received_payment: parseFloat(receivedAmt) || 0,
                              total_cost: entry.total_cost,
                              service_cost: entry.service_cost,
                            })}>Save</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>X</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm"
                            style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
                            onClick={() => updateMutation.mutate({
                              id: entry.id, payment_status: 'paid',
                              received_payment: entry.total_cost,
                              total_cost: entry.total_cost,
                              service_cost: entry.service_cost,
                            })}>Mark Paid</button>
                          <button className="btn btn-sm btn-secondary"
                            onClick={() => { setEditId(entry.id); setReceivedAmt(entry.received_payment || ''); }}>
                            Partial
                          </button>
                        </div>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={() => handleWhatsApp(entry)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: 8, border: 'none',
                          background: '#dcfce7', color: '#15803d',
                          fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <MessageCircle size={14} />
                        Remind
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
