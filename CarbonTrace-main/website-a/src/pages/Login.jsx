import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import api from '../utils/api';

function redirectAfterLogin(role) {
  if (role === 'GOVERNMENT') return '/gov/dashboard';
  if (role === 'PANCHAYAT')  return '/panchayat/dashboard';
  if (role === 'NGO')        return '/ngo/dashboard';
  return '/gov/dashboard';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post(
        '/gov/auth/login',
        { email, password },
        { timeout: 12000 }
      );

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      navigate(redirectAfterLogin(data.user.role));
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Authentication request timed out. Please check backend/DB and try again.');
      } else if (!err.response) {
        setError('Unable to reach server. Please ensure backend is running on port 5001.');
      } else {
        setError(err.response?.data?.message || err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ct-light-bg flex flex-col">
      {/* Government top strip */}
      <div className="bg-ct-sidebar py-2.5 px-6 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ct-saffron" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <div className="w-3 h-3 rounded-full bg-ct-primary" />
        </div>
        <span className="text-ct-sidebar-text text-xs uppercase tracking-widest font-medium">
          Government of India — Ministry of Environment, Forest &amp; Climate Change
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-ct-primary mx-auto mb-4 flex items-center justify-center shadow-light-card">
              <span className="text-white font-bold text-2xl">CT</span>
            </div>
            <h1 className="text-2xl font-bold text-ct-light-text mb-1">CarbonTrace</h1>
            <p className="text-ct-light-muted text-sm font-medium">National Blue Carbon MRV Registry Portal</p>
            <p className="text-ct-light-subtle text-xs mt-1">
              MISHTI Mission — Mangrove Initiative for Shoreline Habitats
            </p>
          </div>

          {/* Login card */}
          <div className="gl-card p-6">
            <h2 className="text-ct-light-text font-semibold text-base mb-5">
              Sign in to Portal
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ct-light-muted uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="gl-input w-full"
                  placeholder="you@gov.in"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ct-light-muted uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="gl-input w-full"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-red-700 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={12} />
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="w-full gl-btn-primary py-2.5 disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 gl-card p-4">
            <p className="gl-section-title">Demo Credentials</p>
            <div className="space-y-2">
              {[
                { role: 'Government', email: 'rajesh@gov.in', pass: 'admin123', color: 'text-ct-primary' },
                { role: 'Panchayat', email: 'ratnagiri@panch.in', pass: 'panch123', color: 'text-amber-600' },
                { role: 'NGO', email: 'coastal@ngo.in', pass: 'ngo123', color: 'text-emerald-600' },
              ].map((cred) => (
                <button
                  key={cred.role}
                  onClick={() => {
                    setEmail(cred.email);
                    setPassword(cred.pass);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-ct-light-hover border border-ct-light-border hover:bg-ct-light-card transition-all text-left group"
                >
                  <span className={`text-xs font-semibold ${cred.color}`}>
                    {cred.role}
                  </span>
                  <span className="text-ct-light-muted text-xs font-mono group-hover:text-ct-light-text">
                    {cred.email}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-ct-light-subtle text-[10px] mt-2 text-center">Click any row to auto-fill</p>
          </div>

          {/* Footer */}
          <p className="text-center text-ct-light-subtle text-xs mt-6">
            Secured by Ethereum Sepolia · IPFS · ISRO Bhuvan
          </p>
        </div>
      </div>
    </div>
  );
}
