import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CreditCard, MessageCircle, AlertCircle, ChevronDown, ChevronUp,
  Download, CheckSquare, Square, Filter, X, TrendingUp, Clock,
  Building2, Users, DollarSign, Calendar, ArrowUpDown, ArrowUp,
  ArrowDown, Trash2, StickyNote, RefreshCw, CheckCircle, XCircle,
  BarChart2, AlertTriangle, Zap, Search
} from 'lucide-react';
import { format, parseISO, differenceInDays, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getServerTimestamp, getServerDateObject } from '../../hooks/useServerTime';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const Rs = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

// ── CSV export ────────────────────────────────────────────────────────────────
function exportToCSV(entries, filename = 'pending_payments.csv') {
  const headers = [
    'Customer', 'Mobile', 'Operator', 'Business', 'Service',
    'Entry Date', 'Days Overdue', 'Total', 'Received', 'Pending', 'Status'
  ];
  const rows = entries.map(e => {
    const days = e.entry_date
      ? differenceInDays(getServerDateObject(), parseISO(e.entry_date))
      : '—';
    return [
      e.customer_name || '',
      e.mobile || '',
      e.profiles?.full_name || '',
      e.profiles?.business_name || '',
      e.service_name || '',
      e.entry_date || '',
      days,
      e.total_cost || 0,
      e.received_payment || 0,
      e.pending_payment || 0,
      e.payment_status || '',
    ];
  });
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── WhatsApp bulk reminder for an operator's customers ────────────────────────
function sendBulkWhatsApp(entries) {
  entries.forEach((e, i) => {
    const mobile = (e.mobile || '').replace(/\D/g, '').slice(-10);
    if (!mobile || mobile.length !== 10) return;
    const msg = `Dear ${e.customer_name || 'Customer'},\n\nThis is a gentle reminder that you have a pending payment of *${Rs(e.pending_payment)}* for *${e.service_name}* on ${e.entry_date ? format(parseISO(e.entry_date), 'dd MMM yyyy') : '—'}.\n\nPlease clear your dues at the earliest.\n\nThank you.`;
    setTimeout(() => {
      window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
    }, i * 600);
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, small }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: `1px solid ${color}22`,
      padding: small ? '12px 16px' : '16px 20px',
      boxShadow: `0 2px 10px ${color}10`,
      display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: small ? 36 : 42, height: small ? 36 : 42, borderRadius: 11,
        background: `${color}15`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={small ? 16 : 19} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: small ? 16 : 20, fontWeight: 900, color: '#0f172a', lineHeight: 1, wordBreak: 'break-all' }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Days overdue badge ────────────────────────────────────────────────────────
function OverdueBadge({ entryDate }) {
  if (!entryDate) return null;
  const days = differenceInDays(getServerDateObject(), parseISO(entryDate));
  const color = days > 60 ? '#ef4444' : days > 30 ? '#f59e0b' : '#10b981';
  const bg    = days > 60 ? '#ef444412' : days > 30 ? '#f59e0b12' : '#10b98112';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bg, color, whiteSpace: 'nowrap' }}>
      {days}d overdue
    </span>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────
function EditRow({ entry, onMarkPaid, onPartial, onWriteOff, onCancel, isUpdating }) {
  const [partialAmt, setPartialAmt] = useState(entry.received_payment || '');
  const [showPartial, setShowPartial] = useState(false);
  const [writeOffNote, setWriteOffNote] = useState('');
  const [showWriteOff, setShowWriteOff] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {!showPartial && !showWriteOff && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onMarkPaid} disabled={isUpdating} style={{
            fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
            background: '#10b981', color: '#fff', border: 'none', opacity: isUpdating ? 0.6 : 1,
          }}><CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />Mark Paid</button>
          <button onClick={() => setShowPartial(true)} style={{
            fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
            background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30',
          }}>Partial</button>
          <button onClick={() => setShowWriteOff(true)} style={{
            fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
            background: '#6b728015', color: '#6b7280', border: '1px solid #6b728030',
          }}><Trash2 size={11} style={{ display: 'inline', marginRight: 4 }} />Write-off</button>
          <button onClick={onCancel} style={{
            fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
            background: 'none', color: '#94a3b8', border: 'none',
          }}><X size={12} /></button>
        </div>
      )}
      {showPartial && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number" value={partialAmt}
            onChange={e => setPartialAmt(e.target.value)}
            placeholder="Amount received"
            style={{ width: 130, padding: '5px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
          />
          <button onClick={() => onPartial(Number(partialAmt))} disabled={isUpdating} style={{
            fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--brand)', color: '#fff', border: 'none',
          }}>Save</button>
          <button onClick={() => setShowPartial(false)} style={{
            fontSize: 11, padding: '5px 9px', borderRadius: 8, cursor: 'pointer',
            background: 'none', color: '#94a3b8', border: 'none',
          }}><X size={12} /></button>
        </div>
      )}
      {showWriteOff && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text" value={writeOffNote}
            onChange={e => setWriteOffNote(e.target.value)}
            placeholder="Reason for write-off..."
            style={{ width: 180, padding: '5px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none' }}
          />
          <button onClick={() => onWriteOff(writeOffNote)} disabled={isUpdating} style={{
            fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
            background: '#ef4444', color: '#fff', border: 'none',
          }}>Confirm</button>
          <button onClick={() => setShowWriteOff(false)} style={{
            fontSize: 11, padding: '5px 9px', borderRadius: 8, cursor: 'pointer',
            background: 'none', color: '#94a3b8', border: 'none',
          }}><X size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ── Single entry row ──────────────────────────────────────────────────────────
function EntryRow({
  entry, selected, onSelect, editId, onEdit, onCancelEdit,
  onMarkPaid, onPartial, onWriteOff, isUpdating,
  adminRemarks, onSaveRemark,
}) {
  const [showRemark, setShowRemark] = useState(false);
  const [remarkText, setRemarkText] = useState(adminRemarks[entry.id] || '');
  const isEditing = editId === entry.id;
  const hasRemark = adminRemarks[entry.id]?.trim().length > 0;

  const handleSaveRemark = () => {
    onSaveRemark(entry.id, remarkText);
    setShowRemark(false);
  };

  return (
    <>
      <tr style={{ background: selected ? '#6366f108' : '#fff', transition: 'background 0.1s' }}>
        {/* Checkbox */}
        <td style={{ padding: '10px 12px', width: 36 }}>
          <button onClick={() => onSelect(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: selected ? 'var(--brand)' : '#cbd5e1' }}>
            {selected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
        </td>
        {/* Customer */}
        <td style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{entry.customer_name}</p>
          <p style={{ fontSize: 11, color: '#64748b' }}>{entry.mobile}</p>
          <OverdueBadge entryDate={entry.entry_date} />
        </td>
        {/* Operator */}
        <td style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{entry.profiles?.full_name || '—'}</p>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>{entry.profiles?.business_name || ''}</p>
        </td>
        {/* Service + date */}
        <td style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{entry.service_name}</p>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>{entry.entry_date ? format(parseISO(entry.entry_date), 'dd MMM yy') : '—'}</p>
        </td>
        {/* Amounts */}
        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: '#64748b' }}>{Rs(entry.total_cost)}</p>
          <p style={{ fontSize: 11, color: '#10b981' }}>{Rs(entry.received_payment)}</p>
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{Rs(entry.pending_payment)}</p>
        </td>
        {/* Actions */}
        <td style={{ padding: '10px 12px' }}>
          {isEditing ? (
            <EditRow
              entry={entry}
              onMarkPaid={() => onMarkPaid(entry)}
              onPartial={(amt) => onPartial(entry, amt)}
              onWriteOff={(note) => onWriteOff(entry, note)}
              onCancel={onCancelEdit}
              isUpdating={isUpdating}
            />
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => onEdit(entry.id)} style={{
                fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--brand)15', color: 'var(--brand)', border: '1px solid var(--brand)30',
              }}><CreditCard size={11} style={{ display: 'inline', marginRight: 4 }} />Update</button>
              <button
                onClick={() => { setShowRemark(p => !p); setRemarkText(adminRemarks[entry.id] || ''); }}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 8, cursor: 'pointer',
                  background: hasRemark ? '#6366f115' : '#f1f5f9', color: hasRemark ? '#6366f1' : '#94a3b8',
                  border: hasRemark ? '1px solid #6366f130' : '1px solid #e2e8f0',
                }}
                title="Admin remark"
              ><StickyNote size={11} /></button>
            </div>
          )}
        </td>
      </tr>
      {/* Admin remark row */}
      {showRemark && (
        <tr style={{ background: '#6366f105' }}>
          <td colSpan={7} style={{ padding: '8px 12px 10px 60px' }}>
            {hasRemark && !showRemark ? (
              <p style={{ fontSize: 12, color: '#6366f1' }}>{adminRemarks[entry.id]}</p>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="text" value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder="Add internal admin note for this entry..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #6366f130', fontSize: 12, outline: 'none', background: '#fff' }}
                />
                <button onClick={handleSaveRemark} style={{
                  fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
                  background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer',
                }}>Save</button>
                <button onClick={() => setShowRemark(false)} style={{
                  fontSize: 11, padding: '6px 9px', borderRadius: 8,
                  background: 'none', color: '#94a3b8', border: 'none', cursor: 'pointer',
                }}><X size={12} /></button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Operator group ────────────────────────────────────────────────────────────
function OperatorGroup({
  operatorId, operatorName, businessName, entries,
  selectedIds, onSelectEntry, onSelectAll,
  editId, onEdit, onCancelEdit,
  onMarkPaid, onPartial, onWriteOff, isUpdating,
  adminRemarks, onSaveRemark,
  onBulkWhatsApp,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const groupSelected = entries.filter(e => selectedIds.has(e.id));
  const allSelected = groupSelected.length === entries.length;
  const totalPending = entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalValue   = entries.reduce((s, e) => s + (e.total_cost || 0), 0);
  const avgDays = entries.reduce((s, e) => {
    if (!e.entry_date) return s;
    return s + differenceInDays(getServerDateObject(), parseISO(e.entry_date));
  }, 0) / (entries.filter(e => e.entry_date).length || 1);

  const initials = (operatorName || '?').substring(0, 2).toUpperCase();

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 16,
      overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      {/* Operator header */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
      }}>
        {/* Select all for this group */}
        <button onClick={() => onSelectAll(entries, !allSelected)} style={{
          background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', color: allSelected ? 'var(--brand)' : '#cbd5e1', flexShrink: 0,
        }}>
          {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--brand)15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'var(--brand)', flexShrink: 0,
        }}>{initials}</div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{operatorName}</p>
          {businessName && <p style={{ fontSize: 11, color: '#64748b' }}>{businessName}</p>}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>ENTRIES</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#334155' }}>{entries.length}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>AVG OVERDUE</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: avgDays > 30 ? '#ef4444' : '#f59e0b' }}>{Math.round(avgDays)}d</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>PENDING</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#ef4444' }}>{Rs(totalPending)}</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onBulkWhatsApp(entries)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
              padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
              background: '#25d36615', color: '#25d366', border: '1px solid #25d36630',
            }}
          ><MessageCircle size={12} /> Remind All</button>
          <button
            onClick={() => exportToCSV(entries, `pending_${operatorName?.replace(/\s/g,'_')}.csv`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
              padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
              background: '#0ea5e910', color: '#0ea5e9', border: '1px solid #0ea5e930',
            }}
          ><Download size={12} /></button>
          <button onClick={() => setCollapsed(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
            background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
          }}>
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Entries table */}
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['', 'Customer', 'Operator', 'Service / Date', 'Total / Rcvd', 'Pending', 'Actions'].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#94a3b8', textAlign: i >= 4 && i <= 5 ? 'right' : 'left',
                    borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  selected={selectedIds.has(e.id)}
                  onSelect={onSelectEntry}
                  editId={editId}
                  onEdit={onEdit}
                  onCancelEdit={onCancelEdit}
                  onMarkPaid={onMarkPaid}
                  onPartial={onPartial}
                  onWriteOff={onWriteOff}
                  isUpdating={isUpdating}
                  adminRemarks={adminRemarks}
                  onSaveRemark={onSaveRemark}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Analytics bar ─────────────────────────────────────────────────────────────
