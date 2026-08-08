import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { uploadFile, generateS3Key } from '../services/storage';

function generateRequestId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `REQ-${year}-${rand}`;
}

export async function getListings(req: Request, res: Response) {
  try {
    const {
      state, land_type, min_credits, max_credits,
      min_price, max_price, sort, page = 1, limit = 9, search
    } = req.query as any;

    const conditions: string[] = ["status = 'active'", "credits_available > 0"];
    const params: any[] = [];
    let pIdx = 1;

    if (state) { conditions.push(`state ILIKE $${pIdx++}`); params.push(`%${state}%`); }
    if (land_type) { conditions.push(`land_type = $${pIdx++}`); params.push(land_type); }
    if (min_credits) { conditions.push(`credits_available >= $${pIdx++}`); params.push(min_credits); }
    if (max_credits) { conditions.push(`credits_available <= $${pIdx++}`); params.push(max_credits); }
    if (min_price) { conditions.push(`price_per_credit >= $${pIdx++}`); params.push(min_price); }
    if (max_price) { conditions.push(`price_per_credit <= $${pIdx++}`); params.push(max_price); }
    if (search) {
      conditions.push(`(land_id ILIKE $${pIdx} OR state ILIKE $${pIdx} OR district ILIKE $${pIdx})`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const orderBy =
      sort === 'price_desc' ? 'price_per_credit DESC' :
      sort === 'availability' ? 'credits_available DESC' :
      sort === 'area' ? 'area_hectares DESC' :
      'price_per_credit ASC';

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const countRes = await query(`SELECT COUNT(*) FROM land_parcels ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT * FROM land_parcels ${whereClause} ORDER BY ${orderBy} LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      params
    );

    return res.json({
      data: dataRes.rows,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('getListings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getListingDetail(req: Request, res: Response) {
  try {
    const { landId } = req.params;
    const result = await query('SELECT * FROM land_parcels WHERE land_id = $1', [landId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Land parcel not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function calculatePrice(req: Request, res: Response) {
  try {
    const { landId } = req.params;
    const { credits, duration_years } = req.query as any;
    const result = await query(
      'SELECT price_per_credit, credits_available FROM land_parcels WHERE land_id = $1',
      [landId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Land parcel not found' });
    const land = result.rows[0];
    const creditsNum = parseInt(credits);
    const durationNum = parseInt(duration_years) || 1;
    if (creditsNum > land.credits_available) {
      return res.status(400).json({ error: 'Requested credits exceed available credits' });
    }
    const durationMultiplier = durationNum >= 10 ? 1.2 : durationNum >= 5 ? 1.1 : durationNum >= 3 ? 1.05 : 1.0;
    const pricePerCredit = parseFloat(land.price_per_credit) * durationMultiplier;
    const totalAmount = pricePerCredit * creditsNum;
    return res.json({
      credits: creditsNum,
      duration_years: durationNum,
      price_per_credit: Math.round(pricePerCredit),
      total_amount: Math.round(totalAmount),
      available_credits: land.credits_available,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function submitRequest(req: Request, res: Response) {
  try {
    const { id: companyId } = req.user!;
    const { land_id, credits_requested, duration_years, intended_use, razorpay_payment_id } = req.body;

    // Validate credits available
    const landRes = await query('SELECT * FROM land_parcels WHERE land_id = $1 AND status = $2', [land_id, 'active']);
    if (landRes.rows.length === 0) return res.status(404).json({ error: 'Land parcel not found' });
    const land = landRes.rows[0];
    const creditsNum = parseInt(credits_requested);
    if (creditsNum > land.credits_available) {
      return res.status(400).json({ error: 'Requested credits exceed available credits' });
    }

    // Upload authorization letter
    let authLetterUrl: string | null = null;
    if (req.file) {
      const key = generateS3Key('auth-letters', req.file.mimetype === 'application/pdf' ? 'pdf' : 'png');
      const { url } = await uploadFile(req.file.buffer, key, req.file.mimetype);
      authLetterUrl = url;
    }

    const requestId = generateRequestId();
    const result = await query(
      `INSERT INTO purchase_requests
        (request_id, company_id, land_parcel_id, credits_requested, duration_years, intended_use, authorization_letter_url, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [requestId, companyId, land.id, creditsNum, parseInt(duration_years), intended_use, authLetterUrl, 'pending', 'pending']
    );

    // Notify company
    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company', $1, 'request_submitted', 'Request Submitted', $2)`,
      [companyId, `Your purchase request ${requestId} has been submitted and is pending review.`]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('submitRequest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
