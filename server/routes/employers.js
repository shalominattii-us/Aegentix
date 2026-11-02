import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate, requireRole } from '../auth.js';

const router = Router();

// GET /api/v1/employers
router.get('/', authenticate, (req, res) => {
  const { query, contract_status } = req.query;

  let whereClauses = [];
  let params = [];

  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    whereClauses.push('(name LIKE ? OR city LIKE ? OR contact_name LIKE ? OR contact_email LIKE ?)');
    params.push(q, q, q, q);
  }
  if (contract_status) {
    whereClauses.push('contract_status = ?');
    params.push(contract_status);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const employers = db.prepare(`SELECT * FROM employers ${whereStr} ORDER BY id DESC`).all(...params);

  const items = employers.map(emp => {
    const openJobs = db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE employer_id = ? AND status = 'open'").get(emp.id).count;
    const activePlacements = db.prepare("SELECT COUNT(*) AS count FROM placements WHERE employer_id = ? AND status = 'active'").get(emp.id).count;
    return {
      ...emp,
      open_jobs: openJobs,
      active_placements: activePlacements
    };
  });

  res.json({
    items,
    total: items.length
  });
});

// GET /api/v1/employers/:id
router.get('/:id', authenticate, (req, res) => {
  const employer = db.prepare('SELECT * FROM employers WHERE id = ?').get(req.params.id);
  if (!employer) {
    return res.status(404).json({ error: 'Employer not found' });
  }

  const jobs = db.prepare('SELECT * FROM jobs WHERE employer_id = ? ORDER BY id DESC').all(employer.id);

  const openJobsCount = db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE employer_id = ? AND status = 'open'").get(employer.id).count;
  const activePlacementsCount = db.prepare("SELECT COUNT(*) AS count FROM placements WHERE employer_id = ? AND status = 'active'").get(employer.id).count;
  const revRow = db.prepare('SELECT COALESCE(SUM(fee_amount), 0) AS total FROM placements WHERE employer_id = ?').get(employer.id);

  res.json({
    employer,
    jobs,
    summary: {
      open_jobs: openJobsCount,
      placements_active: activePlacementsCount,
      revenue_total: revRow ? revRow.total : 0
    }
  });
});

// POST /api/v1/employers
router.post('/', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const {
    name, type = 'hospital', city, state, ehr,
    contact_name, contact_email, contact_phone, baa_signed_at,
    contract_status = 'prospect', fee_pct = 0.20, notes
  } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Employer name required' });
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO employers (
      name, type, city, state, ehr, contact_name, contact_email, contact_phone,
      baa_signed_at, contract_status, fee_pct, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    type,
    city || null,
    state || null,
    ehr || null,
    contact_name || null,
    contact_email || null,
    contact_phone || null,
    baa_signed_at || null,
    contract_status,
    fee_pct !== undefined ? fee_pct : 0.20,
    notes || null,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM employers WHERE id = ?').get(newId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'employer.create',
    entity: 'employers',
    entity_id: newId,
    summary: `Created employer ${name}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

// PATCH /api/v1/employers/:id
router.patch('/:id', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM employers WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Employer not found' });
  }

  const updates = req.body || {};
  const fields = [
    'name', 'type', 'city', 'state', 'ehr',
    'contact_name', 'contact_email', 'contact_phone',
    'baa_signed_at', 'contract_status', 'fee_pct', 'notes'
  ];

  let setClauses = [];
  let params = [];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  if (setClauses.length === 0) {
    return res.json(existing);
  }

  params.push(req.params.id);
  db.prepare(`UPDATE employers SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM employers WHERE id = ?').get(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'employer.update',
    entity: 'employers',
    entity_id: Number(req.params.id),
    summary: `Updated employer ${updated.name}`,
    ip: req.ip
  });

  res.json(updated);
});

export default router;
