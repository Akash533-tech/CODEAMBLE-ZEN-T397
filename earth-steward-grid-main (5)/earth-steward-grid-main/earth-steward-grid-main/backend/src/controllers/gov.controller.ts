import { Request, Response } from 'express';
import { query } from '../db/pool';
import { addBlock } from '../services/blockchain';
import { issueCertificateOnChain } from '../services/ethereum';
import { generateCertificatePDF } from '../services/pdf';
import { uploadFile, generateS3Key } from '../services/storage';
import { sendApprovalEmail, sendRejectionEmail } from '../services/email';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();


function generateCertId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `CC-${year}-${rand}`;
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const [totalReqs, pendingReqs, activeCerts, totalRevenue, companiesCount, landsCount] = await Promise.all([
      query("SELECT COUNT(*) FROM purchase_requests"),
      query("SELECT COUNT(*) FROM purchase_requests WHERE status IN ('pending','under_review')"),
      query("SELECT COUNT(*) FROM certificates WHERE status='active'"),
      query("SELECT COALESCE(SUM(amount_inr),0) as total FROM transactions WHERE status='success'"),
      query("SELECT COUNT(*) FROM companies WHERE is_verified=true"),
      query("SELECT COUNT(*) FROM land_parcels WHERE status='active'"),
    ]);
    const creditsTotal = await query("SELECT SUM(credits_available) as avail, SUM(credits_issued)+SUM(credits_generated) as total FROM (SELECT credits_available, credits_issued, total_credits_generated as credits_generated FROM land_parcels) t");
    return res.json({
      totalRequests: parseInt(totalReqs.rows[0].count),
      pendingRequests: parseInt(pendingReqs.rows[0].count),
      activeCertificates: parseInt(activeCerts.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      registeredCompanies: parseInt(companiesCount.rows[0].count),
      activeLandParcels: parseInt(landsCount.rows[0].count),
      totalCreditsAvailable: parseInt(creditsTotal.rows[0]?.avail || '0'),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTrendChart(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT TO_CHAR(created_at,'Mon') as month, EXTRACT(MONTH FROM created_at) as mon_num,
             EXTRACT(YEAR FROM created_at) as year,
             COUNT(*) as requests, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as approved
      FROM purchase_requests
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month, mon_num, year ORDER BY year, mon_num`);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRevenueChart(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT TO_CHAR(DATE_TRUNC('quarter', created_at),'FMYYYY "Q"Q') as quarter,
             SUM(amount_inr) as revenue
      FROM transactions WHERE status='success'
      GROUP BY DATE_TRUNC('quarter', created_at)
      ORDER BY DATE_TRUNC('quarter', created_at) DESC LIMIT 8`);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getActivity(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT 'request' as type, pr.request_id as id,
             'Request ' || pr.status as action,
             co.name || ' - ' || pr.credits_requested || ' credits' as detail,
             pr.updated_at as timestamp
      FROM purchase_requests pr JOIN companies co ON pr.company_id=co.id
      UNION ALL
      SELECT 'certificate' as type, c.certificate_id as id,
             'Certificate Issued' as action,
             c.certificate_id || ' issued to ' || co.name as detail,
             c.issued_at as timestamp
      FROM certificates c JOIN companies co ON c.company_id=co.id
      ORDER BY timestamp DESC LIMIT 10`);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAlerts(req: Request, res: Response) {
  try {
    const [stalePending, expiringSoon] = await Promise.all([
      query("SELECT COUNT(*) FROM purchase_requests WHERE status='pending' AND created_at < NOW() - INTERVAL '7 days'"),
      query("SELECT COUNT(*) FROM certificates WHERE status='active' AND valid_to <= NOW() + INTERVAL '30 days'"),
    ]);
    const alerts = [];
    const stale = parseInt(stalePending.rows[0].count);
    if (stale > 0) alerts.push({ type: 'warning', message: `${stale} purchase request(s) pending for over 7 days` });
    const expiring = parseInt(expiringSoon.rows[0].count);
    if (expiring > 0) alerts.push({ type: 'info', message: `${expiring} certificate(s) expiring within 30 days` });
    return res.json(alerts);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRequests(req: Request, res: Response) {
  try {
    const { status, company_id, land_id, date_from, date_to, page = 1, limit = 20 } = req.query as any;
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;
    if (status) { conditions.push(`pr.status = $${pIdx++}`); params.push(status); }
    if (company_id) { conditions.push(`pr.company_id = $${pIdx++}`); params.push(company_id); }
    if (land_id) { conditions.push(`lp.land_id = $${pIdx++}`); params.push(land_id); }
    if (date_from) { conditions.push(`pr.created_at >= $${pIdx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`pr.created_at <= $${pIdx++}`); params.push(date_to); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await query(`SELECT COUNT(*) FROM purchase_requests pr JOIN land_parcels lp ON pr.land_parcel_id=lp.id ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `SELECT pr.*, co.name as company_name, co.cin, lp.land_id as land_identifier, lp.state, lp.district, lp.land_type
       FROM purchase_requests pr
       JOIN companies co ON pr.company_id=co.id
       JOIN land_parcels lp ON pr.land_parcel_id=lp.id
       ${where} ORDER BY pr.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx+1}`,
      params
    );
    return res.json({
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: Number(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRequestDetail(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const result = await query(
      `SELECT pr.*, co.name as company_name, co.cin, co.contact_email,
              lp.land_id as land_identifier, lp.state, lp.district, lp.land_type, lp.area_hectares, lp.price_per_credit as base_price,
              go.name as reviewer_name, go.designation as reviewer_designation
       FROM purchase_requests pr
       JOIN companies co ON pr.company_id=co.id
       JOIN land_parcels lp ON pr.land_parcel_id=lp.id
       LEFT JOIN government_officers go ON pr.reviewer_id=go.id
       WHERE pr.request_id=$1 OR pr.id::text=$1`,
      [requestId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateRequestStatus(req: Request, res: Response) {
  try {
    const officerId = req.user!.id;
    const { requestId } = req.params;
    const { status, notes, rejection_reason, price_per_credit } = req.body;

    const reqResult = await query(
      `SELECT pr.*, co.contact_email, co.name as company_name, co.cin, lp.credits_available, lp.district, lp.state, lp.area_hectares, lp.land_id as land_identifier, lp.id as land_id_pk, go.name as officer_name, go.designation as officer_designation
       FROM purchase_requests pr
       JOIN companies co ON pr.company_id=co.id
       JOIN land_parcels lp ON pr.land_parcel_id=lp.id
       LEFT JOIN government_officers go ON go.id=$2
       WHERE pr.request_id=$1 OR pr.id::text=$1`,
      [requestId, officerId]
    );
    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const purchaseReq = reqResult.rows[0];

    const finalStatus = status;

    const totalAmount = price_per_credit
      ? price_per_credit * purchaseReq.credits_requested
      : purchaseReq.total_amount;

    await query(
      `UPDATE purchase_requests
       SET status=$1, reviewer_id=$2, review_notes=$3, rejection_reason=$4,
           price_per_credit=COALESCE($5, price_per_credit), total_amount=COALESCE($6, total_amount), updated_at=NOW(), reviewed_at=NOW()
       WHERE id=$7`,
      [finalStatus, officerId, notes || null, rejection_reason || null,
       price_per_credit || null, totalAmount || null, purchaseReq.id]
    );

    // 🌱 CREDIT DEDUCTION & CERTIFICATE GENERATION
    if (finalStatus === 'completed') {
      const newAvailable = Math.max(0, purchaseReq.credits_available - purchaseReq.credits_requested);
      await query(
        `UPDATE land_parcels SET credits_available=$1, credits_issued=credits_issued+$2, updated_at=NOW() WHERE id=$3`,
        [newAvailable, purchaseReq.credits_requested, purchaseReq.land_id_pk]
      );
      
      // Insert a transaction record for ledger tracking
      if (totalAmount) {
        await query(
          `INSERT INTO transactions (company_id, purchase_request_id, amount_inr, status, transaction_type)
           VALUES ($1, $2, $3, 'success', 'credit_purchase')
           ON CONFLICT DO NOTHING`,
          [purchaseReq.company_id, purchaseReq.id, totalAmount]
        ).catch(() => {});
      }

      // Generate cert
      const certId = generateCertId();
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/company/certificates/${certId}/verify`;
      const vFrom = new Date();
      const vTo = new Date();
      vTo.setFullYear(vTo.getFullYear() + purchaseReq.duration_years);

      let pdfUrl = '';
      try {
        const pdfBuffer = await generateCertificatePDF({
          certificate_id: certId,
          company_name: purchaseReq.company_name,
          cin: purchaseReq.cin,
          credits_issued: purchaseReq.credits_requested,
          land_id: purchaseReq.land_identifier,
          district: purchaseReq.district,
          state: purchaseReq.state,
          area_hectares: purchaseReq.area_hectares,
          valid_from: vFrom.toLocaleDateString('en-IN'),
          valid_to: vTo.toLocaleDateString('en-IN'),
          issued_at: new Date().toLocaleDateString('en-IN'),
          officer_name: purchaseReq.officer_name,
          officer_designation: purchaseReq.officer_designation,
          verify_url: verifyUrl,
        });
        const key = generateS3Key('certificates', 'pdf');
        const { url } = await uploadFile(pdfBuffer, key, 'application/pdf');
        pdfUrl = url;
      } catch (pdfErr) {
        console.error('PDF generation error:', pdfErr);
      }

      // Add to blockchain via Ethereum Sepolia Contract
      let txHash = 'pending';
      try {
        txHash = await issueCertificateOnChain({
          certId: certId,
          companyCIN: purchaseReq.cin,
          landId: purchaseReq.land_identifier,
          credits: purchaseReq.credits_requested,
          validFrom: vFrom,
          validTo: vTo
        });
      } catch (err) {
        console.error('Blockchain error', err);
      }

      // Insert certificate
      await query(
        `INSERT INTO certificates (certificate_id, company_id, purchase_request_id, land_parcel_id, credits_issued, valid_from, valid_to, pdf_url, blockchain_tx_hash, issued_by, qr_code_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [certId, purchaseReq.company_id, purchaseReq.id, purchaseReq.land_id_pk, purchaseReq.credits_requested,
         vFrom, vTo, pdfUrl, txHash, officerId, verifyUrl]
      );

      // Notifs & Emails
      await query(
        `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
         VALUES ('company',$1,'certificate_issued','Certificate Issued',$2)`,
        [purchaseReq.company_id, `Your certificate ${certId} has been issued for ${purchaseReq.credits_requested} credits.`]
      );
    } else if (finalStatus === 'approved') {
      await query(
        `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
         VALUES ('company',$1,'request_approved','Request Approved',$2)`,
        [purchaseReq.company_id, `Your request ${purchaseReq.request_id} has been approved. Please proceed to the dashboard to complete the payment.`]
      );
      if (price_per_credit) {
        await sendApprovalEmail(purchaseReq.contact_email, purchaseReq.company_name, purchaseReq.request_id, price_per_credit, totalAmount!).catch(console.error);
      }
    } else {
      // Rejection or Under Review Notifications
      const notifTitle = finalStatus === 'rejected' ? 'Purchase Request Rejected' : 'Request Under Review';
      const notifMsg = finalStatus === 'rejected'
        ? `Your request ${purchaseReq.request_id} has been rejected. Reason: ${rejection_reason}`
        : `Your request ${purchaseReq.request_id} is now under review.`;
      
      await query(
        `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
         VALUES ('company',$1,$2,$3,$4)`,
        [purchaseReq.company_id, `request_${finalStatus}`, notifTitle, notifMsg]
      );

      if (finalStatus === 'rejected' && rejection_reason) {
        await sendRejectionEmail(purchaseReq.contact_email, purchaseReq.company_name, purchaseReq.request_id, rejection_reason).catch(console.error);
      }
    }

    return res.json({ success: true, message: `Request status updated to ${finalStatus}` });
  } catch (err) {
    console.error('updateRequestStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function bulkUpdateRequests(req: Request, res: Response) {
  try {
    const officerId = req.user!.id;
    const { request_ids, action, notes, price_per_credit } = req.body;
    const status = action === 'approve' ? 'approved' : 'rejected';
    let updated = 0;
    for (const rid of request_ids) {
      await query(
        `UPDATE purchase_requests SET status=$1, reviewer_id=$2, review_notes=$3, updated_at=NOW(), reviewed_at=NOW() WHERE id=$4`,
        [status, officerId, notes || null, rid]
      );
      updated++;
    }
    return res.json({ success: true, updated });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function issueCertificate(req: Request, res: Response) {
  try {
    const officerId = req.user!.id;
    const { purchase_request_id, valid_from, valid_to } = req.body;

    const reqResult = await query(
      `SELECT pr.*, co.name as company_name, co.cin, co.contact_email,
              lp.land_id as land_identifier, lp.state, lp.district, lp.area_hectares,
              go.name as officer_name, go.designation as officer_designation
       FROM purchase_requests pr
       JOIN companies co ON pr.company_id=co.id
       JOIN land_parcels lp ON pr.land_parcel_id=lp.id
       JOIN government_officers go ON go.id=$1
       WHERE pr.id=$2 AND pr.status='completed'`,
      [officerId, purchase_request_id]
    );
    if (reqResult.rows.length === 0) return res.status(404).json({ error: 'Request not found or not completed' });
    const r = reqResult.rows[0];

    const certId = generateCertId();
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/company/certificates/${certId}/verify`;

    // Generate PDF
    let pdfUrl = '';
    try {
      const pdfBuffer = await generateCertificatePDF({
        certificate_id: certId,
        company_name: r.company_name,
        cin: r.cin,
        credits_issued: r.credits_requested,
        land_id: r.land_identifier,
        district: r.district,
        state: r.state,
        area_hectares: r.area_hectares,
        valid_from: new Date(valid_from).toLocaleDateString('en-IN'),
        valid_to: new Date(valid_to).toLocaleDateString('en-IN'),
        issued_at: new Date().toLocaleDateString('en-IN'),
        officer_name: r.officer_name,
        officer_designation: r.officer_designation,
        verify_url: verifyUrl,
      });
      const key = generateS3Key('certificates', 'pdf');
      const { url } = await uploadFile(pdfBuffer, key, 'application/pdf');
      pdfUrl = url;
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
    }

    // Add blockchain block
    const block = await addBlock({
      land_id: r.land_identifier,
      credits_delta: -r.credits_requested,
      event_type: 'issued',
      certificate_id: certId,
      company_cin: r.cin,
    });

    // Insert certificate
    const certResult = await query(
      `INSERT INTO certificates (certificate_id, company_id, purchase_request_id, land_parcel_id, credits_issued, valid_from, valid_to, pdf_url, blockchain_tx_hash, issued_by, qr_code_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [certId, r.company_id, purchase_request_id, r.land_parcel_id, r.credits_requested,
       valid_from, valid_to, pdfUrl, block.block_hash, officerId, verifyUrl]
    );

    // Deduct credits from land parcel
    await query(
      `UPDATE land_parcels SET credits_available=credits_available-$1, credits_issued=credits_issued+$1, updated_at=NOW() WHERE id=$2`,
      [r.credits_requested, r.land_parcel_id]
    );

    // Notify company
    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,'certificate_issued','Certificate Issued',$2)`,
      [r.company_id, `Your certificate ${certId} has been issued for ${r.credits_requested} credits. Download it from the portal.`]
    );

    return res.status(201).json({ certificate_id: certId, pdf_url: pdfUrl });
  } catch (err) {
    console.error('issueCertificate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCertificates(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT c.*, co.name as company_name, co.cin,
             lp.land_id as land_identifier, lp.state, lp.district,
             go.name as issued_by_name
      FROM certificates c
      JOIN companies co ON c.company_id=co.id
      JOIN land_parcels lp ON c.land_parcel_id=lp.id
      LEFT JOIN government_officers go ON c.issued_by=go.id
      ORDER BY c.issued_at DESC LIMIT 100`);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function revokeCertificate(req: Request, res: Response) {
  try {
    const officerId = req.user!.id;
    const { certId } = req.params;
    const { reason } = req.body;

    const certResult = await query(
      `SELECT c.*, lp.land_id as land_identifier FROM certificates c JOIN land_parcels lp ON c.land_parcel_id=lp.id WHERE c.certificate_id=$1`,
      [certId]
    );
    if (certResult.rows.length === 0) return res.status(404).json({ error: 'Certificate not found' });
    const cert = certResult.rows[0];

    await query(
      `UPDATE certificates SET status='revoked', revocation_reason=$1 WHERE certificate_id=$2`,
      [reason, certId]
    );

    // Return credits to pool
    await query(
      `UPDATE land_parcels SET credits_available=credits_available+$1, credits_issued=credits_issued-$1, updated_at=NOW() WHERE id=$2`,
      [cert.credits_issued, cert.land_parcel_id]
    );

    // Blockchain block for revocation
    await addBlock({
      land_id: cert.land_identifier,
      credits_delta: cert.credits_issued,
      event_type: 'revoked',
      certificate_id: certId,
    }).catch(err => console.error('Blockchain error during revoke:', err));

    // Notify company
    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,'certificate_revoked','Certificate Revoked',$2)`,
      [cert.company_id, `Your certificate ${certId} has been revoked. Reason: ${reason}`]
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getLands(req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM land_parcels ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createLand(req: Request, res: Response) {
  try {
    const { land_id, state, district, village, taluka, area_hectares, land_type, permitted_species, plantation_guidelines, price_per_credit } = req.body;
    // Use initial credits based on area and type
    const baseCredits = Math.floor(area_hectares * (land_type === 'forest' ? 50 : land_type === 'wetland' ? 70 : 30));
    const result = await query(
      `INSERT INTO land_parcels (land_id, state, district, village, taluka, area_hectares, land_type, permitted_species, plantation_guidelines, price_per_credit, total_credits_generated, credits_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [land_id, state, district, village, taluka, area_hectares, land_type, JSON.stringify(permitted_species || []), plantation_guidelines, price_per_credit || 750, baseCredits]
    );
    // Genesis blockchain entry
    await addBlock({
      land_id,
      credits_delta: baseCredits,
      event_type: 'generated',
      extra: { state, district, area_hectares, land_type },
    }).catch(console.error);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createLand error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateLandCredits(req: Request, res: Response) {
  try {
    const { landId } = req.params;
    const { credits_to_add, ndvi_score, rationale } = req.body;
    const landResult = await query('SELECT * FROM land_parcels WHERE land_id=$1 OR id::text=$1', [landId]);
    if (landResult.rows.length === 0) return res.status(404).json({ error: 'Land not found' });
    const land = landResult.rows[0];
    await query(
      `UPDATE land_parcels SET credits_available=credits_available+$1, total_credits_generated=total_credits_generated+$1, ndvi_score=$2, ndvi_last_checked=NOW(), updated_at=NOW() WHERE id=$3`,
      [credits_to_add, ndvi_score, land.id]
    );
    await query(
      `INSERT INTO ndvi_logs (land_parcel_id, ndvi_score_before, ndvi_score_after, credits_added, calculation_rationale)
       VALUES ($1,$2,$3,$4,$5)`,
      [land.id, land.ndvi_score || 0, ndvi_score, credits_to_add, rationale || 'Manual update']
    );
    await addBlock({
      land_id: land.land_id,
      credits_delta: credits_to_add,
      event_type: 'generated',
      extra: { ndvi_score, rationale },
    }).catch(console.error);
    return res.json({ success: true, credits_added: credits_to_add });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
