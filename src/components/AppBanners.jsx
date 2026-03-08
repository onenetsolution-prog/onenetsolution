// components/AppBanners.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop <AppBanners /> at the TOP of any user-facing page.
// Handles 3 things in order:
//   1. Maintenance mode banner  — red, blocks new entries visually
//   2. Announcement banner      — colour matches priority (normal/warning/urgent)
//   3. Private messages         — per-user messages from admin, dismissible
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AlertTriangle, Info, Megaphone, X, MessageSquare, Wrench } from 'lucide-react';
import { useAppSettings, usePrivateMessages } from '../hooks/useAppSettings';

// ── Priority config — bg, border, text colour, and which icon to show ────────
const PRIORITY = {
  normal:  { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', Icon: Info },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', Icon: AlertTriangle },
  urgent:  { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', Icon: AlertTriangle },
};

export default function AppBanners() {
  const {
    maintenanceMode,
    maintenanceMessage,
    announcement,
    announcementPriority,
  } = useAppSettings();

  const { messages, markRead } = usePrivateMessages();
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);

  const pCfg = PRIORITY[announcementPriority] || PRIORITY.normal;
  const PriorityIcon = pCfg.Icon; // ← was defined but never rendered before (fixed)

  const hasContent =
    maintenanceMode ||
    (announcement && !dismissedAnnouncement) ||
    messages.length > 0;

  if (!hasContent) return null; // render nothing — no empty div in DOM

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── 1. Maintenance banner ──────────────────────────────────────── */}
      {maintenanceMode && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', marginBottom: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 12, borderLeft: '4px solid #ef4444',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#ef444415',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Wrench size={16} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#b91c1c', marginBottom: 3 }}>
              System Under Maintenance
            </p>
            <p style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
              {maintenanceMessage}
            </p>
          </div>
        </div>
      )}

      {/* ── 2. Announcement banner ─────────────────────────────────────── */}
      {announcement && !dismissedAnnouncement && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 16px', marginBottom: 10,
          background: pCfg.bg,
          border: `1px solid ${pCfg.border}`,
          borderRadius: 12, borderLeft: `4px solid ${pCfg.color}`,
          position: 'relative',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${pCfg.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {/* Priority icon now actually renders — was missing before */}
            <PriorityIcon size={14} color={pCfg.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: pCfg.color,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
            }}>
              Announcement
            </p>
            <p style={{ fontSize: 12, color: pCfg.color, lineHeight: 1.6 }}>
              {announcement}
            </p>
          </div>
          <button
            onClick={() => setDismissedAnnouncement(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: pCfg.color, opacity: 0.6, padding: 2, flexShrink: 0,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3. Private messages from admin ────────────────────────────── */}
      {messages.map(msg => (
        <div key={msg.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 16px', marginBottom: 8,
          background: '#f5f3ff', border: '1px solid #ddd6fe',
          borderRadius: 12, borderLeft: '4px solid #7c3aed',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: '#7c3aed15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <MessageSquare size={14} color="#7c3aed" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: '#7c3aed',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
            }}>
              Message from Admin
            </p>
            <p style={{ fontSize: 12, color: '#4c1d95', lineHeight: 1.6 }}>
              {msg.message}
            </p>
          </div>
          <button
            onClick={() => markRead(msg.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#7c3aed', opacity: 0.6, padding: 2, flexShrink: 0,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}

    </div>
  );
}