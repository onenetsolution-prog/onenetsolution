import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Search, ChevronDown, ChevronUp, User, Phone,
  Calendar, AlertCircle, CheckCircle2, Clock, XCircle, MessageCircle, RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

function WorkDot({ status }) {
  const colors = { completed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444' };
  const color = colors[status] || '#94a3b8';
  return (
    <span title={status} style={{
      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
      background: color, boxShadow: `0 0 0 2px ${color}30`, flexShrink: 0
    }} />
  );
}

// THE FIX: looks up field_id in service definitions to get real label
function resolveFieldLabels(customFieldValues, services) {
  if (!customFieldValues || Object.keys(customFieldValues).length === 0) return [];
  return Object.entries(customFieldValues).map(([key, value]) => {
    let label = null;
    for (const svc of (services || [])) {
      const field = (svc.fields || []).find(f => f.field_id === key);
      if (field) { label = field.field_label; break; }
    }
    // fallback: clean up key if label not found
    if (!label) {
      const cleaned = key.replace(/^[0-9_]+/, '').replace(/_/g, ' ').trim();
      label = (!cleaned || /^[a-f0-9-]{8,}$/i.test(cleaned)) ? 'Info' : cleaned;
    }
    return { label, value: String(value) };
  });
}

function TimelineEntry({ entry, services, isLast }) {
  const isPaid      = entry.payment_status === 'paid';
  const isPartial   = entry.payment_status === 'partially paid';
  const isCompleted = entry.work_status === 'completed';
  const isCancelled = entry.work_status === 'cancelled';
  const customFields = resolveFieldLabels(entry.custom_field_values, services);

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isCompleted ? '#dcfce7' : isCancelled ? '#fee2e2' : '#fef9c3',
          border: `2px solid ${isCompleted ? '#10b981' : isCancelled ? '#ef4444' : '#f59e0b'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {isCompleted ? <CheckCircle2 size={15} color="#10b981" />
            : isCancelled ? <XCircle size={15} color="#ef4444" />
            : <Clock size={15} color="#f59e0b" />}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--ink-100)', margin: '4px 0' }} />}
      </div>

      <div style={{
        flex: 1, background: '#fff', borderRadius: 12,
        border: '1px solid var(--ink-100)', padding: '12px 14px',
        marginBottom: isLast ? 0 : 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink-800)' }}>{entry.service_name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} />
              {entry.entry_date ? format(parseISO(entry.entry_date), 'dd MMM yyyy') : '—'}
              <span style={{ color: 'var(--ink-200)' }}>·</span>
              {entry.entry_date ? formatDistanceToNow(parseISO(entry.entry_date), { addSuffix: true }) : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${isCompleted ? 'badge-success' : isCancelled ? 'badge-danger' : 'badge-warning'}`}>
              {entry.work_status}
            </span>
            <span className={`badge ${isPaid ? 'badge-success' : isPartial ? 'badge-warning' : 'badge-danger'}`}>
              {entry.payment_status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
          {[
            ['Total',    `Rs.${(entry.total_cost       || 0).toLocaleString('en-IN')}`, 'var(--ink-700)'],
            ['Received', `Rs.${(entry.received_payment || 0).toLocaleString('en-IN')}`, '#16a34a'],
            ['Pending',  `Rs.${(entry.pending_payment  || 0).toLocaleString('en-IN')}`, (entry.pending_payment || 0) > 0 ? '#dc2626' : '#16a34a'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'var(--ink-50)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', letterSpacing: 0.4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Custom fields — NOW shows real labels like "Application Type: New" */}
        {customFields.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customFields.map(({ label, value }, i) => (
              <span key={i} style={{
                background: 'var(--brand-light)', color: 'var(--brand)',
                borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600
              }}>
                {label}: <strong>{value}</strong>
              </span>
            ))}
          </div>
        )}

        {entry.remark && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-500)', fontStyle: 'italic', lineHeight: 1.5 }}>
            Remark: "{entry.remark}"
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerCard({ mobile, entries, services }) {
  const [open, setOpen] = useState(false);
  const customer    = entries[0];
  const totalPaid   = entries.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending= entries.reduce((s, e) => s + (e.pending_payment  || 0), 0);
  const hasDue      = totalPending > 0;
  const lastVisit   = entries.map(e => e.entry_date).filter(Boolean).sort().reverse()[0];
  const initial     = (customer.customer_name || 'U')[0].toUpperCase();

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    const num = (mobile || '').replace(/\D/g, '').slice(-10);
    const msg = `Hello ${customer.customer_name}, this is a message from our CSC Center.`;
    window.open(`https://wa.me/91${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="card" style={{ marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 18
          }}>{initial}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--ink-900)' }}>{customer.customer_name}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {entries.slice(0, 8).map(e => <WorkDot key={e.id} status={e.work_status} />)}
                {entries.length > 8 && <span style={{ fontSize: 10, color: 'var(--ink-400)' }}>+{entries.length - 8}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Phone size={10} /> {mobile}
              </span>
              {customer.fathers_name && (
                <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>C/O {customer.fathers_name}</span>
              )}
              {lastVisit && (
                <span style={{ fontSize: 12, color: 'var(--ink-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={10} /> Last visit: {formatDistanceToNow(parseISO(lastVisit), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'center', padding: '6px 12px', background: 'var(--ink-50)', borderRadius: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-800)' }}>{entries.length}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 600 }}>Visits</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 12px', background: '#f0fdf4', borderRadius: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>Rs.{totalPaid.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600 }}>Paid</div>
            </div>
            {hasDue && (
              <div style={{ textAlign: 'center', padding: '6px 12px', background: '#fef2f2', borderRadius: 10, border: '1.5px solid #fecaca' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#dc2626' }}>Rs.{totalPending.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                  <AlertCircle size={9} /> Due
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={handleWhatsApp} title="Send WhatsApp" style={{
              width: 36, height: 36, borderRadius: 10, background: '#dcfce7',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageCircle size={17} color="#16a34a" />
            </button>
            {open ? <ChevronUp size={16} color="var(--ink-400)" /> : <ChevronDown size={16} color="var(--ink-400)" />}
          </div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--ink-100)', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
            Service History · {entries.length} record{entries.length > 1 ? 's' : ''}
          </div>
          {entries.map((entry, idx) => (
            <TimelineEntry key={entry.id} entry={entry} services={services} isLast={idx === entries.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerSearch() {
  const { user } = useAuth();
  const [query, setQuery]             = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['customer-search-entries', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('service_entries').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch services to resolve field_id → field_label
  const { data: services = [] } = useQuery({
    queryKey: ['all-services-for-search', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('custom_services').select('*').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
  });

  const matchesQuery = (entry, q) => {
    const ql = q.toLowerCase();
    const customMatch = Object.entries(entry.custom_field_values || {}).some(([k, v]) => {
      let label = k;
      for (const svc of services) {
        const f = (svc.fields || []).find(f => f.field_id === k);
        if (f) { label = f.field_label; break; }
      }
      return label.toLowerCase().includes(ql) || String(v).toLowerCase().includes(ql);
    });
    return (
      entry.customer_name?.toLowerCase().includes(ql) ||
      entry.fathers_name?.toLowerCase().includes(ql)  ||
      entry.mobile?.includes(ql)                      ||
      entry.remark?.toLowerCase().includes(ql)        ||
      entry.service_name?.toLowerCase().includes(ql)  ||
      customMatch
    );
  };

  const searched = query.trim().length >= 2 ? entries.filter(e => matchesQuery(e, query)) : entries;
  const filtered = pendingOnly ? searched.filter(e => (e.pending_payment || 0) > 0) : searched;

  const grouped = filtered.reduce((acc, e) => {
    const key = e.mobile || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped);
  const totalDue  = filtered.reduce((s, e) => s + (e.pending_payment || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Search</h1>
          <p className="page-subtitle">Search across all customer records</p>
        </div>
        <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)' }} title="Refresh customers">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
            <input className="form-input" style={{ paddingLeft: 40, fontSize: 15 }}
              placeholder="Search by name, mobile, father's name, service, remark..."
              value={query} onChange={e => setQuery(e.target.value)} autoFocus />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: 20, lineHeight: 1 }}>×</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setPendingOnly(p => !p)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
              borderRadius: 9, border: '1.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
              borderColor: pendingOnly ? '#dc2626' : 'var(--ink-200)',
              background:  pendingOnly ? '#fef2f2' : '#fff',
              color:       pendingOnly ? '#dc2626' : 'var(--ink-500)',
            }}>
              <AlertCircle size={14} />
              Pending Due Only
              {pendingOnly && totalDue > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                  Rs.{totalDue.toLocaleString('en-IN')}
                </span>
              )}
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-400)', fontWeight: 600 }}>
              {groupKeys.length} customer{groupKeys.length !== 1 ? 's' : ''} · {filtered.length} records
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['#10b981','Work Completed'],['#f59e0b','Work Pending'],['#ef4444','Cancelled']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-500)', fontWeight: 600 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div>{[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 14 }} />)}</div>
      ) : query.trim().length < 2 && !pendingOnly ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ink-400)' }}>
          <User size={44} style={{ margin: '0 auto 14px', opacity: 0.25 }} />
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-500)' }}>Search for any customer</p>
          <p style={{ fontSize: 13, marginTop: 5 }}>Type a name, mobile number, or service · {entries.length} total records</p>
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="empty-state">
          <Search size={40} />
          <p>No results found{query ? ` for "${query}"` : ''}</p>
        </div>
      ) : (
        <div>
          {groupKeys.map(mobile => (
            <CustomerCard key={mobile} mobile={mobile} entries={grouped[mobile]} services={services} />
          ))}
        </div>
      )}
    </div>
  );
}