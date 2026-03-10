import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getServerTimestamp } from '../../hooks/useServerTime';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingWork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-work', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_status', 'pending')
        .order('entry_date', { ascending: true });
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase
        .from('service_entries')
        .update({ work_status: status, updated_at: getServerTimestamp() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-entries'] });
      toast.success('Work status updated');
    },
    onError: () => toast.error('Failed to update status')
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Work</h1>
          <p className="page-subtitle">{entries.length} entries pending completion</p>
        </div>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[2,1,1,1,1].map((f, j) => <div key={j} className="skeleton" style={{ flex: f, height: 18 }} />)}
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <p>No pending work</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>All work is completed</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Mobile</th>
                  <th>Entry Date</th>
                  <th>Payment</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{entry.customer_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{entry.fathers_name}</div>
                    </td>
                    <td>{entry.service_name}</td>
                    <td>{entry.mobile}</td>
                    <td style={{ color: 'var(--ink-500)' }}>
                      {entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${entry.payment_status === 'paid' ? 'badge-success' : entry.payment_status === 'partially paid' ? 'badge-warning' : 'badge-danger'}`}>
                        {entry.payment_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
                          onClick={() => updateMutation.mutate({ id: entry.id, status: 'completed' })}
                        >
                          Mark Completed
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
                          onClick={() => updateMutation.mutate({ id: entry.id, status: 'cancelled' })}
                        >
                          Cancel
                        </button>
                      </div>
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