import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Copy, X, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, Eye, Zap, Users, CheckCircle,
  FileText, AlertCircle, DollarSign, Layers
} from 'lucide-react';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

const FIELD_TEMPLATES = {
  'Aadhaar': [
    { field_label: 'Aadhaar Number', field_type: 'text', is_required: true, placeholder: '12-digit Aadhaar number' },
    { field_label: 'Update Type', field_type: 'dropdown', is_required: true, is_pricing_field: true, field_options: ['Name', 'Address', 'Mobile', 'Date of Birth'] },
    { field_label: 'Mobile Number', field_type: 'text', is_required: true, placeholder: 'Enter mobile number' },
  ],
  'PAN Card': [
    { field_label: 'Application Type', field_type: 'dropdown', is_required: true, is_pricing_field: true, field_options: ['New PAN', 'Correction', 'Reprint'] },
    { field_label: 'Applicant Name', field_type: 'text', is_required: true, placeholder: 'Full name as per records' },
    { field_label: 'Date of Birth', field_type: 'date', is_required: true },
    { field_label: 'Father Name', field_type: 'text', is_required: true, placeholder: "Father's full name" },
  ],
  'Passport': [
    { field_label: 'Application Type', field_type: 'dropdown', is_required: true, is_pricing_field: true, field_options: ['Fresh', 'Renewal', 'Tatkal'] },
    { field_label: 'Passport Number', field_type: 'text', is_required: false, placeholder: 'For renewal only' },
    { field_label: 'Date of Birth', field_type: 'date', is_required: true },
  ],
  'Driving License': [
    { field_label: 'Application Type', field_type: 'dropdown', is_required: true, is_pricing_field: true, field_options: ['New DL', 'Renewal', 'Duplicate'] },
    { field_label: 'DL Number', field_type: 'text', is_required: false, placeholder: 'For renewal/duplicate' },
    { field_label: 'Vehicle Type', field_type: 'dropdown', is_required: true, field_options: ['2 Wheeler', '4 Wheeler', 'Both'] },
  ],
};

const emptyField = () => ({
  field_id:         `f${Date.now()}${Math.random().toString(36).slice(2,6)}`,
  field_label:      '',
  field_type:       'text',
  field_options:    [],
  is_required:      false,
  is_pricing_field: false,
  placeholder:      '',
});

const emptyService = {
  service_name: '', description: '', is_active: true,
  fields: [], application_type_pricing: {}, pricing_field_id: '',
};

