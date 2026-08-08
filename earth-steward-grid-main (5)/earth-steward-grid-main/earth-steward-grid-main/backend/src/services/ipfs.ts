import FormData from 'form-data';
import axios from 'axios';

const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT) {
  console.warn('[IPFS] PINATA_JWT not set. IPFS uploads will use base64 data URIs as fallback.');
}

/**
 * Upload a file buffer to IPFS via Pinata.
 * Returns the IPFS CID string (without ipfs:// prefix).
 * Falls back to a data URI if PINATA_JWT is not configured.
 */
export async function uploadFileToIPFS(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  if (!PINATA_JWT) {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  const formData = new FormData();
  formData.append('file', buffer, { filename, contentType: mimeType });
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
  formData.append('pinataMetadata', JSON.stringify({ name: filename }));

  const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${PINATA_JWT}`,
    },
  });

  return response.data.IpfsHash as string;
}

/**
 * Upload a JSON metadata object to IPFS via Pinata.
 * Returns the full ipfs:// URI suitable as an ERC-721 tokenURI.
 * Falls back to a data URI if PINATA_JWT is not configured.
 */
export async function uploadMetadataToIPFS(metadata: object, name: string): Promise<string> {
  if (!PINATA_JWT) {
    const json = JSON.stringify(metadata);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    {
      pinataContent: metadata,
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name },
    },
    {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const cid = response.data.IpfsHash as string;
  return `ipfs://${cid}`;
}

/**
 * Build the ERC-721 standard metadata JSON for a carbon credit certificate.
 */
export function buildCertificateMetadata(params: {
  certificateId: string;
  companyName: string;
  creditsIssued: number;
  issueDate: string;
  verificationId: string;
  imageCid: string;
}): object {
  const { certificateId, companyName, creditsIssued, issueDate, verificationId, imageCid } = params;

  const imageUri = imageCid.startsWith('data:') || imageCid.startsWith('ipfs://')
    ? imageCid
    : `ipfs://${imageCid}`;

  return {
    name: `Carbon Credit Certificate #${certificateId}`,
    description: `Certifies ${creditsIssued} tCO2e sequestered, verified by the Government of India MoEFCC Carbon Credit Programme.`,
    image: imageUri,
    external_url: `https://moef.gov.in/carbon-credits/verify?cert=${certificateId}`,
    attributes: [
      { trait_type: 'Recipient', value: companyName },
      { trait_type: 'CO2e Credits', value: String(creditsIssued) },
      { trait_type: 'Issue Date', value: issueDate },
      { trait_type: 'Verification ID', value: verificationId },
      { trait_type: 'Certificate ID', value: certificateId },
      { trait_type: 'Issuer', value: 'Ministry of Environment, Forest and Climate Change, GoI' },
    ],
  };
}
