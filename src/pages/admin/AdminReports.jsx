import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Navigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, parseISO, subDays } from 'date-fns';
import { getServerDateObject } from '../../hooks/useServerTime';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Trophy, UserX, TrendingUp, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

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

// ── PDF export helper ──────────────────────────────────────────────────────────
function exportAdminPDF({ filtered, operatorStats, pieData, dailyData, inactiveUsers, dateFrom, dateTo, totalRevenue, totalProfit, totalPending, totalAmount, collectionRate }) {
  const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW   = 210;
  const pageH   = 297;
  const margin  = 14;
  const cW      = pageW - margin * 2;
  let y         = 0;

  const fmt    = (n) => `Rs.${Number(n).toLocaleString('en-IN')}`;
  const clamp  = (needed) => { if (y + needed > pageH - 14) { pdf.addPage(); y = 14; } };
  const rowH   = 7;

  // ── Header band ─────────────────────────────────────────────────────────────
  pdf.setFillColor(79, 70, 229);
  pdf.rect(0, 0, pageW, 30, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17); pdf.setFont('helvetica', 'bold');
  pdf.text('Platform Report', margin, 13);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text(`Period: ${dateFrom}  →  ${dateTo}`, margin, 21);
  pdf.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageW - margin, 21, { align: 'right' });
  y = 38;

  // ── KPI cards ───────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total Revenue',    value: fmt(totalRevenue)  },
    { label: 'Total Profit',     value: fmt(totalProfit)   },
    { label: 'Total Pending',    value: fmt(totalPending)  },
    { label: 'Collection Rate',  value: `${collectionRate}%` },
    { label: 'Total Entries',    value: String(filtered.length) },
  ];
  const boxW = (cW - 8) / 5;
  kpis.forEach((k, i) => {
    const x = margin + i * (boxW + 2);
    pdf.setFillColor(245, 247, 255);
    pdf.roundedRect(x, y, boxW, 22, 3, 3, 'F');
    pdf.setDrawColor(210, 210, 235);
    pdf.roundedRect(x, y, boxW, 22, 3, 3, 'S');
    pdf.setTextColor(100, 100, 140);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
    pdf.text(k.label.toUpperCase(), x + boxW / 2, y + 7, { align: 'center' });
    pdf.setTextColor(30, 30, 60);
    pdf.setFontSize(k.value.length > 10 ? 7 : 9); pdf.setFont('helvetica', 'bold');
    pdf.text(k.value, x + boxW / 2, y + 16, { align: 'center' });
  });
  y += 30;

  // ── Section title ────────────────────────────────────────────────────────────
  const sectionTitle = (title) => {
    clamp(14);
    pdf.setFillColor(237, 238, 255);
    pdf.rect(margin, y, cW, 8, 'F');
    pdf.setTextColor(79, 70, 229);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 3, y + 5.5);
    y += 12;
  };

  // ── Table renderer ───────────────────────────────────────────────────────────
  const drawTable = (headers, colWidths, rows) => {
    clamp(rowH + 4);
    // Header row
    let cx = margin;
    headers.forEach((h, i) => {
      pdf.setFillColor(79, 70, 229);
      pdf.rect(cx, y, colWidths[i], rowH, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold');
      pdf.text(h, cx + 3, y + 5);
      cx += colWidths[i];
    });
    y += rowH;
    // Data rows
    rows.forEach((row, ri) => {
      clamp(rowH + 2);
      cx = margin;
      pdf.setFillColor(ri % 2 === 0 ? 250 : 244, ri % 2 === 0 ? 250 : 246, 255);
      pdf.rect(margin, y, cW, rowH, 'F');
      row.forEach((cell, ci) => {
        pdf.setTextColor(40, 40, 70);
        pdf.setFontSize(7.5); pdf.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
        pdf.text(String(cell ?? '—'), cx + 3, y + 5);
        cx += colWidths[ci];
      });
      y += rowH;
    });
    y += 8;
  };

  // ── 1. Operator Performance ──────────────────────────────────────────────────
  sectionTitle('Operator Performance');
  drawTable(
    ['Rank', 'Operator', 'Entries', 'Revenue', 'Pending', 'Collection%'],
    [14, 58, 20, 38, 32, 20],
    operatorStats.map((o, i) => [
      `#${i + 1}`, o.name, o.entries, fmt(o.revenue), fmt(o.pending), `${o.collectionRate}%`
    ])
  );

  // ── 2. Service Distribution ──────────────────────────────────────────────────
  sectionTitle('Service Distribution');
  const svcRows = pieData.map(({ name, value }) => {
    const rev = filtered.filter(e => e.service_name === name).reduce((s, e) => s + (e.received_payment || 0), 0);
    const pct = filtered.length ? ((value / filtered.length) * 100).toFixed(1) : '0';
    return [name, value, `${pct}%`, fmt(rev)];
  });
  drawTable(
    ['Service', 'Count', 'Share', 'Revenue'],
    [72, 22, 22, 66],
    svcRows
  );

  // ── 3. Daily Revenue Breakdown ───────────────────────────────────────────────
  if (dailyData.length > 0) {
    sectionTitle('Daily Revenue Breakdown');
    drawTable(
      ['Date', 'Revenue', 'Entries'],
      [50, 80, 52],
      dailyData.map(d => [format(parseISO(d.date), 'dd MMM yyyy'), fmt(d.revenue), d.entries])
    );
  }

  // ── 4. Inactive Users ────────────────────────────────────────────────────────
  if (inactiveUsers.length > 0) {
    sectionTitle(`Inactive Users (No entries in 30 days) — ${inactiveUsers.length} users`);
    drawTable(
      ['Name', 'Business', 'Mobile', 'Plan', 'Status', 'Last Entry'],
      [34, 38, 26, 20, 18, 46],
      inactiveUsers.map(u => [u.name, u.business, u.mobile, u.plan, u.status, u.lastEntry])
    );
  }

  // ── Footer on every page ─────────────────────────────────────────────────────
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(245, 245, 250);
    pdf.rect(0, pageH - 10, pageW, 10, 'F');
    pdf.setTextColor(150, 150, 170);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.text('Confidential — Admin Platform Report', margin, pageH - 4);
    pdf.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
  }

  pdf.save(`platform-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
  const [activeTab,      setActiveTab]      = useState('overview');

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

  const operators = [...new Set(entries.map(e => e.profiles?.business_name || e.profiles?.full_name).filter(Boolean))];
  const filtered  = filterOperator
    ? entries.filter(e => (e.profiles?.business_name || e.profiles?.full_name) === filterOperator)
    : entries;

  const totalRevenue = filtered.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalProfit  = filtered.reduce((s, e) => s + (e.profit || 0), 0);
  const totalPending = filtered.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalAmount  = filtered.reduce((s, e) => s + (e.total_amount || 0), 0);
  const collectionRate = totalAmount > 0 ? Math.round((totalRevenue / totalAmount) * 100) : 0;

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

  const pieData = Object.entries(
    filtered.reduce((acc, e) => { const n = e.service_name || 'Unknown'; acc[n] = (acc[n] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const dailyData = Object.values(
    filtered.reduce((acc, e) => {
      const day = e.entry_date;
      if (!acc[day]) acc[day] = { date: day, revenue: 0, entries: 0 };
      acc[day].revenue += e.received_payment || 0;
      acc[day].entries += 1;
      return acc;
    }, {})
  ).map(d => ({ ...d, label: format(parseISO(d.date), 'dd/MM') }));

  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const lastEntryByUser = allEntries.reduce((acc, e) => {
    if (!acc[e.user_id] || e.entry_date > acc[e.user_id]) acc[e.user_id] = e.entry_date;
    return acc;
  }, {});
  const inactiveUsers = allProfiles.filter(p => {
    const last = lastEntryByUser[p.id];
    return !last || last < thirtyDaysAgo;
  }).map(p => ({
    name:      p.full_name || '—',
    business:  p.business_name || '—',
    mobile:    p.mobile || '—',
    plan:      p.plan || '—',
    status:    p.status || '—',
    lastEntry: lastEntryByUser[p.id] ? format(parseISO(lastEntryByUser[p.id]), 'dd/MM/yyyy') : 'Never',
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

  const handleExportPDF = () => {
    if (filtered.length === 0 && inactiveUsers.length === 0) {
      alert('No data to export');
      return;
    }
    exportAdminPDF({
      filtered, operatorStats, pieData, dailyData, inactiveUsers,
      dateFrom, dateTo, totalRevenue, totalProfit, totalPending, totalAmount, collectionRate
    });
  };

  const tabs = [
    { id: 'overview',  label: 'Overview',      icon: <TrendingUp size={14} /> },
    { id: 'operators', label: 'Top Operators',  icon: <Trophy size={14} /> },
    { id: 'inactive',  label: `Inactive Users (${inactiveUsers.length})`, icon: <UserX size={14} /> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Reports</h1>
          <p className="page-subtitle">Revenue and performance across all operators</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportEntries} style={{ gap: 8 }}>
            <Download size={15} /> Export CSV
          </button>
          <button
            className="btn"
            onClick={handleExportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#10b981', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="admin-reports-filter-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
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
      <div className="admin-reports-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab.id)}>
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
          {activeTab === 'overview' && (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <StatBox label="Total Revenue"   value={`Rs.${totalRevenue.toLocaleString('en-IN')}`} color="var(--brand)" />
                <StatBox label="Total Profit"    value={`Rs.${totalProfit.toLocaleString('en-IN')}`}  color="var(--success)" />
                <StatBox label="Total Pending"   value={`Rs.${totalPending.toLocaleString('en-IN')}`} color="var(--danger)" />
                <StatBox label="Collection Rate" value={`${collectionRate}%`}                         color="var(--warning)" />
                <StatBox label="Total Entries"   value={filtered.length}                              color="var(--ink-600)" />
              </div>

              <div className="admin-charts-row1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
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
                      <div className="pie-chart-admin" style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v) => [v, 'Entries']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
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
                <div className="admin-operators-table table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th><th>Operator</th><th>Entries</th>
                        <th>Revenue</th><th>Pending</th><th>Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operatorStats.map((o, i) => (
                        <tr key={o.name}>
                          <td>
                            <span style={{ fontWeight: 800, fontSize: 15, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--ink-400)' }}>
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
                <div className="admin-inactive-table table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th><th>Business</th><th>Mobile</th>
                        <th>Plan</th><th>Status</th><th>Last Entry</th>
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

      <style>{`
        @media (max-width: 768px) {
          .admin-reports-filter-row { gap: 10px !important; }
          .admin-reports-tabs { flex-wrap: wrap !important; }
          .admin-charts-row1 { grid-template-columns: 1fr !important; }
          .pie-chart-admin { height: 280px !important; }
          .pie-chart-admin svg { max-height: 280px !important; }
          .admin-operators-table { overflow-x: auto !important; }
          .admin-inactive-table { overflow-x: auto !important; }
          .stats-grid { flex-wrap: wrap !important; }
          .stats-grid > .card { min-width: 140px !important; }
        }
      `}</style>
    </div>
  );
}