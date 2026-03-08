import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { Eye, LogOut } from 'lucide-react';

export default function ImpersonationBanner() {
  const { impersonatedUser, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!impersonatedUser) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate('/admin/users');
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 999,
      boxShadow: '0 2px 12px rgba(217,119,6,0.4)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
          width: 30, height: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Eye size={15} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            Admin View Mode — Viewing as: {impersonatedUser.full_name || 'Unknown User'}
          </div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>
            {impersonatedUser.business_name || 'No Business Name'} · {impersonatedUser.mobile || 'No Mobile'}
          </div>
        </div>
      </div>
      <button
        onClick={handleExit}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1.5px solid rgba(255,255,255,0.5)',
          color: 'white',
          padding: '6px 16px',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 700,
          fontSize: 13,
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        }}
      >
        <LogOut size={14} />
        Exit View
      </button>
    </div>
  );
}