function AnalyticsBar({ entries, allEntries }) {
  const totalPending  = entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalValue    = entries.reduce((s, e) => s + (e.total_cost || 0), 0);
  const totalReceived = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const collectionRate = totalValue === 0 ? 0 : Math.round((totalReceived / totalValue) * 100);

  const oldestEntry = entries.reduce((oldest, e) => {
    if (!e.entry_date) return oldest;
    if (!oldest) return e;
    return e.entry_date < oldest.entry_date ? e : oldest;
  }, null);
  const oldestDays = oldestEntry?.entry_date
    ? differenceInDays(getServerDateObject(), parseISO(oldestEntry.entry_date))
    : 0;

  const avgOverdue = entries.length === 0 ? 0 : Math.round(
    entries.reduce((s, e) => s + (e.entry_date ? differenceInDays(getServerDateObject(), parseISO(e.entry_date)) : 0), 0) / entries.length
  );

  // Top debtor
  const debtorMap = {};
  entries.forEach(e => {
    const key = e.mobile || e.customer_name;
    if (!debtorMap[key]) debtorMap[key] = { name: e.customer_name, pending: 0 };
    debtorMap[key].pending += (e.pending_payment || 0);
  });
  const topDebtor = Object.values(debtorMap).sort((a, b) => b.pending - a.pending)[0];

  // This month vs last month (from ALL entries passed in)
  const now = getServerDateObject();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd   = endOfMonth(subMonths(now, 1));

  const thisMonthPending = (allEntries || entries)
    .filter(e => e.entry_date && parseISO(e.entry_date) >= thisMonthStart)
    .reduce((s, e) => s + (e.pending_payment || 0), 0);
  const lastMonthPending = (allEntries || entries)
    .filter(e => e.entry_date && parseISO(e.entry_date) >= lastMonthStart && parseISO(e.entry_date) <= lastMonthEnd)
    .reduce((s, e) => s + (e.pending_payment || 0), 0);
  const monthTrend = lastMonthPending === 0 ? 0 : Math.round(((thisMonthPending - lastMonthPending) / lastMonthPending) * 100);

  const stats = [
    { icon: DollarSign,    label: 'Total Pending',    value: Rs(totalPending),        color: '#ef4444' },
    { icon: BarChart2,     label: 'Collection Rate',  value: `${collectionRate}%`,    color: '#10b981' },
    { icon: Clock,         label: 'Oldest Overdue',   value: `${oldestDays}d`,        color: '#f59e0b' },
    { icon: TrendingUp,    label: 'Avg Overdue',      value: `${avgOverdue}d`,        color: '#8b5cf6' },
    { icon: AlertTriangle, label: 'Top Debtor Due',   value: topDebtor ? Rs(topDebtor.pending) : '—', color: '#ef4444',
      sub: topDebtor?.name },
    { icon: Calendar,      label: 'This Month',       value: Rs(thisMonthPending),    color: '#0ea5e9',
      sub: `Last: ${Rs(lastMonthPending)} (${monthTrend > 0 ? '+' : ''}${monthTrend}%)` },
  ];

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 10, marginBottom: 20,
    }}>
      {stats.map(s => <StatCard key={s.label} {...s} small />)}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPendingPayments() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const queryClient = useQueryClient();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterOperator, setFilterOp]   = useState('');
  const [filterService, setFilterSvc]   = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [minAmt, setMinAmt]             = useState('');
  const [maxAmt, setMaxAmt]             = useState('');
  const [sortBy, setSortBy]             = useState('oldest');
  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]   = useState(new Set());

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editId, setEditId]             = useState(null);

  // ── Admin remarks (localStorage) ──────────────────────────────────────────
  const [adminRemarks, setAdminRemarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminEntryRemarks') || '{}'); } catch { return {}; }
  });

  const saveRemark = useCallback((entryId, text) => {
    const updated = { ...adminRemarks, [entryId]: text };
    setAdminRemarks(updated);
    localStorage.setItem('adminEntryRemarks', JSON.stringify(updated));
  }, [adminRemarks]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_entries')
        .select('*, profiles(full_name, business_name)')
        .neq('payment_status', 'paid')
        .order('entry_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 0,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, received, total, status, writeOffNote }) => {
      const pending = Math.max(0, total - received);
      const profit  = received;
      const payload = {
        payment_status:   status || (pending === 0 ? 'paid' : 'partial'),
        received_payment: received,
        pending_payment:  pending,
        profit,
        updated_at: getServerTimestamp(),
      };
      if (writeOffNote !== undefined) payload.admin_note = writeOffNote;
      const { error } = await supabase.from('service_entries').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-payments'] });
      setEditId(null);
      setSelectedIds(new Set());
    },
  });

  // ── Bulk mark paid ─────────────────────────────────────────────────────────
  const bulkMarkPaid = useCallback(async () => {
    const toUpdate = entries.filter(e => selectedIds.has(e.id));
    for (const e of toUpdate) {
      await updateMutation.mutateAsync({ id: e.id, received: e.total_cost, total: e.total_cost });
    }
  }, [entries, selectedIds, updateMutation]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const operatorOptions = useMemo(() => {
    const map = {};
    entries.forEach(e => { if (e.user_id) map[e.user_id] = e.profiles?.full_name || e.profiles?.business_name || e.user_id; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const serviceOptions = useMemo(() => (
    [...new Set(entries.map(e => e.service_name).filter(Boolean))].sort()
  ), [entries]);

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = entries.filter(e => {
      if (filterOperator && e.user_id !== filterOperator) return false;
      if (filterService && e.service_name !== filterService) return false;
      if (dateFrom && e.entry_date && e.entry_date < dateFrom) return false;
      if (dateTo   && e.entry_date && e.entry_date > dateTo)   return false;
      if (minAmt && (e.pending_payment || 0) < Number(minAmt)) return false;
      if (maxAmt && (e.pending_payment || 0) > Number(maxAmt)) return false;
      if (searchQuery.length >= 2) {
        const q = searchQuery.toLowerCase();
        return (
          e.customer_name?.toLowerCase().includes(q) ||
          e.mobile?.includes(q) ||
          e.service_name?.toLowerCase().includes(q) ||
          e.profiles?.full_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'oldest')  return (a.entry_date || '').localeCompare(b.entry_date || '');
      if (sortBy === 'newest')  return (b.entry_date || '').localeCompare(a.entry_date || '');
      if (sortBy === 'highest') return (b.pending_payment || 0) - (a.pending_payment || 0);
      if (sortBy === 'lowest')  return (a.pending_payment || 0) - (b.pending_payment || 0);
      return 0;
    });
    return list;
  }, [entries, filterOperator, filterService, dateFrom, dateTo, minAmt, maxAmt, searchQuery, sortBy]);

  // ── Group by operator ──────────────────────────────────────────────────────
  const operatorGroups = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.user_id || 'unknown';
      if (!map[key]) map[key] = {
        operatorId: key,
        operatorName: e.profiles?.full_name || '—',
        businessName: e.profiles?.business_name || '',
        entries: [],
      };
      map[key].entries.push(e);
    });
    return Object.values(map).sort((a, b) => {
      const aP = a.entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
      const bP = b.entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
      return bP - aP;
    });
  }, [filtered]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectGroup = (groupEntries, select) => setSelectedIds(prev => {
    const next = new Set(prev);
    groupEntries.forEach(e => select ? next.add(e.id) : next.delete(e.id));
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(filtered.map(e => e.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const activeFilterCount = [filterOperator, filterService, dateFrom, dateTo, minAmt, maxAmt, searchQuery.length >= 2 ? searchQuery : ''].filter(Boolean).length;
  const clearFilters = () => { setFilterOp(''); setFilterSvc(''); setDateFrom(''); setDateTo(''); setMinAmt(''); setMaxAmt(''); setSearchQuery(''); };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (authLoading) return <LoadingSpinner />;
  if (!user) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const totalPending = filtered.reduce((s, e) => s + (e.pending_payment || 0), 0);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.2s ease' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Pending Payments</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            All operators · {filtered.length} entries · {operatorGroups.length} operators
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={refetch}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
              padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
              background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
            }}
          ><RefreshCw size={13} /> Refresh</button>
          <button
            onClick={() => exportToCSV(filtered)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
              padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
              background: '#0ea5e9', color: '#fff', border: 'none',
            }}
          ><Download size={13} /> Export All</button>
        </div>
      </div>

      {/* ── Analytics bar ────────────────────────────────────────────────── */}
      {!isLoading && <AnalyticsBar entries={filtered} allEntries={entries} />}

      {/* ── Search + filter bar ───────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(8px)',
        paddingTop: 8, paddingBottom: 12, marginBottom: 8,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customer, mobile, service..."
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
            />
          </div>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#fff', outline: 'none' }}>
            <option value="oldest">Oldest First</option>
            <option value="newest">Newest First</option>
            <option value="highest">Highest Due</option>
            <option value="lowest">Lowest Due</option>
          </select>
          {/* Filter toggle */}
          <button onClick={() => setShowFilters(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
            padding: '8px 13px', borderRadius: 10, cursor: 'pointer',
            background: activeFilterCount > 0 ? 'var(--brand)' : '#f1f5f9',
            color: activeFilterCount > 0 ? '#fff' : '#64748b',
            border: '1px solid #e2e8f0',
          }}><Filter size={13} /> Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginTop: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
              {/* Operator */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Operator</label>
                <select value={filterOperator} onChange={e => setFilterOp(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff', outline: 'none' }}>
                  <option value="">All Operators</option>
                  {operatorOptions.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>
              {/* Service */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Service</label>
                <select value={filterService} onChange={e => setFilterSvc(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff', outline: 'none' }}>
                  <option value="">All Services</option>
                  {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Date from */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Date to */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Min amount */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Min Due (Rs)</label>
                <input type="number" value={minAmt} onChange={e => setMinAmt(e.target.value)} placeholder="0"
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Max amount */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Max Due (Rs)</label>
                <input type="number" value={maxAmt} onChange={e => setMaxAmt(e.target.value)} placeholder="No limit"
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: 'var(--brand)08', border: '1px solid var(--brand)25',
          borderRadius: 12, marginBottom: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>
            {selectedIds.size} selected
          </span>
          <button onClick={bulkMarkPaid} disabled={updateMutation.isPending} style={{
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: '#10b981', color: '#fff', border: 'none', opacity: updateMutation.isPending ? 0.6 : 1,
          }}><CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />Mark All Paid</button>
          <button onClick={() => exportToCSV(entries.filter(e => selectedIds.has(e.id)), 'selected_pending.csv')} style={{
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            background: '#0ea5e910', color: '#0ea5e9', border: '1px solid #0ea5e930',
          }}><Download size={13} style={{ display: 'inline', marginRight: 5 }} />Export Selected</button>
          <button onClick={clearSelection} style={{
            fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            background: 'none', color: '#94a3b8', border: 'none', marginLeft: 'auto',
          }}><X size={13} /> Clear</button>
        </div>
      )}

      {/* ── Select all bar ────────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && selectedIds.size === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={selectAll} style={{
            fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)',
          }}>Select All ({filtered.length})</button>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      )}

      {/* ── Empty ─────────────────────────────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#10b981" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            {entries.length === 0 ? 'No pending payments!' : 'No results for current filters'}
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            {activeFilterCount > 0 ? 'Try clearing some filters.' : 'All dues have been collected across all operators.'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ marginTop: 12, fontSize: 12, fontWeight: 700, padding: '7px 16px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Operator groups ───────────────────────────────────────────────── */}
      {!isLoading && operatorGroups.map(group => (
        <OperatorGroup
          key={group.operatorId}
          {...group}
          selectedIds={selectedIds}
          onSelectEntry={toggleSelect}
          onSelectAll={selectGroup}
          editId={editId}
          onEdit={setEditId}
          onCancelEdit={() => setEditId(null)}
          onMarkPaid={(entry) => updateMutation.mutate({ id: entry.id, received: entry.total_cost, total: entry.total_cost })}
          onPartial={(entry, amt) => updateMutation.mutate({ id: entry.id, received: amt, total: entry.total_cost })}
          onWriteOff={(entry, note) => updateMutation.mutate({ id: entry.id, received: entry.received_payment || 0, total: entry.total_cost, status: 'written_off', writeOffNote: note })}
          isUpdating={updateMutation.isPending}
          adminRemarks={adminRemarks}
          onSaveRemark={saveRemark}
          onBulkWhatsApp={sendBulkWhatsApp}
        />
      ))}

    </div>
  );
}