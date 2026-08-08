import api from './api';

export async function getDashboard() {
  const res = await api.get('/company/dashboard');
  return res.data;
}

export async function getPurchaseChart() {
  const res = await api.get('/company/dashboard/chart/purchases');
  return res.data;
}

export async function getBreakdownChart() {
  const res = await api.get('/company/dashboard/chart/breakdown');
  return res.data;
}

export async function getRequests() {
  const res = await api.get('/company/requests');
  return res.data;
}

export async function getRequestDetail(requestId: string) {
  const res = await api.get(`/company/requests/${requestId}`);
  return res.data;
}

export async function getCertificates() {
  const res = await api.get('/company/certificates');
  return res.data;
}

export async function getCertificateDetail(certId: string) {
  const res = await api.get(`/company/certificates/${certId}`);
  return res.data;
}

export async function downloadCertificate(certId: string): Promise<string> {
  const res = await api.get(`/company/certificates/${certId}/download`);
  return res.data.url;
}

export async function verifyCertificate(certId: string) {
  const res = await api.get(`/company/certificates/${certId}/verify`);
  return res.data;
}

export async function getTransactions(filters?: {
  date_from?: string;
  date_to?: string;
  status?: string;
}) {
  const res = await api.get('/company/transactions', { params: filters });
  return res.data;
}

export async function exportTransactions(): Promise<Blob> {
  const res = await api.get('/company/transactions/export', {
    responseType: 'blob',
  });
  return res.data;
}

// ==================== NFT Minting ====================

export interface NFTMintResult {
  success: boolean;
  certificate_id: string;
  nft_token_id: string;
  nft_tx_hash: string;
  nft_contract_address: string;
  nft_wallet_address: string;
  nft_ipfs_uri: string;
  etherscan_url: string;
  opensea_url: string;
}

export interface NFTStatus {
  certificate_id: string;
  nft_status: 'not_minted' | 'minting' | 'minted' | 'failed';
  nft_token_id: string | null;
  nft_tx_hash: string | null;
  nft_contract_address: string | null;
  nft_wallet_address: string | null;
  nft_ipfs_uri: string | null;
  etherscan_url: string | null;
  opensea_url: string | null;
}

/** Initiate NFT minting for a certificate. Sends wallet address to backend. */
export async function mintCertificateNFT(certId: string, walletAddress: string): Promise<NFTMintResult> {
  const res = await api.post(`/company/certificates/${certId}/mint-nft`, {
    wallet_address: walletAddress,
  });
  return res.data;
}

/** Poll the NFT minting status for a certificate. */
export async function getNFTStatus(certId: string): Promise<NFTStatus> {
  const res = await api.get(`/company/certificates/${certId}/nft-status`);
  return res.data;
}

