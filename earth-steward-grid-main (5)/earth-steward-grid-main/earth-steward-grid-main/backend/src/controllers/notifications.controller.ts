import { Request, Response } from 'express';
import { query } from '../db/pool';

function getRecipientType(user: any): 'company' | 'officer' {
  return user.type === 'company' ? 'company' : 'officer';
}

export async function getNotifications(req: Request, res: Response) {
  try {
    const recipientType = getRecipientType(req.user!);
    const result = await query(
      'SELECT * FROM notifications WHERE recipient_id=$1 AND recipient_type=$2 ORDER BY created_at DESC LIMIT 50',
      [req.user!.id, recipientType]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    return res.json({ notifications: result.rows, unread_count: unreadCount });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query(
      'UPDATE notifications SET is_read=true WHERE id=$1 AND recipient_id=$2',
      [id, req.user!.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    await query(
      'UPDATE notifications SET is_read=true WHERE recipient_id=$1',
      [req.user!.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
