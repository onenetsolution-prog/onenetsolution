import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { exportReportsToCSV } from '../../utils/csvExport';
import { getServerDate } from '../../hooks/useServerTime';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

function StatBox({ label, value }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--ink-100)',
      padding: '16px 20px', flex: 1
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-400)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)' }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--ink-100)', padding: '20px 24px' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-800)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['reports-entries', user?.id, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from('service_entries').select('*').eq('user_id', user.id);
      if (dateFrom) q = q.gte('entry_date', dateFrom);
      if (dateTo)   q = q.lte('entry_date', dateTo);
      q = q.order('entry_date', { ascending: true });
      const { data } = await q;
      return data || [];
    },
    enabled: !!user?.id
  });

  const totalEntries  = entries.length;
  
  // Memoize all calculations
  const { totalRevenue, totalReceived, totalPending, totalProfit, pieData, dailyData, workData, payData } = useMemo(() => {
    const totRevenue  = entries.reduce((s, e) => s + (e.total_cost       || 0), 0);
    const totReceived = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
    const totPending  = entries.reduce((s, e) => s + (e.pending_payment  || 0), 0);
    const totProfit   = entries.reduce((s, e) => s + (e.profit           || 0), 0);

    // Service Distribution
    const serviceMap = entries.reduce((acc, e) => {
      const n = e.service_name || 'Unknown';
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {});
    const pieChartData = Object.entries(serviceMap).map(([name, value]) => ({ name, value }));

    // Daily Revenue
    const dailyMap = entries.reduce((acc, e) => {
      const day = e.entry_date;
      if (!acc[day]) acc[day] = { date: day, revenue: 0, entries: 0 };
      acc[day].revenue += e.received_payment || 0;
      acc[day].entries += 1;
      return acc;
    }, {});
    const dailyChartData = Object.values(dailyMap).map(d => ({
      ...d,
      label: format(parseISO(d.date), 'dd/MM')
    }));

    // Work Status
    const workCounts = entries.reduce((acc, e) => {
      const s = e.work_status || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const workChartData = [
      { name: 'Pending',   value: workCounts['pending']   || 0 },
      { name: 'Complete',  value: workCounts['completed'] || 0 },
      { name: 'Cancelled', value: workCounts['cancelled'] || 0 },
    ];

    // Payment Status
    const payCounts = entries.reduce((acc, e) => {
      const s = e.payment_status || 'pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const payChartData = [
      { name: 'Pending', value: payCounts['pending']        || 0 },
      { name: 'Partial', value: payCounts['partially paid'] || 0 },
      { name: 'Paid',    value: payCounts['paid']           || 0 },
    ];

    return { totalRevenue: totRevenue, totalReceived: totReceived, totalPending: totPending, totalProfit: totProfit, pieData: pieChartData, dailyData: dailyChartData, workData: workChartData, payData: payChartData };
  }, [entries]);

  const empty = <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-300)', fontSize: 13 }}>No data in range</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics and performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refetch}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)'
            }}
            title="Refresh reports"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => {
              if (entries.length === 0) {
                toast.error('No data to export');
                return;
              }
              const serviceDataWithRevenue = Object.entries(serviceMap).map(([name, value]) => {
                const revenue = entries
                  .filter(e => e.service_name === name)
                  .reduce((s, e) => s + (e.received_payment || 0), 0);
                return { name, value, revenue };
              });
              exportReportsToCSV(
                dailyData,
                serviceDataWithRevenue,
                { totalEntries, totalRevenue, totalReceived, totalPending, totalProfit },
                `reports-${getServerDate()}.csv`
              );
              toast.success('Report exported to CSV');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', background: '#10b981', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-600)' }}>From</span>
          <input type="date" className="form-input" style={{ width: 160 }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-600)' }}>To</span>
          <input type="date" className="form-input" style={{ width: 160 }}
            value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: 13, color: 'var(--ink-400)', fontWeight: 600 }}>
          {totalEntries} entries in range
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : (
        <>
          {/* 5 Stat Cards */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <StatBox label="Total Entries"  value={totalEntries} />
            <StatBox label="Total Revenue"  value={`Rs.${totalRevenue.toLocaleString('en-IN')}`} />
            <StatBox label="Total Received" value={`Rs.${totalReceived.toLocaleString('en-IN')}`} />
            <StatBox label="Total Pending"  value={`Rs.${totalPending.toLocaleString('en-IN')}`} />
            <StatBox label="Total Profit"   value={`Rs.${totalProfit.toLocaleString('en-IN')}`} />
          </div>

          {/* Row 1: Service Distribution + Daily Revenue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            <ChartCard title="Service Distribution">
              {pieData.length === 0 ? empty : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Entries']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Daily Revenue">
              {dailyData.length === 0 ? empty : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => [n === 'revenue' ? `Rs.${v}` : v, n === 'revenue' ? 'Revenue' : 'Entries']} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4,4,0,0]} name="revenue" />
                    <Bar dataKey="entries" fill="#10b981" radius={[4,4,0,0]} name="entries" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

          </div>

          {/* Row 2: Work Status + Payment Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <ChartCard title="Work Status">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Entries']} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {workData.map((_, i) => (
                      <Cell key={i} fill={['#f59e0b','#10b981','#ef4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payment Status">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={payData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Entries']} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {payData.map((_, i) => (
                      <Cell key={i} fill={['#ef4444','#f59e0b','#10b981'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        </>
      )}
    </div>
  );
}