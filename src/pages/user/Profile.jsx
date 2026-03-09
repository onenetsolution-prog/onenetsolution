import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { User, Building, Phone, MapPin, Save, X, MessageCircle, QrCode, CreditCard, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();

  const [form, setForm] = useState({
    full_name:      profile?.full_name      || '',
    business_name:  profile?.business_name  || '',
    mobile:         profile?.mobile         || '',
    address:        profile?.address        || '',
    gst_number:     profile?.gst_number     || '',
    pan_number:     profile?.pan_number     || '',
    gst_enabled:    profile?.gst_enabled    || false,
  });

  const [upiForm, setUpiForm] = useState({
    upi_id:       profile?.upi_id       || '',
    upi_name:     profile?.upi_name     || '',
    upi_mobile:   profile?.upi_mobile   || '',
  });

  const [editing,    setEditing]    = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const { data: appSettings } = useQuery({
    queryKey: ['app-settings-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings').select('*')
        .eq('settings_key', 'main').maybeSingle();
      return data || {};
    }
  });

  const upiId     = appSettings?.upi_id             || '';
  const adminName = appSettings?.admin_name          || 'One Net Solution Admin';
  const subAmount = appSettings?.subscription_amount || 999;
  const waRaw     = appSettings?.whatsapp_number     || '';
  const waNumber  = waRaw.startsWith('91') ? waRaw : `91${waRaw}`;

  const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(adminName)}&am=${subAmount}&cu=INR&tn=OneNetSubscription`;
  const qrUrl = upiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayLink)}&bgcolor=ffffff&color=000000&margin=10`
    : null;

  const waMessage = encodeURIComponent(
    `Hello! I have paid Rs.${subAmount} for One Net Solution subscription.\nEmail: ${user?.email}\nName: ${profile?.full_name || ''}\nPlease activate my account.`
  );

  const mutation = useMutation({
    mutationFn: async (updates) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => { refreshProfile(); setEditing(false); setEditingUpi(false); toast.success('Profile updated successfully'); },
    onError: () => toast.error('Failed to update profile')
  });

  const handleSave = () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    mutation.mutate(form);
  };

  const handleSaveUpi = () => {
    if (!upiForm.upi_id.trim()) { toast.error('UPI ID is required'); return; }
    // Validate UPI format: name@bank or phone@bank
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$|^\d{10}@[a-zA-Z]{2,}$/;
    if (!upiRegex.test(upiForm.upi_id.trim())) {
      toast.error('Invalid UPI format. Use format like: name@bank or 9876543210@bank');
      return;
    }
    mutation.mutate(upiForm);
  };

  const planColor = { trial: '#f59e0b', basic: '#3b82f6', premium: '#10b981', inactive: '#ef4444' };

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--ink-100)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color="var(--brand)" />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-800)', marginTop: 2 }}>{value || '—'}</div>
      </div>
    </div>
  );

  // Preview QR for user's own UPI
  const userUpiLink = upiForm.upi_id
    ? `upi://pay?pa=${upiForm.upi_id}&pn=${encodeURIComponent(upiForm.upi_name || profile?.full_name || '')}&cu=INR`
    : null;
  const userQrPreview = userUpiLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(userUpiLink)}&bgcolor=ffffff&color=000000&margin=8`
    : null;

  const savedUpiId     = profile?.upi_id     || '';
  const savedUpiName   = profile?.upi_name   || '';
  const savedUpiMobile = profile?.upi_mobile || '';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account information</p>
        </div>
      </div>

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Personal Information</div>
              {!editing && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
            </div>
            <div className="card-body">
              {editing ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input type="text" className="form-input" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Your CSC center name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input type="tel" className="form-input" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="10 digit mobile" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea className="form-input" style={{ minHeight: 80 }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your center address" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input type="text" className="form-input" value={form.gst_number} onChange={e => setForm({ ...form, gst_number: e.target.value })} placeholder="18-digit GST registration number" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number (Optional)</label>
                    <input type="text" className="form-input" value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value })} placeholder="10-digit PAN" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
                      <input 
                        type="checkbox" 
                        checked={form.gst_enabled} 
                        onChange={e => setForm({ ...form, gst_enabled: e.target.checked })} 
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      Apply GST on Invoices
                    </label>
                    <div style={{ fontSize: 12, color: 'var(--ink-500)', background: '#f0fdf4', padding: '8px 12px', borderRadius: 8, border: '1px solid #bbf7d0', lineHeight: 1.5 }}>
                      ✓ When enabled, GST will be calculated and displayed on generated invoices using the configured GST rate.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ full_name: profile?.full_name || '', business_name: profile?.business_name || '', mobile: profile?.mobile || '', address: profile?.address || '', gst_number: profile?.gst_number || '', pan_number: profile?.pan_number || '', gst_enabled: profile?.gst_enabled || false }); }}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={mutation.isPending}>
                      <Save size={15} />{mutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <InfoRow icon={User}     label="Full Name"     value={profile?.full_name} />
                  <InfoRow icon={Building} label="Business Name" value={profile?.business_name} />
                  <InfoRow icon={Phone}    label="Mobile"        value={profile?.mobile} />
                  <InfoRow icon={MapPin}   label="Address"       value={profile?.address} />
                  {profile?.gst_number && <InfoRow icon={CreditCard} label="GST Number" value={profile?.gst_number} />}
                  {profile?.pan_number && <InfoRow icon={CreditCard} label="PAN Number" value={profile?.pan_number} />}
                  <div style={{ padding: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-400)' }}>Email</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-800)', marginTop: 2 }}>{user?.email}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* UPI Payment Settings */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={16} color="#10b981" />
                <div className="card-title">My UPI Payment Details</div>
              </div>
              {!editingUpi && (
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setUpiForm({ upi_id: profile?.upi_id || '', upi_name: profile?.upi_name || '', upi_mobile: profile?.upi_mobile || '' });
                  setEditingUpi(true);
                }}>
                  {savedUpiId ? 'Edit' : 'Add UPI'}
                </button>
              )}
            </div>
            <div className="card-body">
              {editingUpi ? (
                <>
                  <div style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16, background: '#f0fdf4', padding: '10px 12px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    💡 This UPI info is used to generate payment QR codes for your customers in Pending Payments.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your UPI ID <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="form-input" value={upiForm.upi_id}
                      onChange={e => setUpiForm({ ...upiForm, upi_id: e.target.value })}
                      placeholder="e.g. yourname@upi or 9876543210@paytm" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input type="text" className="form-input" value={upiForm.upi_name}
                      onChange={e => setUpiForm({ ...upiForm, upi_name: e.target.value })}
                      placeholder="Name on your UPI account" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Your WhatsApp Number</label>
                    <input type="tel" className="form-input" value={upiForm.upi_mobile}
                      onChange={e => setUpiForm({ ...upiForm, upi_mobile: e.target.value })}
                      placeholder="10 digit mobile for payment confirmations" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="btn btn-secondary" onClick={() => setEditingUpi(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveUpi} disabled={mutation.isPending}>
                      <Save size={15} />{mutation.isPending ? 'Saving...' : 'Save UPI Details'}
                    </button>
                  </div>
                </>
              ) : savedUpiId ? (
                <div className="upi-info-row" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <InfoRow icon={Wallet} label="UPI ID"    value={savedUpiId} />
                    <InfoRow icon={User}   label="UPI Name"  value={savedUpiName} />
                    <InfoRow icon={Phone}  label="WhatsApp"  value={savedUpiMobile} />
                  </div>
                  {userQrPreview && (
                    <div className="upi-qr-container" style={{ textAlign: 'center', flexShrink: 0 }}>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(userUpiLink)}&bgcolor=ffffff&color=000000&margin=6`}
                        alt="Your UPI QR" className="upi-qr-image" style={{ borderRadius: 8, border: '2px solid var(--ink-100)' }} />
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>Your QR</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-400)' }}>
                  <Wallet size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600 }}>No UPI details saved yet</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Add your UPI ID to send payment QR codes to customers</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="profile-right-column" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-body">
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `${planColor[profile?.plan] || '#f59e0b'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <User size={26} color={planColor[profile?.plan] || '#f59e0b'} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, textTransform: 'capitalize', color: 'var(--ink-900)' }}>{profile?.plan || 'Trial'} Plan</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`plan-badge ${profile?.plan || 'trial'}`} style={{ fontSize: 12 }}>{profile?.account_status || 'trial'}</span>
                </div>
              </div>
              <div className="divider" />
              {[
                ['Member Since',  profile?.created_at        ? format(new Date(profile.created_at),        'dd MMM yyyy') : '—'],
                ['Trial Started', profile?.trial_start_date  ? format(new Date(profile.trial_start_date),  'dd MMM yyyy') : '—'],
                ['Expiry Date',   profile?.expiry_date        ? format(new Date(profile.expiry_date),       'dd MMM yyyy') : 'Not set'],
                ['Bill Counter',  profile?.bill_counter || 0],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-500)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink-800)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 4 }}>Need to upgrade your plan?</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-400)', marginBottom: 14 }}>Pay via UPI and contact admin to activate your plan.</div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowPayModal(true)}>
                <CreditCard size={15} />Pay &amp; Contact Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowPayModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', animation: 'slideUp 0.22s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)', padding: '20px 24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Upgrade Your Plan</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Scan QR to pay · Then WhatsApp admin</div>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '14px 24px 0' }}>
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Subscription Amount</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>Rs. {subAmount}</span>
              </div>
            </div>
            <div style={{ padding: '16px 24px 8px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', border: '2px dashed #c7d2fe', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <QrCode size={14} color="#6366f1" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', letterSpacing: 0.4 }}>SCAN WITH ANY UPI APP</span>
                </div>
                {qrUrl ? (
                  <img src={qrUrl} alt="UPI QR Code" width={200} height={200} style={{ borderRadius: 10, display: 'block' }} />
                ) : (
                  <div style={{ width: 200, height: 200, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                    <QrCode size={36} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>UPI ID not set by admin yet</span>
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{upiId || '—'}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{adminName}</div>
              </div>
            </div>
            <div style={{ padding: '4px 24px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Works with PhonePe · GPay · Paytm · BHIM · Any UPI App</span>
            </div>
            <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>THEN</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>
            <div style={{ padding: '12px 24px 0' }}>
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#92400e', fontWeight: 600, textAlign: 'center' }}>
                After payment, send screenshot to admin on WhatsApp for activation
              </div>
            </div>
            <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                style={{ width: '100%', background: '#25d366', border: 'none', fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, cursor: 'pointer' }}
                onClick={() => window.open(`https://wa.me/${waNumber}?text=${waMessage}`, '_blank')}
              >
                <MessageCircle size={18} />WhatsApp Admin After Payment
              </button>
              <button onClick={() => setShowPayModal(false)} style={{ width: '100%', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(30px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-right-column { order: 2; }
          .upi-info-row { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .upi-qr-container { align-self: center; }
          .upi-qr-image { width: 80px !important; height: 80px !important; }
        }
      `}</style>
    </div>
  );
}