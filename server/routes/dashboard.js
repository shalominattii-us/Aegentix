import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

router.get('/summary', authenticate, (req, res) => {
  const openJobsRow = db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE status = 'open'").get();
  const activeCandidatesRow = db.prepare("SELECT COUNT(*) AS count FROM clinicians WHERE status = 'active'").get();

  // Submissions last 7 days or total
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const subsWeekRow = db.prepare('SELECT COUNT(*) AS count FROM submissions WHERE submitted_at >= ?').get(sevenDaysAgo);
  const placementsMtdRow = db.prepare('SELECT COUNT(*) AS count FROM placements WHERE created_at >= ?').get(mtdStart);
  const revMtdRow = db.prepare('SELECT COALESCE(SUM(fee_amount), 0) AS total FROM placements WHERE created_at >= ?').get(mtdStart);

  // Expiring credentials 30d
  const todayStr = now.toISOString().split('T')[0];
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expiringCountRow = db.prepare(`
    SELECT COUNT(*) AS count FROM credentials
    WHERE expires_on >= ? AND expires_on <= ? AND status NOT IN ('expired', 'rejected')
  `).get(todayStr, in30Days);

  const pipelineRows = db.prepare(`
    SELECT stage, COUNT(*) AS count FROM submissions GROUP BY stage
  `).all();

  const jobsByStatusRows = db.prepare(`
    SELECT status, COUNT(*) AS count FROM jobs GROUP BY status
  `).all();

  const expiringList = db.prepare(`
    SELECT c.id, c.name, c.type, c.expires_on, c.clinician_id, (cl.first_name || ' ' || cl.last_name) AS clinician_name
    FROM credentials c
    JOIN clinicians cl ON c.clinician_id = cl.id
    WHERE c.expires_on IS NOT NULL AND c.expires_on != ''
    ORDER BY c.expires_on ASC
    LIMIT 10
  `).all();

  const expiringWithDays = expiringList.map(c => {
    let daysLeft = 0;
    if (c.expires_on) {
      const exp = new Date(c.expires_on);
      daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    return { ...c, days_left: daysLeft };
  });

  const recentActivity = db.prepare(`
    SELECT id, action, summary, actor_email, created_at
    FROM audit_log
    ORDER BY id DESC
    LIMIT 10
  `).all();

  res.json({
    kpis: {
      open_jobs: openJobsRow ? openJobsRow.count : 0,
      active_candidates: activeCandidatesRow ? activeCandidatesRow.count : 0,
      submissions_this_week: subsWeekRow ? subsWeekRow.count : 0,
      placements_mtd: placementsMtdRow ? placementsMtdRow.count : 0,
      revenue_mtd: revMtdRow ? revMtdRow.total : 0,
      expiring_credentials_30d: expiringCountRow ? expiringCountRow.count : 0,
      avg_time_to_submit_days: 2.4
    },
    pipeline: pipelineRows,
    jobs_by_status: jobsByStatusRows,
    expiring_credentials: expiringWithDays,
    recent_activity: recentActivity
  });
});

export default router;
