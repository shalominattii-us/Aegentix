import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate, requireRole } from '../auth.js';

const router = Router();

// GET /api/v1/placements
router.get('/', authenticate, (req, res) => {
  const sql = `
    SELECT p.*,
           (c.first_name || ' ' || c.last_name) AS clinician_name,
           j.title AS job_title,
           e.name AS employer_name
    FROM placements p
    JOIN clinicians c ON p.clinician_id = c.id
    JOIN jobs j ON p.job_id = j.id
    JOIN employers e ON p.employer_id = e.id
    ORDER BY p.id DESC
  `;

  const items = db.prepare(sql).all();

  let activeCount = 0;
  let totalHours = 0;
  let totalRevenue = 0;
  let feesPending = 0;

  for (const item of items) {
    if (item.status === 'active') activeCount++;
    totalHours += item.hours || 0;
    totalRevenue += item.fee_amount || 0;
    if (item.fee_status === 'pending') {
      feesPending += item.fee_amount || 0;
    }
  }

  res.json({
    items,
    totals: {
      active: activeCount,
      hours: totalHours,
      revenue: totalRevenue,
      fees_pending: feesPending
    }
  });
});

// POST /api/v1/placements
router.post('/', authenticate, (req, res) => {
  const { submission_id, start_date, bill_rate, pay_rate, hours } = req.body || {};

  if (!submission_id || bill_rate === undefined || pay_rate === undefined) {
    return res.status(400).json({ error: 'Submission ID, bill_rate, and pay_rate required' });
  }

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submission_id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(submission.job_id);
  if (!job) {
    return res.status(404).json({ error: 'Associated job not found' });
  }

  const clinician = db.prepare('SELECT * FROM clinicians WHERE id = ?').get(submission.clinician_id);
  if (!clinician) {
    return res.status(404).json({ error: 'Associated clinician not found' });
  }

  const billRateNum = Number(bill_rate);
  const payRateNum = Number(pay_rate);
  const hoursNum = hours !== undefined && hours !== null ? Number(hours) : 0;

  let feeAmount = 0;
  if (hoursNum > 0) {
    feeAmount = hoursNum * (billRateNum - payRateNum);
  } else {
    feeAmount = billRateNum * 0.2 * 160;
  }

  const now = new Date().toISOString();
  const startDateStr = start_date || job.start_date || now.split('T')[0];

  const result = db.prepare(`
    INSERT INTO placements (
      submission_id, clinician_id, job_id, employer_id, recruiter_id,
      start_date, hours, pay_rate, bill_rate, fee_amount, fee_status, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    submission.id,
    clinician.id,
    job.id,
    job.employer_id,
    req.user.id,
    startDateStr,
    hoursNum,
    payRateNum,
    billRateNum,
    feeAmount,
    'pending',
    'active',
    now
  );

  const placementId = Number(result.lastInsertRowid);

  // Side Effect 1: Update submission stage = 'placed'
  db.prepare(`
    UPDATE submissions SET stage = 'placed', stage_updated_at = ? WHERE id = ?
  `).run(now, submission.id);

  // Side Effect 2: Increment job filled count and set status = 'filled' if filled >= openings
  const newFilled = (job.filled || 0) + 1;
  let newStatus = job.status;
  if (newFilled >= (job.openings || 1)) {
    newStatus = 'filled';
  }
  db.prepare(`
    UPDATE jobs SET filled = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(newFilled, newStatus, now, job.id);

  // Side Effect 3: Optionally set clinician status = 'placed' if active
  db.prepare(`
    UPDATE clinicians SET status = 'placed', updated_at = ? WHERE id = ?
  `).run(now, clinician.id);

  const created = db.prepare('SELECT * FROM placements WHERE id = ?').get(placementId);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'placement.create',
    entity: 'placements',
    entity_id: placementId,
    summary: `Created placement for clinician ${clinician.first_name} ${clinician.last_name} on job ${job.title}`,
    ip: req.ip
  });

  res.status(201).json(created);
});

const FEE_STATUSES = ['pending', 'invoiced', 'paid'];
const PLACEMENT_STATUSES = ['active', 'completed', 'cancelled'];

// PATCH /api/v1/placements/:id  (invoice + close-out workflow)
router.patch('/:id', authenticate, requireRole('recruiter', 'admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM placements WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Placement not found' });
  }

  const { fee_status, status, end_date, hours, bill_rate, pay_rate } = req.body || {};
  const updates = [];
  const values = [];

  if (fee_status !== undefined) {
    if (!FEE_STATUSES.includes(fee_status)) {
      return res.status(400).json({ error: `fee_status must be one of ${FEE_STATUSES.join(', ')}` });
    }
    updates.push('fee_status = ?');
    values.push(fee_status);
  }

  if (status !== undefined) {
    if (!PLACEMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${PLACEMENT_STATUSES.join(', ')}` });
    }
    updates.push('status = ?');
    values.push(status);
  }

  if (end_date !== undefined) {
    if (end_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(end_date))) {
      return res.status(400).json({ error: 'end_date must be YYYY-MM-DD' });
    }
    updates.push('end_date = ?');
    values.push(end_date);
  }

  const hoursNum = hours !== undefined ? Number(hours) : existing.hours;
  const billNum = bill_rate !== undefined ? Number(bill_rate) : existing.bill_rate;
  const payNum = pay_rate !== undefined ? Number(pay_rate) : existing.pay_rate;

  if (hours !== undefined || bill_rate !== undefined || pay_rate !== undefined) {
    if ([hoursNum, billNum, payNum].some((n) => Number.isNaN(n) || n < 0)) {
      return res.status(400).json({ error: 'hours, bill_rate and pay_rate must be non-negative numbers' });
    }
    if (billNum < payNum) {
      return res.status(400).json({ error: 'bill_rate cannot be lower than pay_rate' });
    }
    const fee = hoursNum > 0 ? hoursNum * (billNum - payNum) : billNum * 0.2 * 160;
    updates.push('hours = ?', 'bill_rate = ?', 'pay_rate = ?', 'fee_amount = ?');
    values.push(hoursNum, billNum, payNum, fee);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No supported fields supplied' });
  }

  values.push(req.params.id);
  db.prepare(`UPDATE placements SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM placements WHERE id = ?').get(req.params.id);

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'placement.update',
    entity: 'placements',
    entity_id: updated.id,
    summary: `Placement ${updated.id} updated (${updates.map((u) => u.split(' ')[0]).join(', ')})`,
    meta: { fee_status: updated.fee_status, status: updated.status },
    ip: req.ip
  });

  res.json(updated);
});

export default router;
