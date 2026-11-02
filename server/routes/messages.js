import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

// GET /api/v1/messages/thread/:threadKey
router.get('/thread/:threadKey', authenticate, (req, res) => {
  const items = db.prepare(`
    SELECT m.*,
           s.full_name AS sender_name,
           r.full_name AS recipient_name
    FROM messages m
    LEFT JOIN users s ON m.sender_id = s.id
    LEFT JOIN users r ON m.recipient_id = r.id
    WHERE m.thread_key = ?
    ORDER BY m.id ASC
  `).all(req.params.threadKey);

  res.json({ items });
});

// POST /api/v1/messages
router.post('/', authenticate, (req, res) => {
  const { thread_key, recipient_id, body } = req.body || {};

  if (!thread_key || !body) {
    return res.status(400).json({ error: 'Thread key and message body required' });
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO messages (thread_key, sender_id, recipient_id, body, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    thread_key,
    req.user.id,
    recipient_id || null,
    body,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM messages WHERE id = ?').get(newId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'message.send',
    entity: 'messages',
    entity_id: newId,
    summary: `Sent message in thread ${thread_key}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

export default router;
