import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { exportReportsToCSV } from '../../utils/csvExport';
import { getServerDate } from '../../hooks/useServerTime';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Download, FileText } from 'lucide-react';

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
  const [dateTo, setDateTo] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef(null);

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
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false
  });

  const totalEntries = entries.length;

  const { totalRevenue, totalReceived, totalPending, totalProfit, pieData, dailyData, workData, payData, serviceMap } = useMemo(() => {
    const totRevenue  = entries.reduce((s, e) => s + (e.total_cost       || 0), 0);
    const totReceived = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
    const totPending  = entries.reduce((s, e) => s + (e.pending_payment  || 0), 0);
    const totProfit   = entries.reduce((s, e) => s + (e.profit           || 0), 0);

    const svcMap = entries.reduce((acc, e) => {
      const n = e.service_name || 'Unknown';
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {});
    const pieChartData = Object.entries(svcMap).map(([name, value]) => ({ name, value }));

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

    return {
      totalRevenue: totRevenue, totalReceived: totReceived,
      totalPending: totPending, totalProfit: totProfit,
      pieData: pieChartData, dailyData: dailyChartData,
      workData: workChartData, payData: payChartData,
      serviceMap: svcMap
    };
  }, [entries]);

  // ─── PDF Export ──────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (entries.length === 0) { toast.error('No data to export'); return; }
    setExportingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = 0;

      const fmt = (n) => `Rs.${Number(n).toLocaleString('en-IN')}`;
      const clamp = (needed) => { if (y + needed > pageH - 14) { pdf.addPage(); y = 36; } };

      // ── Header ───────────────────────────────────────────────────────────────
      // Navy top bar
      pdf.setFillColor(17, 24, 76);
      pdf.rect(0, 0, pageW, 22, 'F');
      // Indigo accent stripe
      pdf.setFillColor(79, 70, 229);
      pdf.rect(0, 22, pageW, 4, 'F');

      // Brand name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
      pdf.text('ONE NET SOLUTION', margin, 14);
      // Tagline
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text('Your Trusted Service Partner', margin, 20);
      // Report label right side
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      pdf.text('BUSINESS REPORT', pageW - margin, 11, { align: 'right' });
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text(format(new Date(), 'dd MMM yyyy'), pageW - margin, 17, { align: 'right' });

      y = 34;

      // Period + generated
      const rangeLabel = dateFrom || dateTo
        ? `Period: ${dateFrom || '—'}  →  ${dateTo || '—'}`
        : 'Period: All time';
      pdf.setTextColor(40, 40, 70);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      pdf.text(rangeLabel, margin, y);
      pdf.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageW - margin, y, { align: 'right' });
      y += 10;

      // ── KPI cards ────────────────────────────────────────────────────────────
      const kpis = [
        { label: 'Total Entries',  value: String(totalEntries) },
        { label: 'Total Revenue',  value: fmt(totalRevenue)    },
        { label: 'Received',       value: fmt(totalReceived)   },
        { label: 'Pending',        value: fmt(totalPending)    },
        { label: 'Profit',         value: fmt(totalProfit)     },
      ];
      const boxW = (contentW - 8) / 5;
      kpis.forEach((k, i) => {
        const x = margin + i * (boxW + 2);
        pdf.setFillColor(245, 247, 255);
        pdf.roundedRect(x, y, boxW, 22, 3, 3, 'F');
        pdf.setDrawColor(220, 220, 235);
        pdf.roundedRect(x, y, boxW, 22, 3, 3, 'S');
        pdf.setTextColor(100, 100, 130);
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
        pdf.text(k.label.toUpperCase(), x + boxW / 2, y + 7, { align: 'center' });
        pdf.setTextColor(30, 30, 60);
        pdf.setFontSize(k.value.length > 10 ? 7.5 : 9); pdf.setFont('helvetica', 'bold');
        pdf.text(k.value, x + boxW / 2, y + 16, { align: 'center' });
      });
      y += 30;

      // ── Section title helper ──────────────────────────────────────────────────
      const sectionTitle = (title) => {
        clamp(12);
        pdf.setFillColor(237, 238, 255);
        pdf.rect(margin, y, contentW, 8, 'F');
        // left accent bar
        pdf.setFillColor(79, 70, 229);
        pdf.rect(margin, y, 2, 8, 'F');
        pdf.setTextColor(79, 70, 229);
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 5, y + 5.5);
        y += 12;
      };

      // ── Service Distribution table ────────────────────────────────────────────
      sectionTitle('Service Distribution');
      const svcRows = Object.entries(serviceMap).map(([name, count]) => {
        const rev = entries.filter(e => e.service_name === name).reduce((s, e) => s + (e.received_payment || 0), 0);
        const pct = totalEntries ? ((count / totalEntries) * 100).toFixed(1) : '0';
        return [name, String(count), `${pct}%`, fmt(rev)];
      });

      const colWidths = [70, 22, 22, 40];
      const headers = ['Service', 'Count', 'Share', 'Revenue'];
      const rowH = 7;

      let cx = margin;
      headers.forEach((h, i) => {
        pdf.setFillColor(17, 24, 76);
        pdf.rect(cx, y, colWidths[i], rowH, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
        pdf.text(h, cx + 3, y + 5);
        cx += colWidths[i];
      });
      y += rowH;

      svcRows.forEach((row, ri) => {
        clamp(rowH + 2);
        cx = margin;
        pdf.setFillColor(ri % 2 === 0 ? 250 : 244, ri % 2 === 0 ? 250 : 246, ri % 2 === 0 ? 255 : 255);
        pdf.rect(margin, y, contentW, rowH, 'F');
        row.forEach((cell, ci) => {
          pdf.setTextColor(40, 40, 70);
          pdf.setFontSize(8); pdf.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
          pdf.text(String(cell), cx + 3, y + 5);
          cx += colWidths[ci];
        });
        y += rowH;
      });
      y += 8;

      // ── Daily Revenue table ───────────────────────────────────────────────────
      if (dailyData.length > 0) {
        clamp(20);
        sectionTitle('Daily Revenue Breakdown');
        const dColW = [30, 40, 30];
        const dHeaders = ['Date', 'Revenue (Rs.)', 'Entries'];

        cx = margin;
        dHeaders.forEach((h, i) => {
          pdf.setFillColor(17, 24, 76);
          pdf.rect(cx, y, dColW[i], rowH, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
          pdf.text(h, cx + 3, y + 5);
          cx += dColW[i];
        });
        y += rowH;

        dailyData.forEach((d, ri) => {
          clamp(rowH + 2);
          cx = margin;
          pdf.setFillColor(ri % 2 === 0 ? 250 : 244, ri % 2 === 0 ? 250 : 246, ri % 2 === 0 ? 255 : 255);
          pdf.rect(margin, y, dColW[0] + dColW[1] + dColW[2], rowH, 'F');
          [format(parseISO(d.date), 'dd MMM yyyy'), fmt(d.revenue), String(d.entries)].forEach((cell, ci) => {
            pdf.setTextColor(40, 40, 70);
            pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
            pdf.text(cell, cx + 3, y + 5);
            cx += dColW[ci];
          });
          y += rowH;
        });
        y += 8;
      }

      // ── Status Summary ────────────────────────────────────────────────────────
      clamp(50);
      sectionTitle('Status Summary');

      const statusBoxW = (contentW - 6) / 2;

      // Work Status
      pdf.setFillColor(245, 247, 255);
      pdf.roundedRect(margin, y, statusBoxW, 38, 3, 3, 'F');
      pdf.setDrawColor(220, 220, 235);
      pdf.roundedRect(margin, y, statusBoxW, 38, 3, 3, 'S');
      pdf.setTextColor(60, 60, 100);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text('Work Status', margin + 4, y + 7);
      const wColors = [[245,158,11],[16,185,129],[239,68,68]];
      workData.forEach((w, i) => {
        const wy = y + 14 + i * 8;
        pdf.setFillColor(...wColors[i]);
        pdf.circle(margin + 7, wy + 1.5, 2.5, 'F');
        pdf.setTextColor(40, 40, 70);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
        pdf.text(`${w.name}: ${w.value}`, margin + 12, wy + 2.5);
      });

      // Payment Status
      const px = margin + statusBoxW + 6;
      pdf.setFillColor(245, 247, 255);
      pdf.roundedRect(px, y, statusBoxW, 38, 3, 3, 'F');
      pdf.roundedRect(px, y, statusBoxW, 38, 3, 3, 'S');
      pdf.setTextColor(60, 60, 100);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Status', px + 4, y + 7);
      const pColors = [[239,68,68],[245,158,11],[16,185,129]];
      payData.forEach((p, i) => {
        const py2 = y + 14 + i * 8;
        pdf.setFillColor(...pColors[i]);
        pdf.circle(px + 7, py2 + 1.5, 2.5, 'F');
        pdf.setTextColor(40, 40, 70);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
        pdf.text(`${p.name}: ${p.value}`, px + 12, py2 + 2.5);
      });
      y += 46;

      // ── Footer on all pages ───────────────────────────────────────────────────
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFillColor(17, 24, 76);
        pdf.rect(0, pageH - 10, pageW, 10, 'F');
        pdf.setTextColor(180, 185, 210);
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
        pdf.text('One Net Solution  •  Confidential Business Report', margin, pageH - 4);
        pdf.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
      }

      pdf.save(`ONS-report-${getServerDate()}.pdf`);
      toast.success('PDF exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // ─── CSV Export ───────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (entries.length === 0) { toast.error('No data to export'); return; }
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
      `ONS-reports-${getServerDate()}.csv`
    );
    toast.success('CSV exported successfully');
  };

  const empty = <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-300)', fontSize: 13 }}>No data in range</div>;

  return (
    <div className="page-container" ref={reportRef}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics and performance overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Download size={14} /> Export CSV
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={exportingPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: exportingPdf ? '#9ca3af' : '#10b981', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: exportingPdf ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={e => { if (!exportingPdf) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <FileText size={14} /> {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="reports-date-filter" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
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
          <div className="reports-stats" style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatBox label="Total Entries"  value={totalEntries} />
            <StatBox label="Total Revenue"  value={`Rs.${totalRevenue.toLocaleString('en-IN')}`} />
            <StatBox label="Total Received" value={`Rs.${totalReceived.toLocaleString('en-IN')}`} />
            <StatBox label="Total Pending"  value={`Rs.${totalPending.toLocaleString('en-IN')}`} />
            <StatBox label="Total Profit"   value={`Rs.${totalProfit.toLocaleString('en-IN')}`} />
          </div>

          <div className="reports-charts-row1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ChartCard title="Service Distribution">
              {pieData.length === 0 ? empty : (
                <div className="pie-chart-container" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Entries']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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

          <div className="reports-charts-row2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title="Work Status">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v, 'Entries']} />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {workData.map((_, i) => <Cell key={i} fill={['#f59e0b','#10b981','#ef4444'][i]} />)}
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
                    {payData.map((_, i) => <Cell key={i} fill={['#ef4444','#f59e0b','#10b981'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .reports-date-filter { flex-wrap: wrap !important; gap: 10px !important; }
          .reports-stats { flex-wrap: wrap !important; }
          .reports-stats > div { min-width: 140px !important; }
          .reports-charts-row1 { grid-template-columns: 1fr !important; }
          .reports-charts-row2 { grid-template-columns: 1fr !important; }
          .pie-chart-container { height: 300px !important; }
        }
      `}</style>
    </div>
  );
}