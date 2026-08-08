import crypto from 'crypto';
import { query } from '../db/pool';
import { LedgerBlock } from '../types';

const DIFFICULTY = 2;
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function calculateHash(block: Omit<LedgerBlock, 'block_hash'>): string {
  const blockStr = JSON.stringify({
    block_index: block.block_index,
    previous_hash: block.previous_hash,
    land_id: block.land_id,
    credits_delta: block.credits_delta,
    event_type: block.event_type,
    certificate_id: block.certificate_id,
    company_cin: block.company_cin,
    timestamp: block.timestamp,
    nonce: block.nonce,
    data: block.data,
  });
  return crypto.createHash('sha256').update(blockStr).digest('hex');
}

export function mineBlock(blockData: Omit<LedgerBlock, 'block_hash' | 'nonce'>): LedgerBlock {
  let nonce = 0;
  let hash = '';
  const prefix = '0'.repeat(DIFFICULTY);
  while (!hash.startsWith(prefix)) {
    nonce++;
    hash = calculateHash({ ...blockData, nonce });
  }
  return { ...blockData, nonce, block_hash: hash };
}

export async function getLatestBlock(): Promise<LedgerBlock | null> {
  const res = await query(
    'SELECT * FROM carbon_credit_ledger ORDER BY block_index DESC LIMIT 1'
  );
  return res.rows[0] || null;
}

export async function getBlockCount(): Promise<number> {
  const res = await query('SELECT COUNT(*) FROM carbon_credit_ledger');
  return parseInt(res.rows[0].count, 10);
}

export async function addBlock(data: {
  land_id: string;
  credits_delta: number;
  event_type: 'generated' | 'issued' | 'revoked';
  certificate_id?: string;
  company_cin?: string;
  extra?: any;
}): Promise<LedgerBlock> {
  const latest = await getLatestBlock();
  const count = await getBlockCount();

  const blockData: Omit<LedgerBlock, 'block_hash' | 'nonce'> = {
    block_index: count,
    previous_hash: latest ? latest.block_hash : GENESIS_HASH,
    land_id: data.land_id,
    credits_delta: data.credits_delta,
    event_type: data.event_type,
    certificate_id: data.certificate_id,
    company_cin: data.company_cin,
    timestamp: new Date(),
    data: { event_type: data.event_type, extra: data.extra || {} },
  };

  const minedBlock = mineBlock(blockData);

  await query(
    `INSERT INTO carbon_credit_ledger
      (block_index, block_hash, previous_hash, land_id, credits_delta, event_type,
       certificate_id, company_cin, timestamp, nonce, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      minedBlock.block_index,
      minedBlock.block_hash,
      minedBlock.previous_hash,
      minedBlock.land_id,
      minedBlock.credits_delta,
      minedBlock.event_type,
      minedBlock.certificate_id || null,
      minedBlock.company_cin || null,
      minedBlock.timestamp,
      minedBlock.nonce,
      JSON.stringify(minedBlock.data),
    ]
  );
  return minedBlock;
}

export async function validateChain(): Promise<{ valid: boolean; broken_at_index?: number }> {
  const res = await query('SELECT * FROM carbon_credit_ledger ORDER BY block_index ASC');
  const blocks: LedgerBlock[] = res.rows;

  if (blocks.length === 0) return { valid: true };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const recomputed = calculateHash({
      block_index: block.block_index,
      previous_hash: block.previous_hash,
      land_id: block.land_id,
      credits_delta: block.credits_delta,
      event_type: block.event_type,
      certificate_id: block.certificate_id,
      company_cin: block.company_cin,
      timestamp: block.timestamp,
      nonce: block.nonce,
      data: block.data,
    });

    if (recomputed !== block.block_hash) {
      return { valid: false, broken_at_index: block.block_index };
    }

    if (i > 0 && block.previous_hash !== blocks[i - 1].block_hash) {
      return { valid: false, broken_at_index: block.block_index };
    }
  }

  return { valid: true };
}

export async function ensureGenesisBlock(): Promise<void> {
  const count = await getBlockCount();
  if (count === 0) {
    console.log('Creating genesis block...');
    const genesisData: Omit<LedgerBlock, 'block_hash' | 'nonce'> = {
      block_index: 0,
      previous_hash: GENESIS_HASH,
      land_id: 'GENESIS',
      credits_delta: 0,
      event_type: 'generated',
      timestamp: new Date(),
      data: { message: 'India Carbon Credit Ledger - Genesis Block', program: 'National Carbon Credit Programme' },
    };
    const genesis = mineBlock(genesisData);
    await query(
      `INSERT INTO carbon_credit_ledger
        (block_index, block_hash, previous_hash, land_id, credits_delta, event_type,
         certificate_id, company_cin, timestamp, nonce, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        genesis.block_index,
        genesis.block_hash,
        genesis.previous_hash,
        genesis.land_id,
        genesis.credits_delta,
        genesis.event_type,
        null,
        null,
        genesis.timestamp,
        genesis.nonce,
        JSON.stringify(genesis.data),
      ]
    );
    console.log('Genesis block created:', genesis.block_hash);
  }
}
