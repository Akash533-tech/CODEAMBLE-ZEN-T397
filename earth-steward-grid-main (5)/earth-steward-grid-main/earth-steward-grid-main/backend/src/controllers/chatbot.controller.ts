import { Request, Response } from 'express';
import { query } from '../db/pool';
import { getChatbotResponse } from '../services/ndvi';
import { v4 as uuidv4 } from 'uuid';

const FAQS = [
  { q: 'What are carbon credits?', a: 'Carbon credits are tradable certificates representing the right to emit one tonne of CO2. By purchasing from the Government of India, companies can offset their carbon footprint while supporting national afforestation efforts.' },
  { q: 'How are carbon credits priced?', a: 'Prices range from Rs.500 to Rs.2000 per credit based on land type, NDVI score, location, and duration. Exact pricing is set by government officers after request approval.' },
  { q: 'What documents are required?', a: 'You need: (1) Valid CIN, (2) Board resolution authorizing the purchase, (3) Authorization letter (PDF), (4) Intended use declaration. Additional docs may be required for bulk purchases over 1,000 credits.' },
  { q: 'How long are certificates valid?', a: 'Certificate validity matches the duration selected at purchase: 1, 3, 5, or 10 years. Certificates can be renewed 30 days before expiry subject to credit availability.' },
  { q: 'Can credits be transferred?', a: 'Currently, carbon credits are non-transferable. They are issued to the purchasing company and cannot be resold or transferred to another entity.' },
  { q: 'How is carbon sequestration measured?', a: 'Using satellite imagery (NDVI analysis), ground-truth surveys, and IPCC Tier 2 methodology. Each parcel undergoes quarterly satellite assessment.' },
];

export async function createSession(req: Request, res: Response) {
  try {
    const sessionToken = uuidv4();
    const companyId = (req as any).user?.id || null;
    await query(
      'INSERT INTO chatbot_sessions (company_id, session_token, messages) VALUES ($1,$2,$3)',
      [companyId, sessionToken, JSON.stringify([])]
    );
    return res.json({ session_token: sessionToken });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const { session_token, message } = req.body;
    const sessionRes = await query('SELECT * FROM chatbot_sessions WHERE session_token=$1', [session_token]);
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const session = sessionRes.rows[0];
    const messages: Array<{role: string; content: string}> = session.messages || [];

    // Get live credits count
    const creditsRes = await query("SELECT COALESCE(SUM(credits_available),0) as total FROM land_parcels WHERE status='active'");
    const liveCredits = parseInt(creditsRes.rows[0].total || '0');

    const chatMessages = messages.map((m: any) => ({ role: m.role as 'user'|'assistant', content: m.content }));
    chatMessages.push({ role: 'user', content: message });

    const reply = await getChatbotResponse(chatMessages, liveCredits);

    messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() } as any);
    messages.push({ role: 'assistant', content: reply, timestamp: new Date().toISOString() } as any);

    await query(
      'UPDATE chatbot_sessions SET messages=$1, updated_at=NOW() WHERE session_token=$2',
      [JSON.stringify(messages), session_token]
    );

    return res.json({ reply, session_token });
  } catch (err) {
    console.error('chatbot sendMessage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getFaqs(req: Request, res: Response) {
  return res.json(FAQS);
}
