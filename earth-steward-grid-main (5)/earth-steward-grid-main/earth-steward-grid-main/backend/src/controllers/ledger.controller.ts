import { Request, Response } from 'express';
import { query } from '../db/pool';
import { validateChain } from '../services/blockchain';

export async function getLedger(req: Request, res: Response) {
  try {
    const { land_id, state, date, page = 1, limit = 20 } = req.query as any;
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;
    if (land_id) { conditions.push(`cl.land_id ILIKE $${pIdx++}`); params.push(`%${land_id}%`); }
    if (date) { conditions.push(`DATE(cl.timestamp) = $${pIdx++}`); params.push(date); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;
    const countRes = await query(`SELECT COUNT(*) FROM carbon_credit_ledger cl ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM carbon_credit_ledger cl ${where} ORDER BY block_index DESC LIMIT $${pIdx} OFFSET $${pIdx+1}`,
      params
    );
    return res.json({
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: Number(page),
      pages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTotal(req: Request, res: Response) {
  try {
    const result = await query(`
      SELECT 
        SUM(CASE WHEN event_type='generated' THEN credits_delta ELSE 0 END) as total_generated,
        SUM(CASE WHEN event_type='issued' THEN ABS(credits_delta) ELSE 0 END) as total_issued,
        COALESCE((SELECT SUM(credits_available) FROM land_parcels WHERE status='active'), 0) as total_available
      FROM carbon_credit_ledger`);
    return res.json({
      total_generated: parseInt(result.rows[0].total_generated || '0'),
      total_issued: parseInt(result.rows[0].total_issued || '0'),
      total_available: parseInt(result.rows[0].total_available || '0'),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getBlock(req: Request, res: Response) {
  try {
    const { blockIndex } = req.params;
    const result = await query('SELECT * FROM carbon_credit_ledger WHERE block_index=$1', [blockIndex]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Block not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function validateChainEndpoint(req: Request, res: Response) {
  try {
    const result = await validateChain();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export const getPublicStats = async (req: Request, res: Response) => {
  try {
    const stateQuery = `
      SELECT state, SUM(credits_available) as credits
      FROM land_parcels
      WHERE status = 'active'
      GROUP BY state
      ORDER BY credits DESC
    `;
    const stateResult = await query(stateQuery);
    
    const topParcelsQuery = `
      SELECT land_identifier as id, state, district, land_type as "landType", credits_available as "availableCredits"
      FROM land_parcels
      WHERE status = 'active'
      ORDER BY credits_available DESC
      LIMIT 10
    `;
    const topParcelsResult = await query(topParcelsQuery);

    res.json({
      creditsByState: stateResult.rows.map(r => ({ state: r.state, credits: parseFloat(r.credits) })),
      topParcels: topParcelsResult.rows.map(r => ({ ...r, availableCredits: parseFloat(r.availableCredits) }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
