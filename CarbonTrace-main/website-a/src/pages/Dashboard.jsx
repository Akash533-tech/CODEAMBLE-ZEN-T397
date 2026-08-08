import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import {
  MapPin, Coins, Wallet, Clock, Activity,
} from 'lucide-react';
import api from '../utils/api';
import 'leaflet/dist/leaflet.css';

/* ────────────────────────────────────────────────────── helpers */
const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return n.toLocaleString('en-IN');
  return n;
};

const STATUS_COLORS = {
  ACTIVE: '#10b981', VERIFIED: '#06b6d4', PENDING_VERIFICATION: '#f59e0b', SUSPENDED: '#ef4444',
};

/* ────────────────────────────────────────────────────── map polygon style */
const polyStyle = (feature) => ({
  color: STATUS_COLORS[feature.properties?.status] || '#10b981',
  weight: 2,
  fillOpacity: 0.25,
  dashArray: feature.properties?.status === 'PENDING_VERIFICATION' ? '6 3' : undefined,
});

/* ────────────────────────────────────────────────────── main component */
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [credits, setCredits] = useState(null);
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, creditsRes, landsRes] = await Promise.all([
          api.get('/gov/dashboard/stats'),
          api.get('/gov/credits/count'),
          api.get('/gov/lands'),
        ]);
        setStats(statsRes.data);
        setCredits(creditsRes.data);
        setLands(landsRes.data);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* Build GeoJSON from lands */
  const geoData = {
    type: 'FeatureCollection',
    features: lands.map((l) => {
      let geom;
      try {
        geom = typeof l.polygon_geojson === 'string' ? JSON.parse(l.polygon_geojson) : l.polygon_geojson;
      } catch { geom = null; }
      return {
        type: 'Feature',
        geometry: geom,
        properties: {
          id: l.land_id_gov,
          status: l.status,
          owner: l.landRequest?.owner_name || 'Unknown',
          area: l.landRequest?.area_hectares || 0,
          location: l.landRequest?.location_description || '',
        },
      };
    }).filter((f) => f.geometry),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity size={28} className="text-ct-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-ct-light-muted">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
        <h1 className="text-xl font-bold text-ct-light-text">
          National Blue Carbon Registry Dashboard
        </h1>
        <p className="text-ct-light-muted text-sm mt-0.5">
          Real-time monitoring of carbon credit generation across India's coastal restoration projects
        </p>
        </div>
      </div>

      <div className="flex items-center justify-end text-xs text-ct-light-muted">
        <Clock size={12} className="mr-1" />
        <span>Last synced: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* ── Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Card 1 — Green hero */}
        <div className="gl-stat-card-green">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider">
              Total Registered Lands
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
              <MapPin size={16} className="text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1 text-white">
            {stats?.totalLands || 0}
          </p>
          <p className="text-white/60 text-xs">parcels</p>
        </div>

        {/* Card 2 — Navy hero */}
        <div className="gl-stat-card-navy">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider">
              Credits Issued
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20">
              <Coins size={16} className="text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1 text-white">
            {credits?.total_issued || 0}
          </p>
          <p className="text-white/60 text-xs">CC</p>
        </div>

        {/* Card 3 — White */}
        <div className="gl-stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ct-light-muted text-xs font-medium uppercase tracking-wider">
              Pending Requests
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ct-light-hover">
              <Clock size={16} className="text-ct-light-muted" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1 text-ct-light-text">
            {stats?.pendingRequests || 0}
          </p>
          <p className="text-ct-light-muted text-xs">pending</p>
        </div>

        {/* Card 4 — White */}
        <div className="gl-stat-card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ct-light-muted text-xs font-medium uppercase tracking-wider">
              Total Payouts
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ct-light-hover">
              <Wallet size={16} className="text-ct-light-muted" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1 text-ct-light-text">
            ₹{fmt(stats?.totalPayouts || 0)}
          </p>
          <p className="text-ct-light-muted text-xs">disbursed</p>
        </div>
      </div>

      {/* ── Map ────────────────────────────────────── */}
      <div className="gl-card mb-4 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-ct-light-border flex items-center justify-between">
          <span className="text-sm font-semibold text-ct-light-text">Project Location Map - Registered Land Parcels</span>
          <span className="text-xs text-ct-light-muted font-normal">Source: ISRO Bhuvan</span>
        </div>
        <div className="h-80">
          <MapContainer
            center={[16.5, 73.0]}
            zoom={6}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {geoData.features.length > 0 && (
              <GeoJSON
                data={geoData}
                style={polyStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div style="font-family:'Noto Sans',Arial,sans-serif;font-size:12px;color:#1a1a2e;line-height:1.6">
                      <strong>${feature.properties.id}</strong><br/>
                      Owner: ${feature.properties.owner}<br/>
                      Area: ${feature.properties.area} ha<br/>
                      Status: <span style="color:${STATUS_COLORS[feature.properties.status]}">${feature.properties.status}</span><br/>
                      <span style="font-size:10px;color:#6b7280">${feature.properties.location}</span>
                    </div>
                  `);
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── Recent Lands Table ──────────────────────── */}
      <div className="gl-card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-ct-light-border flex items-center justify-between">
          <span className="text-sm font-semibold text-ct-light-text">Recent Land Registrations</span>
          <NavLink to="/gov/land-requests" className="text-xs text-ct-primary hover:text-ct-primary-dark hover:underline font-medium">
            View All →
          </NavLink>
        </div>
        <table className="gl-table">
          <thead>
            <tr>
              <th>Land ID</th>
              <th>Owner Name</th>
              <th>District</th>
              <th>Area (Ha)</th>
              <th>Status</th>
              <th>Blockchain</th>
            </tr>
          </thead>
          <tbody>
            {lands.slice(0, 8).map((land) => (
              <tr key={land.id}>
                <td className="font-mono text-ct-primary font-semibold">{land.land_id_gov}</td>
                <td>{land.landRequest?.owner_name || '—'}</td>
                <td className="text-ct-light-muted">{land.landRequest?.district || land.landRequest?.location_description || '—'}</td>
                <td>{land.landRequest?.area_hectares || '—'}</td>
                <td>
                    <span className={
                      land.status === 'VERIFIED'
                        ? 'gl-badge-verified'
                        : land.status === 'ACTIVE'
                          ? 'gl-badge-approved'
                          : 'gl-badge-pending'
                    }>
                    {land.status}
                  </span>
                </td>
                <td>
                  {land.blockchain_hash && land.blockchain_hash.startsWith('0x') ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${land.blockchain_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ct-primary hover:text-ct-primary-dark underline text-xs"
                    >
                      {land.blockchain_hash.slice(0, 8)}...{land.blockchain_hash.slice(-6)}
                    </a>
                  ) : (
                    <span className="gl-badge-pending">Pending Chain</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
