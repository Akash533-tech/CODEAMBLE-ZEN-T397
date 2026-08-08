import { useState, useEffect } from 'react';
import { Wallet, ExternalLink, AlertCircle } from 'lucide-react';
import {
  connectWallet,
  getConnectedAddress,
  isMetaMaskInstalled,
} from '../services/web3Service';

export default function WalletConnect() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getConnectedAddress().then((addr) => {
      if (addr) setAddress(addr);
    });

    const handleAccountsChanged = (accounts) => {
      setAddress(accounts[0] || null);
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (!isMetaMaskInstalled()) {
    return (
      <a
        href="https://metamask.io/download"
        target="_blank"
        rel="noopener noreferrer"
        className="gl-badge gl-badge-pending inline-flex items-center gap-2 px-3 py-1.5 hover:border-amber-400 transition-colors"
      >
        <AlertCircle size={12} />
        Install MetaMask
        <ExternalLink size={10} />
      </a>
    );
  }

  if (!address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="gl-btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-full disabled:opacity-50"
        >
          <Wallet size={12} />
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {error && (
          <span className="text-red-500 text-xs max-w-56 text-right">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="gl-badge gl-badge-approved inline-flex items-center gap-2 px-3 py-1.5 rounded-full">
      <span className="gl-live-dot" />
      <span className="font-mono tracking-wide">
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
      <a
        href={`https://sepolia.etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-700 hover:text-emerald-900 transition-colors"
        aria-label="Open connected wallet on Etherscan"
      >
        <ExternalLink size={10} />
      </a>
    </div>
  );
}
