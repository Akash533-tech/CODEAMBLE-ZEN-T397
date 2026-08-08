import { query } from '../db/pool';
import { generateCertificatePDF } from '../services/pdf';
import { uploadFile, generateS3Key } from '../services/storage';
import { sendCertificateEmail } from '../services/email';
import { addBlock } from '../services/blockchain';
import dotenv from 'dotenv';
dotenv.config();

export async function processCertificateJob(data: { purchase_request_id: string; company_id: string }) {
  const { purchase_request_id, company_id } = data;

  console.log(`[CertJob] Processing request ${purchase_request_id}`);

  try {
    const reqResult = await query(
      `SELECT pr.*, co.name as company_name, co.cin, co.contact_email,
              lp.land_id as land_identifier, lp.state, lp.district, lp.area_hectares,
              go.name as officer_name, go.designation as officer_designation
       FROM purchase_requests pr
       JOIN companies co ON pr.company_id=co.id
       JOIN land_parcels lp ON pr.land_parcel_id=lp.id
       LEFT JOIN government_officers go ON pr.reviewer_id=go.id
       WHERE pr.id=$1`,
      [purchase_request_id]
    );

    if (!reqResult.rows[0]) {
      console.error('[CertJob] Purchase request not found:', purchase_request_id);
      return;
    }
    const r = reqResult.rows[0];

    // Check if certificate already exists
    const existingCert = await query('SELECT id FROM certificates WHERE purchase_request_id=$1', [purchase_request_id]);
    if (existingCert.rows.length > 0) {
      console.log('[CertJob] Certificate already exists for this request.');
      return;
    }

    // Generate cert ID
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    const certId = `CC-${year}-${rand}`;

    // Validity = duration_years from today
    const validFrom = new Date();
    const validTo = new Date();
    validTo.setFullYear(validTo.getFullYear() + (r.duration_years || 1));

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certId}`;

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
        valid_from: validFrom.toLocaleDateString('en-IN'),
        valid_to: validTo.toLocaleDateString('en-IN'),
        issued_at: new Date().toLocaleDateString('en-IN'),
        officer_name: r.officer_name || 'Government Officer',
        officer_designation: r.officer_designation || 'Carbon Credit Authority',
        verify_url: verifyUrl,
      });

      const key = generateS3Key('certificates', 'pdf');
      const { url } = await uploadFile(pdfBuffer, key, 'application/pdf');
      pdfUrl = url;

      // Send email with PDF
      await sendCertificateEmail(r.contact_email, r.company_name, certId, pdfBuffer).catch(console.error);
    } catch (pdfErr) {
      console.error('[CertJob] PDF error:', pdfErr);
    }

    // Blockchain block
    const block = await addBlock({
      land_id: r.land_identifier || 'UNKNOWN',
      credits_delta: -r.credits_requested,
      event_type: 'issued',
      certificate_id: certId,
      company_cin: r.cin,
    });

    // Insert certificate record
    await query(
      `INSERT INTO certificates (certificate_id, company_id, purchase_request_id, land_parcel_id, credits_issued, valid_from, valid_to, pdf_url, blockchain_tx_hash, issued_by, qr_code_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [certId, r.company_id, purchase_request_id, r.land_parcel_id,
       r.credits_requested, validFrom, validTo, pdfUrl, block.block_hash,
       r.reviewer_id || null, verifyUrl]
    );

    // Deduct credits from land parcel
    await query(
      `UPDATE land_parcels SET credits_available=credits_available-$1, credits_issued=credits_issued+$1, updated_at=NOW() WHERE id=$2`,
      [r.credits_requested, r.land_parcel_id]
    );

    // Notify company
    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,'certificate_issued','Certificate Issued - ' || $2,$3)`,
      [r.company_id, certId, `Your carbon credit certificate ${certId} has been issued for ${r.credits_requested} credits. Download from the portal.`]
    );

    console.log(`[CertJob] Certificate ${certId} issued successfully.`);
  } catch (err) {
    console.error('[CertJob] Error:', err);
    throw err;
  }
}