export default function AdminServices() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [selectedUserId, setSelectedUserId] = useState('');
  const [showForm,       setShowForm]       = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form,           setForm]           = useState(emptyService);
  const [fields,         setFields]         = useState([]);
  const [pricing,        setPricing]        = useState({});
  const [assignModal,    setAssignModal]    = useState(null);
  const [assignSelected, setAssignSelected] = useState([]);
  const [showPreview,    setShowPreview]    = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [showTemplates,  setShowTemplates]  = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-for-services'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, business_name').order('full_name');
      return (data || []).filter(u => u.id !== user?.id);
    },
    enabled: !!isAdmin,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data } = await supabase.from('custom_services').select('*')
        .eq('user_id', selectedUserId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const { data: usageStats = {} } = useQuery({
    queryKey: ['admin-service-usage', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return {};
      const { data } = await supabase.from('service_entries').select('service_name, total_cost').eq('user_id', selectedUserId);
      const stats = {};
      (data || []).forEach(e => {
        if (!stats[e.service_name]) stats[e.service_name] = { count: 0, revenue: 0 };
        stats[e.service_name].count++;
        stats[e.service_name].revenue += e.total_cost || 0;
      });
      return stats;
    },
    enabled: !!selectedUserId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.service_name.trim()) throw new Error('Service name is required');
      if (!selectedUserId) throw new Error('Select a user first');
      const pricingFieldId = fields.find(f => f.is_pricing_field)?.field_id || '';
      const serviceData = {
        user_id: selectedUserId, service_name: form.service_name.trim(),
        description: form.description, is_active: form.is_active,
        fields, application_type_pricing: pricing, pricing_field_id: pricingFieldId,
      };
      if (editingService) {
        const { error } = await supabase.from('custom_services').update(serviceData).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('custom_services').insert([serviceData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      resetForm();
      toast.success(editingService ? 'Service updated!' : 'Service created!');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('custom_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      setDeleteConfirm(null);
      toast.success('Service deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (svc) => {
      const { error } = await supabase.from('custom_services').insert([{
        user_id: selectedUserId, service_name: svc.service_name + ' (Copy)',
        description: svc.description, is_active: svc.is_active,
        fields: svc.fields, application_type_pricing: svc.application_type_pricing,
        pricing_field_id: svc.pricing_field_id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-services'] }); toast.success('Service duplicated!'); },
    onError: () => toast.error('Failed to duplicate'),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ service, userIds }) => {
      const copies = userIds.map(uid => ({
        user_id: uid, service_name: service.service_name,
        description: service.description, is_active: service.is_active,
        fields: service.fields, application_type_pricing: service.application_type_pricing,
        pricing_field_id: service.pricing_field_id,
      }));
      const { error } = await supabase.from('custom_services').insert(copies);
      if (error) throw error;
    },
    onSuccess: (_, { userIds }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      queryClient.invalidateQueries({ queryKey: ['user-services'] });
      setAssignModal(null); setAssignSelected([]);
      toast.success(`Assigned to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}`);
    },
    onError: () => toast.error('Failed to assign'),
  });

  const resetForm = () => {
    setForm(emptyService); setFields([]); setPricing({});
    setEditingService(null); setShowForm(false); setShowPreview(false);
  };

  const openEdit = (svc) => {
    setEditingService(svc);
    setForm({ service_name: svc.service_name, description: svc.description || '', is_active: svc.is_active });
    setFields(svc.fields || []);
    setPricing(svc.application_type_pricing || {});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyTemplate = (name) => {
    const tpl = FIELD_TEMPLATES[name];
    setFields(tpl.map(f => ({ ...emptyField(), ...f })));
    if (!form.service_name) setForm(p => ({ ...p, service_name: name }));
    setShowTemplates(false);
    toast.success(`${name} template applied`);
  };

  const addField    = () => setFields(f => [...f, emptyField()]);
  const removeField = (idx) => setFields(f => f.filter((_, i) => i !== idx));
  const moveField   = (idx, dir) => {
    const arr = [...fields]; const t = idx + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[idx], arr[t]] = [arr[t], arr[idx]]; setFields(arr);
  };
  const updateField = (idx, key, value) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const nf = { ...f, [key]: value };
      if (key === 'is_pricing_field' && value) return { ...nf, field_type: 'dropdown' };
      if (key === 'field_type' && value !== 'dropdown') return { ...nf, is_pricing_field: false, field_options: [] };
      return nf;
    }));
    if (key === 'is_pricing_field' && !value) {
      const p = { ...pricing };
      (fields[idx].field_options || []).forEach(o => delete p[o]);
      setPricing(p);
    }
  };
  const addOption    = (idx, val) => {
    if (!val || (fields[idx].field_options || []).includes(val)) return;
    updateField(idx, 'field_options', [...(fields[idx].field_options || []), val]);
  };
  const removeOption = (idx, oi) => {
    const removed = fields[idx].field_options[oi];
    updateField(idx, 'field_options', fields[idx].field_options.filter((_, i) => i !== oi));
    if (fields[idx].is_pricing_field) { const p = { ...pricing }; delete p[removed]; setPricing(p); }
  };
  const updatePricing = (opt, key, val) =>
    setPricing(p => ({ ...p, [opt]: { ...(p[opt] || {}), [key]: parseFloat(val) || 0 } }));

  const pricingField   = fields.find(f => f.is_pricing_field);
  const pricingOptions = pricingField?.field_options || [];
  const selectedUser   = users.find(u => u.id === selectedUserId);

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Services</h1>
          <p className="page-subtitle">Create, configure and assign services to operators</p>
        </div>
        {selectedUserId && !showForm && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> Add New Service
          </button>
        )}
      </div>

      {/* Operator selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Select Operator</label>
              <select className="form-select" value={selectedUserId}
                onChange={e => { setSelectedUserId(e.target.value); resetForm(); }}>
                <option value="">— Select an operator —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.business_name || u.full_name || u.id}</option>
                ))}
              </select>
            </div>
            {selectedUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                  {(selectedUser.full_name || 'U')[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-800)' }}>{selectedUser.full_name}</div>
                  {selectedUser.business_name && <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{selectedUser.business_name}</div>}
                </div>
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                  {services.length} service{services.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Form */}
      {showForm && (
        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 340px' : '1fr', gap: 16, marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={15} color="var(--brand)" />
                {editingService ? 'Edit Service' : 'New Service'}
                <span style={{ fontSize: 12, color: 'var(--ink-400)', fontWeight: 500 }}>
                  for {selectedUser?.business_name || selectedUser?.full_name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPreview(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderColor: showPreview ? 'var(--brand)' : 'var(--ink-200)', background: showPreview ? 'var(--brand-light)' : '#fff', color: showPreview ? 'var(--brand)' : 'var(--ink-500)' }}>
                  <Eye size={13} /> Preview
                </button>
                <button className="btn btn-ghost btn-icon" onClick={resetForm}><X size={18} /></button>
              </div>
            </div>
            <div className="card-body">

              {/* Section A */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--ink-100)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-400)', marginBottom: 14 }}>
                  Basic Information
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Service Name *</label>
                    <input type="text" className="form-input" placeholder="e.g. Aadhaar Update"
                      value={form.service_name} onChange={e => setForm(p => ({ ...p, service_name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description (optional)</label>
                    <input type="text" className="form-input" placeholder="Brief description"
                      value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                    {form.is_active
                      ? <ToggleRight size={24} color="var(--success)" />
                      : <ToggleLeft  size={24} color="var(--ink-300)" />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? 'var(--success)' : 'var(--ink-400)' }}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Section B — Fields */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: pricingOptions.length > 0 ? '1px solid var(--ink-100)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-400)' }}>
                    Form Fields ({fields.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Templates dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowTemplates(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1.5px solid var(--ink-200)', background: '#fff', color: 'var(--ink-500)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <FileText size={12} /> Templates
                      </button>
                      {showTemplates && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowTemplates(false)} />
                          <div style={{ position: 'absolute', right: 0, top: 36, zIndex: 60, background: '#fff', border: '1px solid var(--ink-200)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: 160 }}>
                            {Object.keys(FIELD_TEMPLATES).map(t => (
                              <button key={t} onClick={() => applyTemplate(t)}
                                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--ink-700)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                onMouseEnter={e => e.target.style.background = 'var(--brand-light)'}
                                onMouseLeave={e => e.target.style.background = 'none'}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={addField}>
                      <Plus size={13} /> Add Field
                    </button>
                  </div>
                </div>

                {fields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-400)', fontSize: 13, background: 'var(--ink-50)', borderRadius: 10, border: '1.5px dashed var(--ink-200)' }}>
                    No fields yet. Add a field or pick a template above.
                  </div>
                ) : fields.map((field, idx) => (
                  <div key={field.field_id} style={{ background: 'var(--ink-50)', borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid var(--ink-200)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 10, marginBottom: 10 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Field Label</label>
                        <input type="text" className="form-input" placeholder="e.g. Application Type"
                          value={field.field_label} onChange={e => updateField(idx, 'field_label', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Type</label>
                        <select className="form-select" value={field.field_type} onChange={e => updateField(idx, 'field_type', e.target.value)}>
                          {['text','number','date','dropdown','textarea'].map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, paddingBottom: 2 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveField(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}><ChevronDown size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeField(idx)}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={field.is_required} onChange={e => updateField(idx, 'is_required', e.target.checked)} />
                        Required
                      </label>
                      {field.field_type === 'dropdown' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                          <input type="checkbox" checked={field.is_pricing_field} onChange={e => updateField(idx, 'is_pricing_field', e.target.checked)} />
                          Use for Pricing
                        </label>
                      )}
                    </div>

                    {field.field_type === 'dropdown' ? (
                      <div>
                        <label className="form-label">Options <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink-400)' }}>(press Enter to add)</span></label>
                        {(field.field_options || []).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {field.field_options.map((opt, oi) => (
                              <span key={opt} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--brand-light)', color: 'var(--brand)', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
                                {opt}
                                <button onClick={() => removeOption(idx, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 0, fontSize: 14, fontWeight: 900, lineHeight: 1 }}>×</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input type="text" className="form-input" placeholder="Type option and press Enter"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) { addOption(idx, v); e.target.value = ''; } } }} />
                      </div>
                    ) : (
                      <div>
                        <label className="form-label">Placeholder</label>
                        <input type="text" className="form-input" placeholder="Hint text for this field"
                          value={field.placeholder || ''} onChange={e => updateField(idx, 'placeholder', e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Section C — Pricing */}
              {pricingOptions.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--ink-400)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <DollarSign size={12} /> Pricing Table — {pricingField?.field_label}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Option</th>
                          <th style={{ textAlign: 'right' }}>Total Cost (Rs.)</th>
                          <th style={{ textAlign: 'right' }}>Service Cost (Rs.)</th>
                          <th style={{ textAlign: 'right' }}>Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingOptions.map(opt => {
                          const tc = pricing[opt]?.total_cost || 0;
                          const sc = pricing[opt]?.service_cost || 0;
                          return (
                            <tr key={opt}>
                              <td style={{ fontWeight: 700 }}>{opt}</td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" className="form-input" style={{ maxWidth: 130, textAlign: 'right' }} placeholder="0"
                                  value={pricing[opt]?.total_cost || ''} onChange={e => updatePricing(opt, 'total_cost', e.target.value)} />
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input type="number" className="form-input" style={{ maxWidth: 130, textAlign: 'right' }} placeholder="0"
                                  value={pricing[opt]?.service_cost || ''} onChange={e => updatePricing(opt, 'service_cost', e.target.value)} />
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: tc - sc > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                Rs.{tc - sc}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button className="btn btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="card" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              <div className="card-header">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={14} color="var(--brand)" /> User Preview
                </div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-900)', marginBottom: 4 }}>{form.service_name || 'Service Name'}</div>
                {form.description && <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 12 }}>{form.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.is_active ? 'var(--success)' : 'var(--ink-300)' }} />
                  <span style={{ fontSize: 12, color: form.is_active ? 'var(--success)' : 'var(--ink-400)', fontWeight: 600 }}>{form.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                {fields.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-300)', fontSize: 13 }}>No fields added yet</div>
                ) : fields.map(f => (
                  <div key={f.field_id} style={{ marginBottom: 12 }}>
                    <label className="form-label">{f.field_label || 'Field'} {f.is_required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                    {f.field_type === 'dropdown' ? (
                      <select className="form-select" disabled>
                        <option>Select {f.field_label}</option>
                        {(f.field_options || []).map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.field_type === 'textarea' ? (
                      <textarea className="form-input" style={{ minHeight: 56 }} placeholder={f.placeholder} disabled />
                    ) : (
                      <input type={f.field_type} className="form-input" placeholder={f.placeholder} disabled />
                    )}
                  </div>
                ))}
                {pricingOptions.length > 0 && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>PRICING</div>
                    {pricingOptions.map(o => (
                      <div key={o} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-600)', marginBottom: 2 }}>
                        <span>{o}</span><span style={{ fontWeight: 700 }}>Rs.{pricing[o]?.total_cost || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services List */}
      {selectedUserId && !showForm && (
        isLoading ? (
          <div style={{ padding: 24 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, marginBottom: 12 }} />)}
          </div>
        ) : services.length === 0 ? (
          <div className="card"><div className="empty-state"><Zap size={36} /><p>No services yet</p><p style={{ fontSize: 12, marginTop: 4 }}>Click Add New Service to create one</p></div></div>
        ) : services.map(svc => {
          const stats = usageStats[svc.service_name] || { count: 0, revenue: 0 };
          return (
            <div key={svc.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: svc.is_active ? 'var(--brand-light)' : 'var(--ink-50)', border: `1.5px solid ${svc.is_active ? 'var(--brand)' : 'var(--ink-200)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={17} color={svc.is_active ? 'var(--brand)' : 'var(--ink-300)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-900)' }}>{svc.service_name}</div>
                    <span className={`badge ${svc.is_active ? 'badge-success' : 'badge-neutral'}`}>{svc.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {svc.description && <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 4 }}>{svc.description}</div>}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{(svc.fields || []).length} field{(svc.fields || []).length !== 1 ? 's' : ''}</span>
                    {Object.keys(svc.application_type_pricing || {}).length > 0 && <span style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>Pricing configured</span>}
                    {stats.count > 0 && <>
                      <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{stats.count} uses</span>
                      <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Rs.{stats.revenue.toLocaleString('en-IN')} revenue</span>
                    </>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setAssignModal(svc); setAssignSelected([]); }}><Users size={13} /> Assign</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => duplicateMutation.mutate(svc)} disabled={duplicateMutation.isPending}><Copy size={13} /> Duplicate</button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(svc)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(svc.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {!selectedUserId && (
        <div className="card"><div className="empty-state"><Users size={36} /><p>Select an operator above to manage their services</p></div></div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Delete Service?</div></div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--ink-600)' }}>This cannot be undone. Existing entries will remain but the service template will be removed.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Assign "{assignModal.service_name}"</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssignModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginBottom: 14 }}>Select operators to receive a copy. Each copy is independent.</p>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--ink-200)', borderRadius: 10, overflow: 'hidden' }}>
                {users.map((u, i) => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', borderBottom: i < users.length - 1 ? '1px solid var(--ink-100)' : 'none', background: assignSelected.includes(u.id) ? 'var(--brand-light)' : '#fff' }}>
                    <input type="checkbox" checked={assignSelected.includes(u.id)} onChange={() => setAssignSelected(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])} />
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ink-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--ink-600)', flexShrink: 0 }}>
                      {(u.full_name || 'U')[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.full_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{u.business_name || '—'}</div>
                    </div>
                    {assignSelected.includes(u.id) && <CheckCircle size={14} color="var(--success)" />}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={assignSelected.length === 0 || assignMutation.isPending}
                onClick={() => assignMutation.mutate({ service: assignModal, userIds: assignSelected })}>
                {assignMutation.isPending ? 'Assigning...' : `Assign to ${assignSelected.length} User${assignSelected.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}