import { Outlet } from 'react-router-dom';

// Simple pass-through; actual layout is in AdminLayout / UserLayout
export default function Layout() {
  return <Outlet />;
}