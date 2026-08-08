import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// Contract ABI (Only the functions we need)
const contractABI = [
  "function issueCertificate(string memory _certId, string memory _companyCIN, string memory _landId, uint256 _credits, uint256 _validFrom, uint256 _validTo) public",
  "function getCertificate(string memory _certId) public view returns (tuple(string certId, string companyCIN, string landId, uint256 credits, uint256 validFrom, uint256 validTo, address issuedBy, uint256 issuedAt))",
  "function verifyCertificate(string memory _certId) public view returns (bool)"
];

// Load env vars
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc2.sepolia.org";
const PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let contract: ethers.Contract;

if (PRIVATE_KEY && CONTRACT_ADDRESS && CONTRACT_ADDRESS !== 'placeholder_address') {
  provider = new ethers.JsonRpcProvider(RPC_URL);
  wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
  console.log('[Ethereum] Initialized Ethereum service on Sepolia');
} else {
  console.warn('[Ethereum] Service initialized in DRY RUN mode (no key/contract)');
}

export async function issueCertificateOnChain(certParams: {
  certId: string;
  companyCIN: string;
  landId: string;
  credits: number;
  validFrom: Date;
  validTo: Date;
}): Promise<string> {
  const { certId, companyCIN, landId, credits, validFrom, validTo } = certParams;
  const fromTimestamp = Math.floor(validFrom.getTime() / 1000);
  const toTimestamp = Math.floor(validTo.getTime() / 1000);

  if (!contract) {
    console.log(`[Ethereum - DRY RUN] Simulated issue of ${certId} by ${companyCIN}`);
    return `dummy_tx_${certId}`;
  }

  try {
    console.log(`[Ethereum] Submitting issueCertificate transaction for ${certId}...`);
    const tx = await contract.issueCertificate(
      certId,
      companyCIN,
      landId,
      credits,
      fromTimestamp,
      toTimestamp
    );
    
    console.log(`[Ethereum] Transaction sent. Hash: ${tx.hash}`);
    
    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    console.log(`[Ethereum] Transaction confirmed in block ${receipt.blockNumber}`);
    
    return tx.hash;
  } catch (err: any) {
    console.error(`[Ethereum] Failed to issue certificate:`, err.message || err);
    throw new Error('Blockchain transaction failed');
  }
}
