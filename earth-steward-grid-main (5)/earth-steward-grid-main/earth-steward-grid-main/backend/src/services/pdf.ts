import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

interface CertificateData {
  certificate_id: string;
  company_name: string;
  cin: string;
  credits_issued: number;
  land_id: string;
  district: string;
  state: string;
  area_hectares: number;
  valid_from: string;
  valid_to: string;
  issued_at: string;
  officer_name: string;
  officer_designation: string;
  verify_url: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(data.verify_url, { width: 100, margin: 1 });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; background: white; }
    .page {
      width: 210mm; min-height: 297mm; padding: 20mm;
      position: relative; background: white;
    }
    .watermark {
      position: fixed; top: 40%; left: 5%;
      font-size: 52px; color: rgba(0,0,0,0.07);
      transform: rotate(-30deg); white-space: nowrap;
      pointer-events: none; z-index: 0;
    }
    .outer-border {
      border: 8px double #1A5C38;
      padding: 30px;
      min-height: 250mm;
      position: relative; z-index: 1;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .emblem { font-size: 60px; margin-bottom: 8px; }
    .gov-title { font-size: 18px; font-weight: bold; color: #1A2B1F; margin: 4px 0; }
    .ministry { font-size: 14px; color: #333; margin-bottom: 12px; }
    .cert-title {
      font-size: 26px; font-weight: bold; color: #1A5C38;
      letter-spacing: 2px; text-transform: uppercase;
      margin: 12px 0 6px;
    }
    .cert-subtitle { font-size: 12px; color: #555; }
    hr { border: 1px solid #1A5C38; margin: 16px 0; }
    .body-text { font-size: 14px; line-height: 1.8; color: #1A2B1F; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .details-table td {
      border: 1px solid #ccc; padding: 8px 12px;
      font-size: 13px; color: #1A2B1F;
    }
    .details-table td:first-child { font-weight: bold; background: #F0F7F0; width: 40%; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
    .qr-section { text-align: center; }
    .qr-section img { width: 90px; height: 90px; border: 1px solid #ccc; }
    .qr-section p { font-size: 10px; color: #666; margin-top: 4px; }
    .signature { text-align: right; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin: 0 0 6px auto; }
    .signature p { font-size: 13px; color: #1A2B1F; }
    .signature .name { font-weight: bold; }
    .footer-note {
      text-align: center; font-size: 10px; color: #888;
      margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark">GOVERNMENT OF INDIA — OFFICIAL</div>
    <div class="outer-border">
      <div class="header">
        <div class="emblem">🏛️</div>
        <div class="gov-title">Government of India</div>
        <div class="ministry">Ministry of Environment, Forest and Climate Change</div>
        <div class="cert-title">Carbon Credit Certificate</div>
        <div class="cert-subtitle">
          Certificate No: <strong>${data.certificate_id}</strong> &nbsp;|&nbsp;
          Issued on: ${data.issued_at}
        </div>
      </div>

      <hr/>

      <div class="body-text">
        This is to certify that <strong>${data.company_name}</strong>
        (CIN: <strong>${data.cin}</strong>) has been officially issued
        <strong>${data.credits_issued.toLocaleString()} Carbon Credits</strong> under the
        National Carbon Credit Programme of India, as per the provisions of the
        Environment Protection Act and the Ministry's Carbon Credit Guidelines.
      </div>

      <table class="details-table">
        <tr><td>Land Parcel ID</td><td>${data.land_id}</td></tr>
        <tr><td>Location</td><td>${data.district}, ${data.state}</td></tr>
        <tr><td>Area</td><td>${data.area_hectares} hectares</td></tr>
        <tr><td>Credits Issued</td><td><strong>${data.credits_issued.toLocaleString()} Credits</strong></td></tr>
        <tr><td>Valid From</td><td>${data.valid_from}</td></tr>
        <tr><td>Valid To</td><td>${data.valid_to}</td></tr>
        <tr><td>Certificate ID</td><td>${data.certificate_id}</td></tr>
      </table>

      <div class="footer">
        <div class="qr-section">
          <img src="${qrDataUrl}" alt="QR Code" />
          <p>Scan to verify authenticity</p>
        </div>
        <div class="signature">
          <div class="signature-line"></div>
          <p class="name">${data.officer_name}</p>
          <p>${data.officer_designation}</p>
          <p>Carbon Credit Authority</p>
          <p>MoEFCC, Government of India</p>
        </div>
      </div>

      <div class="footer-note">
        This certificate is digitally recorded on the India Carbon Credit Blockchain Ledger.
        Verify at: ${data.verify_url} | Helpline: 1800-XXX-XXXX | carboncredits@moef.gov.in
      </div>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
