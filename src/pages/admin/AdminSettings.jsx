import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getServerTimestamp, getServerDateObject, getServerDate } from '../../hooks/useServerTime';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import {
  Save, Download, Trash2, AlertTriangle, Settings, Users,
  CreditCard, Bell, Shield, Database, ChevronDown, ChevronUp,
  CheckSquare, Square, X, Plus, Clock, Activity, ToggleLeft,
  ToggleRight, Megaphone, MessageSquare, RefreshCw, Eye,
  RotateCcw, FileText, TrendingUp, Zap, Calendar, Hash,
  CheckCircle, XCircle, Edit3, Search
} from 'lucide-react';
import { format, addDays, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const Rs = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

// ── Audit log helper ──────────────────────────────────────────────────────────
async function logAction(action, details = {}) {
  // Non-blocking — silently fails if table doesn't exist yet
  try {
    supabase.from('admin_audit_log').insert([{
      action,
      details: JSON.stringify(details),
      created_at: getServerTimestamp(),
    }]).then(() => {}).catch(() => {});
  } catch (_) {}
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, accent = 'var(--brand)', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid var(--ink-200)',
      marginBottom: 18, overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      <div
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', cursor: 'pointer',
          background: `linear-gradient(135deg, ${accent}08, transparent)`,
          borderBottom: open ? '1px solid var(--ink-100)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} color={accent} />
            </div>
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-800)' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} color="var(--ink-400)" /> : <ChevronDown size={16} color="var(--ink-400)" />}
      </div>
      {open && <div style={{ padding: '18px 20px' }}>{children}</div>}
    </div>
  );
}

// ── Stat mini card ────────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color = 'var(--brand)', sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: `1px solid ${color}20`,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `0 2px 8px ${color}10`,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-400)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sub, color = '#10b981' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: value ? color : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: value ? 23 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

