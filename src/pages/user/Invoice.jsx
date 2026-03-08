import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { getServerTimestamp, getServerDate, getServerDateObject } from '../../hooks/useServerTime';
import { Printer, FileText, Calendar, TrendingUp, Clock, CreditCard, StickyNote } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// Safely escape HTML to prevent XSS
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── FIX: Smart date input that doesn't clear while typing ──
// Uses local state so partial values like "0" don't trigger re-render resets
function DateInput({ value, onChange, style }) {
  const [localValue, setLocalValue] = useState(value);
  const prevValue = useRef(value);

  // Sync only if parent changed externally (not from our own onChange)
  if (value !== prevValue.current) {
    prevValue.current = value;
    if (value !== localValue) setLocalValue(value);
  }

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    // Only fire parent onChange when date is fully complete and valid
    if (val.length === 10 && isValid(parseISO(val))) {
      prevValue.current = val;
      onChange(val);
    }
  };

  const handleBlur = (e) => {
    const val = e.target.value;
    if (!val || !isValid(parseISO(val))) {
      // Revert to last known good value on blur if incomplete
      setLocalValue(value);
    }
  };

  return (
    <input
      type="date"
      className="form-input"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      style={style}
    />
  );
}

export default function Invoice() {
  const { user, profile, refreshProfile } = useAuth();

  const [selectedIds,  setSelectedIds]  = useState([]);
  const [paymentMode,  setPaymentMode]  = useState('Cash');
  const [billNote,     setBillNote]     = useState('');
  const [printing,     setPrinting]     = useState(false);
  const [dateMode,     setDateMode]     = useState('today');
  const [customDate,   setCustomDate]   = useState(getServerDate());
  const [rangeFrom,    setRangeFrom]    = useState(getServerDate());
  const [rangeTo,      setRangeTo]      = useState(getServerDate());

  const today = getServerDate();

  const dateFilter = useMemo(() => {
    if (dateMode === 'today')  return { from: today,      to: today };
    if (dateMode === 'custom') return { from: customDate, to: customDate };
    return { from: rangeFrom, to: rangeTo };
  }, [dateMode, today, customDate, rangeFrom, rangeTo]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['invoice-entries', user?.id, dateFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('*')
        .eq('user_id', user.id)
        .gte('entry_date', dateFilter.from)
        .lte('entry_date', dateFilter.to)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: !!user?.id
  });

  const { data: appSettings = {} } = useQuery({
    queryKey: ['app-settings-invoice'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings').select('*')
        .eq('settings_key', 'main').maybeSingle();
      return data || {};
    }
  });

  // Update global invoice counter
  const updateCounterMutation = useMutation({
    mutationFn: async () => {
      const newCounter = (appSettings?.global_invoice_counter || 0) + 1;
      const { error } = await supabase
        .from('app_settings')
        .update({ global_invoice_counter: newCounter, updated_at: getServerTimestamp() })
        .eq('settings_key', 'main');
      if (error) throw error;
    }
  });

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === entries.length ? [] : entries.map(e => e.id));

  const selectedEntries = entries.filter(e => selectedIds.includes(e.id));
  const totalAmount   = selectedEntries.reduce((s, e) => s + (e.total_cost       || 0), 0);
  const totalReceived = selectedEntries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending  = selectedEntries.reduce((s, e) => s + (e.pending_payment  || 0), 0);

  // Stats for entries in date range
  const statsTotal    = entries.reduce((s, e) => s + (e.total_cost       || 0), 0);
  const statsReceived = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const statsPending  = entries.reduce((s, e) => s + (e.pending_payment  || 0), 0);

  // GST Calculation - only if enabled in profile
  const gstEnabled = profile?.gst_enabled || false;
  const gstRate = appSettings?.gst_rate || 18;
  const gstAmount = gstEnabled ? (totalReceived * gstRate) / 100 : 0;
  const grossTotal = totalReceived + gstAmount;

  // Global invoice numbering
  const globalInvoiceNo = appSettings?.global_invoice_counter || 0;
  const billNo = `INV-${String(globalInvoiceNo + 1).padStart(5, '0')}`;

  const safeFormat = (dateStr) => {
    try { return isValid(parseISO(dateStr)) ? format(parseISO(dateStr), 'dd/MM/yyyy') : '—'; }
    catch { return '—'; }
  };

  const dateLabel = dateMode === 'today'  ? format(getServerDateObject(), 'dd/MM/yyyy')
    : dateMode === 'custom' ? safeFormat(customDate)
    : `${safeFormat(rangeFrom)} – ${safeFormat(rangeTo)}`;

  const handlePrint = async () => {
    if (selectedEntries.length === 0) { toast.error('Select at least one entry'); return; }
    setPrinting(true);

    const biz      = esc(profile?.business_name || profile?.full_name || 'CSC Center');
    const initials = (profile?.business_name || profile?.full_name || 'CSC')[0].toUpperCase();

    const rows = selectedEntries.map((entry, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 10px;color:#64748b;font-size:12px;">${idx + 1}</td>
        <td style="padding:8px 10px;">
          <div style="font-weight:700;font-size:13px;">${esc(entry.customer_name)}</div>
          <div style="color:#64748b;font-size:11px;">${esc(entry.mobile)}</div>
        </td>
        <td style="padding:8px 10px;">
          <div style="font-size:12.5px;color:#334155;">${esc(entry.service_name)}</div>
          ${entry.remark ? `<div style="font-size:11px;color:#94a3b8;font-style:italic;margin-top:2px;">${esc(entry.remark)}</div>` : ''}
        </td>
        <td style="padding:8px 10px;">
          <span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;
            background:${entry.work_status === 'completed' ? '#dcfce7' : '#fef9c3'};
            color:${entry.work_status === 'completed' ? '#166534' : '#854d0e'};">
            ${esc(entry.work_status)}
          </span>
        </td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:13px;">Rs.${(entry.total_cost||0).toLocaleString('en-IN')}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:#16a34a;font-size:13px;">Rs.${(entry.received_payment||0).toLocaleString('en-IN')}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:13px;color:${(entry.pending_payment||0)>0?'#dc2626':'#16a34a'};">Rs.${(entry.pending_payment||0).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${esc(billNo)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1e293b; font-size:13px; background:#fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    table { border-collapse:collapse; width:100%; }
  </style>
</head>
<body>
<div style="max-width:860px;margin:0 auto;padding:40px 50px;">
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #4f46e5;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:900;flex-shrink:0;">${initials}</div>
      <div>
        <div style="font-size:22px;font-weight:900;color:#1e293b;letter-spacing:-0.5px;">${biz}</div>
        ${profile?.address ? `<div style="font-size:12px;color:#64748b;margin-top:3px;">${esc(profile.address)}</div>` : ''}
        ${profile?.mobile  ? `<div style="font-size:12px;color:#64748b;">Mob: ${esc(profile.mobile)}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:28px;font-weight:900;color:#4f46e5;letter-spacing:-1px;">INVOICE</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;font-weight:600;">${esc(billNo)}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border-left:3px solid #6366f1;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;margin-bottom:4px;">Date</div>
      <div style="font-size:13.5px;font-weight:700;color:#1e293b;">${dateLabel}</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border-left:3px solid #10b981;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;margin-bottom:4px;">Payment Mode</div>
      <div style="font-size:13.5px;font-weight:700;color:#1e293b;">${esc(paymentMode)}</div>
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:12px 14px;border-left:3px solid #f59e0b;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;margin-bottom:4px;">Total Entries</div>
      <div style="font-size:13.5px;font-weight:700;color:#1e293b;">${selectedEntries.length} service${selectedEntries.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <table style="margin-bottom:24px;font-size:12.5px;">
    <thead>
      <tr style="background:linear-gradient(135deg,#6366f1,#4f46e5);">
        <th style="padding:10px;text-align:left;font-weight:700;color:#fff;">#</th>
        <th style="padding:10px;text-align:left;font-weight:700;color:#fff;">Customer</th>
        <th style="padding:10px;text-align:left;font-weight:700;color:#fff;">Service</th>
        <th style="padding:10px;text-align:left;font-weight:700;color:#fff;">Status</th>
        <th style="padding:10px;text-align:right;font-weight:700;color:#fff;">Total</th>
        <th style="padding:10px;text-align:right;font-weight:700;color:#fff;">Received</th>
        <th style="padding:10px;text-align:right;font-weight:700;color:#fff;">Pending</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px;">
    <div style="font-size:100px;font-weight:900;color:rgba(99,102,241,0.06);line-height:1;user-select:none;letter-spacing:-4px;">${initials}</div>
    <div style="width:280px;">
      <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border:1.5px solid #e2e8f0;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px;">
          <span style="color:#64748b;font-weight:600;">Total Amount</span>
          <span style="font-weight:800;color:#1e293b;">Rs.${totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px;">
          <span style="color:#64748b;font-weight:600;">Total Received</span>
          <span style="font-weight:800;color:#16a34a;">Rs.${totalReceived.toLocaleString('en-IN')}</span>
        </div>
        ${gstEnabled ? `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px;">
          <span style="color:#64748b;font-weight:600;">GST (${gstRate}%)</span>
          <span style="font-weight:800;color:#f59e0b;">Rs.${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:15px;">
          <span style="color:#64748b;font-weight:700;">Gross Total (w/ GST)</span>
          <span style="font-weight:900;color:#4f46e5;">Rs.${grossTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        ` : `
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:15px;">
          <span style="color:#64748b;font-weight:700;">Total (No GST)</span>
          <span style="font-weight:900;color:#4f46e5;">Rs.${totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        `}
        <div style="display:flex;justify-content:space-between;padding:6px 0 0;font-size:13px;">
          <span style="color:#64748b;font-weight:600;">Total Pending</span>
          <span style="font-weight:800;color:${totalPending > 0 ? '#dc2626' : '#16a34a'};">Rs.${totalPending.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  </div>

  ${billNote ? `
  <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#92400e;margin-bottom:4px;">Note</div>
    <div style="font-size:13px;color:#78350f;font-weight:500;">${esc(billNote)}</div>
  </div>` : ''}

  <div style="border-top:1.5px dashed #cbd5e1;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:12px;color:#94a3b8;">Thank you for using our services. Please keep this invoice for your records.</div>
    <div style="font-size:12px;color:#6366f1;font-weight:800;">&#9733; Powered by One Net Solution &#9733;</div>
  </div>
  <div style="margin-top:32px;display:flex;justify-content:flex-end;">
    <div style="text-align:center;min-width:180px;">
      <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;font-size:11.5px;color:#94a3b8;font-weight:600;">Authorised Signature</div>
    </div>
  </div>
</div>
<script>
  window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });
  window.addEventListener('afterprint', function() { window.close(); });
</script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=960,height=750');
    if (!w) { toast.error('Popup blocked! Please allow popups for this site.'); setPrinting(false); return; }
    w.document.open(); w.document.write(html); w.document.close();

    try {
      // Update user's local counter (backward compat)
      await supabase.from('profiles')
        .update({ bill_counter: (profile?.bill_counter || 0) + 1 })
        .eq('id', user.id);
      
      // Update global counter
      await updateCounterMutation.mutateAsync();
      
      refreshProfile();
      toast.success('Invoice printed and counter updated');
    } catch (err) {
      console.error('Invoice error:', err);
      toast.error('Failed to update counter');
    }
    setPrinting(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoice</h1>
          <p className="page-subtitle">Select entries and print a professional invoice</p>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}
          disabled={printing || selectedEntries.length === 0} style={{ gap: 8 }}>
          <Printer size={16} />
          {printing ? 'Opening...' : `Print Invoice (${selectedEntries.length})`}
        </button>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Entries in Range', value: entries.length,                                icon: FileText,   color: '#6366f1' },
          { label: 'Total Revenue',    value: `Rs.${statsTotal.toLocaleString('en-IN')}`,    icon: TrendingUp, color: '#10b981' },
          { label: 'Total Received',   value: `Rs.${statsReceived.toLocaleString('en-IN')}`, icon: CreditCard, color: '#3b82f6' },
          { label: 'Total Pending',    value: `Rs.${statsPending.toLocaleString('en-IN')}`,  icon: Clock,      color: '#ef4444' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-900)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)', gap: 20, gridAutoFlow: 'dense' }} className="invoice-grid">
        <div style={{ gridColumn: 'auto' }}>

          {/* Date Filter */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={15} color="var(--brand)" /> Date Filter
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {[['today','Today'],['custom','Specific Date'],['range','Date Range']].map(([mode, label]) => (
                  <button key={mode} onClick={() => { setDateMode(mode); setSelectedIds([]); }}
                    style={{
                      padding: '8px 16px', borderRadius: 9, border: '1.5px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      borderColor: dateMode === mode ? 'var(--brand)' : 'var(--ink-200)',
                      background:  dateMode === mode ? 'var(--brand-light)' : '#fff',
                      color:       dateMode === mode ? 'var(--brand)' : 'var(--ink-500)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── FIXED DATE INPUTS ── */}
              {dateMode === 'custom' && (
                <DateInput
                  value={customDate}
                  onChange={(val) => { setCustomDate(val); setSelectedIds([]); }}
                  style={{ width: 200 }}
                />
              )}
              {dateMode === 'range' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <DateInput
                    value={rangeFrom}
                    onChange={(val) => { setRangeFrom(val); setSelectedIds([]); }}
                    style={{ width: 180 }}
                  />
                  <span style={{ color: 'var(--ink-400)', fontWeight: 600 }}>to</span>
                  <DateInput
                    value={rangeTo}
                    onChange={(val) => { setRangeTo(val); setSelectedIds([]); }}
                    style={{ width: 180 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Entries Table */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Entries — {dateLabel}</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-600)' }}>
                <input type="checkbox"
                  checked={selectedIds.length === entries.length && entries.length > 0}
                  onChange={toggleAll} />
                Select All
              </label>
            </div>
            {isLoading ? (
              <div style={{ padding: 20 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4 }} />
                    <div className="skeleton" style={{ flex: 1, height: 18 }} />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="empty-state">
                <FileText size={36} />
                <p>No entries found for selected date</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Change the date filter or add entries from New Entry</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Work</th>
                      <th>Payment</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Received</th>
                      <th style={{ textAlign: 'right' }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const selected = selectedIds.includes(entry.id);
                      return (
                        <tr key={entry.id} style={{ cursor: 'pointer', background: selected ? 'var(--brand-light)' : '' }}
                          onClick={() => toggleSelect(entry.id)}>
                          <td><input type="checkbox" checked={selected} onChange={() => toggleSelect(entry.id)} onClick={e => e.stopPropagation()} /></td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.customer_name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{entry.mobile}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{entry.service_name}</div>
                            {entry.remark && <div style={{ fontSize: 11, color: 'var(--ink-400)', fontStyle: 'italic' }}>{entry.remark}</div>}
                          </td>
                          <td><span className={`badge ${entry.work_status === 'completed' ? 'badge-success' : entry.work_status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{entry.work_status}</span></td>
                          <td><span className={`badge ${entry.payment_status === 'paid' ? 'badge-success' : entry.payment_status === 'partially paid' ? 'badge-warning' : 'badge-danger'}`}>{entry.payment_status}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs.{(entry.total_cost||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Rs.{(entry.received_payment||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign: 'right', color: (entry.pending_payment||0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>Rs.{(entry.pending_payment||0).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Mode + Bill Note */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Payment Mode</div></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Cash','Online','Both'].map(mode => (
                    <button key={mode} onClick={() => setPaymentMode(mode)} style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      borderColor: paymentMode === mode ? 'var(--brand)' : 'var(--ink-200)',
                      background:  paymentMode === mode ? 'var(--brand-light)' : '#fff',
                      color:       paymentMode === mode ? 'var(--brand)' : 'var(--ink-500)',
                    }}>{mode}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StickyNote size={14} color="var(--brand)" /> Bill Note
                </div>
              </div>
              <div className="card-body">
                <input type="text" className="form-input"
                  placeholder='e.g. "Balance due by 10 March"'
                  value={billNote} onChange={e => setBillNote(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div style={{ position: 'relative' }}>
          <div className="card invoice-preview-card" style={{ position: 'sticky', top: 72 }}>
            <div className="card-header">
              <div className="card-title">Invoice Preview</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-light)', padding: '3px 10px', borderRadius: 6 }}>{billNo}</div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid var(--brand)', paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                  {(profile?.business_name || profile?.full_name || 'C')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-900)' }}>{profile?.business_name || profile?.full_name || 'CSC Center'}</div>
                  {profile?.mobile && <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{profile.mobile}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink-700)' }}>{dateLabel}</div>
                  <div style={{ color: 'var(--ink-400)', marginTop: 2 }}>Mode: {paymentMode}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--brand)' }}>{billNo}</div>
                  <div style={{ color: 'var(--ink-400)', marginTop: 2 }}>{selectedEntries.length} entries</div>
                </div>
              </div>

              {selectedEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-300)', fontSize: 13 }}>
                  <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  Select entries to preview
                </div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid var(--ink-200)' }}>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, color: 'var(--ink-500)' }}>Customer</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 700, color: 'var(--ink-500)' }}>Service</th>
                        <th style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--ink-500)' }}>Rs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntries.map(entry => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                          <td style={{ padding: '6px 4px' }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{entry.customer_name}</div>
                            <div style={{ color: 'var(--ink-400)', fontSize: 10.5 }}>{entry.mobile}</div>
                          </td>
                          <td style={{ padding: '6px 4px', color: 'var(--ink-600)', fontSize: 12 }}>
                            {entry.service_name}
                            {entry.remark && <div style={{ fontSize: 10, color: 'var(--ink-400)', fontStyle: 'italic' }}>{entry.remark}</div>}
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{(entry.total_cost||0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ borderTop: '2px solid var(--ink-200)', paddingTop: 10 }}>
                    {[
                      ['Total Amount', `Rs.${totalAmount.toLocaleString('en-IN')}`,   'var(--ink-800)'],
                      ['Received',     `Rs.${totalReceived.toLocaleString('en-IN')}`, 'var(--success)'],
                      ['Pending',      `Rs.${totalPending.toLocaleString('en-IN')}`,  totalPending > 0 ? 'var(--danger)' : 'var(--success)'],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                        <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontWeight: 800, color }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {billNote && (
                    <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 10px', fontSize: 11.5, color: '#92400e', fontStyle: 'italic' }}>
                      Note: {billNote}
                    </div>
                  )}
                  <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10.5, color: 'var(--ink-400)', borderTop: '1px dashed var(--ink-200)', paddingTop: 8 }}>
                    Thank you for using our services
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 10.5, color: '#6366f1', fontWeight: 700, marginTop: 3 }}>
                    ★ Powered by One Net Solution ★
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '0 20px 20px' }}>
              <button className="btn btn-primary" style={{ width: '100%' }}
                onClick={handlePrint} disabled={selectedEntries.length === 0 || printing}>
                <Printer size={15} />
                {printing ? 'Opening...' : 'Print Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}