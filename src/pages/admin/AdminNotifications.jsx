import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Send, Trash2, Bell, Zap, BookmarkPlus, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import { getServerNow } from '../../hooks/useServerTime';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';

// ─── Default templates ────────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  { id: 't1', title: 'Payment Reminder', message: 'Dear user, please clear your pending payment to continue using our services. Thank you.' },
  { id: 't2', title: 'Subscription Expiry', message: 'Your subscription is expiring soon. Please renew it to avoid service interruption.' },
  { id: 't3', title: 'Welcome Message', message: 'Welcome to One Net Solution! We are glad to have you. Feel free to reach out if you need any help.' },
  { id: 't4', title: 'Maintenance Notice', message: 'We will be performing scheduled maintenance. Services may be unavailable for a short time. We apologize for the inconvenience.' },
];

export default function AdminNotifications() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [title, setTitle]               = useState('');
  const [message, setMessage]           = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activeTab, setActiveTab]       = useState('compose'); // 'compose' | 'templates'
  const [templates, setTemplates]       = useState(DEFAULT_TEMPLATES);
  const [newTplTitle, setNewTplTitle]   = useState('');
  const [newTplMsg, setNewTplMsg]       = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, mobile')
        .order('full_name');
      return (data || []).filter(u => u.id !== user?.id);
    },
    enabled: !!isAdmin,
  });

  const { data: sentNotifications = [], isLoading } = useQuery({
    queryKey: ['admin-sent-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_notifications')
        .select('*, profiles(full_name, business_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!isAdmin,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: async ({ targetUsers }) => {
      if (!title.trim())          throw new Error('Title is required');
      if (!message.trim())        throw new Error('Message is required');
      if (targetUsers.length === 0) throw new Error('Select at least one user');

      const rows = targetUsers.map(userId => ({
        user_id:    userId,
        title:      title.trim(),
        message:    message.trim(),
        is_read:    false,
        created_by: 'admin',
      }));

      const { error } = await supabase.from('user_notifications').insert(rows);
      if (error) throw error;
      return targetUsers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sent-notifications'] });
      setTitle('');
      setMessage('');
      setSelectedUsers([]);
      toast.success(`✅ Notification sent to ${count} user${count !== 1 ? 's' : ''}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('user_notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sent-notifications'] });
      toast.success('Notification deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleUser  = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll   = () => setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(u => u.id));
  const broadcastAll = () => {
    if (!title.trim() || !message.trim()) { toast.error('Fill title and message first'); return; }
    sendMutation.mutate({ targetUsers: users.map(u => u.id) });
  };
  const sendSelected = () => sendMutation.mutate({ targetUsers: selectedUsers });

  const applyTemplate = (tpl) => { setTitle(tpl.title); setMessage(tpl.message); setActiveTab('compose'); toast.success('Template applied!'); };
  const saveTemplate  = () => {
    if (!newTplTitle.trim() || !newTplMsg.trim()) { toast.error('Fill template title and message'); return; }
    setTemplates(prev => [...prev, { id: getServerNow().toString(), title: newTplTitle.trim(), message: newTplMsg.trim() }]);
    setNewTplTitle('');
    setNewTplMsg('');
    toast.success('Template saved!');
  };
  const deleteTemplate = (id) => setTemplates(prev => prev.filter(t => t.id !== id));

  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />;

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Send targeted or broadcast notifications to users</p>
        </div>
        {/* Broadcast button — always visible */}
        <button
          className="btn btn-primary"
          style={{ gap: 8, background: 'var(--danger, #e53e3e)' }}
          onClick={broadcastAll}
          disabled={sendMutation.isPending}
        >
          <Zap size={15} />
          {sendMutation.isPending ? 'Sending...' : `Broadcast to All (${users.length})`}
        </button>
      </div>

      {/* ── Tab switcher ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['compose', 'templates'].map(tab => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab === 'compose' ? <Send size={14} /> : <Bookmark size={14} />}
            {tab === 'compose' ? 'Compose' : 'Templates'}
          </button>
        ))}
      </div>

      {/* ── COMPOSE TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Compose card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Compose Notification</div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text" className="form-input"
                  placeholder="e.g. Payment Reminder"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 110, resize: 'vertical' }}
                  placeholder="Write your message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              {/* Send buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={sendSelected}
                  disabled={sendMutation.isPending || selectedUsers.length === 0}
                >
                  <Send size={15} />
                  {sendMutation.isPending ? 'Sending...' : `Send to ${selectedUsers.length} Selected User${selectedUsers.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', color: 'var(--danger, #e53e3e)', borderColor: 'var(--danger, #e53e3e)' }}
                  onClick={broadcastAll}
                  disabled={sendMutation.isPending}
                >
                  <Zap size={15} />
                  {sendMutation.isPending ? 'Sending...' : `Broadcast to ALL ${users.length} Users`}
                </button>
              </div>

              {/* Quick template picker */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 8 }}>Quick templates:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      className="btn btn-secondary btn-sm"
                      onClick={() => applyTemplate(tpl)}
                      title={tpl.message}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User selection card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Select Recipients</div>
              <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {users.length === 0 ? (
                <div className="empty-state"><p>No users found</p></div>
              ) : (
                users.map(u => (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--ink-100)',
                      background: selectedUsers.includes(u.id) ? 'var(--brand-light)' : '#fff',
                      transition: 'background 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.full_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{u.business_name || u.mobile || '—'}</div>
                    </div>
                    {selectedUsers.includes(u.id) && <span className="badge badge-info">Selected</span>}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Create new template */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Create New Template</div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Template Title</label>
                <input
                  type="text" className="form-input"
                  placeholder="e.g. Payment Reminder"
                  value={newTplTitle}
                  onChange={e => setNewTplTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Template Message</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 110, resize: 'vertical' }}
                  placeholder="Write the reusable message..."
                  value={newTplMsg}
                  onChange={e => setNewTplMsg(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveTemplate}>
                <BookmarkPlus size={15} />
                Save Template
              </button>
            </div>
          </div>

          {/* Saved templates list */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Saved Templates</div>
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{templates.length} templates</span>
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {templates.length === 0 ? (
                <div className="empty-state"><Bookmark size={32} /><p>No templates saved</p></div>
              ) : (
                templates.map(tpl => (
                  <div
                    key={tpl.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--ink-100)',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{tpl.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.5 }}>{tpl.message}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => applyTemplate(tpl)}
                        title="Use this template"
                      >
                        <Send size={12} /> Use
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => deleteTemplate(tpl.id)}
                        title="Delete template"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sent Notifications Table ───────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Sent Notifications</div>
          <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{sentNotifications.length} total</div>
        </div>
        {isLoading ? (
          <div style={{ padding: 20 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[2, 2, 1, 1, 1].map((f, j) => <div key={j} className="skeleton" style={{ flex: f, height: 18 }} />)}
              </div>
            ))}
          </div>
        ) : sentNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={36} />
            <p>No notifications sent yet</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Sent At</th>
                  <th>Status</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {sentNotifications.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>
                      {n.profiles?.full_name || n.profiles?.business_name || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{n.title}</td>
                    <td style={{ fontSize: 13, color: 'var(--ink-600)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.message}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                      {n.created_at ? format(new Date(n.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                    </td>
                    <td>
                      <span className={`badge ${n.is_read ? 'badge-success' : 'badge-warning'}`}>
                        {n.is_read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => deleteMutation.mutate(n.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}