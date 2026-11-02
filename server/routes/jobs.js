import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate, requireRole } from '../auth.js';
import { scoreClinicianForJob } from '../matching.js';

const router = Router();

// GET /api/v1/jobs
router.get('/', authenticate, (req, res) => {
  const { status, priority, query, discipline, state } = req.query;

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('j.status = ?');
    params.push(status);
  }
  if (priority) {
    whereClauses.push('j.priority = ?');
    params.push(priority);
  }
  if (discipline) {
    whereClauses.push('j.discipline = ?');
    params.push(discipline);
  }
  if (state) {
    whereClauses.push('j.state = ?');
    params.push(state);
  }
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    whereClauses.push('(j.title LIKE ? OR j.city LIKE ? OR e.name LIKE ? OR j.description LIKE ?)');
    params.push(q, q, q, q);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT j.*, e.name AS employer_name
    FROM jobs j
    JOIN employers e ON j.employer_id = e.id
    ${whereStr}
    ORDER BY j.id DESC
  `;

  const jobs = db.prepare(sql).all(...params);

  const items = jobs.map(job => {
    const subsCount = db.prepare('SELECT COUNT(*) AS count FROM submissions WHERE job_id = ?').get(job.id).count;
    const shortlistedCount = db.prepare(`
      SELECT COUNT(*) AS count FROM submissions
      WHERE job_id = ? AND stage IN ('client_review', 'interview', 'offer', 'placed')
    `).get(job.id).count;

    return {
      ...job,
      required_certs: typeof job.required_certs === 'string' ? JSON.parse(job.required_certs || '[]') : job.required_certs,
      required_states: typeof job.required_states === 'string' ? JSON.parse(job.required_states || '[]') : job.required_states,
      submissions_count: subsCount,
      shortlisted_count: shortlistedCount
    };
  });

  res.json({
    items,
    total: items.length
  });
});

// GET /api/v1/jobs/:id
router.get('/:id', authenticate, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  job.required_certs = typeof job.required_certs === 'string' ? JSON.parse(job.required_certs || '[]') : job.required_certs;
  job.required_states = typeof job.required_states === 'string' ? JSON.parse(job.required_states || '[]') : job.required_states;

  const employer = db.prepare('SELECT * FROM employers WHERE id = ?').get(job.employer_id);

  const pipeline = db.prepare(`
    SELECT stage, COUNT(*) AS count FROM submissions
    WHERE job_id = ?
    GROUP BY stage
  `).all(job.id);

  const submissions = db.prepare(`
    SELECT s.id, s.clinician_id, s.stage, s.match_score, s.submitted_at,
           (c.first_name || ' ' || c.last_name) AS clinician_name,
           c.discipline, c.specialty
    FROM submissions s
    JOIN clinicians c ON s.clinician_id = c.id
    WHERE s.job_id = ?
    ORDER BY s.id DESC
  `).all(job.id);

  res.json({
    job,
    employer,
    pipeline,
    submissions
  });
});

// GET /api/v1/jobs/:id/matches
router.get('/:id/matches', authenticate, (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const limitNum = parseInt(req.query.limit, 10) || 10;

  const candidates = db.prepare("SELECT * FROM clinicians WHERE status = 'active'").all();

  const matches = candidates.map(clinician => {
    const credentials = db.prepare('SELECT * FROM credentials WHERE clinician_id = ?').all(clinician.id);
    const { score, reasons } = scoreClinicianForJob(job, clinician, credentials);
    return {
      clinician_id: clinician.id,
      name: `${clinician.first_name} ${clinician.last_name}`,
      discipline: clinician.discipline,
      specialty: clinician.specialty,
      state: clinician.state,
      years_experience: clinician.years_experience,
      rate_min: clinician.rate_min,
      rate_max: clinician.rate_max,
      availability_date: clinician.availability_date,
      score,
      reasons
    };
  }).sort((a, b) => b.score - a.score).slice(0, limitNum);

  res.json({ matches });
});

// POST /api/v1/jobs
router.post('/', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const {
    employer_id, title, discipline, specialty, city, state, setting, shift,
    shift_hours = 12, start_date, duration_weeks = 13, rate_min, rate_max,
    rate_basis = 'hour', openings = 1, status = 'open', priority = 'normal',
    required_certs = [], required_states = [], description
  } = req.body || {};

  if (!employer_id || !title || !discipline) {
    return res.status(400).json({ error: 'Employer ID, title, and discipline required' });
  }

  const now = new Date().toISOString();
  const certsJson = typeof required_certs === 'string' ? required_certs : JSON.stringify(required_certs);
  const statesJson = typeof required_states === 'string' ? required_states : JSON.stringify(required_states);

  const result = db.prepare(`
    INSERT INTO jobs (
      employer_id, recruiter_id, title, discipline, specialty, city, state, setting, shift,
      shift_hours, start_date, duration_weeks, rate_min, rate_max, rate_basis,
      openings, filled, status, priority, required_certs, required_states, description,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    employer_id,
    req.user.id,
    title,
    discipline,
    specialty || null,
    city || null,
    state || null,
    setting || null,
    shift || null,
    shift_hours,
    start_date || null,
    duration_weeks,
    rate_min !== undefined ? rate_min : null,
    rate_max !== undefined ? rate_max : null,
    rate_basis,
    openings,
    0,
    status,
    priority,
    certsJson,
    statesJson,
    description || null,
    now,
    now
  );

  const newId = Number(result.lastInsertRowid);
  const created = db.prepare('SELECT * FROM jobs WHERE id = ?').get(newId);
  created.required_certs = JSON.parse(created.required_certs || '[]');
  created.required_states = JSON.parse(created.required_states || '[]');

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'job.create',
    entity: 'jobs',
    entity_id: newId,
    summary: `Created job ${title}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

// PATCH /api/v1/jobs/:id
router.patch('/:id', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const updates = req.body || {};
  const fields = [
    'employer_id', 'title', 'discipline', 'specialty', 'city', 'state', 'setting', 'shift',
    'shift_hours', 'start_date', 'duration_weeks', 'rate_min', 'rate_max', 'rate_basis',
    'openings', 'filled', 'status', 'priority', 'required_certs', 'required_states', 'description'
  ];

  let setClauses = [];
  let params = [];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      let val = updates[field];
      if ((field === 'required_certs' || field === 'required_states') && typeof val !== 'string') {
        val = JSON.stringify(val);
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

  db.prepare(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  updated.required_certs = typeof updated.required_certs === 'string' ? JSON.parse(updated.required_certs || '[]') : updated.required_certs;
  updated.required_states = typeof updated.required_states === 'string' ? JSON.parse(updated.required_states || '[]') : updated.required_states;

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'job.update',
    entity: 'jobs',
    entity_id: Number(req.params.id),
    summary: `Updated job ${updated.title}`,
    ip: req.ip
  });

  res.json(updated);
});

export default router;
