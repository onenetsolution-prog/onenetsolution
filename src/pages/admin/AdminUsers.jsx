import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { format, addMonths, isAfter, isBefore, addDays } from 'date-fns';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Search, Edit2, Trash2, CreditCard, History, Eye, AlertTriangle, Download, X, Users, Tag } from 'lucide-react';
import { getServerTimestamp } from '../../hooks/useServerTime';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const EDGE_FUNCTION_URL = import.meta.env.VITE_EDGE_FUNCTION_URL || 'https://ufasuzknpatccufuygjw.supabase.co/functions/v1/clever-service';

export default function AdminUsers() {
  const { user } = useAuth();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search,       setSearch]       = useState('');
  const [filterPlan,   setFilterPlan]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editUser,     setEditUser]     = useState(null);
  const [payUser,      setPayUser]      = useState(null);
  const [historyUser,  setHistoryUser]  = useState(null);
  const [deleteUser,   setDeleteUser]   = useState(null);
  const [pricingUser,  setPricingUser]  = useState(null);
  const [editForm,     setEditForm]     = useState({});
  const [payForm,      setPayForm]      = useState({
    amount: '', plan: 'basic', expiry_date: '',
    payment_mode: 'UPI', note: ''
  });

  if (!user) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  // ── Fetch all users ──────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles').select('id, full_name, business_name, mobile, plan, account_status, expiry_date, address, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).filter(u => u.id !== user.id);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        return [];
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // ── Entry counts per user ────────────────────────────────────────────────
  const { data: entryCounts = {} } = useQuery({
    queryKey: ['admin-entry-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_entries').select('user_id');
      if (error) throw error;
      const counts = {};
      (data || []).forEach(e => { counts[e.user_id] = (counts[e.user_id] || 0) + 1; });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // ── App settings ─────────────────────────────────────────────────────────
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings').select('*')
        .eq('settings_key', 'main').maybeSingle();
      return data;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // ── Payment history ──────────────────────────────────────────────────────
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['payment-history', historyUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', historyUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!historyUser?.id,
    staleTime: 60000
  });

  // ── Update user profile ──────────────────────────────────────────────────
  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from('profiles').update(data).eq('id', editUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
    },
    onError: (e) => toast.error(e.message)
  });

  // ── Record payment ───────────────────────────────────────────────────────
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error: plError } = await supabase
        .from('payment_logs')
        .insert({
          user_id:        payUser.id,
          amount_paid:    parseFloat(payForm.amount),
          plan:           payForm.plan,
          extended_until: payForm.expiry_date,
          payment_mode:   payForm.payment_mode,
          notes:          payForm.note || null,
          payment_date:   getServerTimestamp().split('T')[0],
          recorded_by:    user.id,
        });
      if (plError) throw plError;

      const { error: profError } = await supabase
        .from('profiles')
        .update({
          plan:           payForm.plan,
          account_status: 'active',
          expiry_date:    payForm.expiry_date,
        })
        .eq('id', payUser.id);
      if (profError) throw profError;
    },
    onSuccess: () => {
      toast.success('Payment recorded & user activated!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', payUser?.id] });
      setPayUser(null);
      setPayForm({ amount: '', plan: 'basic', expiry_date: '', payment_mode: 'UPI', note: '' });
    },
    onError: (e) => toast.error(e.message)
  });

  // ── Delete user — removes from BOTH profiles AND Supabase Auth ──────────
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      // Step 1 — Get current admin session token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error('Could not get admin session. Please log in again.');
      }

      // Step 2 — Call Edge Function to delete from Supabase Auth
      // This removes the user's ability to log in permanently
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ user_id: deleteUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user from auth system');
      }

      // Step 3 — Log the deletion in audit log
      await supabase.from('admin_audit_log').insert({
        action: 'USER_DELETED',
        details: JSON.stringify({
          userId:  deleteUser.id,
          name:    deleteUser.full_name,
          email:   deleteUser.email,
        }),
        performed_by: user.email,
      });
    },
    onSuccess: () => {
      toast.success(`${deleteUser?.full_name || 'User'} deleted — they can no longer log in`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteUser(null);
    },
    onError: (e) => toast.error(e.message)
  });

  // ── Save custom subscription amount ──────────────────────────────────────
  const saveCustomSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, amount }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ custom_subscription_amount: amount === '' ? null : parseFloat(amount) })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Custom amount saved!');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.error(e.message)
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const today          = new Date();
  const sevenDaysLater = addDays(today, 7);
  const isExpiringSoon = (d) => d && isAfter(new Date(d), today) && isBefore(new Date(d), sevenDaysLater);
  const isExpired      = (d) => d && isBefore(new Date(d), today);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (u.full_name     || '').toLowerCase().includes(q)
      || (u.business_name || '').toLowerCase().includes(q)
      || (u.mobile        || '').includes(q);
    return matchSearch
      && (!filterPlan   || u.plan           === filterPlan)
      && (!filterStatus || u.account_status === filterStatus);
  });

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.account_status === 'active').length,
    trial:    users.filter(u => u.plan === 'trial' || !u.plan).length,
    inactive: users.filter(u => u.account_status === 'inactive').length,
    expiring: users.filter(u => isExpiringSoon(u.expiry_date)).length,
  };

  const exportUserCSV = async (u) => {
    const { data } = await supabase
      .from('service_entries').select('*')
      .eq('user_id', u.id).order('entry_date', { ascending: false });
    if (!data || data.length === 0) { toast.error('No entries to export'); return; }
    const headers = ['Date','Customer','Father','Mobile','Service','Work Status','Payment Status','Total','Received','Pending'];
    const rows    = data.map(e => [
      e.entry_date, e.customer_name, e.fathers_name, e.mobile,
      e.service_name, e.work_status, e.payment_status,
      e.total_cost, e.received_payment, e.pending_payment
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${u.full_name || u.id}_entries.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleLoginAs = (u) => {
    startImpersonation(u);
    navigate('/dashboard');
    toast.success(`Now viewing as ${u.full_name || 'User'}`);
  };

  const openEdit = (u) => {
    setEditForm({
      full_name:      u.full_name      || '',
      business_name:  u.business_name  || '',
      mobile:         u.mobile         || '',
      address:        u.address        || '',
      plan:           u.plan           || 'trial',
      account_status: u.account_status || 'trial',
      expiry_date:    u.expiry_date    || '',
      notes:          u.notes          || ''
    });
    setEditUser(u);
  };

  const openPay = (u) => {
    setPayForm({
      amount:       u.custom_subscription_amount?.toString() || settings?.subscription_amount?.toString() || '999',
      plan:         'basic',
      expiry_date:  format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      payment_mode: 'UPI',
      note:         ''
    });
    setPayUser(u);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color="var(--brand)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)', margin: 0 }}>Manage Users</h1>
        </div>
        <p style={{ color: 'var(--ink-400)', fontSize: 14, margin: 0, paddingLeft: 46 }}>{stats.total} registered operators</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Users',   value: stats.total,    color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Active',        value: stats.active,   color: '#10b981', bg: '#d1fae5' },
          { label: 'On Trial',      value: stats.trial,    color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Inactive',      value: stats.inactive, color: '#ef4444', bg: '#fee2e2' },
          { label: 'Expiring Soon', value: stats.expiring, color: '#f97316', bg: '#ffedd5' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: `1.5px solid ${s.bg}`, borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {stats.expiring > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#d97706" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
            {stats.expiring} user{stats.expiring > 1 ? 's' : ''} will expire within 7 days — record their payment now!
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'white', border: '1.5px solid var(--ink-200)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, business, mobile..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid var(--ink-200)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={selectStyle}>
          <option value="">All Plans</option>
          <option value="trial">Trial</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
          <option value="custom">Custom</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(search || filterPlan || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterPlan(''); setFilterStatus(''); }} style={secondaryBtnStyle}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Users table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1.5px solid var(--ink-200)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
              <thead>
                <tr style={{ background: 'var(--ink-50)' }}>
                  {['User & Business','Mobile','Plan','Status','Expiry','Sub. Amount','Entries','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', borderBottom: '1.5px solid var(--ink-200)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 50, textAlign: 'center', color: 'var(--ink-400)', fontSize: 14 }}>No users found</td></tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--ink-100)' : 'none',
                    background: isExpiringSoon(u.expiry_date)
                      ? '#fffbeb'
                      : isExpired(u.expiry_date) && u.account_status === 'active'
                        ? '#fff1f2'
                        : 'transparent',
                    transition: 'background 0.15s'
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-light)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                          {(u.full_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-900)' }}>{u.full_name || 'No Name'}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{u.business_name || 'No Business'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-600)' }}>{u.mobile || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><PlanBadge plan={u.plan} /></td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={u.account_status} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.expiry_date ? (
                        <span style={{ fontSize: 12, fontWeight: isExpiringSoon(u.expiry_date) ? 700 : 500, color: isExpired(u.expiry_date) ? '#ef4444' : isExpiringSoon(u.expiry_date) ? '#d97706' : 'var(--ink-600)' }}>
                          {format(new Date(u.expiry_date), 'dd/MM/yyyy')}
                          {isExpiringSoon(u.expiry_date) && ' ⚠️'}
                        </span>
                      ) : <span style={{ fontSize: 12, color: 'var(--ink-300)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <CustomAmountCell
                        user={u}
                        defaultAmount={settings?.subscription_amount}
                        onSave={(amount) => saveCustomSubscriptionMutation.mutate({ userId: u.id, amount })}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-700)' }}>
                        {entryCounts[u.id] || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <ActionBtn onClick={() => handleLoginAs(u)}  title="Login as user"   bg="#eef2ff" color="#4f46e5" icon={<Eye size={13} />} />
                        <ActionBtn onClick={() => openEdit(u)}        title="Edit user"       bg="#f0fdf4" color="#16a34a" icon={<Edit2 size={13} />} />
                        <ActionBtn onClick={() => openPay(u)}         title="Record payment"  bg="#fef3c7" color="#d97706" icon={<CreditCard size={13} />} />
                        <ActionBtn onClick={() => setHistoryUser(u)}  title="Payment history" bg="#f0f9ff" color="#0284c7" icon={<History size={13} />} />
                        <ActionBtn onClick={() => setPricingUser(u)}  title="Service pricing" bg="#fdf4ff" color="#9333ea" icon={<Tag size={13} />} />
                        <ActionBtn onClick={() => exportUserCSV(u)}   title="Export CSV"      bg="#f8fafc" color="#475569" icon={<Download size={13} />} />
                        <ActionBtn onClick={() => setDeleteUser(u)}   title="Delete user"     bg="#fff1f2" color="#e11d48" icon={<Trash2 size={13} />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <Modal title={`Edit — ${editUser.full_name || 'User'}`} onClose={() => setEditUser(null)}>
          {[
            { label: 'Full Name',     key: 'full_name',     type: 'text' },
            { label: 'Business Name', key: 'business_name', type: 'text' },
            { label: 'Mobile',        key: 'mobile',        type: 'tel'  },
            { label: 'Address',       key: 'address',       type: 'text' },
            { label: 'Expiry Date',   key: 'expiry_date',   type: 'date' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                type={f.type}
                value={editForm[f.key] || ''}
                onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Plan</label>
            <select value={editForm.plan} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))} style={{ ...inputStyle }}>
              <option value="trial">Trial</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Account Status</label>
            <select value={editForm.account_status} onChange={e => setEditForm(p => ({ ...p, account_status: e.target.value }))} style={{ ...inputStyle }}>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditUser(null)} style={secondaryBtnStyle}>Cancel</button>
            <button onClick={() => updateUserMutation.mutate(editForm)} disabled={updateUserMutation.isPending} style={primaryBtnStyle}>
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* PAYMENT MODAL */}
      {payUser && (
        <Modal title={`Record Payment — ${payUser.full_name || 'User'}`} onClose={() => setPayUser(null)}>
          <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ink-600)' }}>
            Current plan: <strong>{payUser.plan || 'trial'}</strong> | Expiry: <strong>{payUser.expiry_date ? format(new Date(payUser.expiry_date), 'dd/MM/yyyy') : 'Not set'}</strong>
            {payUser.custom_subscription_amount && (
              <span> | Custom price: <strong style={{ color: '#7c3aed' }}>Rs.{payUser.custom_subscription_amount}</strong></span>
            )}
          </div>
          {[
            { label: 'Amount Received (Rs.)', key: 'amount',      type: 'number', placeholder: '999' },
            { label: 'New Expiry Date',        key: 'expiry_date', type: 'date',   placeholder: ''    },
            { label: 'Note (optional)',         key: 'note',        type: 'text',   placeholder: 'e.g. Paid via GPay' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                type={f.type}
                value={payForm[f.key]}
                placeholder={f.placeholder}
                onChange={e => setPayForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>New Plan</label>
            <select value={payForm.plan} onChange={e => setPayForm(p => ({ ...p, plan: e.target.value }))} style={{ ...inputStyle }}>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Payment Mode</label>
            <select value={payForm.payment_mode} onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))} style={{ ...inputStyle }}>
              {['UPI','Cash','Bank Transfer','Other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setPayUser(null)} style={secondaryBtnStyle}>Cancel</button>
            <button
              onClick={() => recordPaymentMutation.mutate()}
              disabled={recordPaymentMutation.isPending}
              style={{ ...primaryBtnStyle, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
            >
              {recordPaymentMutation.isPending ? 'Saving...' : '✓ Record Payment & Activate'}
            </button>
          </div>
        </Modal>
      )}

      {/* PAYMENT HISTORY MODAL */}
      {historyUser && (
        <Modal title={`Payment History — ${historyUser.full_name || 'User'}`} onClose={() => setHistoryUser(null)} wide>
          {paymentHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-400)' }}>
              No payment records found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--ink-50)' }}>
                  {['Date','Amount','Plan','Mode','Extended Until','Note'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', borderBottom: '1px solid var(--ink-200)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {p.payment_date
                        ? format(new Date(p.payment_date), 'dd/MM/yyyy')
                        : p.created_at
                          ? format(new Date(p.created_at), 'dd/MM/yyyy')
                          : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>
                      Rs.{p.amount_paid}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <PlanBadge plan={p.plan} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>{p.payment_mode || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {p.extended_until ? format(new Date(p.extended_until), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--ink-500)' }}>
                      {p.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {/* SERVICE PRICING MODAL */}
      {pricingUser && <ServicePricingModal user={pricingUser} onClose={() => setPricingUser(null)} />}

      {/* DELETE MODAL */}
      {deleteUser && (
        <Modal title="Delete User" onClose={() => setDeleteUser(null)}>
          <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={16} color="#e11d48" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#9f1239' }}>This action cannot be undone</span>
            </div>
            <div style={{ fontSize: 13, color: '#9f1239', lineHeight: 1.6 }}>
              Deleting <strong>{deleteUser.full_name}</strong> will:
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>Remove their login access permanently</li>
                <li>Delete all their data and entries</li>
                <li>They will not be able to sign in again</li>
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteUser(null)} style={secondaryBtnStyle}>Cancel</button>
            <button
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
              style={{ ...primaryBtnStyle, background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : '🗑 Yes, Delete Permanently'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Inline custom subscription amount cell ───────────────────────────────────
function CustomAmountCell({ user, defaultAmount, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(user.custom_subscription_amount ?? '');

  const handleSave = () => { onSave(value); setEditing(false); };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="number" value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={defaultAmount || '999'}
          style={{ width: 80, padding: '4px 8px', border: '1.5px solid #7c3aed', borderRadius: 6, fontSize: 12, outline: 'none' }}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
        />
        <button onClick={handleSave} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>✓</button>
        <button onClick={() => setEditing(false)} style={{ background: 'var(--ink-100)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
      </div>
    );
  }
  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to set custom amount"
      style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '3px 8px', borderRadius: 6, border: '1.5px dashed var(--ink-200)', width: 'fit-content' }}
    >
      {user.custom_subscription_amount
        ? <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>Rs.{user.custom_subscription_amount}</span>
        : <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>Rs.{defaultAmount || '999'} <span style={{ fontSize: 10, color: 'var(--ink-300)' }}>(default)</span></span>}
      <Edit2 size={10} color="var(--ink-300)" />
    </div>
  );
}

// ── Service Pricing Modal ─────────────────────────────────────────────────────
function ServicePricingModal({ user, onClose }) {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['user-services-for-pricing', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_services').select('*')
        .eq('user_id', user.id).eq('is_active', true)
        .order('service_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: overrides = [], isLoading: loadingOverrides } = useQuery({
    queryKey: ['pricing-overrides', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_pricing_overrides').select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async ({ serviceId, fieldOption, serviceCost, totalCost }) => {
      const existing = overrides.find(o => o.service_id === serviceId && o.field_option === fieldOption);
      if (existing) {
        const { error } = await supabase.from('user_pricing_overrides')
          .update({ service_cost: serviceCost, total_cost: totalCost, updated_at: getServerTimestamp() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_pricing_overrides')
          .insert({ user_id: user.id, service_id: serviceId, field_option: fieldOption, service_cost: serviceCost, total_cost: totalCost });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-overrides', user.id] });
      toast.success('Price override saved!');
    },
    onError: (e) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ serviceId, fieldOption }) => {
      const existing = overrides.find(o => o.service_id === serviceId && o.field_option === fieldOption);
      if (existing) {
        const { error } = await supabase.from('user_pricing_overrides').delete().eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-overrides', user.id] });
      toast.success('Price override removed');
    },
    onError: (e) => toast.error(e.message)
  });

  const getPricingFields = (service) => {
    try {
      const fields = typeof service.fields === 'string' ? JSON.parse(service.fields) : service.fields;
      return (fields || []).filter(f => f.is_pricing_field === true && f.field_options && f.field_options.length > 0);
    } catch { return []; }
  };

  const getOverride = (serviceId, option) =>
    overrides.find(o => o.service_id === serviceId && o.field_option === option);

  return (
    <Modal title={`Service Pricing — ${user.full_name || 'User'}`} onClose={onClose} wide>
      <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16, background: '#fdf4ff', padding: '10px 14px', borderRadius: 10 }}>
        Set custom prices for this user's services. Leave blank to use default pricing.
      </div>
      {loadingServices || loadingOverrides ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-400)' }}>Loading services...</div>
      ) : services.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-400)' }}>
          <Tag size={32} style={{ marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
          <div>No active services found for this user</div>
        </div>
      ) : services.map(service => {
        const pricingFields = getPricingFields(service);
        if (pricingFields.length === 0) return (
          <div key={service.id} style={{ marginBottom: 12, padding: '12px 16px', border: '1.5px solid var(--ink-200)', borderRadius: 10, color: 'var(--ink-400)', fontSize: 13 }}>
            <strong>{service.service_name}</strong> — no pricing fields configured
          </div>
        );
        return (
          <div key={service.id} style={{ marginBottom: 20, border: '1.5px solid var(--ink-200)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'var(--ink-50)', padding: '10px 16px', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--ink-200)' }}>
              {service.service_name}
            </div>
            <div style={{ padding: '12px 16px' }}>
              {pricingFields.map(field => (
                <div key={field.field_id || field.field_label}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', letterSpacing: 0.5, marginBottom: 10 }}>
                    {field.field_label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {field.field_options.map(opt => {
                      const optLabel     = typeof opt === 'object' ? opt.label : opt;
                      const defaultPrice = typeof opt === 'object' ? opt.price : '';
                      const override     = getOverride(service.id, optLabel);
                      return (
                        <PricingRow
                          key={optLabel} label={optLabel}
                          defaultPrice={defaultPrice} override={override}
                          onSave={(sc, tc) => saveMutation.mutate({ serviceId: service.id, fieldOption: optLabel, serviceCost: sc, totalCost: tc })}
                          onReset={() => deleteMutation.mutate({ serviceId: service.id, fieldOption: optLabel })}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onClose} style={primaryBtnStyle}>Done</button>
      </div>
    </Modal>
  );
}

// ── Pricing Row ───────────────────────────────────────────────────────────────
function PricingRow({ label, defaultPrice, override, onSave, onReset }) {
  const [editing, setEditing] = useState(false);
  const [svcCost, setSvcCost] = useState(override?.service_cost ?? '');
  const [totCost, setTotCost] = useState(override?.total_cost   ?? '');

  const handleSave = () => {
    onSave(
      svcCost === '' ? null : parseFloat(svcCost),
      totCost === '' ? null : parseFloat(totCost)
    );
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: override ? '#fdf4ff' : 'var(--ink-50)', borderRadius: 8 }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Default: {defaultPrice ? `Rs.${defaultPrice}` : '—'}</div>
      {editing ? (
        <>
          <input type="number" placeholder="Service cost" value={svcCost} onChange={e => setSvcCost(e.target.value)}
            style={{ width: 110, padding: '4px 8px', border: '1.5px solid #7c3aed', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          <input type="number" placeholder="Total cost" value={totCost} onChange={e => setTotCost(e.target.value)}
            style={{ width: 110, padding: '4px 8px', border: '1.5px solid #7c3aed', borderRadius: 6, fontSize: 12, outline: 'none' }} />
          <button onClick={handleSave} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ background: 'var(--ink-100)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>
        </>
      ) : (
        <>
          {override
            ? <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', minWidth: 80 }}>Rs.{override.service_cost ?? '—'} / Rs.{override.total_cost ?? '—'}</span>
            : <span style={{ fontSize: 11, color: 'var(--ink-300)', minWidth: 80 }}>Using default</span>}
          <button
            onClick={() => { setSvcCost(override?.service_cost ?? ''); setTotCost(override?.total_cost ?? ''); setEditing(true); }}
            style={{ background: '#fdf4ff', color: '#7c3aed', border: '1px solid #e9d5ff', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
          >
            {override ? 'Edit' : 'Set Price'}
          </button>
          {override && (
            <button onClick={onReset} style={{ background: '#fff1f2', color: '#e11d48', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function ActionBtn({ onClick, title, bg, color, icon }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color, transition: 'transform 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {icon}
    </button>
  );
}

function PlanBadge({ plan }) {
  const map = {
    premium: { bg: '#ede9fe', color: '#5b21b6', label: 'Premium' },
    basic:   { bg: '#dbeafe', color: '#1e40af', label: 'Basic'   },
    custom:  { bg: '#fdf4ff', color: '#7c3aed', label: 'Custom'  },
    trial:   { bg: '#f3f4f6', color: '#374151', label: 'Trial'   },
  };
  const p = map[plan] || map.trial;
  return <span style={{ background: p.bg, color: p.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{p.label}</span>;
}

function StatusBadge({ status }) {
  const map = {
    active:   { bg: '#d1fae5', color: '#065f46', label: 'Active'   },
    trial:    { bg: '#fef3c7', color: '#92400e', label: 'Trial'    },
    inactive: { bg: '#fee2e2', color: '#991b1b', label: 'Inactive' },
  };
  const s = map[status] || map.trial;
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,17,23,0.62)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 24, width: '100%', maxWidth: wide ? 720 : 500, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1.5px solid var(--ink-100)', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '24px 24px 0 0' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink-900)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'var(--ink-100)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

const labelStyle        = { display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-500)', marginBottom: 6 };
const inputStyle        = { width: '100%', padding: '9px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'border-color 0.2s' };
const selectStyle       = { padding: '9px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', background: 'white' };
const primaryBtnStyle   = { padding: '9px 20px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)', fontFamily: 'Plus Jakarta Sans, sans-serif' };
const secondaryBtnStyle = { padding: '9px 20px', background: 'white', color: 'var(--ink-600)', border: '1.5px solid var(--ink-200)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' };