import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Settings2, List, Clock, CreditCard, Search, BarChart2, Wrench } from 'lucide-react';

const PAGE_META = {
  'all-entries':       { label: 'All Entries (All Users)',        icon: List,      color: 'bg-slate-100 text-slate-600' },
  'pending-work':      { label: 'Pending Work (All Users)',       icon: Clock,     color: 'bg-amber-50 text-amber-600' },
  'pending-payments':  { label: 'Pending Payments (All Users)',   icon: CreditCard,color: 'bg-rose-50 text-rose-600' },
  'customer-search':   { label: 'Customer Search (All Centers)',  icon: Search,    color: 'bg-indigo-50 text-indigo-600' },
  'reports':           { label: 'Platform Reports',               icon: BarChart2, color: 'bg-green-50 text-green-600' },
  'settings':          { label: 'App Settings',                   icon: Settings2, color: 'bg-purple-50 text-purple-600' },
};

export default function AdminPlaceholders({ page }) {
  const { isAdmin, loading } = useAuth();

  if (loading)  return <LoadingSpinner fullPage />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const meta = PAGE_META[page] || { label: page, icon: Wrench, color: 'bg-slate-100 text-slate-600' };
  const Icon = meta.icon;

  return (
    <div className="p-6 fade-in">
      <div className="mb-5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.color}`}>
          <Icon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>{meta.label}</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className={`w-16 h-16 rounded-2xl ${meta.color} flex items-center justify-center mx-auto mb-4`}>
          <Icon size={28} />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
          {meta.label}
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          This admin page is in Phase 2 of development. It will include full admin controls for all users' data.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-500">
          Coming in Phase 2
        </div>
      </div>
    </div>
  );
}