import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet, Loader2, CheckCircle2, XCircle, ExternalLink,
  Sparkles, UploadCloud, Cpu, ShieldCheck, AlertCircle,
  RefreshCw, Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { connectWallet } from '@/services/wallet';
import { mintCertificateNFT, type NFTMintResult } from '@/services/company';

type MintStep = 'idle' | 'wallet' | 'generating' | 'uploading' | 'minting' | 'success' | 'error';

interface MintNFTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cert: any;
  onSuccess?: (result: NFTMintResult) => void;
}

const STEPS = [
  { key: 'generating', icon: Cpu, label: 'Generating Certificate PDF' },
  { key: 'uploading', icon: UploadCloud, label: 'Uploading to IPFS' },
  { key: 'minting', icon: Sparkles, label: 'Minting on Sepolia' },
  { key: 'success', icon: ShieldCheck, label: 'Confirmed on Blockchain' },
];

function StepIndicator({ currentStep }: { currentStep: MintStep }) {
  const activeIdx = STEPS.findIndex(s => s.key === currentStep);
  return (
    <div className="space-y-2 my-4">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = activeIdx > idx || currentStep === 'success';
        const active = step.key === currentStep;
        const pending = activeIdx < idx && currentStep !== 'success';
        return (
          <div
            key={step.key}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${done ? 'bg-green-50 border border-green-200' : active ? 'bg-blue-50 border border-blue-200' : 'bg-secondary/30 border border-transparent'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-secondary'}`}>
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Icon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <span className={`text-sm font-medium ${done ? 'text-green-700' : active ? 'text-blue-700' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
            {done && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
          </div>
        );
      })}
    </div>
  );
}

export function MintNFTDialog({ open, onOpenChange, cert, onSuccess }: MintNFTDialogProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [step, setStep] = useState<MintStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<NFTMintResult | null>(null);

  const handleConnectWallet = async () => {
    setStep('wallet');
    try {
      const addr = await connectWallet();
      setWalletAddress(addr);
      setStep('idle');
      toast({ title: '✅ Wallet Connected', description: addr.slice(0, 10) + '...' + addr.slice(-4) });
    } catch (err: any) {
      setStep('idle');
      toast({ title: 'Wallet Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleMint = useCallback(async () => {
    if (!walletAddress) return;
    setError(null);
    setMintResult(null);

    try {
      setStep('generating');
      // Small delay for UX — backend does PDF + IPFS + mint in one call
      await new Promise(r => setTimeout(r, 800));

      setStep('uploading');
      await new Promise(r => setTimeout(r, 600));

      setStep('minting');
      const result = await mintCertificateNFT(cert.certificate_id, walletAddress);

      setMintResult(result);
      setStep('success');
      onSuccess?.(result);
      toast({
        title: '🎉 NFT Minted Successfully!',
        description: `Token #${result.nft_token_id} minted on Sepolia`,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Minting failed';
      setError(msg);
      setStep('error');
      toast({ title: 'Minting Failed', description: msg, variant: 'destructive' });
    }
  }, [walletAddress, cert]);

  const handleRetry = () => {
    setStep('idle');
    setError(null);
    setMintResult(null);
  };

  const handleClose = () => {
    if (step === 'generating' || step === 'uploading' || step === 'minting') return; // Block close during mint
    onOpenChange(false);
    setTimeout(() => {
      setStep('idle');
      setError(null);
      setMintResult(null);
    }, 300);
  };

  const isMinting = ['generating', 'uploading', 'minting'].includes(step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <DialogTitle className="flex items-center gap-2 text-base font-bold">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          Mint Certificate as NFT
        </DialogTitle>

        <p className="text-xs text-muted-foreground -mt-1">
          Certificate <span className="font-mono font-semibold">{cert?.certificate_id}</span> will be minted
          as an ERC-721 NFT on Ethereum Sepolia testnet.
        </p>

        {/* Step 1: Connect Wallet */}
        {step !== 'success' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border transition-all ${walletAddress ? 'border-green-300 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-4 h-4 ${walletAddress ? 'text-green-600' : 'text-amber-500'}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {walletAddress ? 'Wallet Connected' : 'Connect MetaMask'}
                    </p>
                    {walletAddress && (
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                      </p>
                    )}
                  </div>
                </div>
                {walletAddress ? (
                  <Badge className="bg-green-500 text-white text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-amber-300 hover:bg-amber-50"
                    onClick={handleConnectWallet}
                    disabled={step === 'wallet'}
                  >
                    {step === 'wallet' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect'}
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Steps (only shown while minting) */}
            {isMinting && <StepIndicator currentStep={step} />}

            {/* Error State */}
            {step === 'error' && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Minting Failed</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isMinting && (
              <div className="flex gap-2">
                {step === 'error' ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleRetry}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleClose}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="text-xs" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      onClick={handleMint}
                      disabled={!walletAddress}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      {walletAddress ? 'Mint NFT on Sepolia' : 'Connect wallet first'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {isMinting && (
              <p className="text-center text-xs text-muted-foreground animate-pulse">
                Please wait — do not close this window...
              </p>
            )}
          </div>
        )}

        {/* Success State */}
        {step === 'success' && mintResult && (
          <div className="space-y-4">
            <StepIndicator currentStep="success" />

            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-700">NFT Minted! 🎉</p>
                  <p className="text-[10px] text-green-600">Token #{mintResult.nft_token_id} on Sepolia</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">Token ID</span>
                  <span className="font-bold text-green-700">#{mintResult.nft_token_id}</span>
                </div>
                <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-mono text-[10px]">
                    {mintResult.nft_wallet_address.slice(0, 8)}...{mintResult.nft_wallet_address.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <span className="font-mono text-[10px]">
                    {mintResult.nft_tx_hash.slice(0, 10)}...{mintResult.nft_tx_hash.slice(-6)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={mintResult.etherscan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Sepolia Etherscan
              </a>
              <a
                href={mintResult.opensea_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Testnet OpenSea
              </a>
              <Button size="sm" variant="outline" className="text-xs w-full" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
