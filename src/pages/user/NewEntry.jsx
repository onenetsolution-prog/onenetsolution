import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { getServerDate, useServerTime } from '../../hooks/useServerTime';
import { format } from 'date-fns';
import { PlusCircle, Send, SkipForward, User, Briefcase, CreditCard, FileText } from 'lucide-react';

function WhatsAppModal({ entry, businessName, onSend, onSkip, includeUpiLink, onIncludeUpiLinkChange }) {
  const showUpiCheckbox = entry.payment_status === 'pending' || entry.payment_status === 'partially paid';
  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-header"><div className="modal-title">Send WhatsApp Message</div></div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--ink-600)', marginBottom: 16 }}>
            Would you like to notify <strong>{entry.customer_name}</strong> on WhatsApp?
          </p>
          <div style={{ background: 'var(--ink-50)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.6, border: '1px solid var(--ink-200)' }}>
            Hello {entry.customer_name}, your {entry.service_name} request has been received at {businessName}. We will update you once completed. Thank you!
          </div>
          {showUpiCheckbox && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="include-upi" checked={includeUpiLink} onChange={e => onIncludeUpiLinkChange(e.target.checked)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
              <label htmlFor="include-upi" style={{ fontSize: 13, color: 'var(--ink-700)', cursor: 'pointer', margin: 0 }}>Include UPI payment QR link in message</label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onSkip}><SkipForward size={15} />Skip</button>
          <button className="btn btn-primary" onClick={onSend}><Send size={15} />Send on WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  service_id: '', customer_name: '', fathers_name: '', mobile: '',
  entry_date: '',
  custom_field_values: {}, work_status: 'pending', payment_status: 'paid',
  total_cost: '', service_cost: '', received_payment: '', remark: '',
};

function SectionLabel({ icon: Icon, label, color = 'var(--brand)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '24px 0 14px', paddingBottom: 10, borderBottom: '1.5px solid var(--ink-100)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} color={color} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--ink-500)' }}>{label}</span>
    </div>
  );
}

export default function NewEntry() {
  const { user, profile } = useAuth();
  const { isLoading: serverTimeLoading } = useServerTime();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  
  // Set entry_date to server date after server time is initialized
  useEffect(() => {
    if (!serverTimeLoading) {
      setForm(prev => ({ ...prev, entry_date: getServerDate() }));
    }
  }, [serverTimeLoading]);
  const [selectedService, setSelectedService] = useState(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [savedEntry, setSavedEntry] = useState(null);
  const [includeUpiLink, setIncludeUpiLink] = useState(true);

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['user-services', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_services').select('*')
        .eq('user_id', user.id).eq('is_active', true).order('service_name');
      return data || [];
    },
    enabled: !!user?.id
  });

  const mutation = useMutation({
    mutationFn: async (entryData) => {
      const { data, error } = await supabase.from('service_entries').insert([entryData]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] });
      setSavedEntry(data); setShowWhatsApp(true);
      toast.success('Entry saved successfully');
    },
    onError: (err) => toast.error('Failed to save entry: ' + err.message)
  });

  const handleServiceChange = useCallback((serviceId) => {
    const svc = services.find(s => s.id === serviceId) || null;
    setSelectedService(svc);
    setForm(prev => ({ ...prev, service_id: serviceId, custom_field_values: {}, total_cost: '', service_cost: '' }));
  }, [services]);

  const handleFieldChange = useCallback((fieldId, value) => {
    setForm(prev => ({ ...prev, custom_field_values: { ...prev.custom_field_values, [fieldId]: value } }));
    if (fieldId === selectedService?.pricing_field_id) {
      const pricing = selectedService?.application_type_pricing?.[value];
      if (pricing) {
        setForm(prev => ({
          ...prev,
          custom_field_values: { ...prev.custom_field_values, [fieldId]: value },
          total_cost: pricing.total_cost,
          service_cost: pricing.service_cost,
        }));
      }
    }
  }, [selectedService]);

  const handlePaymentStatusChange = useCallback((status) => {
    setForm(prev => ({
      ...prev, payment_status: status,
      received_payment: status === 'paid' ? prev.total_cost : status === 'pending' ? '' : prev.received_payment,
    }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.service_id) { toast.error('Please select a service'); return; }
    const totalCost = parseFloat(form.total_cost) || 0;
    const serviceCost = parseFloat(form.service_cost) || 0;
    const receivedPayment = form.payment_status === 'paid' ? totalCost : form.payment_status === 'pending' ? 0 : parseFloat(form.received_payment) || 0;
    mutation.mutate({
      user_id: user.id, service_id: form.service_id,
      service_name: selectedService?.service_name || '',
      customer_name: form.customer_name.toUpperCase(),
      fathers_name: form.fathers_name.toUpperCase(),
      mobile: form.mobile, entry_date: form.entry_date,
      custom_field_values: form.custom_field_values,
      work_status: form.work_status, payment_status: form.payment_status,
      total_cost: totalCost, service_cost: serviceCost,
      received_payment: receivedPayment,
      pending_payment: Math.max(0, totalCost - receivedPayment),
      profit: Math.max(0, receivedPayment - serviceCost),
      remark: form.remark.toUpperCase(),
    });
  }, [form, user.id, selectedService, mutation]);

  const handleWhatsAppSend = () => {
    const mobile = (savedEntry.mobile || '').replace(/\D/g, '').slice(-10);
    if (!mobile) { toast.error('No mobile number'); return; }
    
    const bizName = profile?.business_name || 'our center';
    const entryDate = savedEntry.entry_date ? format(new Date(savedEntry.entry_date), 'dd MMM yyyy') : '';
    const totalCost = savedEntry.total_cost || 0;
    const receivedPayment = savedEntry.received_payment || 0;
    const pendingPayment = savedEntry.pending_payment || 0;
    const isPaymentPending = savedEntry.payment_status === 'pending' || savedEntry.payment_status === 'partially paid';
    const upiId = profile?.upi_id;
    const upiName = profile?.upi_name || profile?.full_name || '';
    
    let msg = `*Service Request Confirmed!*\n\n`;
    msg += `Hello *${savedEntry.customer_name}* \n\n`;
    msg += `Your request has been registered at *${bizName}*.\n\n`;
    msg += `*Service:* ${savedEntry.service_name}\n`;
    msg += `*Date:* ${entryDate}\n`;
    msg += `*Work Status:* ${savedEntry.work_status}\n\n`;
    msg += `*Payment Summary:*\n`;
    msg += `- Total: ₹${totalCost.toLocaleString('en-IN')}\n`;
    msg += `- Received: ₹${receivedPayment.toLocaleString('en-IN')}\n`;
    msg += `- Pending: ₹${pendingPayment.toLocaleString('en-IN')}\n`;
    
    if (includeUpiLink && isPaymentPending && upiId) {
      msg += `\n *Pay Now via UPI:*\n`;
      msg += `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}%26pn=${encodeURIComponent(upiName)}%26am=${pendingPayment}%26tn=${encodeURIComponent(savedEntry.service_name)}\n`;
    }
    
    msg += `\n For queries contact us anytime.\n`;
    msg += `_Thank you for choosing us!_ \n`;
    msg += `*${bizName}*`;
    
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsApp(false); setForm(emptyForm); setForm(prev => ({ ...prev, entry_date: getServerDate() })); setSelectedService(null); setSavedEntry(null); setIncludeUpiLink(true);
  };

  const handleWhatsAppSkip = () => {
    setShowWhatsApp(false); setForm(emptyForm); setForm(prev => ({ ...prev, entry_date: getServerDate() })); setSelectedService(null); setSavedEntry(null); setIncludeUpiLink(true);
  };

  const totalCost = parseFloat(form.total_cost) || 0;
  const receivedPayment = form.payment_status === 'paid' ? totalCost : form.payment_status === 'pending' ? 0 : parseFloat(form.received_payment) || 0;
  const pendingPayment = Math.max(0, totalCost - receivedPayment);

  return (
    <div className="page-container">
      {showWhatsApp && savedEntry && (
        <WhatsAppModal entry={savedEntry} businessName={profile?.business_name || 'our center'} onSend={handleWhatsAppSend} onSkip={handleWhatsAppSkip} includeUpiLink={includeUpiLink} onIncludeUpiLinkChange={setIncludeUpiLink} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">New Entry</h1>
          <p className="page-subtitle">Create a new service entry for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ maxWidth: 780, margin: '0 auto' }}>
          <div className="card-body" style={{ padding: '28px 32px' }}>

            {/* ── SERVICE DROPDOWN ── */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 13, fontWeight: 800 }}>
                Select Service <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              {loadingServices ? (
                <div className="skeleton" style={{ height: 44, borderRadius: 10, marginTop: 6 }} />
              ) : services.length === 0 ? (
                <div style={{ padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 10, fontSize: 13, color: 'var(--ink-500)', border: '1.5px solid var(--ink-200)', marginTop: 6 }}>
                  No services assigned yet. Contact admin to add services.
                </div>
              ) : (
                <select
                  className="form-select"
                  value={form.service_id}
                  onChange={e => handleServiceChange(e.target.value)}
                  required
                  style={{ fontSize: 14, fontWeight: form.service_id ? 700 : 400 }}
                >
                  <option value="">-- Select a service --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.service_name}</option>
                  ))}
                </select>
              )}
              {selectedService?.description && (
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 6, paddingLeft: 2 }}>
                  {selectedService.description}
                </div>
              )}
            </div>

            {/* ── REST OF FORM — slides in after service is chosen ── */}
            {selectedService && (
              <div style={{ animation: 'fadeSlideIn 0.22s ease' }}>

                {/* Customer Details */}
                <SectionLabel icon={User} label="Customer Details" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" required className="form-input" placeholder="Enter full name"
                      value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Father's Name</label>
                    <input type="text" className="form-input" placeholder="Enter father's name"
                      value={form.fathers_name} onChange={e => setForm({ ...form, fathers_name: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mobile Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="tel" required className="form-input" placeholder="10 digit mobile"
                      value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Entry Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="date" required className="form-input"
                      value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                  </div>
                </div>

                {/* Dynamic Service Fields */}
                {selectedService.fields?.length > 0 && (
                  <>
                    <SectionLabel icon={Briefcase} label="Service Fields" color="#8b5cf6" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {selectedService.fields.map(field => (
                        <div key={field.field_id} className="form-group"
                          style={{ marginBottom: 0, gridColumn: field.field_type === 'textarea' ? 'span 2' : 'span 1' }}>
                          <label className="form-label">
                            {field.field_label}
                            {field.is_required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
                          </label>
                          {field.field_type === 'dropdown' ? (
                            <select className="form-select" required={field.is_required}
                              value={form.custom_field_values[field.field_id] || ''}
                              onChange={e => handleFieldChange(field.field_id, e.target.value)}>
                              <option value="">-- Select --</option>
                              {field.field_options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.field_type === 'textarea' ? (
                            <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }}
                              required={field.is_required} placeholder={field.placeholder || ''}
                              value={form.custom_field_values[field.field_id] || ''}
                              onChange={e => handleFieldChange(field.field_id, e.target.value)} />
                          ) : (
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                              className="form-input" required={field.is_required} placeholder={field.placeholder || ''}
                              value={form.custom_field_values[field.field_id] || ''}
                              onChange={e => handleFieldChange(field.field_id, e.target.value)} />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Payment Details */}
                <SectionLabel icon={CreditCard} label="Payment Details" color="#10b981" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Cost (Rs.)</label>
                    <input type="number" className="form-input" placeholder="0"
                      value={form.total_cost} onChange={e => setForm({ ...form, total_cost: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Service Cost (Rs.)</label>
                    <input type="number" className="form-input" placeholder="0"
                      value={form.service_cost} onChange={e => setForm({ ...form, service_cost: e.target.value })} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Payment Status</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['pending', 'paid', 'partially paid'].map(status => (
                      <button key={status} type="button" onClick={() => handlePaymentStatusChange(status)} style={{
                        flex: 1, padding: '9px 4px', borderRadius: 9, border: '1.5px solid',
                        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                        borderColor: form.payment_status === status ? 'var(--brand)' : 'var(--ink-200)',
                        background: form.payment_status === status ? 'var(--brand-light)' : '#fff',
                        color: form.payment_status === status ? 'var(--brand)' : 'var(--ink-500)',
                      }}>{status}</button>
                    ))}
                  </div>
                </div>

                {form.payment_status === 'partially paid' && (
                  <div className="form-group">
                    <label className="form-label">Received Payment (Rs.)</label>
                    <input type="number" className="form-input" placeholder="Amount received"
                      value={form.received_payment} onChange={e => setForm({ ...form, received_payment: e.target.value })} />
                  </div>
                )}

                {/* Live payment summary */}
                {totalCost > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                      Total: Rs.{totalCost.toLocaleString('en-IN')}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 20, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                      Received: Rs.{receivedPayment.toLocaleString('en-IN')}
                    </span>
                    {pendingPayment > 0 && (
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                        Pending: Rs.{pendingPayment.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}

                {/* Status & Remarks */}
                <SectionLabel icon={FileText} label="Status & Remarks" color="#f59e0b" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Work Status</label>
                    <select className="form-select" value={form.work_status}
                      onChange={e => setForm({ ...form, work_status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Remark</label>
                    <input type="text" className="form-input" placeholder="Any notes or remarks"
                      value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28, paddingTop: 20, borderTop: '1.5px solid var(--ink-100)' }}>
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setForm(emptyForm); setSelectedService(null); }}>
                    Clear Form
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ minWidth: 140 }}>
                    <PlusCircle size={16} />
                    {mutation.isPending ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </form>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}