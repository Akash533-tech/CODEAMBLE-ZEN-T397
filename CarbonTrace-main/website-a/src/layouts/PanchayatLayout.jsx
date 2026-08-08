import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, MapPin, Plus, Wallet, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/panchayat/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { to: '/panchayat/requests',   label: 'My Land Requests', icon: MapPin          },
  { to: '/panchayat/submit',     label: 'Submit Request',   icon: Plus            },
  { to: '/panchayat/payouts',    label: 'My Payouts',       icon: Wallet          },
];

export default function PanchayatLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-ct-light-bg">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-ct-sidebar flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">CT</span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-none">CarbonTrace</h1>
              <p className="text-[10px] text-ct-sidebar-muted uppercase tracking-widest mt-0.5">Panchayat Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="gl-section-title px-2 !text-ct-sidebar-muted !mb-2">Main Menu</p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-amber-400 text-slate-900 font-semibold shadow-light-card'
                    : 'text-ct-sidebar-text hover:bg-ct-sidebar-hover'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between p-2.5 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-ct-sidebar-hover border border-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-ct-sidebar-text">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ct-sidebar-text truncate">{user?.name || 'Panchayat User'}</p>
                <p className="text-[10px] uppercase text-amber-400 font-medium">PANCHAYAT</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-ct-sidebar-muted hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-ct-light-card border-b border-ct-light-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-ct-light-text uppercase tracking-wide">
              CarbonTrace — Panchayat Portal
            </h2>
            <span className="text-ct-light-border">|</span>
            <span className="text-xs text-ct-light-muted">{user?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ct-light-muted bg-ct-light-hover px-2.5 py-1 rounded-full border border-ct-light-border font-medium">
              {user?.district || user?.village || 'Local Panchayat'}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-ct-light-muted hover:text-red-600 transition-colors border border-ct-light-border px-3 py-1.5 rounded-lg bg-ct-light-card hover:bg-ct-light-hover"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-ct-light-bg animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
