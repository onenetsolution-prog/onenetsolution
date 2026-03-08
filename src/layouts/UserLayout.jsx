import { useState, useEffect, memo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getServerDateObject } from '../hooks/useServerTime';
import {
  LayoutDashboard, PlusCircle, List, Clock, CreditCard,
  FileText, Search, BarChart2, User, LogOut, Menu, AlertTriangle,
  Bell, TrendingUp, Calendar, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import FloatingSupport from '../components/FloatingSupport';
import ImpersonationBanner from '../components/ImpersonationBanner';

const navItems = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new-entry',        icon: PlusCircle,      label: 'New Entry' },
  { to: '/entries',          icon: List,            label: 'All Entries' },
  { to: '/pending-work',     icon: Clock,           label: 'Pending Work' },
  { to: '/pending-payments', icon: CreditCard,      label: 'Pending Payments' },
  { to: '/invoice',          icon: FileText,        label: 'Invoice' },
  { to: '/customer-search',  icon: Search,          label: 'Customer Search' },
  { to: '/reports',          icon: BarChart2,       label: 'Reports' },
  { to: '/profile',          icon: User,            label: 'Profile' },
];

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

// ── Live Clock Component (Memoized) ──────────────────────────
function LiveClock() {
  const [time, setTime] = useState(getServerDateObject());
  useEffect(() => {
    const id = setInterval(() => setTime(getServerDateObject()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <span style={{ fontSize: 11.5, color: 'var(--ink-400)', fontWeight: 500 }}>
        {format(time, 'EEE, dd MMM yyyy')}
      </span>
      <span style={{ color: 'var(--ink-200)' }}>·</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
        {format(time, 'hh:mm:ss aa')}
      </span>
    </>
  );
}

const MemoizedLiveClock = memo(LiveClock);

// ── Payment block ────────────────────────────────────────────────
function PaymentBlock({ profile, settings, onSignOut }) {
  const amount    = settings?.subscription_amount || 999;
  const upiId     = settings?.upi_id || '';
  const adminName = settings?.admin_name || 'Admin';
  const whatsapp  = settings?.whatsapp_number || '';
  const qrUrl = upiId
    ? 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent('upi://pay?pa=' + upiId + '&pn=' + adminName + '&am=' + amount + '&cu=INR') + '&bgcolor=ffffff&color=000000&margin=10'
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertTriangle size={30} color="#dc2626" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>Account Deactivated</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Your account has been deactivated. Please pay the subscription fee to reactivate access.</p>
        <div style={{ background: '#f5f3ff', borderRadius: 16, padding: '18px 24px', marginBottom: 24, border: '2px solid #ede9fe' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Subscription Amount</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#1e1b4b' }}>Rs.{amount}</div>
        </div>
        {qrUrl && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Scan to Pay via UPI</div>
            <img src={qrUrl} alt="UPI QR" style={{ width: 200, height: 200, borderRadius: 16, border: '3px solid #ede9fe', margin: '0 auto', display: 'block' }} />
            {upiId && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>{upiId}</div>}
          </div>
        )}
        {whatsapp && (
          <button onClick={() => window.open('https://wa.me/91' + whatsapp + '?text=Hi, I have paid the subscription fee. Please activate my account. Name: ' + (profile?.full_name || ''), '_blank')}
            style={{ width: '100%', padding: '14px 20px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
            Message on WhatsApp after Payment
          </button>
        )}
        <button onClick={onSignOut} style={{ width: '100%', padding: '12px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign Out</button>
      </div>
    </div>
  );
}

// ── Subscription limit block ─────────────────────────────────────
function SubscriptionLimitBlock({ profile, settings, onSignOut }) {
  const amount   = settings?.subscription_amount || 999;
  const upiId    = settings?.upi_id || '';
  const adminName = settings?.admin_name || 'Admin';
  const whatsapp = settings?.whatsapp_number || '';
  const qrUrl = upiId
    ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('upi://pay?pa=' + upiId + '&pn=' + adminName + '&am=' + amount + '&cu=INR') + '&bgcolor=ffffff&color=000000&margin=10'
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 36, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e1b4b', marginBottom: 8 }}>{profile?.plan === 'trial' ? 'Trial Limit Reached' : 'Monthly Limit Reached'}</h2>
        <p style={{ fontSize: 13.5, color: '#6b7280', marginBottom: 20 }}>
          {profile?.plan === 'trial' ? 'Your free trial has ended. Upgrade to continue.' : 'You have used all 200 entries for this month. Upgrade for unlimited entries.'}
        </p>
        {qrUrl && (
          <div style={{ marginBottom: 20 }}>
            <img src={qrUrl} alt="UPI QR" style={{ width: 160, height: 160, borderRadius: 12, border: '2px solid #ede9fe', margin: '0 auto', display: 'block' }} />
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: '#1e1b4b' }}>Rs.{amount}</div>
            {upiId && <div style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{upiId}</div>}
          </div>
        )}
        {whatsapp && (
          <button onClick={() => window.open('https://wa.me/91' + whatsapp + '?text=Hi, I want to upgrade my plan. Name: ' + (profile?.full_name || ''), '_blank')}
            style={{ width: '100%', padding: '13px 20px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
            Contact on WhatsApp to Upgrade
          </button>
        )}
        <button onClick={onSignOut} style={{ width: '100%', padding: '11px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign Out</button>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────
function Sidebar({ profile, user, sidebarOpen, setSidebarOpen, handleSignOut }) {
  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-title">One Net Solution</div>
              <div className="sidebar-logo-sub">CSC Center Manager</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')} onClick={() => setSidebarOpen(false)}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'User'}</div>
            <div className="sidebar-user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button className="signout-btn" onClick={handleSignOut} title="Sign out"><LogOut size={15} /></button>
        </div>
      </aside>
    </>
  );
}

// ── Main Layout ──────────────────────────────────────────────────
export default function UserLayout() {
  const { user, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const now = () => getServerDateObject();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('settings_key', 'main').maybeSingle();
      return data;
    },
    staleTime: Infinity,
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ['entry-count', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('id').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  // Today's entry count
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['today-count', user?.id, format(now(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('id')
        .eq('user_id', user.id)
        .eq('entry_date', format(now(), 'yyyy-MM-dd'));
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Total pending amount
  const { data: pendingData = [] } = useQuery({
    queryKey: ['pending-total', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('pending_payment')
        .eq('user_id', user.id)
        .neq('payment_status', 'paid');
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  // Unread notifications — with real-time subscription
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['user-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_notifications').select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Real-time subscription to user_notifications ──
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, refetchNotifications]);

  const handleSignOut = async () => { await signOut(); navigate('/login', { replace: true }); };

  const planLabel    = profile?.plan || 'trial';
  const isAdmin      = user?.email === ADMIN_EMAIL;
  const totalPending = pendingData.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const initials     = (profile?.full_name || user?.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Trial limit calculation ──
  const planLimits = { trial: 50, basic: 200, premium: 99999, custom: 99999 };
  const currentLimit = planLimits[planLabel] || 50;
  const usedEntries = allEntries.length;
  const usagePercent = (usedEntries / currentLimit) * 100;
  const isApproachingLimit = usagePercent >= 70 && usagePercent < 100;
  const isAtLimit = usagePercent >= 100;

  // Current page label for topbar
  const currentPage = navItems.find(n => location.pathname === n.to)?.label || '';

  // Block logic
  const isDeactivated = !isAdmin && profile?.account_status === 'inactive';
  const isLimitBlocked = !isAdmin && !isDeactivated && (() => {
    if (!profile) return false;
    const today  = now();
    const expiry = profile.expiry_date ? new Date(profile.expiry_date) : null;
    if (profile.account_status === 'active' && expiry && expiry > today) return false;
    if (profile.plan === 'trial' || !profile.plan) {
      const days = Math.floor((today - new Date(profile.trial_start_date || today)) / 86400000);
      if (days > 7 || allEntries.length >= 50) return true;
    }
    if (profile.plan === 'basic' && allEntries.length >= 200) return true;
    return false;
  })();

  if (isDeactivated) {
    return <PaymentBlock profile={profile} settings={settings} onSignOut={handleSignOut} />;
  }

  return (
    <div className="app-shell">
      <ImpersonationBanner />
      <Sidebar profile={profile} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} handleSignOut={handleSignOut} />

      <main className="main-content">

        {/* ── TOPBAR ── */}
        <div className="topbar" style={{
          display: 'flex', alignItems: 'center', gap: 0,
          padding: '0 20px', minHeight: 68,
          background: '#fff',
          borderBottom: '1px solid var(--ink-100)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
        }}>

          {/* Hamburger */}
          <button className="hamburger-btn" style={{ display: 'flex', marginRight: 14, flexShrink: 0 }} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          {/* Business Name — big and bold */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 20, fontWeight: 900, color: 'var(--ink-900)',
              letterSpacing: '-0.5px', lineHeight: 1.1,
              fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {profile?.business_name || profile?.full_name || 'My Center'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }} className="user-time-section">
              <Calendar size={11} color="var(--ink-400)" />
              <MemoizedLiveClock />
            </div>
          </div>

          {/* ── Right side chips ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            {/* Today's entries chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#eef2ff', borderRadius: 10,
              padding: '6px 12px', cursor: 'default',
            }} title="Today's entries">
              <FileText size={13} color="#6366f1" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>{todayEntries.length}</span>
              <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, display: 'none' }} className="topbar-chip-label">today</span>
            </div>

            {/* Pending amount chip — only if there's pending */}
            {totalPending > 0 && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef2f2', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}
                title="Total pending payments"
                onClick={() => navigate('/pending-payments')}
              >
                <TrendingUp size={13} color="#ef4444" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
                  Rs.{totalPending >= 1000 ? (totalPending / 1000).toFixed(1) + 'k' : totalPending.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Quick New Entry button */}
            <button
              onClick={() => navigate('/new-entry')}
              title="New Entry"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '7px 14px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)'; }}
            >
              <PlusCircle size={14} />
              <span>New</span>
            </button>

            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs(p => !p)}
                title="Notifications"
                style={{
                  width: 38, height: 38, borderRadius: 10, border: '1px solid var(--ink-100)',
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink-50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                <Bell size={16} color={notifications.length > 0 ? '#6366f1' : 'var(--ink-400)'} />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ef4444', border: '1.5px solid #fff',
                  }} />
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifs && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifs(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: 46, zIndex: 100,
                    width: 300, background: '#fff', borderRadius: 14,
                    border: '1px solid var(--ink-100)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ink-100)', fontWeight: 700, fontSize: 13, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Bell size={13} color="#6366f1" /> Notifications
                      {notifications.length > 0 && (
                        <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                          {notifications.length}
                        </span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '11px 16px', borderBottom: '1px solid var(--ink-50)', fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>{n.title || 'Message from Admin'}</div>
                          <div style={{ color: 'var(--ink-500)', fontSize: 12 }}>{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Plan badge */}
            <span className={'plan-badge ' + planLabel} style={{ flexShrink: 0 }}>{planLabel}</span>

            {/* Profile avatar */}
            <div
              onClick={() => navigate('/profile')}
              title="Profile"
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                transition: 'all 0.15s', userSelect: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {initials}
            </div>
          </div>
        </div>

        {/* ── Trial Limit Warning Banner ── */}
        {isApproachingLimit && !isAdmin && (
          <div style={{
            background: usagePercent >= 90 ? '#fee2e2' : '#fef9c3',
            borderBottom: usagePercent >= 90 ? '2px solid #ef4444' : '2px solid #f59e0b',
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <AlertTriangle size={18} color={usagePercent >= 90 ? '#dc2626' : '#d97706'} />
              <div style={{ fontSize: 13, fontWeight: 600, color: usagePercent >= 90 ? '#831c0f' : '#92400e' }}>
                You have used <strong>{usedEntries} of {currentLimit}</strong> {planLabel} entries
                {usagePercent >= 90 ? ' — Limit almost reached!' : ''}
              </div>
            </div>
            {usagePercent >= 90 && (
              <button
                onClick={() => navigate('/profile')}
                style={{
                  padding: '6px 14px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0
                }}
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        <div className="page-scroll">
          <Outlet />
        </div>
      </main>

      {isLimitBlocked && (
        <SubscriptionLimitBlock profile={profile} settings={settings} onSignOut={handleSignOut} />
      )}
      <FloatingSupport />
    </div>
  );
}