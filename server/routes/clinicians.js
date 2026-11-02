import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate, requireRole } from '../auth.js';
import { scoreClinicianForJob } from '../matching.js';

const router = Router();

// GET /api/v1/clinicians
router.get('/', authenticate, (req, res) => {
  const { query, discipline, state, status, page = 1, limit = 25 } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 25;
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = [];
  let params = [];

  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR specialty LIKE ? OR city LIKE ?)');
    params.push(q, q, q, q, q);
  }
  if (discipline) {
    whereClauses.push('discipline = ?');
    params.push(discipline);
  }
  if (state) {
    whereClauses.push('state = ?');
    params.push(state);
  }
  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRow = db.prepare(`SELECT COUNT(*) AS count FROM clinicians ${whereStr}`).get(...params);
  const total = totalRow ? totalRow.count : 0;

  const sql = `
    SELECT * FROM clinicians
    ${whereStr}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const clinicians = db.prepare(sql).all(...params, limitNum, offset);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const in30DaysStr = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const items = clinicians.map(c => {
    const openSubs = db.prepare(`
      SELECT COUNT(*) AS count FROM submissions
      WHERE clinician_id = ? AND stage NOT IN ('placed', 'rejected', 'withdrawn')
    `).get(c.id).count;

    const credsVerified = db.prepare(`
      SELECT COUNT(*) AS count FROM credentials
      WHERE clinician_id = ? AND status = 'verified'
    `).get(c.id).count;

    const credsExpiring = db.prepare(`
      SELECT COUNT(*) AS count FROM credentials
      WHERE clinician_id = ? AND expires_on >= ? AND expires_on <= ? AND status NOT IN ('expired', 'rejected')
    `).get(c.id, todayStr, in30DaysStr).count;

    return {
      ...c,
      employment_types: typeof c.employment_types === 'string' ? JSON.parse(c.employment_types || '[]') : c.employment_types,
      tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : c.tags,
      open_submissions: openSubs,
      credentials_verified: credsVerified,
      credentials_expiring: credsExpiring
    };
  });

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum
  });
});

// GET /api/v1/clinicians/:id
router.get('/:id', authenticate, (req, res) => {
  const clinician = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(req.params.id);
  if (!clinician) {
    return res.status(404).json({ error: 'Clinician not found' });
  }

  clinician.employment_types = typeof clinician.employment_types === 'string' ? JSON.parse(clinician.employment_types || '[]') : clinician.employment_types;
  clinician.tags = typeof clinician.tags === 'string' ? JSON.parse(clinician.tags || '[]') : clinician.tags;

  const credentials = db.prepare('SELECT * FROM credentials WHERE clinician_id = ? ORDER BY id DESC').all(clinician.id);

  const submissions = db.prepare(`
    SELECT s.id, s.job_id, s.stage, s.match_score, s.submitted_at, j.title AS job_title, e.name AS employer_name
    FROM submissions s
    JOIN jobs j ON s.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    WHERE s.clinician_id = ?
    ORDER BY s.id DESC
  `).all(clinician.id);

  const openJobs = db.prepare(`
    SELECT j.*, e.name AS employer_name
    FROM jobs j
    JOIN employers e ON j.employer_id = e.id
    WHERE j.status = 'open'
  `).all();

  const matches = openJobs.map(job => {
    const { score, reasons } = scoreClinicianForJob(job, clinician, credentials);
    return {
      job_id: job.id,
      title: job.title,
      employer_name: job.employer_name,
      score,
      reasons
    };
  }).sort((a, b) => b.score - a.score).slice(0, 10);

  res.json({
    clinician,
    credentials,
    submissions,
    matches
  });
});

// POST /api/v1/clinicians
router.post('/', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const {
    first_name, last_name, email, phone, discipline, specialty,
    years_experience = 0, city, state, willing_to_travel = 0, remote_ok = 0,
    availability_date, rate_min, rate_max, rate_basis = 'hour',
    employment_types = [], status = 'active', source, tags = [], bio
  } = req.body || {};

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First name and last name required' });
  }

  const now = new Date().toISOString();
  const empTypesJson = typeof employment_types === 'string' ? employment_types : JSON.stringify(employment_types);
  const tagsJson = typeof tags === 'string' ? tags : JSON.stringify(tags);

  const result = db.prepare(`
    INSERT INTO clinicians (
      user_id, recruiter_id, first_name, last_name, email, phone, discipline, specialty,
      years_experience, city, state, willing_to_travel, remote_ok, availability_date,
      rate_min, rate_max, rate_basis, employment_types, status, source, tags, bio,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    null,
    req.user.id,
    first_name,
    last_name,
    email || null,
    phone || null,
    discipline || null,
    specialty || null,
    years_experience || 0,
    city || null,
    state || null,
    willing_to_travel ? 1 : 0,
    remote_ok ? 1 : 0,
    availability_date || null,
    rate_min !== undefined ? rate_min : null,
    rate_max !== undefined ? rate_max : null,
    rate_basis,
    empTypesJson,
    status,
    source || null,
    tagsJson,
    bio || null,
    now,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(newId);
  created.employment_types = JSON.parse(created.employment_types || '[]');
  created.tags = JSON.parse(created.tags || '[]');

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'clinician.create',
    entity: 'clinicians',
    entity_id: newId,
    summary: `Created clinician ${first_name} ${last_name}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

// PATCH /api/v1/clinicians/:id
router.patch('/:id', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clinician not found' });
  }

  const updates = req.body || {};
  const fields = [
    'first_name', 'last_name', 'email', 'phone', 'discipline', 'specialty',
    'years_experience', 'city', 'state', 'willing_to_travel', 'remote_ok',
    'availability_date', 'rate_min', 'rate_max', 'rate_basis', 'employment_types',
    'status', 'source', 'tags', 'bio'
  ];

  let setClauses = [];
  let params = [];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      let val = updates[field];
      if ((field === 'employment_types' || field === 'tags') && typeof val !== 'string') {
        val = JSON.stringify(val);
      } else if (field === 'willing_to_travel' || field === 'remote_ok') {
        val = val ? 1 : 0;
      }
      setClauses.push(`${field} = ?`);
      params.push(val);
    }
  }

  if (setClauses.length === 0) {
    return res.json(existing);
  }

  const now = new Date().toISOString();
  setClauses.push('updated_at = ?');
  params.push(now);
  params.push(req.params.id);

  db.prepare(`UPDATE clinicians SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(req.params.id);
  updated.employment_types = typeof updated.employment_types === 'string' ? JSON.parse(updated.employment_types || '[]') : updated.employment_types;
  updated.tags = typeof updated.tags === 'string' ? JSON.parse(updated.tags || '[]') : updated.tags;

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'clinician.update',
    entity: 'clinicians',
    entity_id: Number(req.params.id),
    summary: `Updated clinician ${updated.first_name} ${updated.last_name}`,
    ip: req.ip
  });

  res.json(updated);
});

