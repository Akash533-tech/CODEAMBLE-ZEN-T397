import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Upload, FileText, ExternalLink, Loader2 } from 'lucide-react';
import api from '../../utils/api';

export default function PanchayatSubmitRequest() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [form, setForm] = useState({
    owner_name: '',
    owner_phone: '',
    area_hectares: '',
    location_description: '',
    village: user.village || '',
    taluka: user.taluka || '',
    district: user.district || '',
  });

  // File state
  const [satbaraFile, setSatbaraFile] = useState(null);
  const [otherDocFile, setOtherDocFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // progress message
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setUploadStep('');

    const area = parseFloat(form.area_hectares);
    if (isNaN(area) || area < 0.1 || area > 500) {
      setError('Please enter a valid area between 0.1 and 500 hectares.');
      setSubmitting(false);
      return;
    }

    if (!satbaraFile) {
      setError('Please upload the 7/12 Satbara document (PDF required).');
      setSubmitting(false);
      return;
    }

    try {
      // Step 1: Submit the land request (text fields)
      setUploadStep('Submitting land request...');
      const res = await api.post('/gov/panchayat/submit-request', {
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone?.trim() || null,
        area_hectares: area,
        location_description: form.location_description?.trim() || '',
        village: form.village?.trim() || null,
        taluka: form.taluka?.trim() || null,
        district: form.district?.trim() || null,
      });

      const requestId = res.data.request.id;

      // Step 2: Upload documents to Pinata IPFS
      setUploadStep('Uploading documents to Pinata IPFS...');
      const formData = new FormData();
      formData.append('satbara', satbaraFile);
      if (otherDocFile) {
        formData.append('other_doc', otherDocFile);
      }

      const uploadRes = await api.post(
        `/gov/land-requests/${requestId}/upload-document`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setUploadStep('');
      setSuccess({
        ...res.data.request,
        satbara_cid: uploadRes.data.satbara_cid,
        other_docs_cid: uploadRes.data.other_docs_cid,
        satbara_url: uploadRes.data.satbara_url,
        other_doc_url: uploadRes.data.other_doc_url,
      });
    } catch (err) {
      setUploadStep('');
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <div className="gov-card text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto rounded-xl">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h2 className="font-heading text-lg font-bold text-text-primary">Request Submitted!</h2>
          <p className="text-2xl font-mono text-amber-400 font-bold">
            REQ-{String(success.id).padStart(4, '0')}
          </p>

          {/* IPFS confirmation */}
          {success.satbara_cid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left space-y-2">
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Documents pinned to Pinata IPFS
              </p>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Satbara CID</p>
                  <p className="text-[10px] font-mono text-emerald-800 break-all">{success.satbara_cid}</p>
                  {success.satbara_url && (
                    <a
                      href={success.satbara_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-0.5"
                    >
                      View on IPFS <ExternalLink size={8} />
                    </a>
                  )}
                </div>
                {success.other_docs_cid && (
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Supporting Doc CID</p>
                    <p className="text-[10px] font-mono text-emerald-800 break-all">{success.other_docs_cid}</p>
                    {success.other_doc_url && (
                      <a
                        href={success.other_doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-0.5"
                      >
                        View on IPFS <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-text-secondary">
            Government will review your request and documents within{' '}
            <strong className="text-text-primary">3–5 working days</strong>.
          </p>
          <p className="text-xs text-text-muted">
            Track status at: My Land Requests
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/panchayat/requests')}
              className="px-4 py-2 text-sm text-gov-navy bg-amber-400 hover:bg-amber-300 transition-colors font-medium"
            >
              Track My Requests
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setSatbaraFile(null);
                setOtherDocFile(null);
                setForm({
                  owner_name: '', owner_phone: '', area_hectares: '',
                  location_description: '', village: user.village || '',
                  taluka: user.taluka || '', district: user.district || '',
                });
              }}
              className="px-4 py-2 text-sm text-text-secondary border border-gov-border hover:text-text-primary transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary">Submit Land Request</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Fill in all details and upload your land documents — they will be stored permanently on IPFS via Pinata
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-sm text-red-400">
          <AlertTriangle size={14} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="gov-card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="gov-label">Owner Full Name *</label>
            <input
              className="gov-input" required value={form.owner_name}
              onChange={e => set('owner_name', e.target.value)}
              placeholder="As per Aadhaar"
            />
          </div>
          <div>
            <label className="gov-label">Owner Phone</label>
            <input
              className="gov-input" value={form.owner_phone} maxLength={10}
              onChange={e => set('owner_phone', e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>
        </div>

        <div>
          <label className="gov-label">Area (Hectares) *</label>
          <input
            className="gov-input" type="number" required min="0.1" max="500" step="0.1"
            value={form.area_hectares}
            onChange={e => set('area_hectares', e.target.value)}
            placeholder="e.g. 5.5"
          />
          <p className="text-[11px] text-text-muted mt-1">Min: 0.1 ha · Max: 500 ha</p>
        </div>

        <div>
          <label className="gov-label">Location Description *</label>
          <textarea
            className="gov-input min-h-[80px] resize-y" required
            value={form.location_description}
            onChange={e => set('location_description', e.target.value)}
            placeholder="Describe the location — e.g. coastal belt near Ratnagiri creek, GPS if available"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="gov-label">Village</label>
            <input className="gov-input bg-gov-slate/50" value={form.village}
              onChange={e => set('village', e.target.value)} placeholder="Village name" />
          </div>
          <div>
            <label className="gov-label">Taluka</label>
            <input className="gov-input bg-gov-slate/50" value={form.taluka}
              onChange={e => set('taluka', e.target.value)} placeholder="Taluka" />
          </div>
          <div>
            <label className="gov-label">District</label>
            <input className="gov-input bg-gov-slate/50" value={form.district}
              onChange={e => set('district', e.target.value)} placeholder="District" />
          </div>
        </div>

        {/* Document uploads — wired to actual Pinata upload */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Upload size={13} className="text-amber-400" />
            Land Documents (uploaded to Pinata IPFS)
          </p>

          {/* Satbara — required */}
          <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            satbaraFile ? 'border-emerald-400 bg-emerald-500/5' : 'border-gov-border hover:border-amber-400/50'
          }`}>
            <label className="block cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className={satbaraFile ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-xs font-medium text-text-primary">
                  7/12 Satbara Extract <span className="text-red-400">*</span>
                </span>
                {satbaraFile && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                    ✓ {satbaraFile.name}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted mb-2">
                PDF, JPG, PNG · Max 10MB · Will be pinned to IPFS permanently
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                onChange={e => setSatbaraFile(e.target.files[0] || null)}
                className="hidden"
              />
              <div className={`text-center py-2 text-xs font-medium rounded transition-colors ${
                satbaraFile
                  ? 'text-emerald-400'
                  : 'text-text-muted hover:text-amber-400'
              }`}>
                {satbaraFile ? `✓ ${satbaraFile.name}` : 'Click to select file'}
              </div>
            </label>
          </div>

          {/* Other doc — optional */}
          <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            otherDocFile ? 'border-blue-400 bg-blue-500/5' : 'border-gov-border hover:border-blue-400/30'
          }`}>
            <label className="block cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={14} className={otherDocFile ? 'text-blue-400' : 'text-text-muted'} />
                <span className="text-xs font-medium text-text-primary">
                  Additional Ownership Document
                </span>
                <span className="text-[10px] text-text-muted">(optional)</span>
                {otherDocFile && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                    ✓ {otherDocFile.name}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-text-muted mb-2">
                PDF, JPG, PNG · Max 10MB
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setOtherDocFile(e.target.files[0] || null)}
                className="hidden"
              />
              <div className={`text-center py-2 text-xs font-medium rounded transition-colors ${
                otherDocFile
                  ? 'text-blue-400'
                  : 'text-text-muted hover:text-blue-400'
              }`}>
                {otherDocFile ? `✓ ${otherDocFile.name}` : 'Click to select file (optional)'}
              </div>
            </label>
          </div>
        </div>

        {/* Upload progress */}
        {uploadStep && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded px-3 py-2">
            <Loader2 size={13} className="animate-spin" />
            {uploadStep}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm font-medium text-gov-navy bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {uploadStep ? 'Uploading...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Upload size={14} />
                Submit & Upload to IPFS
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-text-secondary border border-gov-border hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
