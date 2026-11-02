import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate, requireRole } from '../auth.js';

const router = Router();

const MODES = ['phone', 'video', 'onsite'];
const OUTCOMES = ['scheduled', 'completed', 'no_show', 'cancelled'];

const SELECT_BASE = `
  SELECT i.*,
         (c.first_name || ' ' || c.last_name) AS clinician_name,
         j.title AS job_title,
         e.name AS employer_name,
         s.stage AS submission_stage
  FROM interviews i
  LEFT JOIN submissions s ON i.submission_id = s.id
  LEFT JOIN clinicians c ON i.clinician_id = c.id
  LEFT JOIN jobs j ON i.job_id = j.id
  LEFT JOIN employers e ON j.employer_id = e.id
`;

// GET /api/v1/interviews?job_id&clinician_id&submission_id&outcome&upcoming=true&limit
router.get('/', authenticate, (req, res) => {
  const { job_id, clinician_id, submission_id, outcome, upcoming } = req.query;
  const where = [];
  const params = [];

  if (job_id) {
    where.push('i.job_id = ?');
    params.push(Number(job_id));
  }
  if (clinician_id) {
    where.push('i.clinician_id = ?');
    params.push(Number(clinician_id));
  }
  if (submission_id) {
    where.push('i.submission_id = ?');
    params.push(Number(submission_id));
  }
  if (outcome) {
    if (!OUTCOMES.includes(outcome)) {
      return res.status(400).json({ error: `outcome must be one of ${OUTCOMES.join(', ')}` });
    }
    where.push('i.outcome = ?');
    params.push(outcome);
  }
  if (String(upcoming) === 'true') {
    where.push("i.outcome = 'scheduled' AND datetime(i.scheduled_at) >= datetime('now')");
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  const items = db
    .prepare(
      `${SELECT_BASE}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY datetime(i.scheduled_at) ASC
       LIMIT ?`
    )
    .all(...params, limit);

  res.json({ items, total: items.length });
});

// POST /api/v1/interviews
router.post('/', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const { submission_id, scheduled_at, duration_minutes, mode, interviewer, notes } = req.body || {};

  if (!submission_id || !scheduled_at) {
    return res.status(400).json({ error: 'submission_id and scheduled_at are required' });
  }

  const parsed = new Date(scheduled_at);
  if (Number.isNaN(parsed.getTime())) {
    return res.status(400).json({ error: 'scheduled_at must be an ISO datetime' });
  }

  if (mode !== undefined && !MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of ${MODES.join(', ')}` });
  }

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO interviews (
         submission_id, clinician_id, job_id, scheduled_at, duration_minutes, mode,
         interviewer, notes, outcome, created_by, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`
    )
    .run(
      submission.id,
      submission.clinician_id,
      submission.job_id,
      parsed.toISOString(),
      Number(duration_minutes) > 0 ? Number(duration_minutes) : 30,
      mode || 'video',
      interviewer || null,
      notes || null,
      req.user.id,
      now,
      now
    );

  const interviewId = Number(result.lastInsertRowid);

  // An interview implies the submission reached the interview stage
  if (submission.stage !== 'interview' && !['placed', 'rejected', 'withdrawn'].includes(submission.stage)) {
    db.prepare("UPDATE submissions SET stage = 'interview', stage_updated_at = ? WHERE id = ?").run(now, submission.id);
  }

  const created = db.prepare(`${SELECT_BASE} WHERE i.id = ?`).get(interviewId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'interview.create',
    entity: 'interviews',
    entity_id: interviewId,
    summary: `Scheduled ${created.mode} interview for ${created.clinician_name} on ${created.job_title} at ${created.scheduled_at}`,
    meta: { submission_id: submission.id, outcome: 'scheduled' },
    ip: req.ip,
  });

  res.status(201).json(created);
});

// PATCH /api/v1/interviews/:id
router.patch('/:id', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Interview not found' });
  }

  const { outcome, scheduled_at, interviewer, notes, mode, duration_minutes } = req.body || {};
  const updates = [];
  const values = [];

  if (outcome !== undefined) {
    if (!OUTCOMES.includes(outcome)) {
      return res.status(400).json({ error: `outcome must be one of ${OUTCOMES.join(', ')}` });
    }
    updates.push('outcome = ?');
    values.push(outcome);
  }
  if (scheduled_at !== undefined) {
    const parsed = new Date(scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'scheduled_at must be an ISO datetime' });
    }
    updates.push('scheduled_at = ?');
    values.push(parsed.toISOString());
  }
  if (mode !== undefined) {
    if (!MODES.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of ${MODES.join(', ')}` });
    }
    updates.push('mode = ?');
    values.push(mode);
  }
  if (duration_minutes !== undefined) {
    updates.push('duration_minutes = ?');
    values.push(Number(duration_minutes) > 0 ? Number(duration_minutes) : 30);
  }
  if (interviewer !== undefined) {
    updates.push('interviewer = ?');
    values.push(interviewer);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No supported fields supplied' });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  db.prepare(`UPDATE interviews SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare(`${SELECT_BASE} WHERE i.id = ?`).get(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'interview.update',
    entity: 'interviews',
    entity_id: updated.id,
    summary: `Interview ${updated.id} updated${outcome ? ` (${outcome})` : ''}`,
    meta: { outcome: updated.outcome },
    ip: req.ip,
  });

  res.json(updated);
});

export default router;
