import { Router } from 'express';
import { db, writeAuditLog } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/v1/exports/candidates.csv
router.get('/candidates.csv', authenticate, (req, res) => {
  const { query = '', discipline = '', state = '', status = '' } = req.query;

  const where = [];
  const params = [];

  if (query) {
    where.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.specialty LIKE ? OR c.email LIKE ?)');
    const like = `%${query}%`;
    params.push(like, like, like, like);
  }
  if (discipline) {
    where.push('c.discipline = ?');
    params.push(discipline);
  }
  if (state) {
    where.push('c.state = ?');
    params.push(state);
  }
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }

  const rows = db
    .prepare(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.discipline, c.specialty,
              c.years_experience, c.city, c.state, c.rate_min, c.rate_max, c.rate_basis,
              c.availability_date, c.status, c.willing_to_travel, c.source,
              (SELECT COUNT(*) FROM submissions s WHERE s.clinician_id = c.id) AS submissions,
              (SELECT COUNT(*) FROM credentials cr WHERE cr.clinician_id = c.id AND cr.status = 'verified') AS verified_credentials
       FROM clinicians c
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.last_name, c.first_name`
    )
    .all(...params);

  const csv = toCsv(
    [
      'id', 'first_name', 'last_name', 'email', 'phone', 'discipline', 'specialty',
      'years_experience', 'city', 'state', 'rate_min', 'rate_max', 'rate_basis',
      'availability_date', 'status', 'willing_to_travel', 'source', 'submissions',
      'verified_credentials',
    ],
    rows
  );

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'export.candidates',
    entity: 'clinicians',
    summary: `Exported ${rows.length} candidates to CSV`,
    meta: { filters: { query, discipline, state, status }, count: rows.length },
    ip: req.ip,
  });

  sendCsv(res, `prosurance-candidates-${today()}.csv`, csv);
});

// GET /api/v1/exports/compliance.csv
router.get('/compliance.csv', authenticate, (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 0), 3650);
  const cutoff = new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT cr.id, cr.clinician_id,
              (c.first_name || ' ' || c.last_name) AS clinician_name,
              cr.type, cr.name, cr.issuer, cr.number, cr.state, cr.expires_on, cr.status,
              CAST(julianday(cr.expires_on) - julianday('now') AS INTEGER) AS days_left
       FROM credentials cr
       JOIN clinicians c ON cr.clinician_id = c.id
       WHERE cr.expires_on IS NOT NULL AND cr.expires_on != '' AND date(cr.expires_on) <= date(?)
       ORDER BY date(cr.expires_on) ASC`
    )
    .all(cutoff);

  const csv = toCsv(
    ['id', 'clinician_id', 'clinician_name', 'type', 'name', 'issuer', 'number', 'state', 'expires_on', 'status', 'days_left'],
    rows
  );

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'export.compliance',
    entity: 'credentials',
    summary: `Exported ${rows.length} expiring credentials (${days}d window) to CSV`,
    meta: { days, count: rows.length },
    ip: req.ip,
  });

  sendCsv(res, `prosurance-compliance-${days}d-${today()}.csv`, csv);
});

// GET /api/v1/exports/placements.csv
router.get('/placements.csv', authenticate, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id,
              (c.first_name || ' ' || c.last_name) AS clinician_name,
              j.title AS job_title,
              e.name AS employer_name,
              p.start_date, p.end_date, p.hours, p.bill_rate, p.pay_rate,
              ROUND(p.bill_rate - p.pay_rate, 2) AS margin_per_hour,
              p.fee_amount, p.fee_status, p.status
       FROM placements p
       JOIN clinicians c ON p.clinician_id = c.id
       JOIN jobs j ON p.job_id = j.id
       JOIN employers e ON p.employer_id = e.id
       ORDER BY p.start_date DESC, p.id DESC`
    )
    .all();

  const csv = toCsv(
    [
      'id', 'clinician_name', 'job_title', 'employer_name', 'start_date', 'end_date',
      'hours', 'bill_rate', 'pay_rate', 'margin_per_hour', 'fee_amount', 'fee_status', 'status',
    ],
    rows
  );

  writeAuditLog(db, {
    actor_id: req.user.id,
    actor_email: req.user.email,
    action: 'export.placements',
    entity: 'placements',
    summary: `Exported ${rows.length} placements to CSV`,
    meta: { count: rows.length },
    ip: req.ip,
  });

  sendCsv(res, `prosurance-placements-${today()}.csv`, csv);
});

export default router;
