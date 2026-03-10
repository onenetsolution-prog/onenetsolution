import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { supabase } from '../../lib/supabase';
import { getServerDate, getServerDateObject } from '../../hooks/useServerTime';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Clock, CreditCard, TrendingUp, AlertCircle, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSettings } from '../../hooks/useAppSettings';
import UserPopupNotification from '../../components/UserPopupNotification';
import AppBanners from '../../components/AppBanners';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Outfit:wght@800;900&display=swap');

  .db3-root {
    min-height: 100vh;
    background: #f7f8fc;
    padding: 28px 32px 56px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .db3-content { max-width: 1380px; margin: 0 auto; }
  @media (max-width: 640px) {
    .db3-root { padding: 16px 0 40px; }
  }

  @keyframes db3-up {
    from { opacity:0; transform:translateY(12px) }
    to   { opacity:1; transform:translateY(0) }
  }

  /* ════════════════════════════════════════
     HEADER — Style 4B Enhanced
  ════════════════════════════════════════ */
  .db3-header {
    margin-bottom: 28px;
    animation: db3-up 0.45s ease both;
  }
  .db3-greet-row {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }

  /* Glowing filled pill with shimmer sweep */
  .db3-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: #ffffff;
    background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
    padding: 7px 17px 7px 13px;
    border-radius: 30px;
    box-shadow:
      0 4px 16px rgba(99,102,241,0.40),
      0 1px 4px rgba(99,102,241,0.20),
      inset 0 1px 0 rgba(255,255,255,0.15);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  /* Light shimmer sweep across pill */
  .db3-pill::after {
    content: '';
    position: absolute;
    top: 0; left: -80%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg,
      transparent,
      rgba(255,255,255,0.22),
      transparent
    );
    animation: pill-sweep 4s ease-in-out infinite;
  }
  @keyframes pill-sweep {
    0%   { left: -80% }
    55%  { left: 130% }
    100% { left: 130% }
  }

  /* Pulsing live dot inside pill */
  .db3-pill-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #fff;
    flex-shrink: 0;
    animation: live-pulse 2.2s ease-in-out infinite;
  }
  @keyframes live-pulse {
    0%,100% { opacity:1;  box-shadow: 0 0 0 0   rgba(255,255,255,0.7) }
    50%     { opacity:0.6; box-shadow: 0 0 0 4px rgba(255,255,255,0)   }
  }

  /* Thin gradient divider */
  .db3-greet-div {
    width: 1.5px; height: 30px;
    background: linear-gradient(180deg,
      transparent 0%, #c7d2fe 40%, #c7d2fe 60%, transparent 100%);
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* Name — Outfit black, first letter indigo */
  .db3-name {
    font-family: 'Outfit', sans-serif;
    font-size: 26px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.8px;
    line-height: 1;
  }
  @media (max-width: 640px) {
    .db3-name { font-size: 20px; }
    .db3-greet-div { display: none; }
  }
  .db3-name-first { color: #6366f1; }

  /* ════════════════════════════════════════
     STAT GRID — 3 top, 2 centered bottom
  ════════════════════════════════════════ */
  .db3-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 18px;
    margin-bottom: 24px;
  }
  /* Top row — 3 cards, each spans 2 of 6 columns */
  .db3-stat:nth-child(1) { grid-column: span 2; }
  .db3-stat:nth-child(2) { grid-column: span 2; }
  .db3-stat:nth-child(3) { grid-column: span 2; }
  /* Bottom row — 2 cards centered: start at col 2, each span 2 */
  .db3-stat:nth-child(4) { grid-column: 2 / span 2; }
  .db3-stat:nth-child(5) { grid-column: 4 / span 2; }

  @media (max-width: 1024px) {
    .db3-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .db3-stat:nth-child(1) { grid-column: span 1; }
    .db3-stat:nth-child(2) { grid-column: span 1; }
    .db3-stat:nth-child(3) { grid-column: span 2; }
    .db3-stat:nth-child(4) { grid-column: span 1; }
    .db3-stat:nth-child(5) { grid-column: span 1; }
  }
  @media (max-width: 640px) {
    .db3-grid { grid-template-columns: 1fr; gap: 12px; padding: 0 12px; }
    .db3-stat { padding: 18px 18px 0; }
    .db3-stat:nth-child(n) { grid-column: span 1 !important; }
    .db3-stat-val { font-size: 28px; }
    .db3-stat-label { font-size: 9px; }
  }

  .db3-stat {
    background: #ffffff;
    border: 1px solid #e8edf5;
    border-radius: 18px;
    padding: 22px 22px 0;
    position: relative;
    overflow: hidden;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    cursor: default;
  }
  .db3-stat-link { cursor: pointer; }
  .db3-stat-link:hover,
  .db3-stat:not(.db3-stat-link):hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 36px rgba(0,0,0,0.08);
  }
  .db3-stat:nth-child(1){animation:db3-up 0.4s 0.04s ease both}
  .db3-stat:nth-child(2){animation:db3-up 0.4s 0.08s ease both}
  .db3-stat:nth-child(3){animation:db3-up 0.4s 0.12s ease both}
  .db3-stat:nth-child(4){animation:db3-up 0.4s 0.18s ease both}
  .db3-stat:nth-child(5){animation:db3-up 0.4s 0.22s ease both}

  .db3-stat-label {
    font-size: 10px; font-weight: 800;
    letter-spacing: 1.6px; text-transform: uppercase;
    color: #94a3b8; margin-bottom: 18px;
  }
  .db3-stat-icon-wrap {
    position: absolute; top: 18px; right: 18px;
    width: 48px; height: 48px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
  }
  .db3-stat-icon-blob {
    position: absolute; top: -8px; right: -8px;
    width: 70px; height: 70px; border-radius: 50%;
    opacity: 0.18; filter: blur(16px); pointer-events: none;
  }
  .db3-stat-val {
    font-size: 34px; font-weight: 900; color: #0f172a;
    line-height: 1; letter-spacing: -1.5px; margin-bottom: 8px;
    font-variant-numeric: tabular-nums;
  }
  .db3-stat-sub-row {
    display: flex; align-items: center;
    justify-content: space-between; padding-bottom: 16px;
  }
  .db3-stat-sub  { font-size: 12px; color: #94a3b8; font-weight: 500; }
  .db3-stat-pct  {
    font-size: 11px; font-weight: 700;
    background: #f1f5f9; color: #94a3b8;
    padding: 2px 8px; border-radius: 10px;
  }
  .db3-stat-hint-text {
    font-size: 11px; color: #6366f1; font-weight: 600;
    background: #eef2ff; padding: 2px 9px; border-radius: 8px;
    opacity: 0; transition: opacity 0.18s;
  }
  .db3-stat-link:hover .db3-stat-hint-text { opacity: 1; }
  .db3-stat-bar {
    height: 4px; border-radius: 0; width: 55%;
    margin: 0 -22px; position: relative; left: 22px;
  }

  /* ── SKELETON ── */
  .db3-skel {
    background:#fff; border:1px solid #e8edf5;
    border-radius:18px; padding:22px 22px 18px;
  }
  .db3-shim {
    background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
    background-size:200% 100%;
    animation: db3-shim 1.4s infinite linear; border-radius:6px;
  }
  @keyframes db3-shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

  /* ── TABLE CARD ── */
  .db3-card {
    background: #fff; border: 1px solid #e8edf5;
    border-radius: 18px; overflow: hidden;
    animation: db3-up 0.4s 0.28s ease both;
  }
  .db3-card-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9;
  }
  .db3-card-title { font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px; }
  .db3-card-sub   { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
  .db3-chip {
    font-size: 11px; font-weight: 700; color: #6366f1;
    background: #eef2ff; border: 1px solid #c7d2fe;
    padding: 4px 12px; border-radius: 20px;
  }

  /* ── TABLE ── */
  .db3-tbl-wrap { overflow-x: auto; }
  .db3-tbl { width: 100%; border-collapse: collapse; }
  .db3-tbl th {
    padding: 10px 20px; text-align: left;
    font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: #94a3b8;
    background: #fafbff; border-bottom: 1px solid #f1f5f9; white-space: nowrap;
  }
  .db3-tbl td { padding: 13px 20px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
  @media (max-width: 640px) {
    .db3-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .db3-tbl { min-width: 600px; font-size: 12px; }
    .db3-tbl th { padding: 8px 12px; font-size: 9px; }
    .db3-tbl td { padding: 10px 12px; }
  }
  .db3-tbl tbody tr:last-child td { border-bottom: none; }
  .db3-tbl tbody tr { transition: background 0.1s; }
  .db3-tbl tbody tr:hover td { background: #fafbff; }
  .db3-cname { font-size: 13px; font-weight: 700; color: #0f172a; }
  .db3-cmob  { font-size: 11px; color: #94a3b8; margin-top: 1px; }
  .db3-svc   { font-size: 12.5px; color: #475569; font-weight: 500; }
  .db3-dt    { font-size: 12px; color: #94a3b8; white-space: nowrap; }
  .db3-amt   { font-size: 13px; font-weight: 800; color: #0f172a; text-align: right; font-variant-numeric: tabular-nums; }

  /* ── BADGES ── */
  .db3b {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 20px;
    font-size: 10.5px; font-weight: 600; white-space: nowrap;
  }
  .db3b::before { content:''; width:4px; height:4px; border-radius:50%; background:currentColor; opacity:0.7; flex-shrink:0; }
  .db3b-g { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
  .db3b-y { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
  .db3b-r { background:#fff1f2; color:#e11d48; border:1px solid #fecdd3; }
  .db3b-n { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }

  /* ── EMPTY ── */
  .db3-empty { display:flex; flex-direction:column; align-items:center; padding:60px 20px; gap:10px; }
  .db3-empty-ico {
    width:58px; height:58px; border-radius:18px;
    background:#eef2ff; border:1px solid #c7d2fe;
    display:flex; align-items:center; justify-content:center; margin-bottom:6px;
  }
  .db3-empty-t { font-size:14px; font-weight:700; color:#475569; }
  .db3-empty-s { font-size:12px; color:#94a3b8; }

  /* ── TRIAL ── */
  .db3-trial {
    margin-top:18px; background:#fffbeb; border:1.5px solid #fde68a;
    border-radius:14px; padding:14px 18px;
    display:flex; align-items:center; gap:12px;
    animation: db3-up 0.4s 0.36s ease both;
  }
  .db3-trial-ico {
    width:34px; height:34px; border-radius:10px; flex-shrink:0;
    background:#fef3c7; border:1px solid #fde68a;
    display:flex; align-items:center; justify-content:center;
  }
  .db3-trial-txt { font-size:12.5px; color:#92400e; font-weight:500; line-height:1.5; }
  .db3-trial-txt b { color:#d97706; }
  .db3-row-sk { display:flex; gap:14px; padding:13px 20px; border-bottom:1px solid #f8fafc; align-items:center; }
`;

function Styles() { return <style dangerouslySetInnerHTML={{ __html: CSS }} />; }

function SkeletonCard() {
  return (
    <div className="db3-skel">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
        <div className="db3-shim" style={{ width:'60%', height:10 }} />
        <div className="db3-shim" style={{ width:42, height:42, borderRadius:12 }} />
      </div>
      <div className="db3-shim" style={{ width:'40%', height:34, marginBottom:10 }} />
      <div className="db3-shim" style={{ width:'55%', height:11 }} />
    </div>
  );
}

function StatCard({ icon: Icon, value, label, sub, color, barColor, onClick, hint }) {
  return (
    <div className={`db3-stat${onClick ? ' db3-stat-link' : ''}`} onClick={onClick}>
      <div className="db3-stat-label">{label}</div>
      <div className="db3-stat-icon-wrap" style={{ background:`${color}14` }}>
        <div className="db3-stat-icon-blob" style={{ background:color }} />
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div className="db3-stat-val">{value}</div>
      <div className="db3-stat-sub-row">
        <span className="db3-stat-sub">{sub}</span>
        {hint
          ? <span className="db3-stat-hint-text">→ {hint}</span>
          : <span className="db3-stat-pct">— 0%</span>
        }
      </div>
      <div className="db3-stat-bar" style={{ background:`linear-gradient(90deg,${barColor})` }} />
    </div>
  );
}

function StatusBadge({ status, type }) {
  const wMap = { pending:'db3b db3b-y', completed:'db3b db3b-g', cancelled:'db3b db3b-r' };
  const pMap = { pending:'db3b db3b-r', paid:'db3b db3b-g', 'partially paid':'db3b db3b-y' };
  return <span className={type==='work'?(wMap[status]||'db3b db3b-n'):(pMap[status]||'db3b db3b-n')}>{status}</span>;
}

export default function Dashboard() {
  const { user, profile: authProfile } = useAuth();
  const { effectiveUserId }            = useImpersonation();
  const { trial_limit }                = useAppSettings();
  const navigate    = useNavigate();
  const queryUserId = effectiveUserId || user?.id;

  const today      = getServerDate();
  const monthStart = format(startOfMonth(getServerDateObject()), 'yyyy-MM-dd');
  const monthEnd   = format(endOfMonth(getServerDateObject()),   'yyyy-MM-dd');

  const { data: impersonatedProfile } = useQuery({
    queryKey: ['impersonated-profile', effectiveUserId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id, full_name, business_name, mobile, plan, expiry_date, account_status, trial_start_date, address, gst_number, pan_number, gst_enabled, upi_id, upi_name, upi_mobile, created_at').eq('id', effectiveUserId).maybeSingle();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Failed to fetch impersonated profile:', err);
        return null;
      }
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const profile = effectiveUserId ? impersonatedProfile : authProfile;

  const { data: monthEntries = [], isLoading: loadingEntries, refetch: refetchMonth } = useQuery({
    queryKey: ['dashboard-entries', queryUserId, monthStart],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('*')
        .eq('user_id', queryUserId).gte('entry_date', monthStart).lte('entry_date', monthEnd)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!queryUserId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const { data: recentEntries = [], isLoading: loadingRecent, refetch: refetchRecent } = useQuery({
    queryKey: ['dashboard-recent', queryUserId],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('*')
        .eq('user_id', queryUserId).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!queryUserId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const { data: todayEntries = [], isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: ['dashboard-today', queryUserId, today],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('*')
        .eq('user_id', queryUserId).eq('entry_date', today).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!queryUserId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['user-notifications', queryUserId],
    queryFn: async () => {
      const { data } = await supabase.from('user_notifications').select('*')
        .eq('user_id', queryUserId).eq('is_read', false).order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!queryUserId,
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  const todayCount      = todayEntries.length;
  const totalEntries    = monthEntries.length;
  const pendingWork     = monthEntries.filter(e => e.work_status === 'pending').length;
  const monthRevenue    = monthEntries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending    = monthEntries
    .filter(e => e.payment_status !== 'paid')
    .reduce((s, e) => s + (e.pending_payment || 0), 0);
  const isLoading = loadingEntries || loadingRecent || loadingToday;

  const hour     = getServerDateObject().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const rawName  = profile?.full_name?.split(' ')[0] || 'there';
  const nameFirst = rawName[0].toUpperCase();
  const nameRest  = rawName.slice(1).toUpperCase();

  const STATS = [
    {
      icon: CalendarDays, value: todayCount,
      label: "Today's Entries", sub: `${format(getServerDateObject(),'dd MMM')} entries`,
      color: '#6366f1', barColor: '#6366f1,#a5b4fc', onClick: null, hint: null,
    },
    {
      icon: FileText, value: totalEntries,
      label: 'Total Entries', sub: `${totalEntries} this month`,
      color: '#8b5cf6', barColor: '#7c3aed,#a78bfa', onClick: null, hint: null,
    },
    {
      icon: TrendingUp, value: '₹' + monthRevenue.toLocaleString('en-IN'),
      label: 'Month Revenue', sub: 'received this month',
      color: '#06b6d4', barColor: '#0891b2,#67e8f9', onClick: null, hint: null,
    },
    {
      icon: CreditCard, value: '₹' + totalPending.toLocaleString('en-IN'),
      label: 'Total Pending', sub: 'across all entries',
      color: '#ef4444', barColor: '#dc2626,#fca5a5',
      onClick: () => navigate('/entries?payment_status=pending'), hint: 'View dues',
    },
    {
      icon: Clock, value: pendingWork,
      label: 'Pending Work', sub: 'awaiting completion',
      color: '#f59e0b', barColor: '#d97706,#fcd34d',
      onClick: () => navigate('/entries?work_status=pending'), hint: 'View tasks',
    },
  ];

  return (
    <>
      <Styles />
      <div className="db3-root">
        {notifications.length > 0 && <UserPopupNotification notifications={notifications} />}
        <div className="db3-content">
          <AppBanners />

          {/* ── Header — 4B Enhanced ── */}
          <div className="db3-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="db3-greet-row">
              <div className="db3-pill">
                <span className="db3-pill-dot" />
                {greeting}
              </div>
              <div className="db3-greet-div" />
              <div className="db3-name">
                <span className="db3-name-first">{nameFirst}</span>{nameRest}
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="db3-grid">
            {isLoading
              ? Array.from({length:5}).map((_,i) => <SkeletonCard key={i} />)
              : STATS.map(s => <StatCard key={s.label} {...s} />)
            }
          </div>

          {/* ── Recent Entries ── */}
          <div className="db3-card">
            <div className="db3-card-head">
              <div>
                <div className="db3-card-title">Recent Entries</div>
                <div className="db3-card-sub">Latest 20 entries across all services</div>
              </div>
              {!loadingRecent && <span className="db3-chip">{recentEntries.length} records</span>}
            </div>

            {loadingRecent ? (
              Array.from({length:5}).map((_,i) => (
                <div key={i} className="db3-row-sk">
                  <div className="db3-shim" style={{flex:2,   height:13,borderRadius:5}}/>
                  <div className="db3-shim" style={{flex:1.5, height:13,borderRadius:5}}/>
                  <div className="db3-shim" style={{flex:1,   height:13,borderRadius:5}}/>
                  <div className="db3-shim" style={{flex:1,   height:13,borderRadius:5}}/>
                  <div className="db3-shim" style={{flex:1,   height:13,borderRadius:5}}/>
                  <div className="db3-shim" style={{flex:0.7, height:13,borderRadius:5}}/>
                </div>
              ))
            ) : recentEntries.length === 0 ? (
              <div className="db3-empty">
                <div className="db3-empty-ico"><FileText size={26} color="#6366f1" strokeWidth={1.5}/></div>
                <div className="db3-empty-t">No entries yet</div>
                <div className="db3-empty-s">Go to New Entry to add your first record</div>
              </div>
            ) : (
              <div className="db3-tbl-wrap">
                <table className="db3-tbl">
                  <thead>
                    <tr>
                      <th>Customer</th><th>Service</th><th>Date</th>
                      <th>Work</th><th>Payment</th>
                      <th style={{textAlign:'right'}}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map(entry => (
                      <tr key={entry.id}>
                        <td>
                          <div className="db3-cname">{entry.customer_name}</div>
                          <div className="db3-cmob">{entry.mobile}</div>
                        </td>
                        <td><span className="db3-svc">{entry.service_name}</span></td>
                        <td><span className="db3-dt">{entry.entry_date ? format(new Date(entry.entry_date),'dd MMM yyyy') : '—'}</span></td>
                        <td><StatusBadge status={entry.work_status}    type="work"/></td>
                        <td><StatusBadge status={entry.payment_status} type="pay" /></td>
                        <td><div className="db3-amt">₹{(entry.total_cost||0).toLocaleString('en-IN')}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Trial Banner ── */}
          {(profile?.plan === 'trial' || !profile?.plan) && (
            <div className="db3-trial">
              <div className="db3-trial-ico"><AlertCircle size={17} color="#f59e0b"/></div>
              <div className="db3-trial-txt">
                <b>Trial Plan Active</b> — limited to 7 days or {trial_limit || 50} entries.
                Contact admin to upgrade and unlock full access.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
