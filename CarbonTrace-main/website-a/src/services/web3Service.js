import { ethers } from 'ethers';

// Contract addresses — loaded from env or set here after deployment
const LAND_REGISTRY_ADDRESS =
  import.meta.env.VITE_LAND_REGISTRY_ADDRESS ||
  '0x1964750319B71FEd6bf7b129CD90bEE5094C4F5D';

const CARBON_CREDIT_MANAGER_ADDRESS =
  import.meta.env.VITE_CARBON_CREDIT_MANAGER_ADDRESS ||
  '0xb16d9b5dF763bA0f640BDDA83d20E0D74a87C753';

const LAND_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'landId', type: 'string' },
      { internalType: 'string', name: 'ipfsCid', type: 'string' },
      { internalType: 'string', name: 'polygonHash', type: 'string' },
    ],
    name: 'registerLand',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const CARBON_CREDIT_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'landId', type: 'string' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'issueCredits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'landId', type: 'string' },
      { internalType: 'string', name: 'companyId', type: 'string' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferToCompany',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// ─── MetaMask Detection ──────────────────────────────────────────────────────

export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

// ─── Connect Wallet ──────────────────────────────────────────────────────────
// This explicitly requests accounts — triggering the MetaMask popup

export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed. Please install from metamask.io');
  }

  // Request accounts — this WILL trigger the MetaMask confirmation popup
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts?.length) {
    throw new Error('No accounts found. Please unlock MetaMask.');
  }

  // Switch to Sepolia testnet (chainId 11155111 = 0xaa36a7)
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],
    });
  } catch (err) {
    if (err.code === 4902) {
      // Chain not added yet — add Sepolia
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Ethereum Sepolia Testnet',
            rpcUrls: ['https://rpc.sepolia.org'],
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    } else if (err.code === 4001) {
      throw new Error('User rejected network switch to Sepolia. Please switch to Sepolia in MetaMask.');
    } else {
      throw err;
    }
  }

  return accounts[0];
}

// ─── Get already-connected address (no popup) ────────────────────────────────

export async function getConnectedAddress() {
  if (!isMetaMaskInstalled()) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
}

// ─── Get Ethers Signer ───────────────────────────────────────────────────────

async function getSigner() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  // getSigner() prompts MetaMask to connect if not yet connected
  return provider.getSigner();
}

// ─── Register Land on-chain via MetaMask ────────────────────────────────────
// This sends a real Sepolia transaction and waits for MetaMask confirmation

export async function signRegisterLand(landIdGov, ipfsCid, polygon) {
  // Step 1: Ensure wallet is connected (triggers MetaMask popup if needed)
  await connectWallet();

  // Step 2: Get signer after wallet is confirmed
  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  const contract = new ethers.Contract(
    LAND_REGISTRY_ADDRESS,
    LAND_REGISTRY_ABI,
    signer
  );

  const polygonStr = typeof polygon === 'object' ? JSON.stringify(polygon) : String(polygon);
  const polygonHash = polygonStr.substring(0, 64);

  console.log('[WEB3] 🚀 registerLand — CID:', ipfsCid, '| LandID:', landIdGov);
  console.log('[WEB3] Signer:', signerAddress, '| Contract:', LAND_REGISTRY_ADDRESS);

  // Step 3: Send transaction — MetaMask will show confirmation popup here
  const tx = await contract.registerLand(landIdGov, ipfsCid, polygonHash);

  console.log('[WEB3] ⏳ Tx submitted:', tx.hash);

  // Step 4: Wait for on-chain confirmation
  const receipt = await tx.wait();

  console.log('[WEB3] ✅ Confirmed in block:', receipt.blockNumber, '| Hash:', receipt.hash);

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    ipfsCid,
    explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
    ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsCid}`,
    signerAddress,
  };
}

// ─── Issue Carbon Credits on-chain via MetaMask ──────────────────────────────

export async function signIssueCredits(landIdGov, amount) {
  // Step 1: Ensure wallet is connected
  await connectWallet();

  const signer = await getSigner();
  const signerAddress = await signer.getAddress();

  const contract = new ethers.Contract(
    CARBON_CREDIT_MANAGER_ADDRESS,
    CARBON_CREDIT_ABI,
    signer
  );

  const amountWei = ethers.parseUnits(String(Math.max(1, Math.floor(amount))), 18);

  console.log('[WEB3] 🚀 issueCredits — Land:', landIdGov, '| Amount:', amount, 'CC');

  const tx = await contract.issueCredits(landIdGov, amountWei);
  console.log('[WEB3] ⏳ Tx submitted:', tx.hash);

  const receipt = await tx.wait();
  console.log('[WEB3] ✅ Confirmed in block:', receipt.blockNumber);

  return {
    success: true,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
    signerAddress,
  };
}
