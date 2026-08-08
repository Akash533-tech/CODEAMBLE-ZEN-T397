import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { JWTPayload } from '../types';

function generateRequestId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `REQ-${year}-${random}`;
}

function signTokens(payload: JWTPayload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function storeRefreshToken(userId: string, userType: string, refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (token_hash, user_id, user_type, expires_at) VALUES ($1,$2,$3,$4)',
    [tokenHash, userId, userType, expiresAt]
  );
}

export async function registerCompany(req: Request, res: Response) {
  try {
    const { cin, name, contact_email, contact_phone, password, registered_address, gstin, pan } = req.body;
    const existing = await query('SELECT id FROM companies WHERE cin = $1 OR contact_email = $2', [cin, contact_email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Company with this CIN or email already exists' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO companies (cin, name, contact_email, contact_phone, password_hash, registered_address, gstin, pan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, cin, name, contact_email, is_verified, created_at`,
      [cin, name, contact_email, contact_phone, password_hash, registered_address, gstin, pan]
    );
    const company = result.rows[0];
    const payload: JWTPayload = { id: company.id, type: 'company', cin: company.cin };
    const { accessToken, refreshToken } = signTokens(payload);
    await storeRefreshToken(company.id, 'company', refreshToken);
    return res.status(201).json({ accessToken, refreshToken, company });
  } catch (err) {
    console.error('registerCompany error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function loginCompany(req: Request, res: Response) {
  try {
    const { cin, password } = req.body;
    const result = await query('SELECT * FROM companies WHERE cin = $1', [cin]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid CIN or password' });
    }
    const company = result.rows[0];
    const valid = await bcrypt.compare(password, company.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid CIN or password' });
    const payload: JWTPayload = { id: company.id, type: 'company', cin: company.cin };
    const { accessToken, refreshToken } = signTokens(payload);
    await storeRefreshToken(company.id, 'company', refreshToken);
    const { password_hash: _, ...safeCompany } = company;
    return res.json({ accessToken, refreshToken, company: safeCompany });
  } catch (err) {
    console.error('loginCompany error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function loginGov(req: Request, res: Response) {
  try {
    const { officer_id, password } = req.body;
    const result = await query('SELECT * FROM government_officers WHERE officer_id = $1', [officer_id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid officer ID or password' });
    }
    const officer = result.rows[0];
    const valid = await bcrypt.compare(password, officer.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid officer ID or password' });
    const payload: JWTPayload = {
      id: officer.id, type: 'officer', officer_id: officer.officer_id, role: officer.role,
    };
    const { accessToken, refreshToken } = signTokens(payload);
    await storeRefreshToken(officer.id, 'officer', refreshToken);
    const { password_hash: _, ...safeOfficer } = officer;
    return res.json({ accessToken, refreshToken, officer: safeOfficer });
  } catch (err) {
    console.error('loginGov error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refresh_token } = req.body;
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const storedRes = await query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    if (storedRes.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token not found or expired' });
    }
    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    const payload: JWTPayload = { id: decoded.id, type: decoded.type, cin: decoded.cin, officer_id: decoded.officer_id, role: decoded.role };
    const { accessToken, refreshToken: newRefreshToken } = signTokens(payload);
    await storeRefreshToken(decoded.id, decoded.type, newRefreshToken);
    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('refreshToken error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  // Simplified: in real app, send email with reset link
  const { email } = req.body;
  const result = await query('SELECT id, name FROM companies WHERE contact_email = $1', [email]);
  // Always return 200 to not reveal if email exists
  console.log(`[FORGOT PASSWORD] Reset requested for: ${email}`);
  return res.json({ message: 'If this email is registered, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  // Simplified implementation
  const { token, password } = req.body;
  return res.json({ message: 'Password reset functionality requires email setup. Please contact support.' });
}
