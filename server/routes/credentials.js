import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

// PATCH /api/v1/credentials/:id
router.patch('/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM credentials WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Credential not found' });
  }

  const updates = req.body || {};
  const fields = ['type', 'name', 'issuer', 'number', 'state', 'issued_on', 'expires_on', 'status', 'document_url'];

  let setClauses = [];
  let params = [];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  // Handle verified status transition
  if (updates.status === 'verified') {
    const now = new Date().toISOString();
    setClauses.push('verified_by = ?');
    params.push(req.user.email);
    setClauses.push('verified_at = ?');
    params.push(now);
  }

  if (setClauses.length === 0) {
    return res.json(existing);
  }

  params.push(req.params.id);
  db.prepare(`UPDATE credentials SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM credentials WHERE id = ?').get(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'credential.update',
    entity: 'credentials',
    entity_id: Number(req.params.id),
    summary: `Updated credential ${updated.name} (status: ${updated.status})`,
    ip: req.ip
  });

  res.json(updated);
});

export default router;
