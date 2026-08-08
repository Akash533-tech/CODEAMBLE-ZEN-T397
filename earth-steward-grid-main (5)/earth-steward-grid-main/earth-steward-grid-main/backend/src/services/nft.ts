import { ethers } from 'ethers';
import { Mutex } from 'async-mutex';

// ---- Contract ABI (only what we need for minting) ----
const NFT_ABI = [
  'function mintCertificate(address recipient, string memory uri) external returns (uint256)',
  'function totalMinted() external view returns (uint256)',
  'event CertificateIssued(address indexed recipient, uint256 indexed tokenId, string tokenURI)',
];

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const MINTER_PRIVATE_KEY = process.env.ETH_PRIVATE_KEY;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;

let provider: ethers.JsonRpcProvider | null = null;
let minterWallet: ethers.Wallet | null = null;
let nftContract: ethers.Contract | null = null;

// Mutex to prevent nonce collisions during concurrent mints
const mintMutex = new Mutex();

function initNFTService() {
  if (!MINTER_PRIVATE_KEY || !NFT_CONTRACT_ADDRESS) {
    console.warn('[NFT] Missing ETH_PRIVATE_KEY or NFT_CONTRACT_ADDRESS — NFT minting in DRY RUN mode');
    return;
  }
  provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  minterWallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
  nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, minterWallet);
  console.log('[NFT] Initialized NFT minting service');
  console.log('[NFT] Minter wallet:', minterWallet.address);
  console.log('[NFT] Contract address:', NFT_CONTRACT_ADDRESS);
}

initNFTService();

export interface MintResult {
  txHash: string;
  tokenId: string;
  contractAddress: string;
  etherscanUrl: string;
  openseaUrl: string;
  recipient: string;
}

/**
 * Mint a certificate NFT directly to the recipient's wallet.
 * Uses a mutex lock to prevent nonce collisions on concurrent requests.
 */
export async function mintCertificateNFT(recipientAddress: string, tokenURI: string): Promise<MintResult> {
  // 1. Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    throw new Error(`Invalid Ethereum address: "${recipientAddress}"`);
  }
  const checksumAddress = ethers.getAddress(recipientAddress);

  // 2. DRY RUN mode (no key/contract configured)
  if (!nftContract || !minterWallet || !provider) {
    console.log(`[NFT - DRY RUN] Would mint to ${checksumAddress} with URI: ${tokenURI.substring(0, 60)}...`);
    const fakeTokenId = String(Math.floor(Math.random() * 9000) + 1000);
    const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const contractAddr = NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    return {
      txHash: fakeHash,
      tokenId: fakeTokenId,
      contractAddress: contractAddr,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${fakeHash}`,
      openseaUrl: `https://testnets.opensea.io/assets/sepolia/${contractAddr}/${fakeTokenId}`,
      recipient: checksumAddress,
    };
  }

  // 3. Mint with nonce lock to prevent concurrent nonce collisions
  const release = await mintMutex.acquire();
  try {
    // Check minter balance first
    const balance = await provider.getBalance(minterWallet.address);
    if (balance < ethers.parseEther('0.001')) {
      throw new Error(
        `Minter wallet balance too low (${ethers.formatEther(balance)} ETH). ` +
        `Please fund ${minterWallet.address} with Sepolia ETH from https://sepoliafaucet.com`
      );
    }

    console.log(`[NFT] Minting certificate NFT to ${checksumAddress}...`);

    // Estimate gas with +20% buffer
    const gasEstimate = await nftContract.mintCertificate.estimateGas(checksumAddress, tokenURI);
    const gasLimit = (gasEstimate * 120n) / 100n;

    // Send transaction
    const tx = await nftContract.mintCertificate(checksumAddress, tokenURI, { gasLimit });
    console.log(`[NFT] Transaction sent: ${tx.hash}`);

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);
    console.log(`[NFT] Confirmed in block ${receipt.blockNumber}`);

    // Parse tokenId from CertificateIssued event
    let tokenId = '0';
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = nftContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed && parsed.name === 'CertificateIssued') {
            tokenId = parsed.args.tokenId.toString();
            break;
          }
        } catch {
          // Not our event, skip
        }
      }
    }

    const contractAddress = NFT_CONTRACT_ADDRESS!;
    return {
      txHash: tx.hash,
      tokenId,
      contractAddress,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
      openseaUrl: `https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenId}`,
      recipient: checksumAddress,
    };
  } catch (err: any) {
    const message: string = err.message || String(err);

    if (message.includes('insufficient funds') || message.includes('balance too low')) {
      throw new Error(
        'Minter wallet has insufficient Sepolia ETH to cover gas fees. Please refill at https://sepoliafaucet.com'
      );
    }
    if (message.includes('CALL_EXCEPTION') || message.includes('execution reverted')) {
      throw new Error(`Smart contract rejected the transaction: ${message}`);
    }
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('NETWORK_ERROR')
    ) {
      throw new Error('RPC network timeout. Please try again.');
    }

    console.error('[NFT] Mint failed:', message);
    throw new Error(`NFT minting failed: ${message}`);
  } finally {
    release();
  }
}

export { NFT_CONTRACT_ADDRESS };
