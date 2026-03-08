import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getServerDateObject } from '../hooks/useServerTime';
import {
  LayoutDashboard, Users, Settings, List, Clock,
  CreditCard, Search, BarChart2, Bell, Zap, LogOut, Menu, Shield, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const navItems = [
  { to: '/admin',                  icon: LayoutDashboard, label: 'Dashboard',        end: true },
  { to: '/admin/users',            icon: Users,           label: 'Manage Users' },
  { to: '/admin/services',         icon: Zap,             label: 'Manage Services' },
  { to: '/admin/entries',          icon: List,            label: 'All Entries' },
  { to: '/admin/pending-work',     icon: Clock,           label: 'Pending Work' },
  { to: '/admin/pending-payments', icon: CreditCard,      label: 'Pending Payments' },
  { to: '/admin/customer-search',  icon: Search,          label: 'Customer Search' },
  { to: '/admin/reports',          icon: BarChart2,       label: 'Reports' },
  { to: '/admin/notifications',    icon: Bell,            label: 'Notifications' },
  { to: '/admin/settings',         icon: Settings,        label: 'Settings' },
];

function useClock() {
  const [time, setTime] = useState(getServerDateObject());
  useEffect(() => {
    const id = setInterval(() => setTime(getServerDateObject()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const now          = useClock();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate('/login', { replace: true }); };

  const currentPage = navItems.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label || 'Admin Panel';

  const { data: todayCount = 0 } = useQuery({
    queryKey: ['admin-today-count', format(now, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { count } = await supabase
        .from('service_entries')
        .select('id', { count: 'exact', head: true })
        .eq('entry_date', format(now, 'yyyy-MM-dd'));
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: pendingTotal = 0 } = useQuery({
    queryKey: ['admin-pending-total'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('pending_payment')
        .neq('payment_status', 'paid');
      return (data || []).reduce((s, e) => s + (e.pending_payment || 0), 0);
    },
    refetchInterval: 60000,
  });

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
  const { data: usersCount = 0 } = useQuery({
    queryKey: ['admin-users-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id');
      if (error) return 0;
      // Filter out the admin user
      const nonAdminUsers = (data || []).filter(u => u.id !== user?.id);
      return nonAdminUsers.length;
    },
    staleTime: 60000,
    enabled: !!user?.id,
  });

  const Sidebar = () => (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-title">One Net Solution</div>
              <div className="sidebar-logo-sub" style={{ color: '#ef4444' }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">Admin</div>
            <div className="sidebar-user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button className="signout-btn" onClick={handleSignOut} title="Sign out"><LogOut size={15} /></button>
        </div>
      </aside>
    </>
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">

        {/* Topbar */}
        <div className="topbar" style={{
          display: 'flex', alignItems: 'center', gap: 0,
          padding: '0 20px', minHeight: 68,
          background: '#fff',
          borderBottom: '1px solid var(--ink-100)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.05)',
        }}>
          <button className="hamburger-btn" style={{ display: 'flex', marginRight: 14 }} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          {/* Page name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600 }}>Admin</span>
              <ChevronRight size={12} color="var(--ink-300)" />
              <span style={{
                fontSize: 18, fontWeight: 900, letterSpacing: '-0.4px',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{currentPage}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }} className="admin-time-section">
              <span style={{ fontSize: 11.5, color: 'var(--ink-400)', fontWeight: 500 }}>
                {format(now, 'EEE, dd MMM yyyy')}
              </span>
              <span style={{ color: 'var(--ink-200)' }}>·</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                {format(now, 'hh:mm:ss aa')}
              </span>
            </div>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}
              onClick={() => navigate('/admin/users')} title="Total users">
              <Users size={13} color="#ef4444" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>{usersCount}</span>
              <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>users</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '6px 12px' }}
              title="Today's entries">
              <List size={13} color="#f97316" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#ea580c' }}>{todayCount}</span>
              <span style={{ fontSize: 11, color: '#fb923c', fontWeight: 600 }}>today</span>
            </div>

            {pendingTotal > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}
                onClick={() => navigate('/admin/pending-payments')} title="Total pending">
                <CreditCard size={13} color="#ef4444" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
                  Rs.{pendingTotal >= 1000 ? (pendingTotal / 1000).toFixed(1) + 'k' : pendingTotal}
                </span>
              </div>
            )}

            <span className="plan-badge premium" style={{ background: '#fee2e2', color: '#991b1b', flexShrink: 0 }}>
              Admin
            </span>
          </div>
        </div>

        <div className="page-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
}