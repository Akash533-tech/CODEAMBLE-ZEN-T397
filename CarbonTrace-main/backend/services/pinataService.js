const axios = require('axios');
const FormData = require('form-data');

const PINATA_BASE = 'https://api.pinata.cloud';

function getPinataHeaders() {
  return {
    pinata_api_key: process.env.PINATA_API_KEY,
    pinata_secret_api_key: process.env.PINATA_API_SECRET,
    'Content-Type': 'application/json',
  };
}

function getPinataFileHeaders(formData) {
  return {
    ...formData.getHeaders(),
    pinata_api_key: process.env.PINATA_API_KEY,
    pinata_secret_api_key: process.env.PINATA_API_SECRET,
  };
}

/**
 * Pin raw JSON data to IPFS via Pinata
 */
async function pinJSONToIPFS(data, name) {
  try {
    const body = {
      pinataMetadata: {
        name: name || 'CarbonTrace-Data',
        keyvalues: {
          platform: 'CarbonTrace',
          type: data.type || 'land_record',
          timestamp: new Date().toISOString(),
        },
      },
      pinataContent: data,
    };

    const response = await axios.post(
      `${PINATA_BASE}/pinning/pinJSONToIPFS`,
      body,
      { headers: getPinataHeaders(), timeout: 30000 }
    );

    if (!response.data?.IpfsHash) {
      throw new Error('Pinata returned no IpfsHash');
    }

    console.log(`[PINATA] ✅ Pinned JSON: ${response.data.IpfsHash}`);
    return {
      success: true,
      cid: response.data.IpfsHash,
      size: response.data.PinSize,
      timestamp: response.data.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
    };
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    console.error('[PINATA] ❌ JSON pin failed:', detail);
    return { success: false, error: detail, cid: null };
  }
}

/**
 * Pin a real binary file buffer to IPFS via Pinata
 * @param {Buffer} fileBuffer - Raw file buffer
 * @param {string} originalName - Original filename
 * @param {string} pinataName - Name for Pinata metadata
 */
async function pinFileToIPFS(fileBuffer, originalName, pinataName) {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: originalName || 'document',
      contentType: 'application/octet-stream',
    });

    const metadata = JSON.stringify({
      name: pinataName || originalName || 'CarbonTrace-Document',
      keyvalues: {
        platform: 'CarbonTrace',
        type: 'farmer_document',
        timestamp: new Date().toISOString(),
      },
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({ cidVersion: 1 });
    formData.append('pinataOptions', options);

    const response = await axios.post(
      `${PINATA_BASE}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: getPinataFileHeaders(formData),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (!response.data?.IpfsHash) {
      throw new Error('Pinata returned no IpfsHash');
    }

    console.log(`[PINATA] ✅ Pinned file: ${response.data.IpfsHash} (${originalName})`);
    return {
      success: true,
      cid: response.data.IpfsHash,
      size: response.data.PinSize,
      timestamp: response.data.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
    };
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    console.error('[PINATA] ❌ File pin failed:', detail);
    return { success: false, error: detail, cid: null };
  }
}

async function pinLandData(landData) {
  const payload = {
    type: 'land_registration',
    platform: 'CarbonTrace MRV',
    network: 'Ethereum Sepolia',
    land_id: landData.land_id_gov,
    owner_name: landData.owner_name,
    panchayat: landData.panchayat_name,
    area_hectares: landData.area_hectares,
    location: landData.location_description,
    allowed_species: landData.allowed_species,
    polygon_geojson: landData.polygon_geojson,
    conditions: landData.conditions || '',
    registered_at: new Date().toISOString(),
    registered_by: 'Government of India — MRV Portal',
  };

  return pinJSONToIPFS(payload, `LandRegistration-${landData.land_id_gov}`);
}

async function pinCreditIssuanceData(issuanceData) {
  const payload = {
    type: 'carbon_credit_issuance',
    platform: 'CarbonTrace MRV',
    network: 'Ethereum Sepolia',
    land_id: issuanceData.land_id_gov,
    credits_issued: issuanceData.credits_calculated,
    algorithm: {
      area_ha: issuanceData.area_ha,
      sequestration_rate: issuanceData.sequestration_rate,
      years: issuanceData.years,
      survival_rate: issuanceData.survival_rate,
      carbon_tco2e: issuanceData.carbon_tco2e,
      formula: 'area_ha × sequestration_rate × years × survival_rate',
    },
    issued_by: 'Government of India — NCCR',
    issued_at: new Date().toISOString(),
    standard: 'India Carbon Credit Trading Scheme 2025',
  };

  return pinJSONToIPFS(payload, `CreditIssuance-${issuanceData.land_id_gov}`);
}

async function pinMRVData(mrvData) {
  const payload = {
    type: 'mrv_verification',
    platform: 'CarbonTrace MRV',
    land_id: mrvData.land_id,
    ndvi_value: mrvData.ndvi_value,
    greenery_increase: mrvData.greenery_increase_percent,
    satellite_source: mrvData.satellite_source,
    recorded_at: mrvData.recorded_at || new Date().toISOString(),
    verified_by: 'ISRO Bhuvan Satellite + AI Analysis',
  };

  return pinJSONToIPFS(
    payload,
    `MRV-${mrvData.land_id}-${Date.now()}`
  );
}

async function testPinataConnection() {
  try {
    const response = await axios.get(
      `${PINATA_BASE}/data/testAuthentication`,
      { headers: getPinataHeaders(), timeout: 10000 }
    );
    console.log('[PINATA] ✅ Connection OK:', response.data.message);
    return { success: true };
  } catch (err) {
    console.error('[PINATA] ❌ Connection failed:', err.response?.data?.error || err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  pinLandData,
  pinCreditIssuanceData,
  pinMRVData,
  pinJSONToIPFS,
  pinFileToIPFS,
  testPinataConnection,
};
