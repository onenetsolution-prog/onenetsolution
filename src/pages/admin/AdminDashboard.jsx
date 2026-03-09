import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getServerDateObject } from '../../hooks/useServerTime';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Users, FileText, TrendingUp, Clock, AlertTriangle,
  CheckCircle, XCircle, Activity, DollarSign, BarChart2,
  UserX, Zap, Award, Star, ArrowUp, ArrowDown, Minus,
  Calendar, Bell, RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, addDays } from 'date-fns';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

const Rs = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (a, b) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

function getValueFontSize(value, large = false) {
  const str = String(value);
  if (large) {
    if (str.length <= 6) return 36;
    if (str.length <= 10) return 28;
    if (str.length <= 14) return 22;
    return 17;
  } else {
    if (str.length <= 6) return 30;
    if (str.length <= 10) return 24;
    if (str.length <= 14) return 18;
    return 14;
  }
}

function TrendBadge({ value }) {
  if (value > 0) return (
    <span style={{ color: 'var(--success)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, background: '#10b98112', padding: '2px 8px', borderRadius: 20 }}>
      <ArrowUp size={10} /> +{value}%
    </span>
  );
  if (value < 0) return (
    <span style={{ color: 'var(--danger)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, background: '#ef444412', padding: '2px 8px', borderRadius: 20 }}>
      <ArrowDown size={10} /> {value}%
    </span>
  );
  return <span style={{ color: 'var(--ink-400)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, background: 'var(--ink-100)', padding: '2px 8px', borderRadius: 20 }}><Minus size={10} /> 0%</span>;
}

const COLOR_MAP = {
  'var(--brand)':   '#6366f1',
  'var(--success)': '#10b981',
  'var(--danger)':  '#ef4444',
  'var(--warning)': '#f59e0b',
};
function resolveColor(color) { return COLOR_MAP[color] || color; }
function alpha(color, opacity) {
  const hex = resolveColor(color);
  const p = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${hex}${p}`;
}

function CardBlob({ color, size = 100, top = -28, right = -28 }) {
  return (
    <div style={{
      position: 'absolute', top, right,
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 40% 40%, ${alpha(color, 0.28)} 0%, ${alpha(color, 0.10)} 45%, transparent 72%)`,
      pointerEvents: 'none', zIndex: 0,
    }} />
  );
}

// ── Large hero card (top row) — with optional onClick ──
function StatCardLarge({ icon: Icon, label, value, sub, color, trend, onClick }) {
  const fontSize = getValueFontSize(value, true);
  const c = resolveColor(color);
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 20,
        border: `1px solid ${alpha(color, 0.15)}`,
        padding: '22px 24px 18px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 8px 28px ${alpha(color, 0.20)}`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <CardBlob color={color} size={120} top={-32} right={-32} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-400)' }}>{label}</p>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: alpha(color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={18} color={c} />
        </div>
      </div>
      <p style={{ fontSize, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1.1, letterSpacing: '-0.02em', wordBreak: 'break-all', marginBottom: 6, position: 'relative', zIndex: 1 }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, position: 'relative', zIndex: 1 }}>
        {sub && <p style={{ fontSize: 12, color: 'var(--ink-400)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{sub}</p>}
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      {clickable && (
        <p style={{ fontSize: 10, color: c, fontWeight: 700, marginTop: 6, position: 'relative', zIndex: 1, opacity: 0.7, letterSpacing: '0.05em' }}>
          → Click to view
        </p>
      )}
      <div style={{ height: 3, background: alpha(color, 0.15), borderRadius: 99, marginTop: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ height: '100%', width: '60%', background: c, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── Compact card (bottom row) — with optional onClick ──
function StatCardCompact({ icon: Icon, label, value, sub, color, trend, onClick }) {
  const fontSize = getValueFontSize(value, false);
  const c = resolveColor(color);
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16,
        border: `1px solid ${alpha(color, 0.15)}`,
        padding: '16px 18px 14px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 6px 20px ${alpha(color, 0.18)}`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <CardBlob color={color} size={100} top={-26} right={-26} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-400)' }}>{label}</p>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: alpha(color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={c} />
        </div>
      </div>
      <p style={{ fontSize, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1.1, letterSpacing: '-0.02em', wordBreak: 'break-all', marginBottom: 4, position: 'relative', zIndex: 1 }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, position: 'relative', zIndex: 1 }}>
        {sub && <p style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{sub}</p>}
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      {clickable && (
        <p style={{ fontSize: 10, color: c, fontWeight: 700, marginTop: 4, position: 'relative', zIndex: 1, opacity: 0.7, letterSpacing: '0.05em' }}>
          → Click to view
        </p>
      )}
      <div style={{ height: 2, background: alpha(color, 0.15), borderRadius: 99, marginTop: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ height: '100%', width: '60%', background: c, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function AlertRow({ icon: Icon, color, label, value, urgent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 10,
      background: urgent ? `${color}10` : 'var(--ink-50)',
      border: urgent ? `1px solid ${color}30` : '1px solid var(--ink-100)',
      marginBottom: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: urgent ? color : 'var(--ink-600)', background: urgent ? `${color}15` : 'transparent', padding: urgent ? '2px 10px' : '0', borderRadius: 20 }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--ink-200)', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ink-100)', display: 'flex', alignItems: 'center', gap: 10, background: `linear-gradient(135deg, ${accent}08 0%, transparent 100%)` }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={accent} />
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-800)' }}>{title}</h3>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function UserRow({ user, label, labelColor }) {
  const initials = (user.full_name || user.email || '?').substring(0, 2).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--brand)' }}>{initials}</div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)' }}>{user.full_name || 'No Name'}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>{user.business_name || user.email}</p>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${labelColor}15`, color: labelColor }}>{label}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email === ADMIN_EMAIL;

  if (!user) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const today = getServerDateObject();
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subMonths(today, 1));
  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const sevenDaysLater = addDays(today, 7);
  const thirtyDaysAgo = subDays(today, 30);

  const { data: allProfiles = [], isLoading: loadingProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name, business_name, plan, account_status, expiry_date, created_at').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
        return [];
      }
    }
  });

  const { data: allEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['admin-all-entries-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('*').order('created_at', { ascending: false }).limit(2000);
      return data || [];
    }
  });

  const { data: allServices = [], refetch: refetchServices } = useQuery({
    queryKey: ['admin-all-services-dash'],
    queryFn: async () => {
      const { data } = await supabase.from('custom_services').select('*');
      return data || [];
    }
  });

  const isLoading = loadingProfiles || loadingEntries;
  if (isLoading) return <LoadingSpinner />;

  const thisMonthEntries = allEntries.filter(e => { const d = new Date(e.entry_date || e.created_at); return d >= thisMonthStart && d <= thisMonthEnd; });
  const lastMonthEntries = allEntries.filter(e => { const d = new Date(e.entry_date || e.created_at); return d >= lastMonthStart && d <= lastMonthEnd; });

  const thisMonthRevenue = thisMonthEntries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const lastMonthRevenue = lastMonthEntries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const revenueTrend = pct(thisMonthRevenue, lastMonthRevenue);
  const thisMonthCount = thisMonthEntries.length;
  const lastMonthCount = lastMonthEntries.length;
  const entryTrend = pct(thisMonthCount, lastMonthCount);

  const totalPending = allEntries.filter(e => e.payment_status !== 'paid').reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalPendingWork = allEntries.filter(e => e.work_status === 'pending').length;

  const newUsersThisMonth = allProfiles.filter(p => { const d = new Date(p.created_at); return d >= thisMonthStart && d <= thisMonthEnd; }).length;
  const newUsersLastMonth = allProfiles.filter(p => { const d = new Date(p.created_at); return d >= lastMonthStart && d <= lastMonthEnd; }).length;
  const userTrend = pct(newUsersThisMonth, newUsersLastMonth);

  const expiringUsers = allProfiles.filter(p => { if (!p.expiry_date) return false; const exp = new Date(p.expiry_date); return isAfter(exp, today) && isBefore(exp, sevenDaysLater); });
  const expiredUsers  = allProfiles.filter(p => { if (!p.expiry_date) return false; return isBefore(new Date(p.expiry_date), today) && p.account_status !== 'inactive'; });
  const inactiveUsers = allProfiles.filter(p => { const ue = allEntries.filter(e => e.user_id === p.id); if (ue.length === 0) return true; return isBefore(new Date(ue[0].created_at), thirtyDaysAgo); });
  const approachingLimitUsers = allProfiles.filter(p => { if (p.plan === 'premium') return false; const limit = p.plan === 'basic' ? 200 : 50; const count = thisMonthEntries.filter(e => e.user_id === p.id).length; return count >= limit * 0.8; });
  const trialUsers  = allProfiles.filter(p => p.plan === 'trial' || !p.plan);
  const activeUsers = allProfiles.filter(p => p.account_status === 'active');

  const operatorRevenue = allProfiles.map(p => {
    const rev = thisMonthEntries.filter(e => e.user_id === p.id).reduce((s, e) => s + (e.received_payment || 0), 0);
    return { ...p, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const serviceCounts = {};
  allEntries.forEach(e => { if (e.service_name) serviceCounts[e.service_name] = (serviceCounts[e.service_name] || 0) + 1; });
  const topServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recentUsers   = allProfiles.slice(0, 8);
  const recentEntries = allEntries.slice(0, 8);

  const statusColor = { active: 'var(--success)', trial: 'var(--warning)', inactive: 'var(--danger)', basic: '#6366f1', premium: '#0ea5e9' };

  // ── STAT CARDS with navigate links ──
  // Change these paths to match your actual route structure
  const topStats = [
    {
      icon: TrendingUp, label: 'Month Revenue',
      value: Rs(thisMonthRevenue),
      sub: `Last month: ${Rs(lastMonthRevenue)}`,
      color: '#0ea5e9', trend: revenueTrend,
      onClick: () => navigate('/admin/entries'),          // → all entries (revenue source)
    },
    {
      icon: Users, label: 'Total Users',
      value: allProfiles.length,
      sub: `${newUsersThisMonth} joined this month`,
      color: 'var(--brand)', trend: userTrend,
      onClick: () => navigate('/admin/users'),            // → user management
    },
    {
      icon: FileText, label: 'Total Entries',
      value: allEntries.length,
      sub: `${thisMonthCount} this month`,
      color: 'var(--success)', trend: entryTrend,
      onClick: () => navigate('/admin/entries'),          // → entries list
    },
  ];

  const bottomStats = [
    {
      icon: DollarSign, label: 'Total Pending',
      value: Rs(totalPending),
      sub: 'across all operators',
      color: 'var(--danger)',
      onClick: () => navigate('/admin/entries?payment_status=pending'), // → pending payments
    },
    {
      icon: Clock, label: 'Pending Work',
      value: totalPendingWork,
      sub: 'entries awaiting completion',
      color: 'var(--warning)',
      onClick: () => navigate('/admin/entries?work_status=pending'),    // → pending work
    },
    {
      icon: Activity, label: 'Active Users',
      value: activeUsers.length,
      sub: `${trialUsers.length} on trial`,
      color: '#8b5cf6',
      onClick: () => navigate('/admin/users?account_status=active'),    // → active users
    },
  ];

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.2s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-900)' }}>Admin Dashboard</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-400)', marginTop: 3 }}>
              Platform overview — {format(today, 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {expiringUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f59e0b15', border: '1px solid #f59e0b40', padding: '8px 14px', borderRadius: 10 }}>
                <Bell size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{expiringUsers.length} expiring soon</span>
              </div>
            )}
            {expiredUsers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#ef444415', border: '1px solid #ef444440', padding: '8px 14px', borderRadius: 10 }}>
                <AlertTriangle size={14} color="#ef4444" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{expiredUsers.length} expired</span>
              </div>
            )}
            <button onClick={() => { refetchProfiles(); refetchEntries(); refetchServices(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)' }} title="Refresh dashboard data">
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Large Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 12 }}>
        {topStats.map((s, i) => <StatCardLarge key={i} {...s} />)}
      </div>

      {/* Bottom 3 Compact Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {bottomStats.map((s, i) => <StatCardCompact key={i} {...s} />)}
      </div>

      {/* Alert Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SectionCard title="Platform Health Alerts" icon={AlertTriangle} accent="#ef4444">
          <AlertRow icon={AlertTriangle} color="#ef4444" label="Expired accounts"       value={expiredUsers.length}          urgent={expiredUsers.length > 0} />
          <AlertRow icon={Clock}         color="#f59e0b" label="Expiring in 7 days"     value={expiringUsers.length}         urgent={expiringUsers.length > 0} />
          <AlertRow icon={UserX}         color="#8b5cf6" label="Inactive 30+ days"      value={inactiveUsers.length}         urgent={inactiveUsers.length > 3} />
          <AlertRow icon={Zap}           color="#ef4444" label="Approaching plan limit" value={approachingLimitUsers.length} urgent={approachingLimitUsers.length > 0} />
          <AlertRow icon={Users}         color="#0ea5e9" label="Trial accounts"         value={trialUsers.length}            urgent={false} />
        </SectionCard>

        <SectionCard title="Month vs Last Month" icon={BarChart2} accent="#0ea5e9">
          {[
            { label: 'Revenue',   this: Rs(thisMonthRevenue), last: Rs(lastMonthRevenue), trend: revenueTrend, color: '#0ea5e9' },
            { label: 'Entries',   this: thisMonthCount,        last: lastMonthCount,        trend: entryTrend,   color: 'var(--success)' },
            { label: 'New Users', this: newUsersThisMonth,     last: newUsersLastMonth,     trend: userTrend,    color: 'var(--brand)' }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--ink-100)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{item.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>Last</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-500)' }}>{item.last}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>This</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.this}</p>
                </div>
                <TrendBadge value={item.trend} />
              </div>
            </div>
          ))}
          {(() => {
            const totalAmount = thisMonthEntries.reduce((s, e) => s + (e.total_cost || 0), 0);
            const rate = totalAmount === 0 ? 0 : Math.min(100, Math.round((thisMonthRevenue / totalAmount) * 100));
            return (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-600)' }}>Collection Rate</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: rate > 70 ? 'var(--success)' : 'var(--warning)' }}>{rate}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--ink-100)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${rate}%`, background: rate > 70 ? 'var(--success)' : 'var(--warning)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })()}
        </SectionCard>
      </div>

      {/* Top Operators + Top Services */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SectionCard title="Top 5 Operators by Revenue" icon={Award} accent="var(--brand)">
          {operatorRevenue.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>No data yet</p>
            : operatorRevenue.map((op, i) => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--ink-100)' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: i === 0 ? '#fbbf2420' : i === 1 ? '#9ca3af20' : '#b4530920', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : '#b45309' }}>#{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.full_name || 'No Name'}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>{op.business_name || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand)' }}>{Rs(op.revenue)}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>{thisMonthEntries.filter(e => e.user_id === op.id).length} entries</p>
                </div>
              </div>
            ))}
        </SectionCard>

        <SectionCard title="Most Popular Services" icon={Star} accent="var(--success)">
          {topServices.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>No entries yet</p>
            : topServices.map(([name, count], i) => {
              const barWidth = Math.round((count / topServices[0][1]) * 100);
              return (
                <div key={name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>{name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-600)' }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--ink-100)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: `hsl(${160 + i * 30}, 70%, 45%)`, borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
        </SectionCard>
      </div>

      {/* Expiring + Approaching Limit */}
      {(expiringUsers.length > 0 || approachingLimitUsers.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
          {expiringUsers.length > 0 && (
            <SectionCard title="Expiring in 7 Days" icon={Calendar} accent="#f59e0b">
              {expiringUsers.map(p => <UserRow key={p.id} user={p} label={`Exp: ${format(new Date(p.expiry_date), 'dd/MM/yyyy')}`} labelColor="#f59e0b" />)}
            </SectionCard>
          )}
          {approachingLimitUsers.length > 0 && (
            <SectionCard title="Approaching Plan Limit (80%+)" icon={Zap} accent="#ef4444">
              {approachingLimitUsers.map(p => {
                const limit = p.plan === 'basic' ? 200 : 50;
                const count = thisMonthEntries.filter(e => e.user_id === p.id).length;
                const usedPct = Math.round((count / limit) * 100);
                return (
                  <div key={p.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)' }}>{p.full_name || 'No Name'}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>{count}/{limit}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--ink-100)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${usedPct}%`, background: usedPct >= 90 ? '#ef4444' : '#f59e0b', borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </SectionCard>
          )}
        </div>
      )}

      {/* Recent Users + Entries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <SectionCard title="Recent Users" icon={Users} accent="var(--brand)">
          {recentUsers.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>No users yet</p>
            : recentUsers.map(p => <UserRow key={p.id} user={p} label={p.plan || 'trial'} labelColor={statusColor[p.plan] || statusColor.trial} />)}
        </SectionCard>

        <SectionCard title="Recent Entries" icon={FileText} accent="var(--success)">
          {recentEntries.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--ink-400)', textAlign: 'center', padding: '20px 0' }}>No entries yet</p>
            : recentEntries.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--ink-100)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)' }}>{e.customer_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-400)' }}>{e.service_name} • {e.mobile}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand)' }}>{Rs(e.total_cost)}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: e.payment_status === 'paid' ? '#10b98115' : '#f59e0b15', color: e.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>{e.payment_status}</span>
                </div>
              </div>
            ))}
        </SectionCard>
      </div>
    </div>
  );
}