
import cron from 'node-cron';
import { query } from '../db/pool';
import { sendExpiryWarningEmail } from '../services/email';
import dotenv from 'dotenv';
dotenv.config();

// Certificate expiry check — runs daily at 2am
// Note: this runs as part of the main server process
// In production, move to a separate worker

async function checkExpiry() {
  console.log('[ExpiryJob] Checking certificate expiry...');
  try {
    // Mark certificates as expired
    const expiredRes = await query(
      `UPDATE certificates SET status='expired'
       WHERE status='active' AND valid_to < NOW()
       RETURNING id, certificate_id, company_id`
    );
    for (const cert of expiredRes.rows) {
      await query(
        `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
         VALUES ('company',$1,'certificate_expired','Certificate Expired',$2)`,
        [cert.company_id, `Your certificate ${cert.certificate_id} has expired.`]
      );
    }
    if (expiredRes.rows.length > 0) {
      console.log(`[ExpiryJob] Marked ${expiredRes.rows.length} certificates as expired.`);
    }

    // Warn about certificates expiring in 30 days
    const expiringRes = await query(
      `SELECT c.*, co.contact_email, co.name as company_name
       FROM certificates c JOIN companies co ON c.company_id=co.id
       WHERE c.status='active'
         AND c.valid_to BETWEEN NOW() AND NOW() + INTERVAL '30 days'`
    );
    for (const cert of expiringRes.rows) {
      const daysLeft = Math.ceil((new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      await sendExpiryWarningEmail(
        cert.contact_email, cert.company_name, cert.certificate_id,
        new Date(cert.valid_to).toLocaleDateString('en-IN'), daysLeft
      ).catch(console.error);
    }
    if (expiringRes.rows.length > 0) {
      console.log(`[ExpiryJob] Sent ${expiringRes.rows.length} expiry warnings.`);
    }
  } catch (err) {
    console.error('[ExpiryJob] Error:', err);
  }
}

// Schedule: daily at 02:00
try {
  if (typeof (global as any).__cronStarted === 'undefined') {
    (global as any).__cronStarted = true;
    // Use simple interval for dev compatibility
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(checkExpiry, TWENTY_FOUR_HOURS);
    setTimeout(checkExpiry, 5000); // Run once at startup after 5s delay
    console.log('[ExpiryJob] Certificate expiry check scheduled (daily).');
  }
} catch (e) {
  console.error('Cron setup error:', e);
}

export { checkExpiry };
