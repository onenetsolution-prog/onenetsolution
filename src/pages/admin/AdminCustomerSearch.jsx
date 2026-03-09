import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Search, Filter, Download, Users, FileText, DollarSign,
  AlertTriangle, ChevronDown, ChevronUp, Phone, Calendar,
  CheckCircle, Clock, XCircle, Building2, StickyNote,
  Flag, Star, Shield, X, Eye, TrendingUp, Copy,
  MessageCircle, Pencil, ArrowUpDown, ArrowUp, ArrowDown,
  Keyboard, RefreshCw, BarChart2, Hash, Layers, Info
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const Rs = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

// ─── Risk flag colors & labels ────────────────────────────────────────────────
const RISK_CONFIG = {
  none:        { label: 'Normal',      color: '#10b981', bg: '#10b98112' },
  suspicious:  { label: 'Suspicious',  color: '#f59e0b', bg: '#f59e0b12' },
  blacklisted: { label: 'Blacklisted', color: '#ef4444', bg: '#ef444412' },
  vip:         { label: 'VIP',         color: '#8b5cf6', bg: '#8b5cf612' },
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportToCSV(entries, filename = 'customers_export.csv') {
  const headers = [
    'Customer Name', 'Father Name', 'Mobile', 'Service', 'Date',
    'Operator', 'Business', 'Work Status', 'Payment Status',
    'Total Cost', 'Received', 'Pending', 'Remark'
  ];
  const rows = entries.map(e => [
    e.customer_name || '',
    e.fathers_name || '',
    e.mobile || '',
    e.service_name || '',
    e.entry_date || e.created_at?.slice(0, 10) || '',
    e.profiles?.full_name || '',
    e.profiles?.business_name || '',
    e.work_status || '',
    e.payment_status || '',
    e.total_cost || 0,
    e.received_payment || 0,
    e.pending_payment || 0,
    (e.remark || '').replace(/,/g, ';'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Badge component ──────────────────────────────────────────────────────────
function Badge({ label, color, bg, size = 11 }) {
  return (
    <span style={{
      fontSize: size, fontWeight: 700, padding: '2px 8px',
      borderRadius: 20, background: bg, color, whiteSpace: 'nowrap'
    }}>{label}</span>
  );
}

// ─── Work & Payment badges ────────────────────────────────────────────────────
function WorkBadge({ status }) {
  const map = {
    completed: { label: 'Done',    color: '#10b981', bg: '#10b98112' },
    pending:   { label: 'Pending', color: '#f59e0b', bg: '#f59e0b12' },
  };
  const cfg = map[status] || { label: status || '—', color: '#6b7280', bg: '#6b728012' };
  return <Badge {...cfg} />;
}
function PayBadge({ status }) {
  const map = {
    paid:    { label: 'Paid',    color: '#10b981', bg: '#10b98112' },
    pending: { label: 'Pending', color: '#ef4444', bg: '#ef444412' },
    partial: { label: 'Partial', color: '#f59e0b', bg: '#f59e0b12' },
  };
  const cfg = map[status] || { label: status || '—', color: '#6b7280', bg: '#6b728012' };
  return <Badge {...cfg} />;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, color = 'var(--ink-700)' }) {
  return (
    <div style={{
      background: 'var(--ink-50)', borderRadius: 10, padding: '8px 12px',
      minWidth: 80, textAlign: 'center'
    }}>
      <p style={{ fontSize: 10, color: 'var(--ink-400)', fontWeight: 600, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

// ─── Single entry card ────────────────────────────────────────────────────────
function EntryCard({ entry, highlight, fieldLabels = {} }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = entry.entry_date || entry.created_at?.slice(0, 10);
  const operatorName = entry.profiles?.full_name || entry.profiles?.business_name || 'Unknown Operator';
  const businessName = entry.profiles?.business_name;

  // Resolve custom fields: replace raw field IDs with human labels
  const customFields = useMemo(() => {
    if (!entry.custom_field_values) return [];
    try {
      const vals = typeof entry.custom_field_values === 'string'
        ? JSON.parse(entry.custom_field_values) : entry.custom_field_values;
      return Object.entries(vals)
        .filter(([, v]) => v !== '' && v != null)
        .map(([rawKey, v]) => {
          // First try the fieldLabels map (most accurate)
          if (fieldLabels[rawKey]) return [fieldLabels[rawKey], v];
          // Fallback: strip pattern like f1772609941410tntm → tntm
          // Pattern: optional 'f', then 10-15 digits, then remaining suffix
          const match = rawKey.match(/^[a-f]?\d{10,15}([a-z0-9]+)$/i);
          if (match && match[1]) return [match[1].toUpperCase(), v];
          // Last resort: return as-is cleaned up
          return [rawKey.replace(/[_-]/g, ' ').trim(), v];
        });
    } catch { return []; }
  }, [entry.custom_field_values, fieldLabels]);

  const isEdited = entry.updated_at && entry.updated_at !== entry.created_at;

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--ink-100)',
      marginBottom: 8, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.15s'
    }}>
      {/* Entry header */}
      <div
        style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
        onClick={() => setExpanded(p => !p)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Service + badges row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)' }}>
              {entry.service_name || '—'}
            </span>
            {isEdited && (
              <span style={{ fontSize: 10, color: '#6b7280', background: '#6b728012', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                edited
              </span>
            )}
            <WorkBadge status={entry.work_status} />
            <PayBadge status={entry.payment_status} />
          </div>

          {/* Operator + date row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-500)' }}>
              <Building2 size={11} /> {operatorName}{businessName && businessName !== operatorName ? ` · ${businessName}` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-400)' }}>
              <Calendar size={11} /> {dateStr ? format(parseISO(dateStr), 'dd MMM yyyy') : '—'}
            </span>
          </div>
        </div>

        {/* Amount tiles */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <StatTile label="Total" value={Rs(entry.total_cost)} />
          <StatTile label="Paid" value={Rs(entry.received_payment)} color="#10b981" />
          {(entry.pending_payment > 0) && (
            <StatTile label="Due" value={Rs(entry.pending_payment)} color="#ef4444" />
          )}
        </div>

        <div style={{ color: 'var(--ink-400)', marginLeft: 4, marginTop: 2, flexShrink: 0 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--ink-100)', padding: '12px 14px', background: 'var(--ink-50)' }}>
          {entry.remark && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remark</p>
              <p style={{ fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5 }}>{entry.remark}</p>
            </div>
          )}
          {customFields.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custom Fields</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {customFields.map(([k, v]) => (
                  <span key={k} style={{
                    fontSize: 11, background: '#fff', border: '1px solid var(--ink-200)',
                    borderRadius: 8, padding: '3px 9px', color: 'var(--ink-600)', fontWeight: 600
                  }}>{k}: {v}</span>
                ))}
              </div>
            </div>
          )}
          {entry.updated_at && entry.updated_at !== entry.created_at && (
            <p style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 10 }}>
              Last edited: {format(parseISO(entry.updated_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Customer group card ──────────────────────────────────────────────────────
function CustomerGroup({ mobile, entries, adminNotes, riskFlags, onSaveNote, onSetRisk, highlight, fieldLabels }) {
  const [expanded, setExpanded] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteText, setNoteText] = useState(adminNotes[mobile] || '');
  const [showRiskMenu, setShowRiskMenu] = useState(false);

  const customerName = entries[0]?.customer_name || 'Unknown';
  const fathersName  = entries[0]?.fathers_name;
  const firstSeen    = entries[entries.length - 1]?.entry_date || entries[entries.length - 1]?.created_at?.slice(0, 10);
  const lastSeen     = entries[0]?.entry_date || entries[0]?.created_at?.slice(0, 10);
  const operators    = [...new Set(entries.map(e => e.profiles?.full_name || e.profiles?.business_name).filter(Boolean))];
  const totalPaid    = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending = entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const totalValue   = entries.reduce((s, e) => s + (e.total_cost || 0), 0);
  const risk         = riskFlags[mobile] || 'none';
  const riskCfg      = RISK_CONFIG[risk];
  const hasNote      = adminNotes[mobile] && adminNotes[mobile].trim().length > 0;
  const hasCrossOperatorDue = totalPending > 0 && operators.length > 1;

  const handleSaveNote = () => {
    onSaveNote(mobile, noteText);
    setShowNoteEditor(false);
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: `1px solid ${hasCrossOperatorDue ? '#ef444430' : 'var(--ink-200)'}`,
      marginBottom: 12,
      boxShadow: hasCrossOperatorDue ? '0 2px 12px #ef444410' : '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      {/* Group header */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: `${riskCfg.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: riskCfg.color
          }}>
            {customerName.substring(0, 2).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-900)' }}>{customerName}</span>
              {fathersName && <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>s/o {fathersName}</span>}
              <Badge label={riskCfg.label} color={riskCfg.color} bg={riskCfg.bg} />
              {hasCrossOperatorDue && (
                <Badge label={`⚠ Multi-op Due ${Rs(totalPending)}`} color="#ef4444" bg="#ef444412" />
              )}
              {hasNote && <Badge label="📝 Note" color="#6366f1" bg="#6366f112" />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-500)', fontWeight: 600 }}>
                <Phone size={11} /> {mobile}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                {entries.length} visit{entries.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                {operators.length} operator{operators.length !== 1 ? 's' : ''}
              </span>
              {firstSeen && (
                <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                  First: {format(parseISO(firstSeen), 'dd MMM yy')}
                </span>
              )}
              {lastSeen && (
                <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                  Last: {format(parseISO(lastSeen), 'dd MMM yy')}
                </span>
              )}
            </div>
          </div>

          {/* Lifetime value tiles */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <StatTile label="Lifetime" value={Rs(totalValue)} color="var(--brand)" />
            <StatTile label="Paid" value={Rs(totalPaid)} color="#10b981" />
            {totalPending > 0 && <StatTile label="Due" value={Rs(totalPending)} color="#ef4444" />}
          </div>
        </div>

        {/* Operators list */}
        {operators.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10, paddingLeft: 54 }}>
            {operators.map(op => (
              <span key={op} style={{
                fontSize: 11, background: 'var(--ink-100)', color: 'var(--ink-600)',
                padding: '2px 9px', borderRadius: 20, fontWeight: 600
              }}>{op}</span>
            ))}
          </div>
        )}

        {/* Admin note display */}
        {hasNote && !showNoteEditor && (
          <div style={{
            marginTop: 10, marginLeft: 54, padding: '8px 12px',
            background: '#6366f108', border: '1px solid #6366f120',
            borderRadius: 8, fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5
          }}>
            <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin Note · </span>
            {adminNotes[mobile]}
          </div>
        )}

        {/* Note editor */}
        {showNoteEditor && (
          <div style={{ marginTop: 10, marginLeft: 54 }}>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add admin note (only you can see this)..."
              style={{
                width: '100%', minHeight: 72, padding: '8px 10px',
                borderRadius: 8, border: '1px solid #6366f140',
                fontSize: 12, color: 'var(--ink-700)', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                background: '#6366f105'
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={handleSaveNote} style={{
                fontSize: 12, fontWeight: 700, padding: '5px 14px',
                background: 'var(--brand)', color: '#fff', border: 'none',
                borderRadius: 8, cursor: 'pointer'
              }}>Save</button>
              <button onClick={() => setShowNoteEditor(false)} style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px',
                background: 'var(--ink-100)', color: 'var(--ink-600)', border: 'none',
                borderRadius: 8, cursor: 'pointer'
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingLeft: 54, flexWrap: 'wrap' }}>
          {/* WhatsApp */}
          <button
            onClick={() => window.open(`https://wa.me/91${mobile.replace(/\D/g, '').slice(-10)}`, '_blank')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, padding: '5px 11px',
              background: '#25d36615', color: '#25d366', border: '1px solid #25d36630',
              borderRadius: 8, cursor: 'pointer'
            }}
          ><MessageCircle size={12} /> WhatsApp</button>

          {/* Copy mobile */}
          <button
            onClick={() => navigator.clipboard.writeText(mobile)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, padding: '5px 11px',
              background: 'var(--ink-100)', color: 'var(--ink-600)', border: 'none',
              borderRadius: 8, cursor: 'pointer'
            }}
          ><Copy size={12} /> Copy Mobile</button>

          {/* Admin note toggle */}
          <button
            onClick={() => setShowNoteEditor(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, padding: '5px 11px',
              background: '#6366f110', color: '#6366f1', border: '1px solid #6366f130',
              borderRadius: 8, cursor: 'pointer'
            }}
          ><StickyNote size={12} /> {hasNote ? 'Edit Note' : 'Add Note'}</button>

          {/* Risk flag */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowRiskMenu(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 700, padding: '5px 11px',
                background: riskCfg.bg, color: riskCfg.color, border: `1px solid ${riskCfg.color}30`,
                borderRadius: 8, cursor: 'pointer'
              }}
            ><Flag size={12} /> {riskCfg.label}</button>
            {showRiskMenu && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 100,
                background: '#fff', border: '1px solid var(--ink-200)',
                borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                overflow: 'hidden', minWidth: 130
              }}>
                {Object.entries(RISK_CONFIG).map(([key, cfg]) => (
                  <div key={key}
                    onClick={() => { onSetRisk(mobile, key); setShowRiskMenu(false); }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      color: cfg.color, display: 'flex', alignItems: 'center', gap: 8,
                      background: risk === key ? cfg.bg : 'transparent'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                    {cfg.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export this customer */}
          <button
            onClick={() => exportToCSV(entries, `customer_${mobile}.csv`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, padding: '5px 11px',
              background: '#0ea5e910', color: '#0ea5e9', border: '1px solid #0ea5e930',
              borderRadius: 8, cursor: 'pointer'
            }}
          ><Download size={12} /> Export</button>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto',
              fontSize: 11, fontWeight: 700, padding: '5px 11px',
              background: 'var(--ink-50)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)',
              borderRadius: 8, cursor: 'pointer'
            }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : `Show ${entries.length} Entr${entries.length !== 1 ? 'ies' : 'y'}`}
          </button>
        </div>
      </div>

      {/* Entries list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--ink-100)', padding: '12px 16px', background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
          {entries.map(e => <EntryCard key={e.id} entry={e} highlight={highlight} fieldLabels={fieldLabels} />)}
        </div>
      )}
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────
function SummaryBar({ entries, groups }) {
  const totalValue   = entries.reduce((s, e) => s + (e.total_cost || 0), 0);
  const totalPaid    = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending = entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
  const operators    = new Set(entries.map(e => e.user_id)).size;

  const items = [
    { icon: FileText,    label: 'Entries',   value: entries.length,    color: 'var(--brand)' },
    { icon: Users,       label: 'Customers', value: groups,            color: '#8b5cf6' },
    { icon: Building2,   label: 'Operators', value: operators,         color: '#0ea5e9' },
    { icon: TrendingUp,  label: 'Total',     value: Rs(totalValue),    color: 'var(--ink-700)' },
    { icon: CheckCircle, label: 'Collected', value: Rs(totalPaid),     color: '#10b981' },
    { icon: AlertTriangle, label: 'Pending', value: Rs(totalPending),  color: '#ef4444' },
  ];

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px',
      background: 'linear-gradient(135deg, var(--brand)08, #0ea5e908)',
      border: '1px solid var(--ink-200)', borderRadius: 14, marginBottom: 16
    }}>
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', background: '#fff',
          borderRadius: 10, border: '1px solid var(--ink-150, #eee)'
        }}>
          <Icon size={13} color={color} />
          <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 600 }}>{label}:</span>
          <span style={{ fontSize: 12, fontWeight: 800, color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, color = 'var(--brand)' }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12, fontWeight: 700, padding: '5px 13px',
      borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
      background: active ? color : 'var(--ink-100)',
      color: active ? '#fff' : 'var(--ink-600)',
      border: active ? `1px solid ${color}` : '1px solid var(--ink-200)',
    }}>{label}</button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminCustomerSearch() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // ── Search & filter state ──────────────────────────────────────────────────
  const [query, setQuery]               = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [filterOperator, setFilterOp]   = useState('');
  const [filterService, setFilterSvc]   = useState('');
  const [filterPayStatus, setFilterPay] = useState('');
  const [filterWorkStatus, setFilterWork] = useState('');
  const [filterRisk, setFilterRisk]     = useState('');
  const [sortBy, setSortBy]             = useState('recent'); // recent | pending | value | visits
  const [showFilters, setShowFilters]   = useState(false);
  const [showDupeOnly, setShowDupeOnly] = useState(false);
  const [showCrossOpDue, setShowCrossOpDue] = useState(false);

  // ── Local persisted admin data (notes & risk flags) ─────────────────────────
  const [adminNotes, setAdminNotes]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminNotes') || '{}'); } catch { return {}; }
  });
  const [riskFlags, setRiskFlags]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('riskFlags') || '{}'); } catch { return {}; }
  });

  const searchRef = useRef(null);

  // ── Keyboard shortcut: Ctrl+K or / to focus search ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const saveNote = useCallback((mobile, text) => {
    const updated = { ...adminNotes, [mobile]: text };
    setAdminNotes(updated);
    localStorage.setItem('adminNotes', JSON.stringify(updated));
  }, [adminNotes]);

  const saveRisk = useCallback((mobile, risk) => {
    const updated = { ...riskFlags, [mobile]: risk };
    setRiskFlags(updated);
    localStorage.setItem('riskFlags', JSON.stringify(updated));
  }, [riskFlags]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-customer-search'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_entries')
        .select('*, profiles(full_name, business_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 0,
  });

  // ── Custom services fetch (for field ID → label resolution) ───────────────
  const { data: allServices = [], refetch: refetchServices } = useQuery({
    queryKey: ['admin-all-services-search'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('custom_services').select('*');
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Failed to fetch services:', err);
        return [];
      }
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Build flat map: fieldId → label across all services
  // Handles: fields as array of {id, label}, {id, name}, or as JSON string
  const fieldLabels = useMemo(() => {
    const map = {};
    const processField = (f) => {
      if (!f || !f.id) return;
      map[f.id] = f.label || f.name || f.placeholder || f.id;
    };
    allServices.forEach(svc => {
      let fields = svc.fields;
      if (typeof fields === 'string') {
        try { fields = JSON.parse(fields); } catch { fields = null; }
      }
      if (Array.isArray(fields)) fields.forEach(processField);
      else if (fields && typeof fields === 'object') {
        Object.values(fields).forEach(f => {
          if (typeof f === 'object') processField(f);
        });
      }
      // Also check custom_fields key if present
      let cf = svc.custom_fields;
      if (typeof cf === 'string') { try { cf = JSON.parse(cf); } catch { cf = null; } }
      if (Array.isArray(cf)) cf.forEach(processField);
    });
    return map;
  }, [allServices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchServices()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchServices]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const operatorOptions = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const id = e.user_id;
      const name = e.profiles?.full_name || e.profiles?.business_name;
      if (id && name) map[id] = name;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const serviceOptions = useMemo(() => {
    return [...new Set(entries.map(e => e.service_name).filter(Boolean))].sort();
  }, [entries]);

  // ── Matching logic ────────────────────────────────────────────────────────
  const matchesQuery = useCallback((entry, q) => {
    if (!q || q.length < 2) return true;
    const lower = q.toLowerCase();
    const fields = [
      entry.customer_name, entry.fathers_name, entry.mobile,
      entry.remark, entry.service_name,
      entry.profiles?.full_name, entry.profiles?.business_name,
    ];
    if (fields.some(f => f && f.toLowerCase().includes(lower))) return true;
    // custom fields
    if (entry.custom_field_values) {
      try {
        const vals = typeof entry.custom_field_values === 'string'
          ? JSON.parse(entry.custom_field_values) : entry.custom_field_values;
        return Object.entries(vals).some(([k, v]) =>
          k.toLowerCase().includes(lower) || String(v).toLowerCase().includes(lower)
        );
      } catch {}
    }
    return false;
  }, []);

  // ── Apply all filters ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (!matchesQuery(e, query)) return false;
      if (filterOperator && e.user_id !== filterOperator) return false;
      if (filterService && e.service_name !== filterService) return false;
      if (filterPayStatus && e.payment_status !== filterPayStatus) return false;
      if (filterWorkStatus && e.work_status !== filterWorkStatus) return false;
      if (dateFrom) {
        const d = e.entry_date || e.created_at?.slice(0, 10);
        if (!d || d < dateFrom) return false;
      }
      if (dateTo) {
        const d = e.entry_date || e.created_at?.slice(0, 10);
        if (!d || d > dateTo) return false;
      }
      return true;
    });
  }, [entries, query, filterOperator, filterService, filterPayStatus, filterWorkStatus, dateFrom, dateTo, matchesQuery]);

  // ── Group by mobile ────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.mobile || 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [filtered]);

  // ── Duplicate detection (same mobile, different names) ────────────────────
  const duplicates = useMemo(() => {
    const dupes = new Set();
    Object.entries(grouped).forEach(([mobile, entries]) => {
      const names = [...new Set(entries.map(e => (e.customer_name || '').toLowerCase().trim()).filter(Boolean))];
      if (names.length > 1) dupes.add(mobile);
    });
    return dupes;
  }, [grouped]);

  // ── Cross-operator pending ────────────────────────────────────────────────
  const crossOpDues = useMemo(() => {
    const set = new Set();
    Object.entries(grouped).forEach(([mobile, entries]) => {
      const ops = new Set(entries.map(e => e.user_id).filter(Boolean));
      const pending = entries.reduce((s, e) => s + (e.pending_payment || 0), 0);
      if (ops.size > 1 && pending > 0) set.add(mobile);
    });
    return set;
  }, [grouped]);

  // ── Apply risk + dupe + cross-op filters on groups ────────────────────────
  const visibleGroups = useMemo(() => {
    let groups = Object.entries(grouped);
    if (filterRisk) groups = groups.filter(([m]) => (riskFlags[m] || 'none') === filterRisk);
    if (showDupeOnly) groups = groups.filter(([m]) => duplicates.has(m));
    if (showCrossOpDue) groups = groups.filter(([m]) => crossOpDues.has(m));

    // Sort
    groups.sort(([, aE], [, bE]) => {
      if (sortBy === 'recent') {
        const aD = aE[0]?.entry_date || aE[0]?.created_at || '';
        const bD = bE[0]?.entry_date || bE[0]?.created_at || '';
        return bD.localeCompare(aD);
      }
      if (sortBy === 'pending') {
        const aP = aE.reduce((s, e) => s + (e.pending_payment || 0), 0);
        const bP = bE.reduce((s, e) => s + (e.pending_payment || 0), 0);
        return bP - aP;
      }
      if (sortBy === 'value') {
        const aV = aE.reduce((s, e) => s + (e.total_cost || 0), 0);
        const bV = bE.reduce((s, e) => s + (e.total_cost || 0), 0);
        return bV - aV;
      }
      if (sortBy === 'visits') return bE.length - aE.length;
      return 0;
    });
    return groups;
  }, [grouped, filterRisk, showDupeOnly, showCrossOpDue, sortBy, riskFlags, duplicates, crossOpDues]);

  const activeFilterCount = [
    filterOperator, filterService, filterPayStatus, filterWorkStatus,
    dateFrom, dateTo, filterRisk, showDupeOnly && 'dupe', showCrossOpDue && 'cross'
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterOp(''); setFilterSvc(''); setFilterPay(''); setFilterWork('');
    setDateFrom(''); setDateTo(''); setFilterRisk('');
    setShowDupeOnly(false); setShowCrossOpDue(false);
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) return <LoadingSpinner />;
  if (!user) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const showResults = query.length >= 2 || activeFilterCount > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.2s ease' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-900)' }}>Customer Search</h1>
            <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
              Search across all operators · {entries.length.toLocaleString()} total entries
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={refetch}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
                background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)'
              }}
            ><RefreshCw size={13} /> Refresh</button>
            <button
              onClick={() => exportToCSV(showResults ? filtered : entries, 'all_customers.csv')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
                background: '#0ea5e9', color: '#fff', border: 'none'
              }}
            ><Download size={13} /> Export {showResults ? 'Results' : 'All'}</button>
          </div>
        </div>
      </div>

      {/* ── Sticky search + filter bar ────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(248,249,250,0.95)', backdropFilter: 'blur(8px)',
        paddingTop: 8, paddingBottom: 12, marginBottom: 8,
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, mobile, father's name, service, operator, remark... (Ctrl+K)"
            style={{
              width: '100%', padding: '11px 120px 11px 40px',
              borderRadius: 12, border: '1.5px solid var(--ink-200)',
              fontSize: 13, color: 'var(--ink-800)', outline: 'none',
              background: '#fff', boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--ink-200)'}
          />
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6, alignItems: 'center' }}>
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                background: activeFilterCount > 0 ? 'var(--brand)' : 'var(--ink-100)',
                color: activeFilterCount > 0 ? '#fff' : 'var(--ink-600)',
                border: 'none'
              }}
            >
              <Filter size={12} />
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{
            background: '#fff', border: '1px solid var(--ink-200)', borderRadius: 14,
            padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
          }}>
            {/* Row 1: dropdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
              {/* Operator */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Operator</label>
                <select value={filterOperator} onChange={e => setFilterOp(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', background: '#fff', outline: 'none' }}>
                  <option value="">All Operators</option>
                  {operatorOptions.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>
              {/* Service */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Service</label>
                <select value={filterService} onChange={e => setFilterSvc(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', background: '#fff', outline: 'none' }}>
                  <option value="">All Services</option>
                  {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Payment status */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Payment</label>
                <select value={filterPayStatus} onChange={e => setFilterPay(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', background: '#fff', outline: 'none' }}>
                  <option value="">Any Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              {/* Work status */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Work</label>
                <select value={filterWorkStatus} onChange={e => setFilterWork(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', background: '#fff', outline: 'none' }}>
                  <option value="">Any Work Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              {/* Risk */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Risk Flag</label>
                <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', background: '#fff', outline: 'none' }}>
                  <option value="">All</option>
                  {Object.entries(RISK_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: date range */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--ink-200)', fontSize: 12, color: 'var(--ink-700)', outline: 'none' }} />
              </div>
            </div>

            {/* Row 3: toggle pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterPill label="⚠ Duplicates Only" active={showDupeOnly} onClick={() => setShowDupeOnly(p => !p)} color="#f59e0b" />
              <FilterPill label="🔴 Cross-Op Dues" active={showCrossOpDue} onClick={() => setShowCrossOpDue(p => !p)} color="#ef4444" />
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{
                  fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
                  background: 'none', color: 'var(--ink-400)', border: '1px solid var(--ink-200)',
                  cursor: 'pointer', marginLeft: 'auto'
                }}>Clear all filters</button>
              )}
            </div>
          </div>
        )}

        {/* Sort bar — only when results visible */}
        {showResults && visibleGroups.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, marginRight: 4 }}>Sort:</span>
            {[
              { key: 'recent',  label: 'Most Recent' },
              { key: 'pending', label: 'Highest Due' },
              { key: 'value',   label: 'Highest Value' },
              { key: 'visits',  label: 'Most Visits' },
            ].map(s => (
              <FilterPill key={s.key} label={s.label} active={sortBy === s.key} onClick={() => setSortBy(s.key)} color="var(--brand)" />
            ))}
          </div>
        )}
      </div>

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {/* ── Prompt state ──────────────────────────────────────────────────── */}
      {!isLoading && !showResults && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: 'var(--brand)10',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Search size={28} color="var(--brand)" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 6 }}>Search All Customers</p>
          <p style={{ fontSize: 13, color: 'var(--ink-400)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
            Type 2+ characters to search across all operator entries by name, mobile, service, remark, and more.
            <br /><br />
            <span style={{ fontSize: 11, background: 'var(--ink-100)', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>Ctrl+K</span>
            {' '}or{' '}
            <span style={{ fontSize: 11, background: 'var(--ink-100)', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>/</span>
            {' '}to focus search
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 20 }}>
            {entries.length.toLocaleString()} entries · {Object.keys(
              entries.reduce((m, e) => { if (e.mobile) m[e.mobile] = 1; return m; }, {})
            ).length.toLocaleString()} unique customers loaded
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {!isLoading && showResults && (
        <>
          {/* Summary bar */}
          <SummaryBar entries={filtered} groups={visibleGroups.length} />

          {/* Duplicate warning */}
          {duplicates.size > 0 && !showDupeOnly && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 10, marginBottom: 12
            }}>
              <AlertTriangle size={15} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
                {duplicates.size} mobile number{duplicates.size !== 1 ? 's' : ''} have multiple different customer names — possible duplicates or data errors.
              </span>
              <button onClick={() => setShowDupeOnly(true)} style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
              }}>View</button>
            </div>
          )}

          {/* Cross-operator due warning */}
          {crossOpDues.size > 0 && !showCrossOpDue && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10, marginBottom: 12
            }}>
              <AlertTriangle size={15} color="#ef4444" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7f1d1d' }}>
                {crossOpDues.size} customer{crossOpDues.size !== 1 ? 's' : ''} have pending dues across multiple operators.
              </span>
              <button onClick={() => setShowCrossOpDue(true)} style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
              }}>View</button>
            </div>
          )}

          {/* Result count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--ink-500)', fontWeight: 600 }}>
              {visibleGroups.length} customer{visibleGroups.length !== 1 ? 's' : ''} · {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
              {duplicates.size > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· {duplicates.size} duplicate{duplicates.size !== 1 ? 's' : ''}</span>}
              {crossOpDues.size > 0 && <span style={{ color: '#ef4444', marginLeft: 8 }}>· {crossOpDues.size} cross-op due</span>}
            </p>
          </div>

          {/* Empty */}
          {visibleGroups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-600)', marginBottom: 6 }}>No customers found</p>
              <p style={{ fontSize: 13, color: 'var(--ink-400)' }}>Try different search terms or clear some filters.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{
                  marginTop: 12, fontSize: 12, fontWeight: 700, padding: '7px 16px',
                  background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer'
                }}>Clear filters</button>
              )}
            </div>
          )}

          {/* Customer groups */}
          {visibleGroups.map(([mobile, groupEntries]) => (
            <CustomerGroup
              key={mobile}
              mobile={mobile}
              entries={groupEntries}
              adminNotes={adminNotes}
              riskFlags={riskFlags}
              onSaveNote={saveNote}
              onSetRisk={saveRisk}
              highlight={query}
              fieldLabels={fieldLabels}
            />
          ))}
        </>
      )}
    </div>
  );
}