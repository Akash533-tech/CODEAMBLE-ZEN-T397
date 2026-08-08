-- Migration 002: Add NFT columns to certificates table
-- Tracks on-chain NFT minting status for each certificate

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nft_tx_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nft_contract_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nft_wallet_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nft_ipfs_uri VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS nft_status VARCHAR(50) DEFAULT 'not_minted';

-- Index for quick lookup of minted status
CREATE INDEX IF NOT EXISTS idx_certificates_nft_status ON certificates(nft_status);

COMMENT ON COLUMN certificates.nft_status IS 'Values: not_minted | minting | minted | failed';
COMMENT ON COLUMN certificates.nft_ipfs_uri IS 'Full ipfs:// URI used as ERC-721 tokenURI';
