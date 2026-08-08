import { ExternalLink } from 'lucide-react';

export default function BlockchainBadge({ hash }) {
  if (!hash || hash === 'PENDING_CHAIN') {
    return (
      <span className="gl-badge gl-badge-pending">
        Pending Chain
      </span>
    );
  }
  if (hash.startsWith('0x') && hash.length === 66) {
    return (
      <a
        href={`https://sepolia.etherscan.io/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="gl-badge gl-badge-approved text-xs inline-flex items-center gap-1 hover:border-emerald-400 transition-colors"
        aria-label="Open transaction on Etherscan"
      >
        {hash.slice(0, 8)}...{hash.slice(-6)}
        <ExternalLink size={10} />
      </a>
    );
  }
  return (
    <span className="text-ct-light-muted text-xs font-mono">
      {hash?.slice(0, 16)}...
    </span>
  );
}
