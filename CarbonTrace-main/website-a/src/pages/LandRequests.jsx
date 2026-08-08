import { useState, useEffect } from 'react';
import {
  MapPin, Search, ChevronRight, ChevronDown,
  XCircle, Clock, ExternalLink, User, MapIcon,
  Calendar, Leaf, Shield, FileText, Eye, AlertTriangle,
  CheckCircle2, Loader2
} from 'lucide-react';
import api from '../utils/api';
import {
  signRegisterLand,
  connectWallet,
  isMetaMaskInstalled,
} from '../services/web3Service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getIPFSUrl = (cid) => {
  if (!cid || cid.includes('Fake') || cid.includes('Mock') ||
      cid === 'QmPending' || cid === 'PENDING_CHAIN' || !cid.startsWith('Q') && !cid.startsWith('bafy')) {
    return null;
  }
  const clean = cid
    .replace('https://gateway.pinata.cloud/ipfs/', '')
    .replace('https://ipfs.io/ipfs/', '')
    .trim();
  return `https://gateway.pinata.cloud/ipfs/${clean}`;
};

const isRealTxHash = (hash) =>
  hash &&
  hash !== 'PENDING_CHAIN' &&
  hash.startsWith('0x') &&
  hash.length === 66;

const STATUS_STYLE = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' },
  UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Under Review' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LandRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [blockchainError, setBlockchainError] = useState(null);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/gov/land-requests')
      .then(r => setRequests(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search &&
        !r.owner_name?.toLowerCase().includes(search.toLowerCase()) &&
        !r.panchayat?.name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const countByStatus = requests.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});

  const handleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Always re-fetch detail (never use stale cache)
    // so documents uploaded after first expand are shown
    setLoadingDetail(id);
    try {
      const res = await api.get(`/gov/land-requests/${id}`);
      setDetailData(prev => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error('Detail load failed:', err);
    } finally {
      setLoadingDetail(null);
    }
  };

  const refreshDetail = async (id) => {
    try {
      setLoadingDetail(id);
      const res = await api.get(`/gov/land-requests/${id}`);
      setDetailData(prev => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setLoadingDetail(null);
    }
  };

  const handleApprove = async (request) => {
    setBlockchainError(null);
    try {
      setProcessing(request.id);

      // Step 1: Upload land data to Pinata IPFS (backend does this)
      setBlockchainStatus('Uploading land data to Pinata IPFS...');
      const prepRes = await api.post(
        `/gov/land-requests/${request.id}/prepare-approval`,
        { state: 'MH' }
      );
      const { land_id_gov, ipfs_cid, polygon } = prepRes.data;

      if (!ipfs_cid || ipfs_cid === 'QmPending') {
        throw new Error('IPFS upload failed — Pinata returned no valid CID. Check Pinata API keys.');
      }

      let txHash = null;
      let signerAddress = null;

      // Step 2: Try MetaMask first (real on-chain transaction)
      if (isMetaMaskInstalled()) {
        setBlockchainStatus('MetaMask popup opening — please approve the transaction...');
        try {
          const result = await signRegisterLand(land_id_gov, ipfs_cid, polygon);
          txHash = result.txHash;
          signerAddress = result.signerAddress;
          console.log('[APPROVE] ✅ MetaMask tx confirmed:', txHash);
        } catch (metamaskErr) {
          // User rejected or chain error — try backend relayer
          if (metamaskErr.code === 4001 || metamaskErr.message?.includes('rejected')) {
            throw new Error('Transaction rejected in MetaMask. Please approve to register on blockchain.');
          }
          console.warn('[APPROVE] MetaMask failed, trying backend relayer:', metamaskErr.message);
          setBlockchainStatus('Registering via backend relayer on Sepolia...');
        }
      } else {
        setBlockchainStatus('MetaMask not detected — registering via backend relayer...');
      }

      // Step 3: If MetaMask didn't work, use backend relayer (gets real tx hash from funded wallet)
      if (!txHash) {
        // First, save land record with pending status so we can retry
        const tempRes = await api.patch(
          `/gov/land-requests/${request.id}/approve-with-hash`,
          {
            tx_hash: 'PENDING_CHAIN',
            land_id_gov,
            ipfs_cid,
            signer_address: 'Backend Relayer',
            polygon,
          }
        );

        setBlockchainStatus('Backend relayer registering on Sepolia (real transaction)...');
        const relayRes = await api.post(`/gov/lands/${land_id_gov}/blockchain-retry`).catch(() => ({ data: {} }));

        if (relayRes.data?.success && relayRes.data?.txHash && isRealTxHash(relayRes.data.txHash)) {
          txHash = relayRes.data.txHash;
          signerAddress = 'Government Backend Relayer (Sepolia)';
          // Update the land record with the real tx hash
          await api.patch(`/gov/lands/${land_id_gov}/update-tx-hash`, {
            tx_hash: txHash,
          }).catch(() => {}); // non-fatal if this endpoint doesn't exist yet
        } else {
          // Backend relayer also failed — save with PENDING_CHAIN
          console.warn('[APPROVE] Backend relayer also failed — land saved with PENDING_CHAIN');
          setBlockchainStatus(null);
          setProcessing(null);
          const res = await api.get(`/gov/land-requests/${request.id}`);
          setDetailData(prev => ({ ...prev, [request.id]: res.data }));
          fetchRequests();
          setBlockchainError('Land approved and IPFS pinned, but blockchain registration pending. The backend relayer needs a funded Sepolia wallet. Add DEPLOYER_PRIVATE_KEY with Sepolia ETH in backend/.env');
          return;
        }

        setBlockchainStatus(null);
        setProcessing(null);
        const res = await api.get(`/gov/land-requests/${request.id}`);
        setDetailData(prev => ({ ...prev, [request.id]: res.data }));
        fetchRequests();
        return;
      }

      // Step 4: Save final approval with real tx hash
      setBlockchainStatus('Saving approval to database...');
      await api.patch(
        `/gov/land-requests/${request.id}/approve-with-hash`,
        {
          tx_hash: txHash,
          land_id_gov,
          ipfs_cid,
          signer_address: signerAddress,
          polygon,
        }
      );

      setBlockchainStatus(null);
      setProcessing(null);
      const res = await api.get(`/gov/land-requests/${request.id}`);
      setDetailData(prev => ({ ...prev, [request.id]: res.data }));
      fetchRequests();
    } catch (err) {
      setBlockchainStatus(null);
      setProcessing(null);
      const msg = err.response?.data?.message || err.message || 'Approval failed';
      setBlockchainError(msg);
      alert('❌ ' + msg);
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm('Reject this land request?')) return;
    try {
      await api.patch(`/gov/land-requests/${requestId}/reject`);
      fetchRequests();
      setDetailData(prev => {
        const updated = { ...prev };
        if (updated[requestId]) {
          updated[requestId] = { ...updated[requestId], status: 'REJECTED' };
        }
        return updated;
      });
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-ct-light-text">
            Land Registration Requests
          </h1>
          <p className="text-sm text-ct-light-muted mt-0.5">
            Review farmer documents and approve land registration submitted by panchayats
          </p>
        </div>
        <span className="text-xs text-ct-light-muted">
          {requests.length} total requests
        </span>
      </div>

      <div className="gl-card flex items-center justify-between gap-4 p-3">
        <div className="flex gap-1">
          {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === s
                  ? 'bg-ct-primary/10 text-ct-primary'
                  : 'text-ct-light-muted hover:text-ct-light-text hover:bg-ct-light-hover'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_STYLE[s]?.label || s}
              {s !== 'ALL' && countByStatus[s] ? ` (${countByStatus[s]})` : ''}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ct-light-muted" />
          <input
            type="text"
            placeholder="Search owner or panchayat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="gl-input pl-8 py-1.5 text-xs w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="gl-card flex items-center justify-center h-48">
          <p className="text-sm text-ct-light-muted animate-pulse">Loading requests...</p>
        </div>
      ) : (
        <div className="gl-card p-0 overflow-hidden">
          <table className="gl-table">
            <thead>
              <tr>
                <th>Request #</th>
                <th>Owner Name</th>
                <th>Panchayat</th>
                <th>District</th>
                <th>Area (ha)</th>
                <th>Documents</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const st = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                const isExpanded = expandedId === r.id;
                const detail = detailData[r.id];

                return (
                  <>
                    <tr
                      key={r.id}
                      className="cursor-pointer hover:bg-ct-light-hover"
                      onClick={() => handleExpand(r.id)}
                    >
                      <td className="font-mono text-xs text-ct-primary">
                        REQ-{String(r.id).padStart(4, '0')}
                      </td>
                      <td className="font-medium text-ct-light-text">{r.owner_name}</td>
                      <td className="text-ct-light-muted">{r.panchayat?.name || '—'}</td>
                      <td className="text-ct-light-muted text-xs">{r.panchayat?.district || '—'}</td>
                      <td className="font-mono">{r.area_hectares}</td>
                      <td>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          detail?.documents?.[0]?.satbara_cid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {detail?.documents?.[0]?.satbara_cid ? '✓ On IPFS' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`gl-badge ${st.bg} ${st.text} border ${st.border}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="text-xs text-ct-light-muted">
                        {new Date(r.createdAt || r.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: '2-digit',
                        })}
                      </td>
                      <td>
                        {isExpanded
                          ? <ChevronDown size={14} className="text-ct-primary" />
                          : <ChevronRight size={14} className="text-ct-light-muted" />
                        }
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`detail-${r.id}`}>
                        <td colSpan={9} className="p-0 bg-ct-light-hover/50">
                          {loadingDetail === r.id ? (
                            <div className="p-6 text-center text-sm text-ct-light-muted animate-pulse">
                              Loading details...
                            </div>
                          ) : detail ? (
                            <DetailPanel
                              request={detail}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onRefresh={() => refreshDetail(r.id)}
                              processing={processing}
                              loadingDetail={loadingDetail === r.id}
                            />
                          ) : (
                            <div className="p-6 text-center text-sm text-ct-light-muted">
                              Failed to load details
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ct-light-muted">
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Blockchain status toast */}
      {blockchainStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-ct-light-card border border-ct-light-border rounded-2xl px-5 py-4 shadow-light-card-hover min-w-72 max-w-80">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={16} className="text-ct-primary animate-spin flex-shrink-0" />
            <span className="text-ct-primary text-sm font-semibold">Blockchain Transaction</span>
          </div>
          <p className="text-ct-light-muted text-xs ml-7">{blockchainStatus}</p>
        </div>
      )}

      {/* Error toast */}
      {blockchainError && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 shadow-lg min-w-72 max-w-96">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm font-semibold">Approval Notice</span>
            <button
              onClick={() => setBlockchainError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XCircle size={14} />
            </button>
          </div>
          <p className="text-red-600 text-xs ml-7">{blockchainError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ request, onApprove, onReject, onRefresh, processing, loadingDetail }) {
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const docs = request.documents?.[0] || null;
  const land = request.registeredLand || null;

  const satbaraUrl = getIPFSUrl(docs?.satbara_cid);
  const otherDocUrl = getIPFSUrl(docs?.other_docs_cid);
  const landIpfsUrl = getIPFSUrl(land?.plantation_doc_cid);
  const hasAnyDocument = Boolean(satbaraUrl || otherDocUrl);

  const etherscanUrl = isRealTxHash(land?.blockchain_hash)
    ? `https://sepolia.etherscan.io/tx/${land.blockchain_hash}`
    : null;

  return (
    <div className="p-5 grid grid-cols-3 gap-5 border-t border-ct-light-border">

      {/* Column 1 — Owner Info */}
      <div className="space-y-4">
        <div>
          <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider mb-2">
            Owner Information
          </p>
          <div className="space-y-2">
            {[
              { icon: User, label: 'Owner Name', value: request.owner_name },
              { icon: MapIcon, label: 'Location', value: request.location_description },
              { icon: Leaf, label: 'Area', value: `${request.area_hectares} hectares` },
              { icon: Calendar, label: 'Submitted', value: new Date(request.created_at).toLocaleDateString('en-IN') },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <item.icon size={12} className="text-ct-light-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-ct-light-muted uppercase tracking-wide">{item.label}</p>
                  <p className="text-xs text-ct-light-text font-medium">{item.value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider mb-2">Panchayat</p>
          <div className="space-y-1.5 text-xs">
            <p className="text-ct-light-text font-medium">{request.panchayat?.name}</p>
            <p className="text-ct-light-muted">{request.panchayat?.village}, {request.panchayat?.taluka}</p>
            <p className="text-ct-light-muted">{request.panchayat?.district}</p>
          </div>
        </div>
      </div>

      {/* Column 2 — Farmer Uploaded Documents (view-only for govt) */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider">
              Farmer Uploaded Documents
            </p>
            <button
              onClick={onRefresh}
              disabled={loadingDetail}
              className="flex items-center gap-1 text-[10px] text-ct-primary hover:text-ct-primary-dark disabled:opacity-50 transition-colors"
              title="Reload document status"
            >
              <Loader2 size={10} className={loadingDetail ? 'animate-spin' : ''} />
              {loadingDetail ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <p className="text-[10px] text-ct-light-muted mb-3">
            Documents uploaded by the farmer/panchayat — stored on IPFS via Pinata
          </p>

          {/* 7/12 Satbara */}
          <div className="bg-ct-light-hover border border-ct-light-border rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-amber-600" />
                <span className="text-xs font-medium text-ct-light-text">7/12 Satbara Extract</span>
              </div>
              {satbaraUrl ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={8} /> ON IPFS
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  NOT UPLOADED
                </span>
              )}
            </div>
            {satbaraUrl ? (
              <div className="space-y-1">
                <p className="text-[10px] text-ct-light-muted font-mono break-all">
                  {docs?.satbara_cid?.slice(0, 24)}...
                </p>
                <a
                  href={satbaraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-ct-primary hover:text-ct-primary-dark transition-colors font-medium"
                >
                  <Eye size={9} /> View on Pinata IPFS
                  <ExternalLink size={9} />
                </a>
              </div>
            ) : (
              <p className="text-[10px] text-ct-light-muted italic">
                Farmer has not uploaded this document yet
              </p>
            )}
          </div>

          {/* Supporting Document */}
          <div className="bg-ct-light-hover border border-ct-light-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-blue-600" />
                <span className="text-xs font-medium text-ct-light-text">Supporting Document</span>
              </div>
              {otherDocUrl ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={8} /> ON IPFS
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full">
                  OPTIONAL
                </span>
              )}
            </div>
            {otherDocUrl ? (
              <div className="space-y-1">
                <p className="text-[10px] text-ct-light-muted font-mono break-all">
                  {docs?.other_docs_cid?.slice(0, 24)}...
                </p>
                <a
                  href={otherDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-ct-primary hover:text-ct-primary-dark transition-colors font-medium"
                >
                  <Eye size={9} /> View on Pinata IPFS
                  <ExternalLink size={9} />
                </a>
              </div>
            ) : (
              <p className="text-[10px] text-ct-light-muted italic">
                No supporting document uploaded
              </p>
            )}
          </div>

          {!hasAnyDocument && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-600" />
                <p className="text-[10px] text-amber-700 font-medium">
                  No documents on IPFS yet
                </p>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                The farmer/panchayat must upload documents before you can approve. Ask them to upload via the Panchayat portal.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3 — Blockchain Record + Actions */}
      <div className="space-y-4">
        {land && (
          <div>
            <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider mb-2">
              Blockchain Record
            </p>
            <div className="bg-ct-light-hover border border-ct-light-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ct-light-muted uppercase">Land ID</span>
                <span className="text-xs text-ct-primary font-mono font-bold">{land.land_id_gov}</span>
              </div>
              <div>
                <span className="text-[10px] text-ct-light-muted uppercase block mb-1">Tx Hash</span>
                {etherscanUrl ? (
                  <a
                    href={etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-ct-primary hover:text-ct-primary-dark font-mono transition-colors"
                  >
                    {land.blockchain_hash.slice(0, 12)}...{land.blockchain_hash.slice(-6)}
                    <ExternalLink size={9} />
                  </a>
                ) : (
                  <span className="text-[10px] text-amber-600 flex items-center gap-1">
                    <Clock size={9} />
                    {land.blockchain_hash === 'PENDING_CHAIN'
                      ? 'Pending on-chain confirmation'
                      : 'Not yet on chain'}
                  </span>
                )}
              </div>
              {landIpfsUrl && (
                <div>
                  <span className="text-[10px] text-ct-light-muted uppercase block mb-1">IPFS Record</span>
                  <a
                    href={landIpfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-ct-primary hover:text-ct-primary-dark transition-colors"
                  >
                    View land data on Pinata
                    <ExternalLink size={9} />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider mb-2">
            Actions
          </p>
          {request.status === 'PENDING' ? (
            <div className="space-y-2">
              <div className="p-2 border border-ct-light-border bg-ct-light-hover rounded-lg">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    onChange={(e) => setReviewConfirmed(e.target.checked)}
                    className="mt-0.5 accent-ct-primary"
                  />
                  <span className="text-[11px] text-ct-light-muted">
                    I have reviewed owner details, panchayat data, and the farmer-uploaded IPFS documents before taking action.
                  </span>
                </label>
                {!hasAnyDocument && (
                  <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle size={9} />
                    No IPFS documents found yet. Review documents before approval.
                  </p>
                )}
              </div>

              {!isMetaMaskInstalled() && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] text-blue-700">
                    ℹ️ MetaMask not detected. Approval will use the backend relayer (requires funded DEPLOYER_PRIVATE_KEY in backend/.env).
                  </p>
                </div>
              )}

              <button
                onClick={() => onApprove(request)}
                disabled={processing === request.id || !reviewConfirmed}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold gl-btn-primary disabled:opacity-50"
              >
                <Shield size={12} />
                {processing === request.id ? 'Processing...' : '⛓ Approve + Register on Chain'}
              </button>
              <button
                onClick={() => onReject(request.id)}
                disabled={processing === request.id || !reviewConfirmed}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold gl-btn-danger disabled:opacity-50"
              >
                <XCircle size={12} />
                Reject Request
              </button>
            </div>
          ) : (
            <div className={`p-3 border rounded-lg text-xs text-center ${STATUS_STYLE[request.status]?.bg} ${STATUS_STYLE[request.status]?.text} ${STATUS_STYLE[request.status]?.border}`}>
              {request.status === 'APPROVED'
                ? '✓ Approved and registered on blockchain'
                : '✗ This request has been rejected'}
            </div>
          )}
        </div>

        {land?.allowed_species?.length > 0 && (
          <div>
            <p className="text-xs text-ct-primary-dark font-semibold uppercase tracking-wider mb-2">
              Allowed Species
            </p>
            <div className="flex flex-wrap gap-1">
              {land.allowed_species.map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
