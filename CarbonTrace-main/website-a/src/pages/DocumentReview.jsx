import { useState, useEffect } from 'react';
import {
  FileCheck2, FileText, ExternalLink,
  CheckCircle2, XCircle, Clock, RefreshCw
} from 'lucide-react';
import api from '../utils/api';

const getIPFSUrl = (cid) => {
  if (!cid || cid.includes('Fake') ||
      cid === 'QmPending') return null;
  const clean = cid
    .replace('https://gateway.pinata.cloud/ipfs/', '')
    .replace('https://ipfs.io/ipfs/', '')
    .trim();
  return `https://gateway.pinata.cloud/ipfs/${clean}`;
};

const STATUS_MAP = {
  VERIFIED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    label: 'Verified'
  },
  PENDING: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock,
    label: 'Pending'
  },
  REJECTED: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
    label: 'Rejected'
  },
};

export default function DocumentReview() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchDocs = () => {
    setLoading(true);
    api.get('/gov/documents')
      .then(r => setDocs(r.data))
      .catch(err => {
        console.error('Failed to load docs:', err);
        setDocs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  const filtered = filter === 'ALL'
    ? docs
    : docs.filter(d => d.doc_status === filter);

  const counts = docs.reduce((a, d) => {
    a[d.doc_status] = (a[d.doc_status] || 0) + 1;
    return a;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-ct-light-text">
            Document Verification
          </h1>
          <p className="text-sm text-ct-light-muted mt-0.5">
            Review uploaded land ownership documents stored on Pinata IPFS
          </p>
        </div>
        <button
          onClick={fetchDocs}
          className="flex items-center gap-1.5 text-xs text-ct-light-muted hover:text-ct-primary transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Verified', key: 'VERIFIED', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Review', key: 'PENDING', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Rejected', key: 'REJECTED', color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.key} className="gl-card flex items-center gap-3 p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
              <FileCheck2 size={16} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-ct-light-text">
                {counts[s.key] || 0}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ct-light-muted mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="gl-card flex gap-1 p-2">
        {['ALL','PENDING','VERIFIED','REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === s
                ? 'bg-ct-primary/10 text-ct-primary'
                : 'text-ct-light-muted hover:text-ct-light-text hover:bg-ct-light-hover'
            }`}
          >
            {s === 'ALL'
              ? `All (${docs.length})`
              : `${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Document Cards */}
      {loading ? (
        <div className="gl-card flex items-center justify-center h-48">
          <p className="text-sm text-ct-light-muted animate-pulse">
            Loading documents...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gl-card flex items-center justify-center h-48">
          <p className="text-sm text-ct-light-muted">
            No documents found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(doc => {
            const st = STATUS_MAP[doc.doc_status] || STATUS_MAP.PENDING;
            const StIcon = st.icon;
            const satbaraUrl = getIPFSUrl(doc.satbara_cid);
            const otherUrl = getIPFSUrl(doc.other_docs_cid);

            return (
              <div key={doc.id} className="gl-card p-4 hover:border-ct-primary/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-ct-primary" />
                    <div>
                      <p className="text-sm font-semibold text-ct-light-text">
                        {doc.req_number} - {doc.owner}
                      </p>
                      <p className="text-[10px] text-ct-light-muted mt-0.5">
                        {doc.panchayat} · {doc.district}
                      </p>
                    </div>
                  </div>
                  <span className={`gl-badge ${st.bg} ${st.text} border ${st.border}`}>
                    <StIcon size={10} className="mr-1" />
                    {st.label}
                  </span>
                </div>

                {/* Document links */}
                <div className="space-y-2 pt-2 border-t border-ct-light-border">
                  {/* Satbara */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ct-light-muted">
                      7/12 Satbara Extract
                    </span>
                    {satbaraUrl ? (
                      <a
                        href={satbaraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-ct-primary hover:text-ct-primary-dark transition-colors"
                      >
                        View IPFS
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-ct-light-subtle">
                        Not yet on IPFS
                      </span>
                    )}
                  </div>

                  {/* Other doc */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ct-light-muted">
                      Supporting Document
                    </span>
                    {otherUrl ? (
                      <a
                        href={otherUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-ct-primary hover:text-ct-primary-dark transition-colors"
                      >
                        View IPFS
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-ct-light-subtle">
                        Not yet on IPFS
                      </span>
                    )}
                  </div>

                  {/* CID display */}
                  {(doc.satbara_cid || doc.other_docs_cid) && (
                    <div className="mt-2 p-2 bg-ct-light-hover border border-ct-light-border rounded-lg">
                      <p className="text-[9px] text-ct-light-muted uppercase tracking-wide mb-1">
                        IPFS CID
                      </p>
                      <p className="text-[10px] text-ct-light-muted font-mono break-all">
                        {(doc.satbara_cid || doc.other_docs_cid)?.slice(0, 30)}...
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-ct-light-muted">
                    Uploaded:{' '}
                    {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
