import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  FileCheck2,
  Satellite,
  Coins,
  Wallet,
  Shield,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import WalletConnect from '../components/WalletConnect';

const navItems = [
  { path: '/gov/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/gov/land-requests', label: 'Land Requests', icon: MapPin },
  { path: '/gov/documents', label: 'Documents', icon: FileCheck2 },
  { path: '/gov/ndvi', label: 'NDVI Monitoring', icon: Satellite },
  { path: '/gov/credits', label: 'Credit Issuance', icon: Coins },
  { path: '/gov/payouts', label: 'Payouts', icon: Wallet },
  { path: '/gov/audit', label: 'Blockchain Audit', icon: Shield },
];

export default function GovLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
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
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const currentPageTitle = navItems.find((item) => item.path === location.pathname)?.label || 'Portal';

  return (
    <div className="flex h-screen overflow-hidden bg-ct-light-bg">
      {/* ── SIDEBAR ─────────────────────────────── */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-ct-sidebar flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ct-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">CT</span>
            </div>
            {!collapsed && (
              <div>
                <p className="text-white font-bold text-sm leading-none">CarbonTrace</p>
                <p className="text-ct-sidebar-muted text-[10px] mt-0.5 uppercase tracking-widest">
                  Govt Admin Portal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Government strip */}
        {!collapsed && (
          <div className="px-4 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-ct-saffron flex-shrink-0" />
              <p className="text-[10px] text-ct-sidebar-muted uppercase tracking-wide leading-tight">
                Govt. of India — MISHTI Mission
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {!collapsed && <p className="gl-section-title px-2 !text-ct-sidebar-muted !mb-2">Main Menu</p>}
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-ct-primary text-ct-light-text font-semibold shadow-light-card'
                    : 'text-ct-sidebar-text hover:bg-ct-sidebar-hover'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={
                      isActive ? 'text-ct-light-text flex-shrink-0' : 'text-ct-sidebar-muted group-hover:text-ct-sidebar-text flex-shrink-0'
                    }
                  />
                  {!collapsed && <span className="font-medium">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-ct-sidebar-muted hover:text-ct-sidebar-text hover:bg-ct-sidebar-hover transition-colors text-xs"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* User card at bottom */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-3 p-2.5 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-ct-sidebar-hover flex items-center justify-center flex-shrink-0 border border-white/10">
              <span className="text-ct-sidebar-text font-bold text-xs">{initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-ct-sidebar-text text-xs font-semibold truncate">{user?.name}</p>
                  <p className="text-ct-sidebar-muted text-[10px] uppercase tracking-wide">{user?.role}</p>
                </div>
                <button onClick={handleLogout} className="text-ct-sidebar-muted hover:text-red-400 transition-colors">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-ct-light-card border-b border-ct-light-border flex items-center justify-between px-6 flex-shrink-0">
          {/* Left — Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ct-light-muted" />
            <input
              type="text"
              placeholder={`Search ${currentPageTitle}...`}
              className="gl-input pl-9 py-1.5 text-xs w-64 rounded-lg"
              readOnly
            />
          </div>

          {/* Right — Status + Wallet + Bell + User */}
          <div className="flex items-center gap-3">
            {/* Network badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ct-light-hover border border-ct-light-border">
              <div className="gl-live-dot" />
              <span className="text-[10px] text-ct-light-muted font-medium">Sepolia</span>
            </div>

            <div className="w-px h-4 bg-ct-light-border" />

            <WalletConnect />

            {/* Notification bell */}
            <button className="relative w-8 h-8 rounded-lg bg-ct-light-hover border border-ct-light-border flex items-center justify-center text-ct-light-muted hover:text-ct-light-text transition-colors">
              <Bell size={14} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>

            {/* User avatar + name */}
            <div className="flex items-center gap-2 pl-2 border-l border-ct-light-border">
              <div className="text-right">
                <p className="text-xs font-semibold text-ct-light-text leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-ct-light-muted">{user?.role || 'GOVERNMENT'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-ct-primary flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{initials}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
