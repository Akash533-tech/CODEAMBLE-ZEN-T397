import { Request, Response } from 'express';
import { query } from '../db/pool';
import { getPresignedUrl } from '../services/storage';
import { mintCertificateNFT, NFT_CONTRACT_ADDRESS } from '../services/nft';
import { uploadFileToIPFS, uploadMetadataToIPFS, buildCertificateMetadata } from '../services/ipfs';
import { generateCertificatePDF } from '../services/pdf';

export async function getDashboard(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const [certsRes, requestsRes, txnRes, expiringRes] = await Promise.all([
      query("SELECT COUNT(*) FROM certificates WHERE company_id=$1 AND status='active'", [companyId]),
      query("SELECT COUNT(*) FROM purchase_requests WHERE company_id=$1 AND status='pending'", [companyId]),
      query("SELECT COALESCE(SUM(credits),0) as total FROM transactions WHERE company_id=$1 AND status='success'", [companyId]),
      query("SELECT COUNT(*) FROM certificates WHERE company_id=$1 AND status='active' AND valid_to <= NOW() + INTERVAL '30 days'", [companyId]),
    ]);
    const totalCredits = await query(
      "SELECT COALESCE(SUM(credits_issued),0) as total FROM certificates WHERE company_id=$1",
      [companyId]
    );
    return res.json({
      activeCertificates: parseInt(certsRes.rows[0].count),
      pendingRequests: parseInt(requestsRes.rows[0].count),
      totalCreditsPurchased: parseInt(totalCredits.rows[0].total || '0'),
      creditsExpiringSoon: parseInt(expiringRes.rows[0].count),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPurchaseChart(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const result = await query(
      `SELECT TO_CHAR(created_at, 'Mon') as month,
              EXTRACT(MONTH FROM created_at) as mon_num,
              EXTRACT(YEAR FROM created_at) as year,
              SUM(credits) as credits,
              SUM(amount_inr) as revenue
       FROM transactions
       WHERE company_id = $1 AND status = 'success'
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month, mon_num, year
       ORDER BY year, mon_num`,
      [companyId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBreakdownChart(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const result = await query(
      `SELECT lp.land_type as name, SUM(c.credits_issued) as value
       FROM certificates c
       JOIN land_parcels lp ON c.land_parcel_id = lp.id
       WHERE c.company_id = $1
       GROUP BY lp.land_type`,
      [companyId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRequests(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const result = await query(
      `SELECT pr.*, lp.land_id as land_identifier, lp.state, lp.district, lp.land_type,
              go.name as reviewer_name
       FROM purchase_requests pr
       JOIN land_parcels lp ON pr.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON pr.reviewer_id = go.id
       WHERE pr.company_id = $1
       ORDER BY pr.created_at DESC`,
      [companyId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRequestDetail(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { requestId } = req.params;
    const result = await query(
      `SELECT pr.*, lp.land_id as land_identifier, lp.state, lp.district, lp.land_type, lp.area_hectares,
              go.name as reviewer_name, go.designation as reviewer_designation
       FROM purchase_requests pr
       JOIN land_parcels lp ON pr.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON pr.reviewer_id = go.id
       WHERE pr.request_id = $1 AND pr.company_id = $2`,
      [requestId, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCertificates(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const result = await query(
      `SELECT c.*, lp.land_id as land_identifier, lp.state, lp.district, lp.area_hectares,
              go.name as issued_by_name, go.designation as issued_by_designation
       FROM certificates c
       JOIN land_parcels lp ON c.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON c.issued_by = go.id
       WHERE c.company_id = $1
       ORDER BY c.issued_at DESC`,
      [companyId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCertificateDetail(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { certId } = req.params;
    const result = await query(
      `SELECT c.*, lp.land_id as land_identifier, lp.state, lp.district, lp.area_hectares,
              go.name as issued_by_name, co.name as company_name, co.cin
       FROM certificates c
       JOIN land_parcels lp ON c.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON c.issued_by = go.id
       JOIN companies co ON c.company_id = co.id
       WHERE c.certificate_id = $1 AND c.company_id = $2`,
      [certId, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function downloadCertificate(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { certId } = req.params;
    const result = await query(
      'SELECT pdf_url FROM certificates WHERE certificate_id=$1 AND company_id=$2',
      [certId, companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const { pdf_url } = result.rows[0];
    if (!pdf_url) return res.status(404).json({ error: 'PDF not yet generated' });
    // If local file, return relative URL; if S3, get presigned URL
    if (pdf_url.startsWith('/uploads/')) {
      return res.json({ url: pdf_url });
    }
    const key = pdf_url.split('.amazonaws.com/')[1];
    const signedUrl = await getPresignedUrl(key, 3600);
    return res.json({ url: signedUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyCertificate(req: Request, res: Response) {
  try {
    const { certId } = req.params;
    const result = await query(
      `SELECT c.certificate_id, c.status, c.credits_issued, c.valid_from, c.valid_to,
              c.blockchain_tx_hash, c.issued_at,
              co.name as company_name, co.cin,
              lp.land_id as land_identifier, lp.state, lp.district,
              go.name as issued_by_name
       FROM certificates c
       JOIN companies co ON c.company_id = co.id
       JOIN land_parcels lp ON c.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON c.issued_by = go.id
       WHERE c.certificate_id = $1`,
      [certId]
    );
    if (result.rows.length === 0) return res.status(404).json({ valid: false, error: 'Certificate not found' });
    const cert = result.rows[0];
    return res.json({ valid: cert.status === 'active', ...cert });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTransactions(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { date_from, date_to, status } = req.query as any;
    const conditions = ['t.company_id = $1'];
    const params: any[] = [companyId];
    let pIdx = 2;
    if (status) { conditions.push(`t.status = $${pIdx++}`); params.push(status); }
    if (date_from) { conditions.push(`t.created_at >= $${pIdx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`t.created_at <= $${pIdx++}`); params.push(date_to); }
    const result = await query(
      `SELECT t.*, pr.request_id, lp.land_id as land_identifier
       FROM transactions t
       LEFT JOIN purchase_requests pr ON t.purchase_request_id = pr.id
       LEFT JOIN land_parcels lp ON pr.land_parcel_id = lp.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.created_at DESC`,
      params
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportTransactions(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const result = await query(
      `SELECT t.transaction_id, t.credits, t.amount_inr, t.payment_method,
              t.status, t.created_at, pr.request_id, lp.land_id
       FROM transactions t
       LEFT JOIN purchase_requests pr ON t.purchase_request_id = pr.id
       LEFT JOIN land_parcels lp ON pr.land_parcel_id = lp.id
       WHERE t.company_id = $1 ORDER BY t.created_at DESC`,
      [companyId]
    );
    const header = 'Transaction ID,Credits,Amount (INR),Payment Method,Status,Date,Request ID,Land ID\n';
    const rows = result.rows.map(r =>
      `${r.transaction_id},${r.credits},${r.amount_inr},${r.payment_method},${r.status},${r.created_at},${r.request_id || ''},${r.land_id || ''}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    return res.send(header + rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== NFT MINTING ====================

/**
 * POST /api/company/certificates/:certId/mint-nft
 * Body: { wallet_address: string }
 * Mints the certificate as an ERC-721 NFT on Sepolia and transfers it to the user's wallet.
 */
export async function mintNFT(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { certId } = req.params;
    const { wallet_address } = req.body;

    if (!wallet_address || typeof wallet_address !== 'string') {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    // 1. Fetch certificate + company details
    const certResult = await query(
      `SELECT c.*, co.name as company_name, co.cin,
              lp.land_id as land_identifier, lp.state, lp.district, lp.area_hectares,
              go.name as officer_name, go.designation as officer_designation
       FROM certificates c
       JOIN companies co ON c.company_id = co.id
       JOIN land_parcels lp ON c.land_parcel_id = lp.id
       LEFT JOIN government_officers go ON c.issued_by = go.id
       WHERE c.certificate_id = $1 AND c.company_id = $2`,
      [certId, companyId]
    );

    if (certResult.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = certResult.rows[0];

    // 2. Reject if already minted
    if (cert.nft_status === 'minted') {
      return res.status(409).json({
        error: 'Certificate already minted as NFT',
        nft_token_id: cert.nft_token_id,
        nft_tx_hash: cert.nft_tx_hash,
        nft_contract_address: cert.nft_contract_address,
        nft_wallet_address: cert.nft_wallet_address,
        nft_ipfs_uri: cert.nft_ipfs_uri,
        etherscan_url: `https://sepolia.etherscan.io/tx/${cert.nft_tx_hash}`,
        opensea_url: `https://testnets.opensea.io/assets/sepolia/${cert.nft_contract_address}/${cert.nft_token_id}`,
      });
    }

    // 3. Mark as minting (optimistic update for polling)
    await query(
      `UPDATE certificates SET nft_status = 'minting', nft_wallet_address = $1 WHERE certificate_id = $2`,
      [wallet_address, certId]
    );

    // 4. Generate PDF for the certificate
    let pdfBuffer: Buffer;
    try {
      const issuedAt = cert.issued_at
        ? new Date(cert.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'N/A';
      const validFrom = new Date(cert.valid_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const validTo = new Date(cert.valid_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      pdfBuffer = await generateCertificatePDF({
        certificate_id: cert.certificate_id,
        company_name: cert.company_name,
        cin: cert.cin,
        credits_issued: cert.credits_issued,
        land_id: cert.land_identifier,
        district: cert.district,
        state: cert.state,
        area_hectares: parseFloat(cert.area_hectares) || 0,
        valid_from: validFrom,
        valid_to: validTo,
        issued_at: issuedAt,
        officer_name: cert.officer_name || 'Director General',
        officer_designation: cert.officer_designation || 'MoEFCC, Government of India',
        verify_url: `https://moef.gov.in/carbon-credits/verify?cert=${cert.certificate_id}`,
      });
    } catch (pdfErr: any) {
      console.warn('[NFT Mint] PDF generation failed, using placeholder:', pdfErr.message);
      pdfBuffer = Buffer.from(`CarbonCreditCertificate:${certId}:${Date.now()}`);
    }

    // 5. Upload PDF to IPFS
    let imageCid: string;
    try {
      imageCid = await uploadFileToIPFS(pdfBuffer, `${certId}.pdf`, 'application/pdf');
    } catch (ipfsErr: any) {
      console.warn('[NFT Mint] IPFS image upload failed, using inline fallback:', ipfsErr.message);
      imageCid = `data:application/pdf;base64,${pdfBuffer.slice(0, 256).toString('base64')}`;
    }

    // 6. Build and upload metadata to IPFS
    const metadata = buildCertificateMetadata({
      certificateId: cert.certificate_id,
      companyName: cert.company_name,
      creditsIssued: cert.credits_issued,
      issueDate: cert.issued_at ? new Date(cert.issued_at).toISOString().split('T')[0] : 'N/A',
      verificationId: cert.certificate_id,
      imageCid,
    });

    let tokenURI: string;
    try {
      tokenURI = await uploadMetadataToIPFS(metadata, `${certId}-metadata.json`);
    } catch (metaErr: any) {
      console.warn('[NFT Mint] IPFS metadata upload failed, using inline fallback:', metaErr.message);
      const json = JSON.stringify(metadata);
      tokenURI = `data:application/json;base64,${Buffer.from(json).toString('base64')}`;
    }

    // 7. Mint the NFT on Sepolia
    const mintResult = await mintCertificateNFT(wallet_address, tokenURI);

    // 8. Persist NFT data to DB
    await query(
      `UPDATE certificates SET
        nft_status = 'minted',
        nft_token_id = $1,
        nft_tx_hash = $2,
        nft_contract_address = $3,
        nft_wallet_address = $4,
        nft_ipfs_uri = $5
       WHERE certificate_id = $6`,
      [
        mintResult.tokenId,
        mintResult.txHash,
        mintResult.contractAddress,
        mintResult.recipient,
        tokenURI,
        certId,
      ]
    );

    return res.json({
      success: true,
      certificate_id: certId,
      nft_token_id: mintResult.tokenId,
      nft_tx_hash: mintResult.txHash,
      nft_contract_address: mintResult.contractAddress,
      nft_wallet_address: mintResult.recipient,
      nft_ipfs_uri: tokenURI,
      etherscan_url: mintResult.etherscanUrl,
      opensea_url: mintResult.openseaUrl,
    });
  } catch (err: any) {
    // Mark as failed in DB on error
    try {
      await query(
        `UPDATE certificates SET nft_status = 'failed' WHERE certificate_id = $1`,
        [req.params.certId]
      );
    } catch { /* ignore secondary error */ }

    const message = err.message || 'NFT minting failed';
    console.error('[NFT Mint] Error:', message);
    return res.status(500).json({ error: message });
  }
}

/**
 * GET /api/company/certificates/:certId/nft-status
 * Returns the current NFT minting status for a certificate (for polling).
 */
export async function getNFTStatus(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { certId } = req.params;

    const result = await query(
      `SELECT nft_status, nft_token_id, nft_tx_hash, nft_contract_address,
              nft_wallet_address, nft_ipfs_uri
       FROM certificates
       WHERE certificate_id = $1 AND company_id = $2`,
      [certId, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const row = result.rows[0];
    return res.json({
      certificate_id: certId,
      nft_status: row.nft_status || 'not_minted',
      nft_token_id: row.nft_token_id || null,
      nft_tx_hash: row.nft_tx_hash || null,
      nft_contract_address: row.nft_contract_address || null,
      nft_wallet_address: row.nft_wallet_address || null,
      nft_ipfs_uri: row.nft_ipfs_uri || null,
      etherscan_url: row.nft_tx_hash ? `https://sepolia.etherscan.io/tx/${row.nft_tx_hash}` : null,
      opensea_url: row.nft_token_id && row.nft_contract_address
        ? `https://testnets.opensea.io/assets/sepolia/${row.nft_contract_address}/${row.nft_token_id}`
        : null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

