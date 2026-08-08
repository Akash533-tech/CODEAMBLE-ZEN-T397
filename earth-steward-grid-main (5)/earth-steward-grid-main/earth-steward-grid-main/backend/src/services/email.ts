import nodemailer from 'nodemailer';

function createTransport() {
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  // Dev: log emails to console
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransport();

const FROM = `"${process.env.FROM_NAME || 'Carbon Credit Authority'}" <${process.env.FROM_EMAIL || 'noreply@carboncredits.gov.in'}>`;

async function sendMail(to: string, subject: string, html: string, attachments?: any[]) {
  const msg = { from: FROM, to, subject, html, attachments };
  if (process.env.SENDGRID_API_KEY) {
    await transporter.sendMail(msg);
  } else {
    const info = await transporter.sendMail(msg);
    console.log('[EMAIL DEV]', subject, '->', to);
    if ((info as any).message) {
      const parsed = JSON.parse((info as any).message);
      console.log('[EMAIL BODY PREVIEW]', parsed.subject);
    }
  }
}

export async function sendApprovalEmail(
  to: string,
  companyName: string,
  requestId: string,
  pricePerCredit: number,
  totalAmount: number
) {
  await sendMail(
    to,
    `Purchase Request ${requestId} Approved`,
    `<h2>Dear ${companyName},</h2>
     <p>Your carbon credit purchase request <strong>${requestId}</strong> has been <strong style="color:green">approved</strong>.</p>
     <p>Price per credit: <strong>₹${pricePerCredit}</strong> | Total amount: <strong>₹${totalAmount.toLocaleString()}</strong></p>
     <p>Please log in to the portal to complete payment.</p>
     <p>Regards,<br/>Carbon Credit Authority, MoEFCC</p>`
  );
}

export async function sendRejectionEmail(
  to: string,
  companyName: string,
  requestId: string,
  reason: string
) {
  await sendMail(
    to,
    `Purchase Request ${requestId} Rejected`,
    `<h2>Dear ${companyName},</h2>
     <p>Your carbon credit purchase request <strong>${requestId}</strong> has been <strong style="color:red">rejected</strong>.</p>
     <p><strong>Reason:</strong> ${reason}</p>
     <p>You may reapply with the required documents. For queries, contact carboncredits@moef.gov.in</p>
     <p>Regards,<br/>Carbon Credit Authority, MoEFCC</p>`
  );
}

export async function sendCertificateEmail(
  to: string,
  companyName: string,
  certificateId: string,
  pdfBuffer: Buffer
) {
  await sendMail(
    to,
    `Carbon Credit Certificate ${certificateId} Issued`,
    `<h2>Dear ${companyName},</h2>
     <p>Congratulations! Your Carbon Credit Certificate <strong>${certificateId}</strong> has been issued.</p>
     <p>Please find the certificate attached to this email.</p>
     <p>You can also download it anytime from the portal under My Certificates.</p>
     <p>Regards,<br/>Carbon Credit Authority, MoEFCC</p>`,
    [{ filename: `${certificateId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  );
}

export async function sendExpiryWarningEmail(
  to: string,
  companyName: string,
  certificateId: string,
  expiryDate: string,
  daysLeft: number
) {
  await sendMail(
    to,
    `Certificate ${certificateId} Expiring in ${daysLeft} days`,
    `<h2>Dear ${companyName},</h2>
     <p>Your Carbon Credit Certificate <strong>${certificateId}</strong> is expiring on <strong>${expiryDate}</strong> (${daysLeft} days remaining).</p>
     <p>Please log in to the portal to renew your certificate before expiry.</p>
     <p>Regards,<br/>Carbon Credit Authority, MoEFCC</p>`
  );
}

export async function sendPaymentConfirmationEmail(
  to: string,
  companyName: string,
  requestId: string,
  amount: number
) {
  await sendMail(
    to,
    `Payment Confirmed — ${requestId}`,
    `<h2>Dear ${companyName},</h2>
     <p>Your payment of <strong>₹${amount.toLocaleString()}</strong> for request <strong>${requestId}</strong> has been confirmed.</p>
     <p>Your certificate is being generated and will be emailed to you shortly.</p>
     <p>Regards,<br/>Carbon Credit Authority, MoEFCC</p>`
  );
}
