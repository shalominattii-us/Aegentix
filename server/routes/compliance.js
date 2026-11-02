import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

// GET /api/v1/compliance/expiring?days=30
router.get('/expiring', authenticate, (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const now = new Date();

  const credentials = db.prepare(`
    SELECT c.*, (cl.first_name || ' ' || cl.last_name) AS clinician_name
    FROM credentials c
    JOIN clinicians cl ON c.clinician_id = cl.id
    WHERE c.expires_on IS NOT NULL AND c.expires_on != ''
  `).all();

  const itemsWithDays = credentials.map(c => {
    const exp = new Date(c.expires_on);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...c,
      days_left: daysLeft
    };
  }).filter(c => c.days_left <= days)
    .sort((a, b) => a.days_left - b.days_left);

  res.json({ items: itemsWithDays });
});

// GET /api/v1/compliance/audit?limit=50
router.get('/audit', authenticate, (req, res) => {
  const limitNum = parseInt(req.query.limit, 10) || 50;

  const items = db.prepare(`
    SELECT * FROM audit_log
    ORDER BY id DESC
    LIMIT ?
  `).all(limitNum);

  res.json({ items });
});

export default router;