const INPUT = {
  width: '100%', padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--ink-200)', fontSize: 13,
  color: 'var(--ink-800)', outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
  const map = {
    trial:   { color: '#f59e0b', bg: '#f59e0b12', label: 'Trial' },
    basic:   { color: '#6366f1', bg: '#6366f112', label: 'Basic' },
    premium: { color: '#0ea5e9', bg: '#0ea5e912', label: 'Premium' },
    custom:  { color: '#8b5cf6', bg: '#8b5cf612', label: 'Custom' },
  };
  const cfg = map[plan] || map.trial;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusDot({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: active ? '#10b981' : '#ef4444' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#10b981' : '#ef4444', display: 'inline-block' }} />
      {active ? 'Active' : 'Expired'}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdminSettings() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // ── Active tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('platform');

  // ── Core settings (existing) ───────────────────────────────────────────
  const [pageLoading, setPageLoading]           = useState(true);
  const [settingsId, setSettingsId]             = useState(null);
  const [upiId, setUpiId]                       = useState('');
  const [adminName, setAdminName]               = useState('');
  const [subscriptionAmount, setSubscriptionAmount] = useState('999');
  const [whatsappNumber, setWhatsappNumber]     = useState('');
  const [callNumber, setCallNumber]             = useState('');
  const [announcement, setAnnouncement]         = useState('');

  // ── NEW: Plan limits ───────────────────────────────────────────────────
  const [trialLimit, setTrialLimit]     = useState('50');
  const [basicLimit, setBasicLimit]     = useState('200');
  const [premiumLimit, setPremiumLimit] = useState('99999');
  const [gstRate, setGstRate]           = useState('18');

  // ── NEW: Maintenance mode ──────────────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode]     = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  // ── NEW: Announcement scheduler fields ────────────────────────────────
  const [announcementStart, setAnnouncementStart] = useState('');
  const [announcementEnd, setAnnouncementEnd]     = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');

  // ── NEW: Soft delete toggle ────────────────────────────────────────────
  const [softDeleteEnabled, setSoftDeleteEnabled] = useState(true);

  // ── NEW: User selection for bulk ops ──────────────────────────────────
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [bulkDays, setBulkDays]               = useState('30');
  const [userSearch, setUserSearch]           = useState('');

  // ── NEW: Payment tracker state ─────────────────────────────────────────
  const [payUserId, setPayUserId]     = useState('');
  const [payAmount, setPayAmount]     = useState('');
  const [payTxnId, setPayTxnId]       = useState('');
  const [payMode, setPayMode]         = useState('upi');
  const [payNote, setPayNote]         = useState('');
  const [payDays, setPayDays]         = useState('30');

  // ── NEW: Upgrade state ─────────────────────────────────────────────────
  const [upgradeUserId, setUpgradeUserId] = useState('');
  const [upgradePlan, setUpgradePlan]     = useState('basic');
  const [upgradeDays, setUpgradeDays]     = useState('30');

  // ── NEW: Private message state ─────────────────────────────────────────
  const [msgUserId, setMsgUserId]   = useState('');
  const [msgText, setMsgText]       = useState('');
  const [msgExpiry, setMsgExpiry]   = useState('');

  // ── Load settings ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('app_settings').select('*').eq('settings_key', 'main').maybeSingle().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setUpiId(data.upi_id || '');
        setAdminName(data.admin_name || '');
        setSubscriptionAmount(String(data.subscription_amount || 999));
        setWhatsappNumber(data.whatsapp_number || '');
        setCallNumber(data.call_number || '');
        setAnnouncement(data.announcement || '');
        setTrialLimit(String(data.trial_limit || 50));
        setBasicLimit(String(data.basic_limit || 200));
        setPremiumLimit(String(data.premium_limit || 99999));
        setGstRate(String(data.gst_rate || 18));
        setMaintenanceMode(!!data.maintenance_mode);
        setMaintenanceMessage(data.maintenance_message || '');
        setAnnouncementStart(data.announcement_start || '');
        setAnnouncementEnd(data.announcement_end || '');
        setAnnouncementPriority(data.announcement_priority || 'normal');
        setSoftDeleteEnabled(data.soft_delete_enabled !== false);
      }
      setPageLoading(false);
    });
  }, []);

  // ── Fetch all profiles ─────────────────────────────────────────────────
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['admin-settings-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
  });

  // ── Fetch payment logs ─────────────────────────────────────────────────
  const { data: paymentLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['admin-payment-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(100);
      if (error) { return []; }
      return data || [];
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Fetch audit log ────────────────────────────────────────────────────
  const { data: auditLogs = [], refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { return []; }
      return data || [];
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Fetch DB stats ─────────────────────────────────────────────────────
  const { data: dbStats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-db-stats'],
    queryFn: async () => {
      const [{ count: totalEntries }, { count: thisMonthEntries }, { data: oldest }, { data: topOp }] = await Promise.all([
        supabase.from('service_entries').select('*', { count: 'exact', head: true }),
        supabase.from('service_entries').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(getServerDateObject().getFullYear(), getServerDateObject().getMonth(), 1).toISOString()),
        supabase.from('service_entries').select('created_at').order('created_at', { ascending: true }).limit(1),
        supabase.from('service_entries').select('user_id').limit(10000),
      ]);
      const opCounts = {};
      (topOp || []).forEach(e => { opCounts[e.user_id] = (opCounts[e.user_id] || 0) + 1; });
      const topOpId = Object.entries(opCounts).sort((a, b) => b[1] - a[1])[0];
      const topProfile = topOpId ? allProfiles.find(p => p.id === topOpId[0]) : null;
      return {
        totalEntries: totalEntries || 0,
        thisMonthEntries: thisMonthEntries || 0,
        oldestEntry: oldest?.[0]?.created_at || null,
        topOperator: topProfile ? (topProfile.full_name || topProfile.business_name) : '—',
        topOperatorCount: topOpId?.[1] || 0,
        totalUsers: allProfiles.length,
        activeUsers: allProfiles.filter(p => p.account_status === 'active').length,
      };
    },
    enabled: isAdmin && allProfiles.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch archived entries ─────────────────────────────────────────────
  const { data: archivedEntries = [], refetch: refetchArchived } = useQuery({
    queryKey: ['admin-archived-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archived_entries')
        .select('*')
        .order('archived_at', { ascending: false })
        .limit(50);
      if (error) { return []; }
      return data || [];
    },
    enabled: isAdmin,
    retry: false,
  });

  // ── Fetch private messages ─────────────────────────────────────────────
  const { data: privateMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['admin-private-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });
      // If table doesn't exist yet, return empty gracefully
      if (error) { return []; }
      return data || [];
    },
    enabled: isAdmin,
    retry: false, // don't retry if table missing
  });

  // ── Save core settings ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate announcement dates
      if (announcementStart && announcementEnd) {
        const start = new Date(announcementStart);
        const end = new Date(announcementEnd);
        if (start >= end) {
          throw new Error('Announcement start date must be before end date');
        }
      }

      const payload = {
        upi_id: upiId, admin_name: adminName,
        subscription_amount: parseFloat(subscriptionAmount) || 999,
        whatsapp_number: whatsappNumber, call_number: callNumber,
        announcement, announcement_start: announcementStart || null,
        announcement_end: announcementEnd || null, announcement_priority: announcementPriority,
        trial_limit: parseInt(trialLimit) || 50,
        basic_limit: parseInt(basicLimit) || 200,
        premium_limit: parseInt(premiumLimit) || 99999,
        gst_rate: parseFloat(gstRate) || 18,
        maintenance_mode: maintenanceMode, maintenance_message: maintenanceMessage,
        soft_delete_enabled: softDeleteEnabled,
      };
      if (settingsId) {
        const { error } = await supabase.from('app_settings').update(payload).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('app_settings').insert([{ ...payload, settings_key: 'main' }]).select().single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }
      logAction('SETTINGS_SAVED', { fields: Object.keys(payload) }); // fire and forget
    },
    onSuccess: () => {
      // Invalidate so user dashboards pick up new announcement/maintenance immediately
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-settings-profiles'] });
      toast.success('Settings saved — all users will see changes immediately');
    },
    onError: (err) => {
      console.error('[AdminSettings] save error:', err);
      toast.error('Save failed: ' + (err.message || 'Unknown error'));
    },
  });

  // ── Clear announcement ─────────────────────────────────────────────────
  const clearAnnouncement = async () => {
    if (!settingsId) return;
    await supabase.from('app_settings').update({ announcement: '', announcement_start: null, announcement_end: null }).eq('id', settingsId);
    setAnnouncement(''); setAnnouncementStart(''); setAnnouncementEnd('');
    toast.success('Announcement cleared');
    await logAction('ANNOUNCEMENT_CLEARED');
  };

  // ── Maintenance toggle ─────────────────────────────────────────────────
  const toggleMaintenance = async (val) => {
    setMaintenanceMode(val);
    if (settingsId) {
      await supabase.from('app_settings').update({ maintenance_mode: val }).eq('id', settingsId);
      await logAction('MAINTENANCE_MODE', { enabled: val });
      toast.success(val ? 'Maintenance mode ON' : 'Maintenance mode OFF');
    }
  };

  // ── Bulk expiry extend ─────────────────────────────────────────────────
  const bulkExtend = async () => {
    if (selectedUserIds.size === 0) { toast.error('Select users first'); return; }
    const days = parseInt(bulkDays) || 30;
    let count = 0;
    for (const uid of selectedUserIds) {
      const profile = allProfiles.find(p => p.id === uid);
      const currentExpiry = profile?.expiry_date ? new Date(profile.expiry_date) : getServerDateObject();
      const base = isAfter(currentExpiry, getServerDateObject()) ? currentExpiry : getServerDateObject();
      const newExpiry = addDays(base, days).toISOString().split('T')[0];
      await supabase.from('profiles').update({ expiry_date: newExpiry, account_status: 'active' }).eq('id', uid);
      count++;
    }
    await logAction('BULK_EXTEND', { userCount: count, days });
    queryClient.invalidateQueries({ queryKey: ['admin-settings-profiles'] });
    setSelectedUserIds(new Set());
    toast.success(`Extended ${count} users by ${days} days`);
  };

  // ── Record payment ─────────────────────────────────────────────────────
  const recordPayment = async () => {
    if (!payUserId || !payAmount) { toast.error('Select user and enter amount'); return; }
    const profile = allProfiles.find(p => p.id === payUserId);
    const days = parseInt(payDays) || 30;
    const currentExpiry = profile?.expiry_date ? new Date(profile.expiry_date) : getServerDateObject();
    const base = isAfter(currentExpiry, getServerDateObject()) ? currentExpiry : getServerDateObject();
    const newExpiry = addDays(base, days).toISOString().split('T')[0];

    const { error: logError } = await supabase.from('payment_logs').insert([{
      user_id: payUserId, amount_paid: parseFloat(payAmount),
      transaction_id: payTxnId || null, payment_mode: payMode,
      payment_date: getServerDate(),
      extended_until: newExpiry, notes: payNote || null,
      recorded_by: user.id,
    }]);
    if (logError) { toast.error('Payment log failed: ' + logError.message + ' — run supabase_migration.sql first'); return; }

    await supabase.from('profiles').update({ expiry_date: newExpiry, account_status: 'active' }).eq('id', payUserId);
    await logAction('PAYMENT_RECORDED', { userId: payUserId, amount: payAmount, txnId: payTxnId, extendedUntil: newExpiry });
    queryClient.invalidateQueries({ queryKey: ['admin-settings-profiles'] });
    refetchLogs();
    setPayUserId(''); setPayAmount(''); setPayTxnId(''); setPayNote('');
    toast.success(`Payment recorded. Expiry extended to ${newExpiry}`);
  };

  // ── Upgrade user ───────────────────────────────────────────────────────
  const upgradeUser = async () => {
    if (!upgradeUserId) { toast.error('Select a user'); return; }
    const days = parseInt(upgradeDays) || 30;
    const newExpiry = addDays(getServerDateObject(), days).toISOString().split('T')[0];
    await supabase.from('profiles').update({
      plan: upgradePlan, expiry_date: newExpiry, account_status: 'active',
    }).eq('id', upgradeUserId);
    await logAction('USER_UPGRADED', { userId: upgradeUserId, plan: upgradePlan, expiry: newExpiry });
    queryClient.invalidateQueries({ queryKey: ['admin-settings-profiles'] });
    setUpgradeUserId('');
    toast.success(`User upgraded to ${upgradePlan} until ${newExpiry}`);
  };

  // ── Send private message ───────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgUserId) { toast.error('Please select a user'); return; }
    if (!msgText.trim()) { toast.error('Please write a message'); return; }

    // Minimal safe payload — only include columns that exist in the table
    const payload = { user_id: msgUserId, message: msgText.trim(), is_read: false };
    if (msgExpiry) payload.expires_at = msgExpiry;

    const { data, error } = await supabase.from('admin_messages').insert([payload]).select().single()

    if (error) {
      toast.error('Send failed: ' + (error.message || error.code || 'Check console for details'));
      return;
    }

    await logAction('PRIVATE_MESSAGE_SENT', { userId: msgUserId, messageId: data?.id });
    refetchMessages();
    setMsgUserId(''); setMsgText(''); setMsgExpiry('');
    toast.success('Message sent to user');
  };

  // ── Delete message ─────────────────────────────────────────────────────
  const deleteMessage = async (id) => {
    await supabase.from('admin_messages').delete().eq('id', id);
    refetchMessages();
    toast.success('Message deleted');
  };

  // ── Delete profile (user) ──────────────────────────────────────────────
  const deleteProfile = async (id, name) => {
    if (!window.confirm(`Delete ${name}? Their data will be permanently removed.`)) return;
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') { toast.error('Cancelled'); return; }
    try {
      await supabase.from('profiles').delete().eq('id', id);
      await logAction('USER_DELETED', { userId: id, name });
      queryClient.invalidateQueries({ queryKey: ['admin-settings-profiles'] });
      setUserSearch('');
      toast.success(`${name} deleted`);
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // ── Delete archived entry ──────────────────────────────────────────────
  const deleteArchivedEntry = async (id) => {
    if (!window.confirm('Permanently delete this archived entry? Cannot be undone.')) return;
    try {
      await supabase.from('archived_entries').delete().eq('id', id);
      await logAction('ARCHIVED_ENTRY_DELETED', { entryId: id });
      refetchArchived();
      toast.success('Archived entry permanently deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // ── Delete audit log entry ─────────────────────────────────────────────
  const deleteAuditEntry = async (id) => {
    if (!window.confirm('Delete this audit log entry?')) return;
    try {
      await supabase.from('admin_audit_log').delete().eq('id', id);
      await logAction('AUDIT_LOG_ENTRY_DELETED', { logId: id });
      refetchAudit();
      toast.success('Audit log entry deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // ── State for refresh loading ──────────────────────────────────────────
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [refreshingAudit, setRefreshingAudit] = useState(false);

  const handleRefreshStats = async () => {
    setRefreshingStats(true);
    await refetchStats();
    setRefreshingStats(false);
  };

  const handleRefreshAudit = async () => {
    setRefreshingAudit(true);
    await refetchAudit();
    setRefreshingAudit(false);
  };

  // ── Export CSV (existing) ──────────────────────────────────────────────
  const exportCSV = async () => {
    const { data: entries } = await supabase.from('service_entries')
      .select('*').order('created_at', { ascending: false });
    if (!entries?.length) { toast.error('No data'); return; }
    const headers = ['Customer','Fathers Name','Mobile','Service','Date','Work Status','Payment Status','Total','Received','Pending','Profit','Operator','Remark'];
    const rows = entries.map(e => [e.customer_name,e.fathers_name,e.mobile,e.service_name,e.entry_date,e.work_status,e.payment_status,e.total_cost,e.received_payment,e.pending_payment,e.profit,e.operator_name||'',e.remark]);
    const csv = [headers,...rows].map(r=>r.map(v=>'"'+(v||'')+'"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'export-'+getServerDate()+'.csv';
    a.click();
    toast.success('CSV exported');
    await logAction('CSV_EXPORTED');
  };

  // ── Soft delete all entries ────────────────────────────────────────────
  const softDeleteAllEntries = async () => {
    if (!window.confirm('Archive ALL entries? They will be recoverable for 30 days.')) return;
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') { toast.error('Cancelled'); return; }
    const { data: entries } = await supabase.from('service_entries').select('*');
    if (entries?.length) {
      const archived = entries.map(e => ({ ...e, original_id: e.id, archived_at: getServerTimestamp(), archived_by: user.id }));
      // Remove id to let DB generate new ones
      archived.forEach(e => delete e.id);
      await supabase.from('archived_entries').insert(archived);
      await supabase.from('service_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await logAction('SOFT_DELETE_ALL', { count: entries.length });
      queryClient.invalidateQueries();
      refetchArchived();
      toast.success(`${entries.length} entries archived (recoverable for 30 days)`);
    }
  };

  // ── Restore archived entry ─────────────────────────────────────────────
  const restoreEntry = async (archived) => {
    const { original_id, archived_at, archived_by, id, ...entry } = archived;
    const { error } = await supabase.from('service_entries').insert([{ ...entry, id: original_id }]);
    if (error) { toast.error('Restore failed: ' + error.message); return; }
    await supabase.from('archived_entries').delete().eq('id', id);
    await logAction('ENTRY_RESTORED', { originalId: original_id });
    refetchArchived();
    queryClient.invalidateQueries();
    toast.success('Entry restored');
  };

  // ── Guards ─────────────────────────────────────────────────────────────
  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (pageLoading) return (
    <div className="page-container">
      <div className="page-header"><div><h1 className="page-title">Settings</h1></div></div>
      {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{height:140,borderRadius:16,marginBottom:18}}/>)}
    </div>
  );

  const qrUrl = upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${adminName}&am=${subscriptionAmount}&cu=INR`)}&bgcolor=ffffff&color=000000&margin=10`
    : null;

  const filteredProfiles = allProfiles.filter(p =>
    !userSearch || p.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    p.business_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const TABS = [
    { id: 'platform', label: 'Platform', icon: Settings },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'comms', label: 'Comms', icon: Bell },
    { id: 'data', label: 'Data & Safety', icon: Shield },
    { id: 'stats', label: 'DB Stats', icon: Database },
  ];


  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.2s ease' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)' }}>Admin Settings</h1>
          <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>Platform configuration & controls</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {maintenanceMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10 }}>
              <AlertTriangle size={13} color="#ef4444" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Maintenance ON</span>
            </div>
          )}
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--brand)', color: '#fff', border: 'none' }}>
            <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
            padding: '7px 14px', borderRadius: 9, cursor: 'pointer', border: 'none',
            background: activeTab === tab.id ? '#fff' : 'transparent',
            color: activeTab === tab.id ? 'var(--brand)' : 'var(--ink-500)',
            boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: PLATFORM
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'platform' && (
        <>
          {/* Maintenance Mode */}
          <Section title="Maintenance Mode" icon={Zap} accent="#ef4444">
            <Toggle
              value={maintenanceMode}
              onChange={toggleMaintenance}
              label="Enable Maintenance Mode"
              sub="All users see a maintenance banner and cannot create new entries. Admin retains full access."
              color="#ef4444"
            />
            {maintenanceMode && (
              <div style={{ marginTop: 12 }}>
                <Field label="Maintenance Message">
                  <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)}
                    placeholder="We are under maintenance. Back soon!"
                    style={{ ...INPUT, minHeight: 70, resize: 'vertical' }} />
                </Field>
              </div>
            )}
          </Section>

          {/* Payment Settings (existing) */}
          <Section title="Payment Settings" icon={CreditCard} accent="#10b981">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <Field label="UPI ID"><input type="text" style={INPUT} placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} /></Field>
                <Field label="Admin Name"><input type="text" style={INPUT} placeholder="Name on UPI" value={adminName} onChange={e => setAdminName(e.target.value)} /></Field>
                <Field label="Subscription Amount (Rs.)" hint="Default price used in payment links and QR codes">
                  <input type="number" style={INPUT} value={subscriptionAmount} onChange={e => setSubscriptionAmount(e.target.value)} />
                </Field>
              </div>
              {qrUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase' }}>QR Preview</p>
                  <img src={qrUrl} alt="UPI QR" style={{ width: 150, height: 150, borderRadius: 12, border: '2px solid var(--ink-200)' }} />
                  <p style={{ fontSize: 12, color: 'var(--ink-500)' }}>Rs.{subscriptionAmount}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Support Contact (existing) */}
          <Section title="Support Contact" icon={MessageSquare} accent="#0ea5e9">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="WhatsApp Number"><input type="tel" style={INPUT} placeholder="10 digit number" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} /></Field>
              <Field label="Call Number"><input type="tel" style={INPUT} placeholder="10 digit number" value={callNumber} onChange={e => setCallNumber(e.target.value)} /></Field>
            </div>
          </Section>

          {/* Plan Limits & GST */}
          <Section title="Plan Entry Limits & Invoice Settings" icon={Hash} accent="#8b5cf6">
            <p style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 16 }}>Configure subscription limits and invoice GST rate applied to all user invoices.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
              <Field label="Trial Limit" hint="entries/month">
                <input type="number" style={INPUT} value={trialLimit} onChange={e => setTrialLimit(e.target.value)} />
              </Field>
              <Field label="Basic Limit" hint="entries/month">
                <input type="number" style={INPUT} value={basicLimit} onChange={e => setBasicLimit(e.target.value)} />
              </Field>
              <Field label="Premium Limit" hint="99999 = unlimited">
                <input type="number" style={INPUT} value={premiumLimit} onChange={e => setPremiumLimit(e.target.value)} />
              </Field>
              <Field label="Invoice GST Rate" hint="percentage %">
                <input type="number" style={INPUT} value={gstRate} onChange={e => setGstRate(e.target.value)} placeholder="18" />
              </Field>
            </div>
          </Section>

          {/* Soft delete toggle */}
          <Section title="Safety Settings" icon={Shield} accent="#f59e0b">
            <Toggle
              value={softDeleteEnabled}
              onChange={setSoftDeleteEnabled}
              label="Enable Soft Delete (Archive instead of permanent delete)"
              sub="When ON, deleted entries are moved to archive and recoverable for 30 days."
              color="#f59e0b"
            />
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: SUBSCRIPTIONS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Record Payment */}
          <Section title="Record Subscription Payment" icon={CreditCard} accent="#10b981">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
              <Field label="User">
                <select value={payUserId} onChange={e => setPayUserId(e.target.value)} style={INPUT}>
                  <option value="">Select user...</option>
                  {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.business_name || p.email}</option>)}
                </select>
              </Field>
              <Field label="Amount (Rs.)">
                <input type="number" style={INPUT} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={subscriptionAmount} />
              </Field>
              <Field label="UPI Transaction ID">
                <input type="text" style={INPUT} value={payTxnId} onChange={e => setPayTxnId(e.target.value)} placeholder="UTR/TXN ID" />
              </Field>
              <Field label="Payment Mode">
                <select value={payMode} onChange={e => setPayMode(e.target.value)} style={INPUT}>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Extend By">
                <select value={payDays} onChange={e => setPayDays(e.target.value)} style={INPUT}>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="180">180 days</option>
                  <option value="365">1 year</option>
                </select>
              </Field>
              <Field label="Note (optional)">
                <input type="text" style={INPUT} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Any remark" />
              </Field>
            </div>
            <button onClick={recordPayment} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
              background: '#10b981', color: '#fff', border: 'none',
            }}><CheckCircle size={14} /> Record & Extend Expiry</button>
          </Section>

          {/* Payment History */}
          <Section title="Payment History" icon={FileText} accent="#0ea5e9" defaultOpen={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-400)' }}>{paymentLogs.length} payments recorded</p>
              <button onClick={() => {
                const headers = ['User','Amount','Txn ID','Mode','Date','Extended Until','Notes'];
                const rows = paymentLogs.map(l => [l.profiles?.full_name||l.user_id, l.amount_paid, l.transaction_id||'', l.payment_mode, l.payment_date, l.extended_until||'', l.notes||'']);
                const csv = [headers,...rows].map(r=>r.map(v=>'"'+(v||'')+'"').join(',')).join('\n');
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='payment_logs.csv'; a.click();
              }} style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', background: '#0ea5e910', color: '#0ea5e9', border: '1px solid #0ea5e930' }}>
                <Download size={12} style={{ display: 'inline', marginRight: 4 }} />Export
              </button>
            </div>
            {paymentLogs.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>No payments recorded yet</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['User','Amount','Txn ID','Mode','Date','Extended Until'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paymentLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '9px 10px', fontWeight: 600, color: '#334155' }}>{log.profiles?.full_name || log.profiles?.business_name || '—'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 700, color: '#10b981' }}>{Rs(log.amount_paid)}</td>
                          <td style={{ padding: '9px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{log.transaction_id || '—'}</td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#0ea5e912', color: '#0ea5e9' }}>{log.payment_mode}</span>
                          </td>
                          <td style={{ padding: '9px 10px', color: '#64748b' }}>{log.payment_date}</td>
                          <td style={{ padding: '9px 10px', color: '#64748b' }}>{log.extended_until || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Section>

          {/* One-click upgrade */}
          <Section title="Trial → Paid Upgrade" icon={Zap} accent="#f59e0b">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
              <Field label="User">
                <select value={upgradeUserId} onChange={e => setUpgradeUserId(e.target.value)} style={INPUT}>
                  <option value="">Select user...</option>
                  {allProfiles.filter(p => p.plan === 'trial' || !p.plan).map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.business_name || p.email}</option>
                  ))}
                </select>
              </Field>
              <Field label="Upgrade to Plan">
                <select value={upgradePlan} onChange={e => setUpgradePlan(e.target.value)} style={INPUT}>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Active For">
                <select value={upgradeDays} onChange={e => setUpgradeDays(e.target.value)} style={INPUT}>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </Field>
            </div>
            <button onClick={upgradeUser} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
              background: '#f59e0b', color: '#fff', border: 'none',
            }}><Zap size={14} /> Upgrade Now</button>
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: USERS (Bulk operations)
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <>
          <Section title="Bulk Expiry Extender" icon={Calendar} accent="#6366f1">
            {/* Search + select all */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..."
                  style={{ ...INPUT, paddingLeft: 30 }} />
              </div>
              <select value={bulkDays} onChange={e => setBulkDays(e.target.value)} style={{ ...INPUT, width: 'auto' }}>
                <option value="30">+30 days</option>
                <option value="60">+60 days</option>
                <option value="90">+90 days</option>
                <option value="180">+180 days</option>
                <option value="365">+1 year</option>
              </select>
              <button onClick={() => setSelectedUserIds(new Set(filteredProfiles.map(p => p.id)))}
                style={{ fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 9, cursor: 'pointer', background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130' }}>
                Select All
              </button>
              {selectedUserIds.size > 0 && (
                <>
                  <button onClick={() => setSelectedUserIds(new Set())}
                    style={{ fontSize: 11, padding: '7px 10px', borderRadius: 9, cursor: 'pointer', background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                    <X size={12} />
                  </button>
                  <button onClick={bulkExtend}
                    style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', background: '#6366f1', color: '#fff', border: 'none' }}>
                    Extend {selectedUserIds.size} users
                  </button>
                </>
              )}
            </div>
            {/* User list */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {filteredProfiles.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--ink-400)' }}>No users found</p>
              ) : filteredProfiles.map(p => {
                const isSelected = selectedUserIds.has(p.id);
                const expiry = p.expiry_date ? new Date(p.expiry_date) : null;
                const daysLeft = expiry ? differenceInDays(expiry, new Date()) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                return (
                  <div key={p.id} onClick={() => {
                    setSelectedUserIds(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; });
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                    background: isSelected ? '#6366f108' : 'transparent',
                    border: isSelected ? '1px solid #6366f125' : '1px solid transparent',
                    transition: 'all 0.1s',
                  }}>
                    <span style={{ color: isSelected ? '#6366f1' : '#cbd5e1', flexShrink: 0 }}>
                      {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{p.full_name || p.business_name || p.email}</p>
                      <p style={{ fontSize: 11, color: '#64748b' }}>{p.email}</p>
                    </div>
                    <PlanBadge plan={p.plan} />
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        {expiry ? (
                          <p style={{ fontSize: 11, fontWeight: 700, color: isExpired ? '#ef4444' : isExpiring ? '#f59e0b' : '#10b981' }}>
                            {isExpired ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d left`}
                          </p>
                        ) : <p style={{ fontSize: 11, color: '#94a3b8' }}>no expiry</p>}
                        <p style={{ fontSize: 10, color: '#94a3b8' }}>{p.expiry_date || '—'}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProfile(p.id, p.full_name || p.business_name || p.email); }}
                        style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, cursor: 'pointer', background: '#ef444410', color: '#ef4444', border: '1px solid #ef444420', fontWeight: 700, whiteSpace: 'nowrap' }}
                        title="Delete this user profile"
                      >
                        <Trash2 size={11} style={{ display: 'inline', marginRight: 2 }} />Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: COMMS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'comms' && (
        <>
          {/* Announcement Scheduler */}
          <Section title="Announcement Banner" icon={Megaphone} accent="#f59e0b">
            <Field label="Announcement Message">
              <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)}
                placeholder="This will appear on all user dashboards. Leave empty to hide."
                style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
              <Field label="Show From" hint="Leave blank to show immediately">
                <input type="date" style={INPUT} value={announcementStart} onChange={e => setAnnouncementStart(e.target.value)} />
              </Field>
              <Field label="Hide After" hint="Leave blank to show indefinitely">
                <input type="date" style={INPUT} value={announcementEnd} onChange={e => setAnnouncementEnd(e.target.value)} />
              </Field>
              <Field label="Priority">
                <select value={announcementPriority} onChange={e => setAnnouncementPriority(e.target.value)} style={INPUT}>
                  <option value="normal">Normal (blue)</option>
                  <option value="warning">Warning (yellow)</option>
                  <option value="urgent">Urgent (red)</option>
                </select>
              </Field>
            </div>
            {announcement && (
              <button onClick={clearAnnouncement} style={{
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)',
              }}>Clear Announcement</button>
            )}
          </Section>

          {/* Per-user private message */}
          <Section title="Per-User Private Message" icon={MessageSquare} accent="#8b5cf6">
            <p style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 14 }}>Send a notice visible only on one operator's dashboard. Stays until they dismiss it or it expires.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
              <Field label="Send To">
                <select value={msgUserId} onChange={e => setMsgUserId(e.target.value)} style={INPUT}>
                  <option value="">Select user...</option>
                  {allProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.business_name || p.email}</option>)}
                </select>
              </Field>
              <Field label="Expires On" hint="Optional — leave blank to show until dismissed">
                <input type="date" style={INPUT} value={msgExpiry} onChange={e => setMsgExpiry(e.target.value)} />
              </Field>
            </div>
            <Field label="Message">
              <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                placeholder="e.g. Your subscription expires in 3 days. Please renew to continue."
                style={{ ...INPUT, minHeight: 70, resize: 'vertical' }} />
            </Field>
            <button onClick={sendMessage} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              background: '#8b5cf6', color: '#fff', border: 'none',
            }}><MessageSquare size={14} /> Send Message</button>

            {/* Active messages */}
            {privateMessages.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Active Messages</p>
                {privateMessages.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: '#8b5cf608', border: '1px solid #8b5cf620', borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 3 }}>{m.profiles?.full_name || m.profiles?.business_name || m.user_id}</p>
                      <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{m.message}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                        Sent {m.created_at?.slice(0,10)} {m.expires_at ? `· Expires ${m.expires_at}` : ''} · {m.is_read ? '✓ Read' : 'Unread'}
                      </p>
                    </div>
                    <button onClick={() => deleteMessage(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: DATA & SAFETY
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'data' && (
        <>
          {/* Export */}
          <Section title="Export Data" icon={Download} accent="#0ea5e9">
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 14 }}>Export all service entries from all operators as CSV.</p>
            <button onClick={exportCSV} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              background: '#0ea5e9', color: '#fff', border: 'none',
            }}><Download size={14} /> Export All Entries as CSV</button>
          </Section>

          {/* Soft delete + recovery */}
          <Section title="Archive & Recovery" icon={RotateCcw} accent="#10b981">
            <p style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 16 }}>
              Archived entries are recoverable for 30 days. After that they are permanently removed.
            </p>
            {archivedEntries.length > 0 ? (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-600)', marginBottom: 10 }}>{archivedEntries.length} archived entries</p>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {archivedEntries.map(e => {
                    const archivedAt = e.archived_at ? new Date(e.archived_at) : null;
                    const daysLeft = archivedAt ? 30 - differenceInDays(new Date(), archivedAt) : 0;
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f8fafc', borderRadius: 10, marginBottom: 6, border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{e.customer_name} · {e.service_name}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8' }}>{e.profiles?.full_name || '—'} · {e.entry_date}</p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: daysLeft < 7 ? '#ef4444' : '#f59e0b', whiteSpace: 'nowrap' }}>{daysLeft}d left</span>
                        <button onClick={() => restoreEntry(e)} style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                          background: '#10b98115', color: '#10b981', border: '1px solid #10b98130',
                        }}><RotateCcw size={11} style={{ display: 'inline', marginRight: 3 }} />Restore</button>
                        <button onClick={() => deleteArchivedEntry(e.id)} style={{
                          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                          background: '#ef444115', color: '#ef4444', border: '1px solid #ef444130',
                        }}><Trash2 size={11} style={{ display: 'inline', marginRight: 3 }} />Delete</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--ink-400)' }}>No archived entries.</p>
            )}
          </Section>

          {/* Audit log */}
          <Section title="Admin Action Audit Log" icon={Activity} accent="#6366f1" defaultOpen={false}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 10 }}>
              <button onClick={handleRefreshAudit} disabled={refreshingAudit} style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', background: '#6366f110', color: '#6366f1', border: '1px solid #6366f130', opacity: refreshingAudit ? 0.6 : 1 }}>
                <RefreshCw size={11} style={{ display: 'inline', marginRight: 4, animation: refreshingAudit ? 'spin 1s linear infinite' : 'none' }} />{refreshingAudit ? 'Refreshing...' : 'Refresh'}
              </button>
              {auditLogs.length > 0 && (
                <button 
                  onClick={async () => {
                    if (!window.confirm(`Delete all ${auditLogs.length} audit logs? Cannot be undone.`)) return;
                    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') { toast.error('Cancelled'); return; }
                    try {
                      for (const log of auditLogs) {
                        await supabase.from('admin_audit_log').delete().eq('id', log.id);
                      }
                      refetchAudit();
                      toast.success(`Deleted ${auditLogs.length} logs`);
                    } catch (err) {
                      toast.error('Delete failed');
                    }
                  }}
                  style={{ fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', background: '#ef444110', color: '#ef4444', border: '1px solid #ef444130' }}
                  title="Delete all audit logs"
                >
                  <Trash2 size={11} style={{ display: 'inline', marginRight: 4 }} />Clear All
                </button>
              )}
            </div>
            {auditLogs.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--ink-400)', textAlign: 'center', padding: '16px 0' }}>No actions logged yet</p>
              : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {auditLogs.map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366f112', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Activity size={13} color="#6366f1" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{log.action}</p>
                        {log.details && (
                          <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, wordBreak: 'break-all' }}>
                            {(() => { try { const d = JSON.parse(log.details); return Object.entries(d).map(([k,v])=>`${k}: ${v}`).join(' · '); } catch { return log.details; } })()}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <p style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {log.created_at ? format(parseISO(log.created_at), 'dd MMM, hh:mm a') : '—'}
                        </p>
                        <button 
                          onClick={() => deleteAuditEntry(log.id)}
                          style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, cursor: 'pointer', background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0', fontWeight: 600 }}
                          title="Delete this log entry"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </Section>

          {/* Danger Zone (existing + upgraded) */}
          <div style={{ border: '1.5px solid #fca5a5', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', background: '#fff5f5', borderBottom: '1px solid #fca5a5' }}>
              <AlertTriangle size={15} color="var(--danger)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>Danger Zone</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-600)', marginBottom: 14 }}>
                {softDeleteEnabled
                  ? 'Entries will be archived (recoverable for 30 days) instead of permanently deleted.'
                  : 'Permanently delete all service entries. This cannot be undone.'}
              </p>
              <button onClick={softDeleteEnabled ? softDeleteAllEntries : async () => {
                if (!window.confirm('Permanently delete ALL entries? Cannot be undone.')) return;
                if (window.prompt('Type DELETE to confirm:') !== 'DELETE') { toast.error('Cancelled'); return; }
                await supabase.from('service_entries').delete().neq('id','00000000-0000-0000-0000-000000000000');
                await logAction('PERMANENT_DELETE_ALL');
                queryClient.invalidateQueries();
                toast.success('All entries permanently deleted');
              }} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--danger)', color: '#fff', border: 'none',
              }}>
                <Trash2 size={14} />
                {softDeleteEnabled ? 'Archive All Entries' : 'Delete All Entries'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: DB STATS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'stats' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => refetchStats()} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 10, cursor: 'pointer', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={13} /> Refresh Stats
            </button>
          </div>
          {dbStats ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                <MiniStat icon={FileText}    label="Total Entries"       value={dbStats.totalEntries.toLocaleString()} color="#6366f1" />
                <MiniStat icon={TrendingUp}  label="This Month"          value={dbStats.thisMonthEntries.toLocaleString()} color="#10b981" />
                <MiniStat icon={Users}       label="Total Users"         value={dbStats.totalUsers} color="#0ea5e9" />
                <MiniStat icon={Activity}    label="Active Users"        value={dbStats.activeUsers} color="#f59e0b" sub={`${Math.round((dbStats.activeUsers/dbStats.totalUsers||1)*100)}% active`} />
                <MiniStat icon={Clock}       label="Oldest Entry"        value={dbStats.oldestEntry ? format(parseISO(dbStats.oldestEntry), 'dd MMM yy') : '—'} color="#8b5cf6" />
                <MiniStat icon={Zap}         label="Most Active Op"      value={dbStats.topOperator} sub={`${dbStats.topOperatorCount} entries`} color="#ef4444" />
              </div>
              {/* User plan breakdown */}
              <Section title="User Plan Breakdown" icon={Users} accent="#0ea5e9">
                {['trial','basic','premium','custom'].map(plan => {
                  const count = allProfiles.filter(p => (p.plan || 'trial') === plan).length;
                  const pct = allProfiles.length ? Math.round((count / allProfiles.length) * 100) : 0;
                  const colors = { trial: '#f59e0b', basic: '#6366f1', premium: '#0ea5e9', custom: '#8b5cf6' };
                  return (
                    <div key={plan} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-700)', textTransform: 'capitalize' }}>{plan}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: colors[plan] }}>{count} users ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[plan], borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </Section>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-400)' }}>Loading stats...</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}