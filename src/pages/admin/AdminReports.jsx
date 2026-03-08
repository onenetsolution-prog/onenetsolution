import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Navigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { getServerDateObject } from '../../hooks/useServerTime';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Trophy, UserX, TrendingUp } from 'lucide-react';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899'];

// ── CSV export helper ──────────────────────────────────────────────────────────
function exportToCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    )
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const StatBox = ({ label, value, color }) => (
  <div className="card" style={{ padding: '18px 20px' }}>
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-400)', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
  </div>
);

export default function AdminReports() {
  const { user, loading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [dateFrom,       setDateFrom]       = useState(format(startOfMonth(getServerDateObject()), 'yyyy-MM-dd'));
  const [dateTo,         setDateTo]         = useState(format(endOfMonth(getServerDateObject()),   'yyyy-MM-dd'));
  const [filterOperator, setFilterOperator] = useState('');
  const [activeTab,      setActiveTab]      = useState('overview'); // 'overview' | 'operators' | 'inactive'

  // ── All entries in date range ──────────────────────────────────────────────
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin-reports', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries')
        .select('*, profiles(full_name, business_name)')
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo)
        .order('entry_date', { ascending: true });
      return data || [];
    },
    enabled: !!isAdmin,
  });

  // ── All profiles (for inactive report) ────────────────────────────────────
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, mobile, plan, status, expiry_date')
        .order('full_name');
      return (data || []).filter(p => p.id !== user?.id);
    },
    enabled: !!isAdmin,
  });

  // ── All entries ever (for inactive report) ─────────────────────────────────
  const { data: allEntries = [] } = useQuery({
    queryKey: ['admin-all-entries-ever'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries')
        .select('user_id, entry_date')
        .order('entry_date', { ascending: false });
      return data || [];
    },
    enabled: !!isAdmin,
  });

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  // ── Derived data ───────────────────────────────────────────────────────────
  const operators = [...new Set(entries.map(e => e.profiles?.business_name || e.profiles?.full_name).filter(Boolean))];
  const filtered  = filterOperator
    ? entries.filter(e => (e.profiles?.business_name || e.profiles?.full_name) === filterOperator)
    : entries;

  const totalRevenue = filtered.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalProfit  = filtered.reduce((s, e) => s + (e.profit || 0), 0);
  const totalPending = filtered.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalAmount  = filtered.reduce((s, e) => s + (e.total_amount || 0), 0);
  const collectionRate = totalAmount > 0 ? Math.round((totalRevenue / totalAmount) * 100) : 0;

  // Revenue by operator (all entries, not filtered by operator)
  const operatorStats = Object.values(
    entries.reduce((acc, e) => {
      const name = e.profiles?.business_name || e.profiles?.full_name || 'Unknown';
      if (!acc[name]) acc[name] = { name, revenue: 0, pending: 0, entries: 0, total: 0 };
      acc[name].revenue  += e.received_payment || 0;
      acc[name].pending  += e.pending_payment  || 0;
      acc[name].entries  += 1;
      acc[name].total    += e.total_amount     || 0;
      return acc;
    }, {})
  )
  .map(o => ({ ...o, collectionRate: o.total > 0 ? Math.round((o.revenue / o.total) * 100) : 0 }))
  .sort((a, b) => b.revenue - a.revenue);

  const top5 = operatorStats.slice(0, 5);

  // Service distribution
  const pieData = Object.entries(
    filtered.reduce((acc, e) => { const n = e.service_name || 'Unknown'; acc[n] = (acc[n] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Daily revenue
  const dailyData = Object.values(
    filtered.reduce((acc, e) => {
      const day = e.entry_date;
      if (!acc[day]) acc[day] = { date: day, revenue: 0, entries: 0 };
      acc[day].revenue += e.received_payment || 0;
      acc[day].entries += 1;
      return acc;
    }, {})
  ).map(d => ({ ...d, label: format(parseISO(d.date), 'dd/MM') }));

  // Inactive users — no entries in last 30 days
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const lastEntryByUser = allEntries.reduce((acc, e) => {
    if (!acc[e.user_id] || e.entry_date > acc[e.user_id]) acc[e.user_id] = e.entry_date;
    return acc;
  }, {});
  const inactiveUsers = allProfiles.filter(p => {
    const last = lastEntryByUser[p.id];
    return !last || last < thirtyDaysAgo;
  }).map(p => ({
    name:        p.full_name || '—',
    business:    p.business_name || '—',
    mobile:      p.mobile || '—',
    plan:        p.plan || '—',
    status:      p.status || '—',
    lastEntry:   lastEntryByUser[p.id] ? format(parseISO(lastEntryByUser[p.id]), 'dd/MM/yyyy') : 'Never',
  }));

  // ── CSV exports ────────────────────────────────────────────────────────────
  const handleExportEntries = () => {
    const rows = filtered.map(e => ({
      Date:       e.entry_date,
      Operator:   e.profiles?.business_name || e.profiles?.full_name || '—',
      Customer:   e.customer_name || '—',
      Mobile:     e.mobile || '—',
      Service:    e.service_name || '—',
      Amount:     e.total_amount || 0,
      Received:   e.received_payment || 0,
      Pending:    e.pending_payment || 0,
      WorkStatus: e.work_status || '—',
      PayStatus:  e.payment_status || '—',
    }));
    exportToCSV(rows, `entries_${dateFrom}_to_${dateTo}.csv`);
  };

  const handleExportOperators = () => {
    exportToCSV(operatorStats.map(o => ({
      Operator:       o.name,
      Entries:        o.entries,
      Revenue:        o.revenue,
      Pending:        o.pending,
      CollectionRate: `${o.collectionRate}%`,
    })), 'operator_report.csv');
  };

  const handleExportInactive = () => {
    exportToCSV(inactiveUsers, 'inactive_users.csv');
  };

  // ── Tab nav ────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',  label: 'Overview',        icon: <TrendingUp size={14} /> },
    { id: 'operators', label: 'Top Operators',   icon: <Trophy size={14} /> },
    { id: 'inactive',  label: `Inactive Users (${inactiveUsers.length})`, icon: <UserX size={14} /> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Reports</h1>
          <p className="page-subtitle">Revenue and performance across all operators</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportEntries} style={{ gap: 8 }}>
          <Download size={15} /> Export Entries CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>From</label>
              <input type="date" className="form-input" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>To</label>
              <input type="date" className="form-input" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 200 }} value={filterOperator} onChange={e => setFilterOperator(e.target.value)}>
              <option value="">All Operators</option>
              {operators.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{ fontSize: 13, color: 'var(--ink-400)', fontWeight: 600 }}>
              {filtered.length} entries in range
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <StatBox label="Total Revenue"     value={`Rs.${totalRevenue.toLocaleString('en-IN')}`} color="var(--brand)" />
                <StatBox label="Total Profit"      value={`Rs.${totalProfit.toLocaleString('en-IN')}`}  color="var(--success)" />
                <StatBox label="Total Pending"     value={`Rs.${totalPending.toLocaleString('en-IN')}`} color="var(--danger)" />
                <StatBox label="Collection Rate"   value={`${collectionRate}%`}                         color="var(--warning)" />
                <StatBox label="Total Entries"     value={filtered.length}                              color="var(--ink-600)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="card">
                  <div className="card-header"><div className="card-title">Revenue by Operator</div></div>
                  <div className="card-body">
                    {operatorStats.length === 0 ? <div className="empty-state"><p>No data</p></div> : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={operatorStats} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`Rs.${v}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#4f46e5" radius={[6,6,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><div className="card-title">Service Distribution</div></div>
                  <div className="card-body">
                    {pieData.length === 0 ? <div className="empty-state"><p>No data</p></div> : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [v, 'Entries']} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Daily Revenue Trend</div></div>
                <div className="card-body">
                  {dailyData.length === 0 ? <div className="empty-state"><p>No data in range</p></div> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v, name) => [name === 'revenue' ? `Rs.${v}` : v, name === 'revenue' ? 'Revenue' : 'Entries']} />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]} name="revenue" />
                        <Bar dataKey="entries" fill="#4f46e5" radius={[4,4,0,0]} name="entries" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── TOP OPERATORS TAB ─────────────────────────────────────────── */}
          {activeTab === 'operators' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Top Operators by Revenue</div>
                <button className="btn btn-secondary btn-sm" onClick={handleExportOperators}>
                  <Download size={13} /> Export CSV
                </button>
              </div>
              {operatorStats.length === 0 ? (
                <div className="empty-state"><Trophy size={36} /><p>No data in selected range</p></div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Operator</th>
                        <th>Entries</th>
                        <th>Revenue</th>
                        <th>Pending</th>
                        <th>Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operatorStats.map((o, i) => (
                        <tr key={o.name}>
                          <td>
                            <span style={{
                              fontWeight: 800, fontSize: 15,
                              color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--ink-400)'
                            }}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{o.name}</td>
                          <td>{o.entries}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>Rs.{o.revenue.toLocaleString('en-IN')}</td>
                          <td style={{ color: 'var(--danger)' }}>Rs.{o.pending.toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--ink-100)', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${o.collectionRate}%`, height: '100%', background: o.collectionRate >= 80 ? 'var(--success)' : o.collectionRate >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36 }}>{o.collectionRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── INACTIVE USERS TAB ────────────────────────────────────────── */}
          {activeTab === 'inactive' && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Inactive Users — No entries in 30 days</div>
                <button className="btn btn-secondary btn-sm" onClick={handleExportInactive} disabled={inactiveUsers.length === 0}>
                  <Download size={13} /> Export CSV
                </button>
              </div>
              {inactiveUsers.length === 0 ? (
                <div className="empty-state"><UserX size={36} /><p>All users are active</p></div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Business</th>
                        <th>Mobile</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Last Entry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inactiveUsers.map((u, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{u.name}</td>
                          <td>{u.business}</td>
                          <td>{u.mobile}</td>
                          <td><span className="badge badge-info">{u.plan}</span></td>
                          <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{u.status}</span></td>
                          <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{u.lastEntry}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}