// DELETE /api/v1/clinicians/:id
router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Clinician not found' });
  }

  db.prepare('DELETE FROM clinicians WHERE id = ?').run(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'clinician.delete',
    entity: 'clinicians',
    entity_id: Number(req.params.id),
    summary: `Deleted clinician ${existing.first_name} ${existing.last_name}`,
    ip: req.ip
  });

  res.json({ success: true });
});

// GET /api/v1/clinicians/:id/credentials
router.get('/:id/credentials', authenticate, (req, res) => {
  const items = db.prepare('SELECT * FROM credentials WHERE clinician_id = ? ORDER BY id DESC').all(req.params.id);
  res.json({ items });
});

// POST /api/v1/clinicians/:id/credentials
router.post('/:id/credentials', authenticate, (req, res) => {
  const clinician = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(req.params.id);
  if (!clinician) {
    return res.status(404).json({ error: 'Clinician not found' });
  }

  const { type, name, issuer, number, state, issued_on, expires_on, status = 'pending', document_url } = req.body || {};
  if (!type || !name) {
    return res.status(400).json({ error: 'Type and name required' });
  }

  const now = new Date().toISOString();
  let verifiedBy = null;
  let verifiedAt = null;
  if (status === 'verified') {
    verifiedBy = req.user.email;
    verifiedAt = now;
  }

  const result = db.prepare(`
    INSERT INTO credentials (
      clinician_id, type, name, issuer, number, state, issued_on, expires_on, status, verified_by, verified_at, document_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clinician.id,
    type,
    name,
    issuer || null,
    number || null,
    state || null,
    issued_on || null,
    expires_on || null,
    status,
    verifiedBy,
    verifiedAt,
    document_url || null,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM credentials WHERE id = ?').get(newId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'credential.create',
    entity: 'credentials',
    entity_id: newId,
    summary: `Created credential ${name} for clinician ${clinician.first_name} ${clinician.last_name}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

export default router;
