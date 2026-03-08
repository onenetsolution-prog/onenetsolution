import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Search, Eye, Trash2, X, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getServerTimestamp, getServerDateObject } from '../../hooks/useServerTime';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

// CSV Export function
function exportToCSV(entries, filename = 'all_entries.csv') {
  if (!entries || entries.length === 0) { alert('No entries to export'); return; }
  const headers = ['Customer Name', 'Service', 'Mobile', 'Date', 'Work Status', 'Payment Status', 'Total Cost', 'Received', 'Pending', 'Profit'];
  const rows = entries.map(e => [
    e.customer_name || '', e.service_name || '', e.mobile || '',
    e.entry_date || '', e.work_status || '', e.payment_status || '',
    e.total_cost || 0, e.received_payment || 0, e.pending_payment || 0, e.profit || 0
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status, type }) {
  const workMap = { pending: 'badge-warning', completed: 'badge-success', cancelled: 'badge-danger' };
  const payMap  = { pending: 'badge-danger', paid: 'badge-success', 'partially paid': 'badge-warning' };
  const cls = type === 'work' ? (workMap[status] || 'badge-neutral') : (payMap[status] || 'badge-neutral');
  return <span className={`badge ${cls}`}>{status}</span>;
}

function ViewModal({ entry, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{entry.customer_name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Service',        entry.service_name],
              ['Mobile',         entry.mobile],
              ["Father's Name",  entry.fathers_name],
              ['Date',           entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'],
              ['Work Status',    entry.work_status],
              ['Payment Status', entry.payment_status],
              ['Total Cost',     `Rs.${entry.total_cost || 0}`],
              ['Received',       `Rs.${entry.received_payment || 0}`],
              ['Pending',        `Rs.${entry.pending_payment || 0}`],
              ['Profit',         `Rs.${entry.profit || 0}`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--ink-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-800)' }}>{value || '—'}</div>
              </div>
            ))}
          </div>
          {entry.custom_field_values && Object.keys(entry.custom_field_values).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', marginBottom: 8 }}>Custom Fields</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(entry.custom_field_values).map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--ink-50)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-800)' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {entry.remark && (
            <div style={{ marginTop: 12, background: 'var(--ink-50)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-400)', marginBottom: 3 }}>Remark</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>{entry.remark}</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FullEditModal({ entry, onClose, onSave, isSaving }) {
  const [form, setForm] = useState({
    customer_name:    entry.customer_name    || '',
    fathers_name:     entry.fathers_name     || '',
    mobile:           entry.mobile           || '',
    entry_date:       entry.entry_date       || '',
    service_name:     entry.service_name     || '',
    work_status:      entry.work_status      || 'pending',
    payment_status:   entry.payment_status   || 'pending',
    total_cost:       entry.total_cost       ?? '',
    service_cost:     entry.service_cost     ?? '',
    received_payment: entry.received_payment ?? '',
    remark:           entry.remark           || '',
    custom_field_values: entry.custom_field_values || {},
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    const total    = parseFloat(form.total_cost) || 0;
    const service  = parseFloat(form.service_cost) || 0;
    const received = form.payment_status === 'paid'
      ? total
      : form.payment_status === 'pending'
        ? 0
        : parseFloat(form.received_payment) || 0;
    onSave({
      customer_name:    form.customer_name.toUpperCase(),
      fathers_name:     form.fathers_name.toUpperCase(),
      mobile:           form.mobile,
      entry_date:       form.entry_date,
      service_name:     form.service_name,
      work_status:      form.work_status,
      payment_status:   form.payment_status,
      total_cost:       total,
      service_cost:     service,
      received_payment: received,
      pending_payment:  Math.max(0, total - received),
      profit:           Math.max(0, received - service),
      remark:           form.remark.toUpperCase(),
      custom_field_values: form.custom_field_values,
    });
  };

  const customKeys = Object.keys(form.custom_field_values);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div className="modal-title">Edit Entry — {entry.customer_name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">

          {/* Customer Details */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Customer Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Customer name" />
              </div>
              <div className="form-group">
                <label className="form-label">Father's Name</label>
                <input className="form-input" value={form.fathers_name} onChange={e => set('fathers_name', e.target.value)} placeholder="Father's name" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Date</label>
                <input className="form-input" type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Service */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Service</div>
            <div className="form-group">
              <label className="form-label">Service Name</label>
              <input className="form-input" value={form.service_name} onChange={e => set('service_name', e.target.value)} placeholder="Service name" />
            </div>
          </div>

          {/* Custom Fields */}
          {customKeys.length > 0 && (
            <div style={sectionStyle}>
              <div style={sectionTitle}>Service Fields</div>
              <div className="form-row" style={{ flexWrap: 'wrap' }}>
                {customKeys.map(key => (
                  <div className="form-group" key={key} style={{ flex: '1 1 45%' }}>
                    <label className="form-label">{key}</label>
                    <input className="form-input" value={form.custom_field_values[key] || ''} onChange={e => setForm(p => ({ ...p, custom_field_values: { ...p.custom_field_values, [key]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Status</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Work Status</label>
                <select className="form-select" value={form.work_status} onChange={e => set('work_status', e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="form-select" value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partially paid">Partially Paid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Payment Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Total Cost (Rs.)</label>
                <input className="form-input" type="number" value={form.total_cost} onChange={e => set('total_cost', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Service Cost (Rs.)</label>
                <input className="form-input" type="number" value={form.service_cost} onChange={e => set('service_cost', e.target.value)} />
              </div>
            </div>
            {form.payment_status === 'partially paid' && (
              <div className="form-group">
                <label className="form-label">Received Payment (Rs.)</label>
                <input className="form-input" type="number" value={form.received_payment} onChange={e => set('received_payment', e.target.value)} />
              </div>
            )}
          </div>

          {/* Remark */}
          <div style={{ ...sectionStyle, marginBottom: 0 }}>
            <div style={sectionTitle}>Remark</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea className="form-input" style={{ minHeight: 72 }} value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="Optional remark..." />
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEntries() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [search,         setSearch]         = useState('');
  const [filterService,  setFilterService]  = useState('');
  const [filterWork,     setFilterWork]     = useState('');
  const [filterPay,      setFilterPay]      = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [viewEntry,      setViewEntry]      = useState(null);
  const [editEntry,      setEditEntry]      = useState(null);
  const [deleteId,       setDeleteId]       = useState(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-entries-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries')
        .select('*, profiles(full_name, business_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!isAdmin
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { error } = await supabase
        .from('service_entries')
        .update({ ...updates, updated_at: getServerTimestamp() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entries-all'] });
      setEditEntry(null);
      toast.success('Entry updated');
    },
    onError: () => toast.error('Failed to update entry')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('service_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entries-all'] });
      setDeleteId(null);
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Failed to delete entry')
  });

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const services  = [...new Set(entries.map(e => e.service_name).filter(Boolean))];
  const operators = [...new Set(entries.map(e => e.profiles?.full_name || e.profiles?.business_name).filter(Boolean))];

  const filtered = entries.filter(e => {
    const q      = search.toLowerCase();
    const opName = e.profiles?.full_name || e.profiles?.business_name || '';
    const matchSearch = !q || e.customer_name?.toLowerCase().includes(q) || e.mobile?.includes(q) || e.fathers_name?.toLowerCase().includes(q);
    const matchSvc    = !filterService  || e.service_name === filterService;
    const matchWork   = !filterWork     || e.work_status === filterWork;
    const matchPay    = !filterPay      || e.payment_status === filterPay;
    const matchOp     = !filterOperator || opName === filterOperator;
    const matchFrom   = !dateFrom       || e.entry_date >= dateFrom;
    const matchTo     = !dateTo         || e.entry_date <= dateTo;
    return matchSearch && matchSvc && matchWork && matchPay && matchOp && matchFrom && matchTo;
  });

  const totalAmt      = filtered.reduce((s, e) => s + (e.total_cost || 0), 0);
  const totalReceived = filtered.reduce((s, e) => s + (e.received_payment || 0), 0);
  const totalPending  = filtered.reduce((s, e) => s + (e.pending_payment || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Entries</h1>
          <p className="page-subtitle">{filtered.length} of {entries.length} entries across all operators</p>
        </div>
        <button 
          onClick={refetch}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)' }}
          title="Refresh all entries"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
              <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" value={filterOperator} onChange={e => setFilterOperator(e.target.value)}>
              <option value="">All Operators</option>
              {operators.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-select" value={filterService} onChange={e => setFilterService(e.target.value)}>
              <option value="">All Services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-select" value={filterWork} onChange={e => setFilterWork(e.target.value)}>
              <option value="">All Work Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="form-select" value={filterPay} onChange={e => setFilterPay(e.target.value)}>
              <option value="">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially paid">Partially Paid</option>
            </select>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input type="date" className="form-input" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => {
            const date = format(getServerDateObject(), 'dd-MM-yyyy_HHmmss');
            exportToCSV(filtered, `entries_${date}.csv`);
            toast.success(`CSV Downloaded: ${filtered.length} entries`);
          }}
        >
          <Download size={16} />
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Entries',  value: filtered.length,                              color: '#4f46e5' },
          { label: 'Total',    value: `Rs.${totalAmt.toLocaleString('en-IN')}`,      color: '#0284c7' },
          { label: 'Received', value: `Rs.${totalReceived.toLocaleString('en-IN')}`, color: '#10b981' },
          { label: 'Pending',  value: `Rs.${totalPending.toLocaleString('en-IN')}`,  color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[2,1,1,1,1,1,1].map((f, j) => <div key={j} className="skeleton" style={{ flex: f, height: 18 }} />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No entries found</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Operator</th>
                  <th>Service</th>
                  <th>Date</th>
                  <th>Work</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.customer_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{entry.mobile}</div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>
                      {entry.profiles?.business_name || entry.profiles?.full_name || '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>{entry.service_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                      {entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td><StatusBadge status={entry.work_status} type="work" /></td>
                    <td><StatusBadge status={entry.payment_status} type="pay" /></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs.{entry.total_cost || 0}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Rs.{entry.received_payment || 0}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>Rs.{entry.pending_payment || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => setViewEntry(entry)}><Eye size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit all fields" onClick={() => setEditEntry(entry)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(entry.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={6} style={{ fontWeight: 700 }}>Totals ({filtered.length} entries)</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs.{totalAmt.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>Rs.{totalReceived.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>Rs.{totalPending.toLocaleString('en-IN')}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {viewEntry && <ViewModal entry={viewEntry} onClose={() => setViewEntry(null)} />}

      {editEntry && (
        <FullEditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          isSaving={updateMutation.isPending}
          onSave={(updates) => updateMutation.mutate({ id: editEntry.id, updates })}
        />
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header"><div className="modal-title">Delete Entry</div></div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--ink-600)' }}>Are you sure? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const sectionStyle = { marginBottom: 20, padding: '14px 16px', background: 'var(--ink-50)', borderRadius: 12, border: '1px solid var(--ink-100)' };
const sectionTitle = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--ink-400)', marginBottom: 14 };