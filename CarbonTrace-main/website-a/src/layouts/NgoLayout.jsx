import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Trees, Upload, Wallet, LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/ngo/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/ngo/lands',     label: 'My Lands',     icon: Trees           },
  { to: '/ngo/mrv',       label: 'MRV Upload',   icon: Upload          },
  { to: '/ngo/payments',  label: 'My Payments',  icon: Wallet          },
];

export default function NgoLayout() {
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
            <div className="w-9 h-9 rounded-lg bg-ct-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">CT</span>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-none">CarbonTrace</h1>
              <p className="text-[10px] text-ct-sidebar-muted uppercase tracking-widest mt-0.5">NGO Portal</p>
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
                    ? 'bg-ct-primary text-white font-semibold shadow-light-card'
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
                <p className="text-xs font-semibold text-ct-sidebar-text truncate">{user?.name || 'NGO Partner'}</p>
                <p className="text-[10px] uppercase text-emerald-400 font-medium">NGO</p>
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
              CarbonTrace — NGO Portal
            </h2>
            <span className="text-ct-light-border">|</span>
            <span className="text-xs text-ct-light-muted">{user?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
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
