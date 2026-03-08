import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getServerTimestamp, getServerDate } from '../../hooks/useServerTime';
import { exportEntriesToCSV } from '../../utils/csvExport';
import { toast } from 'sonner';
import { Search, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 20;

// ── Resolves field_id keys → real labels from service definitions ──
function resolveFields(customFieldValues, services) {
  if (!customFieldValues || Object.keys(customFieldValues).length === 0) return [];
  return Object.entries(customFieldValues).map(([key, value]) => {
    let label = null;
    for (const svc of (services || [])) {
      const field = (svc.fields || []).find(f => f.field_id === key);
      if (field) { label = field.field_label; break; }
    }
    if (!label) {
      const cleaned = key.replace(/^[0-9_]+/, '').replace(/_/g, ' ').trim();
      label = (!cleaned || /^[a-f0-9-]{8,}$/i.test(cleaned)) ? 'Field' : cleaned;
    }
    return { label, value: String(value) };
  });
}

function StatusBadge({ status, type }) {
  const workMap = { pending: 'badge-warning', completed: 'badge-success', cancelled: 'badge-danger' };
  const payMap  = { pending: 'badge-danger', paid: 'badge-success', 'partially paid': 'badge-warning' };
  const cls = type === 'work' ? (workMap[status] || 'badge-neutral') : (payMap[status] || 'badge-neutral');
  return <span className={`badge ${cls}`}>{status}</span>;
}

function ViewModal({ entry, services, onClose }) {
  const customFields = useMemo(() => {
    if (!entry.custom_field_values || Object.keys(entry.custom_field_values).length === 0) return [];
    return Object.entries(entry.custom_field_values).map(([key, value]) => {
      let label = null;
      for (const svc of (services || [])) {
        const field = (svc.fields || []).find(f => f.field_id === key);
        if (field) { label = field.field_label; break; }
      }
      if (!label) {
        const cleaned = key.replace(/^[0-9_]+/, '').replace(/_/g, ' ').trim();
        label = (!cleaned || /^[a-f0-9-]{8,}$/i.test(cleaned)) ? 'Field' : cleaned;
      }
      return { label, value: String(value) };
    });
  }, [entry.custom_field_values, services]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{entry.customer_name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              ['Service',        entry.service_name],
              ['Mobile',         entry.mobile],
              ["Father's Name",  entry.fathers_name],
              ['Entry Date',     entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'],
              ['Work Status',    entry.work_status],
              ['Payment Status', entry.payment_status],
              ['Total Cost',     `Rs.${(entry.total_cost || 0).toLocaleString('en-IN')}`],
              ['Received',       `Rs.${(entry.received_payment || 0).toLocaleString('en-IN')}`],
              ['Pending',        `Rs.${(entry.pending_payment || 0).toLocaleString('en-IN')}`],
              ['Profit',         `Rs.${(entry.profit || 0).toLocaleString('en-IN')}`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--ink-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-800)' }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          {entry.remark && (
            <div style={{ marginTop: 14, background: 'var(--ink-50)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 3 }}>Remark</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>{entry.remark}</div>
            </div>
          )}

          {/* Service Fields — now shows real labels, works for ALL future fields too */}
          {customFields.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)', marginBottom: 8 }}>
                Service Fields
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {customFields.map(({ label, value }, i) => (
                  <div key={i} style={{ background: 'var(--ink-50)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)', marginTop: 2 }}>{value}</div>
                  </div>
                ))}
              </div>
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

function EditModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState({
    work_status:      entry.work_status,
    payment_status:   entry.payment_status,
    received_payment: entry.received_payment,
    total_cost:       entry.total_cost,
    service_cost:     entry.service_cost,
    remark:           entry.remark || '',
  });

  const handleSave = () => {
    const totalCost       = parseFloat(form.total_cost) || 0;
    const serviceCost     = parseFloat(form.service_cost) || 0;
    const receivedPayment = form.payment_status === 'paid'
      ? totalCost : form.payment_status === 'pending'
        ? 0 : parseFloat(form.received_payment) || 0;
    onSave({
      ...form,
      total_cost:       totalCost,
      service_cost:     serviceCost,
      received_payment: receivedPayment,
      pending_payment:  Math.max(0, totalCost - receivedPayment),
      profit:           Math.max(0, receivedPayment - serviceCost),
      remark:           form.remark.toUpperCase(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit Entry — {entry.customer_name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Work Status</label>
              <select className="form-select" value={form.work_status} onChange={e => setForm({ ...form, work_status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Status</label>
              <select className="form-select" value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partially paid">Partially Paid</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Cost (Rs.)</label>
              <input type="number" className="form-input" value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Service Cost (Rs.)</label>
              <input type="number" className="form-input" value={form.service_cost} onChange={e => setForm({ ...form, service_cost: e.target.value })} />
            </div>
          </div>
          {form.payment_status === 'partially paid' && (
            <div className="form-group">
              <label className="form-label">Received Payment (Rs.)</label>
              <input type="number" className="form-input" value={form.received_payment} onChange={e => setForm({ ...form, received_payment: e.target.value })} />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Remark</label>
            <textarea className="form-input" style={{ minHeight: 72 }} value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function AllEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search,         setSearch]         = useState('');
  const [filterService,  setFilterService]  = useState('');
  const [filterWork,     setFilterWork]     = useState('');
  const [filterPay,      setFilterPay]      = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [viewEntry,      setViewEntry]      = useState(null);
  const [editEntry,      setEditEntry]      = useState(null);
  const [deleteId,       setDeleteId]       = useState(null);
  const [currentPage,    setCurrentPage]    = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterService, filterWork, filterPay, dateFrom, dateTo]);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['all-entries', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_entries').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch all service definitions once — used to resolve field IDs → labels
  const { data: services = [] } = useQuery({
    queryKey: ['all-services-labels', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_services').select('*')
        .eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user?.id
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
      queryClient.invalidateQueries({ queryKey: ['all-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-entries'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-entries'] });
      setDeleteId(null);
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Failed to delete entry')
  });

  const serviceNames = [...new Set(entries.map(e => e.service_name).filter(Boolean))];

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch  = !q           || e.customer_name?.toLowerCase().includes(q) || e.mobile?.includes(q) || e.fathers_name?.toLowerCase().includes(q);
    const matchService = !filterService || e.service_name === filterService;
    const matchWork    = !filterWork    || e.work_status === filterWork;
    const matchPay     = !filterPay     || e.payment_status === filterPay;
    const matchFrom    = !dateFrom      || e.entry_date >= dateFrom;
    const matchTo      = !dateTo        || e.entry_date <= dateTo;
    return matchSearch && matchService && matchWork && matchPay && matchFrom && matchTo;
  });

  const totalAmt      = filtered.reduce((s, e) => s + (e.total_cost        || 0), 0);
  const totalReceived = filtered.reduce((s, e) => s + (e.received_payment  || 0), 0);
  const totalPending  = filtered.reduce((s, e) => s + (e.pending_payment   || 0), 0);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedEntries = filtered.slice(startIdx, endIdx);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Entries</h1>
          <p className="page-subtitle">{filtered.length} of {entries.length} entries</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refetch}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              background: 'var(--ink-100)', color: 'var(--ink-600)', border: '1px solid var(--ink-200)'
            }}
            title="Refresh entries"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => {
              if (filtered.length === 0) {
                toast.error('No entries to export');
                return;
              }
              exportEntriesToCSV(filtered, services, `entries-${getServerDate()}.csv`);
              toast.success(`Exported ${filtered.length} entries`);
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
              <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search name, mobile..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" value={filterService} onChange={e => setFilterService(e.target.value)}>
              <option value="">All Services</option>
              {serviceNames.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* Table */}
      <div className="table-wrap">
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[2,1,1,1,1,1].map((f, j) => <div key={j} className="skeleton" style={{ flex: f, height: 18 }} />)}
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
                {paginatedEntries.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.customer_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{entry.mobile}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{entry.service_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--ink-500)' }}>
                      {entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td><StatusBadge status={entry.work_status}   type="work" /></td>
                    <td><StatusBadge status={entry.payment_status} type="pay"  /></td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs.{(entry.total_cost       || 0).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>Rs.{(entry.received_payment || 0).toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)',  fontWeight: 600 }}>Rs.{(entry.pending_payment  || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewEntry(entry)} title="View"><Eye    size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditEntry(entry)} title="Edit"><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteId(entry.id)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={5} style={{ fontWeight: 700 }}>Totals ({filtered.length} entries)</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>Rs.{totalAmt.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>Rs.{totalReceived.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)'  }}>Rs.{totalPending.toLocaleString('en-IN')}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination Controls ── */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: '#fff', borderRadius: 12,
          border: '1px solid var(--ink-100)', marginBottom: 20
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', fontWeight: 600 }}>
            Showing {startIdx + 1} to {Math.min(endIdx, filtered.length)} of {filtered.length} entries
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px', background: currentPage === 1 ? '#f3f4f6' : '#fff',
                border: '1px solid var(--ink-200)', borderRadius: 8,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                color: currentPage === 1 ? '#d1d5db' : '#4f46e5',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <div style={{
              padding: '8px 12px', background: '#eef2ff', borderRadius: 8,
              fontSize: 13, fontWeight: 700, color: '#4f46e5',
              display: 'flex', alignItems: 'center'
            }}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px', background: currentPage === totalPages ? '#f3f4f6' : '#fff',
                border: '1px solid var(--ink-200)', borderRadius: 8,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? '#d1d5db' : '#4f46e5',
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewEntry && (
        <ViewModal
          entry={viewEntry}
          services={services}
          onClose={() => setViewEntry(null)}
        />
      )}
      {editEntry && (
        <EditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={(updates) => updateMutation.mutate({ id: editEntry.id, updates })}
        />
      )}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Delete Entry</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--ink-600)' }}>
                Are you sure you want to delete this entry? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteId)}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}