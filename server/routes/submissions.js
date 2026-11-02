import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate } from '../auth.js';
import { scoreClinicianForJob } from '../matching.js';

const router = Router();

// GET /api/v1/submissions
router.get('/', authenticate, (req, res) => {
  const { stage, job_id, clinician_id, limit = 50 } = req.query;
  const limitNum = parseInt(limit, 10) || 50;

  let whereClauses = [];
  let params = [];

  if (stage) {
    whereClauses.push('s.stage = ?');
    params.push(stage);
  }
  if (job_id) {
    whereClauses.push('s.job_id = ?');
    params.push(job_id);
  }
  if (clinician_id) {
    whereClauses.push('s.clinician_id = ?');
    params.push(clinician_id);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT s.*,
           (c.first_name || ' ' || c.last_name) AS clinician_name,
           c.discipline, c.specialty,
           j.title AS job_title,
           e.name AS employer_name
    FROM submissions s
    JOIN clinicians c ON s.clinician_id = c.id
    JOIN jobs j ON s.job_id = j.id
    JOIN employers e ON j.employer_id = e.id
    ${whereStr}
    ORDER BY s.id DESC
    LIMIT ?
  `;

  const items = db.prepare(sql).all(...params, limitNum);

  res.json({ items });
});

// POST /api/v1/submissions
router.post('/', authenticate, (req, res) => {
  const { job_id, clinician_id, notes } = req.body || {};

  if (!job_id || !clinician_id) {
    return res.status(400).json({ error: 'Job ID and clinician ID required' });
  }

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const clinician = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(clinician_id);
  if (!clinician) {
    return res.status(404).json({ error: 'Clinician not found' });
  }

  // Check duplicate active submission
  const existing = db.prepare(`
    SELECT id FROM submissions
    WHERE job_id = ? AND clinician_id = ? AND stage NOT IN ('rejected', 'withdrawn')
  `).get(job_id, clinician_id);

  if (existing) {
    return res.status(409).json({ error: 'Active submission already exists for this clinician and job' });
  }

  const credentials = db.prepare('SELECT * FROM credentials WHERE clinician_id = ?').all(clinician_id);
  const { score } = scoreClinicianForJob(job, clinician, credentials);

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO submissions (
      job_id, clinician_id, recruiter_id, stage, match_score, submitted_at, stage_updated_at, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    job_id,
    clinician_id,
    req.user.id,
    'submitted',
    score,
    now,
    now,
    notes || null,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM submissions WHERE id = ?').get(newId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'submission.create',
    entity: 'submissions',
    entity_id: newId,
    summary: `Submitted clinician ${clinician.first_name} ${clinician.last_name} for job ${job.title}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

// PATCH /api/v1/submissions/:id
router.patch('/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const updates = req.body || {};
  const fields = ['stage', 'notes', 'offer_rate', 'rejection_reason'];

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

  const now = new Date().toISOString();
  setClauses.push('stage_updated_at = ?');
  params.push(now);
  params.push(req.params.id);

  db.prepare(`UPDATE submissions SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'submission.update_stage',
    entity: 'submissions',
    entity_id: Number(req.params.id),
    summary: `Updated submission stage to ${updated.stage}`,
    ip: req.ip
  });

  res.json(updated);
});

// DELETE /api/v1/submissions/:id
router.delete('/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'submission.delete',
    entity: 'submissions',
    entity_id: Number(req.params.id),
    summary: `Deleted submission #${existing.id}`,
    ip: req.ip
  });

  res.json({ success: true });
});

export default router;
