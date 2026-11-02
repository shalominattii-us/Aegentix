import test, { before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Set test DB path before importing db and seed
const testDbPath = './data/test_prosurance.db';
process.env.DB_PATH = testDbPath;

// Start from a clean database so seed + assertions are deterministic
for (const suffix of ['', '-wal', '-shm']) {
  const f = path.resolve(testDbPath + suffix);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

const { seedDatabase } = await import('../server/seed.js');
const { app } = await import('../server/index.js');

let server;
let baseUrl;
let authToken;

before(async () => {
  seedDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch (e) {}
  }
});

test('1. Auth: Login success and failure', async () => {
  // Failure
  const resBad = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@aegentix.health', password: 'WrongPassword' })
  });
  assert.strictEqual(resBad.status, 401);

  // Success
  const resGood = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'recruiter@aegentix.health', password: 'Prosurance!2026' })
  });
  assert.strictEqual(resGood.status, 200);
  const data = await resGood.json();
  assert.ok(data.token, 'Token should be returned');
  assert.strictEqual(data.user.email, 'recruiter@aegentix.health');
  authToken = data.token;
});

test('2. Auth: GET /auth/me', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.user.email, 'recruiter@aegentix.health');
  assert.strictEqual(data.user.role, 'recruiter');
});

test('3. Auth: 401 without token', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/me`);
  assert.strictEqual(res.status, 401);
});

test('4. Clinicians: List and query filter', async () => {
  const resAll = await fetch(`${baseUrl}/api/v1/clinicians`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(resAll.status, 200);
  const dataAll = await resAll.json();
  assert.ok(Array.isArray(dataAll.items));
  assert.ok(dataAll.total >= 20, 'Should have at least 20 clinicians');

  const resFiltered = await fetch(`${baseUrl}/api/v1/clinicians?query=Jenkins`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(resFiltered.status, 200);
  const dataFiltered = await resFiltered.json();
  assert.ok(dataFiltered.items.some(c => c.first_name === 'Sarah' && c.last_name === 'Jenkins'));
});

test('5. Clinician: Detail shape', async () => {
  const res = await fetch(`${baseUrl}/api/v1/clinicians/1`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.clinician && data.clinician.id === 1);
  assert.ok(Array.isArray(data.credentials));
  assert.ok(Array.isArray(data.submissions));
  assert.ok(Array.isArray(data.matches));
});

test('6. Job: Matches endpoint returns descending scores', async () => {
  const res = await fetch(`${baseUrl}/api/v1/jobs/1/matches`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.matches));
  assert.ok(data.matches.length > 0);

  for (let i = 0; i < data.matches.length - 1; i++) {
    assert.ok(data.matches[i].score >= data.matches[i + 1].score, 'Matches should be ordered descending by score');
  }
});

test('7. Dashboard: Summary shape', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dashboard/summary`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.kpis && typeof data.kpis.open_jobs === 'number');
  assert.ok(Array.isArray(data.pipeline));
  assert.ok(Array.isArray(data.jobs_by_status));
  assert.ok(Array.isArray(data.expiring_credentials));
  assert.ok(Array.isArray(data.recent_activity));
});

let createdSubmissionId;
let testClinicianId;
let testJobId;

test('8. Submission: Create submission for a fresh candidate', async () => {
  const stamp = Date.now();
  const clinicianRes = await fetch(`${baseUrl}/api/v1/clinicians`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: `Candidate${stamp}`,
      email: `test.candidate.${stamp}@example.com`,
      discipline: 'RN',
      specialty: 'ICU',
      state: 'CA',
      city: 'Sacramento',
      rate_min: 80,
      rate_max: 95,
      availability_date: '2026-11-10',
      status: 'active'
    })
  });
  assert.strictEqual(clinicianRes.status, 201);
  testClinicianId = (await clinicianRes.json()).id;
  assert.ok(testClinicianId);

  const res = await fetch(`${baseUrl}/api/v1/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ job_id: 1, clinician_id: testClinicianId, notes: 'API test submission' })
  });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.job_id, 1);
  assert.strictEqual(data.clinician_id, testClinicianId);
  assert.strictEqual(data.stage, 'submitted');
  assert.ok(typeof data.match_score === 'number');
  createdSubmissionId = data.id;
});

test('9. Submission: Duplicate submission returns 409 Conflict', async () => {
  const res = await fetch(`${baseUrl}/api/v1/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ job_id: 1, clinician_id: testClinicianId, notes: 'Duplicate test' })
  });
  assert.strictEqual(res.status, 409);
});

test('10. Submission: Patch stage', async () => {
  const res = await fetch(`${baseUrl}/api/v1/submissions/${createdSubmissionId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ stage: 'interview' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.stage, 'interview');
});

test('11. Placement: Create placement side effects (submission placed, job filled incremented, fee computed)', async () => {
  const jobRes = await fetch(`${baseUrl}/api/v1/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test ICU RN',
      employer_id: 1,
      discipline: 'RN',
      specialty: 'ICU',
      city: 'Sacramento',
      state: 'CA',
      setting: 'Hospital',
      shift: 'Night 3x12',
      shift_hours: 36,
      start_date: '2026-11-20',
      duration_weeks: 13,
      rate_min: 85,
      rate_max: 100,
      rate_basis: 'hour',
      openings: 1,
      status: 'open',
      priority: 'high',
      required_certs: ['BLS'],
      required_states: ['CA']
    })
  });
  assert.strictEqual(jobRes.status, 201);
  testJobId = (await jobRes.json()).id;
  assert.ok(testJobId);

  const subRes = await fetch(`${baseUrl}/api/v1/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ job_id: testJobId, clinician_id: testClinicianId, notes: 'Placement test sub' })
  });
  assert.strictEqual(subRes.status, 201);
  const subData = await subRes.json();

  // bill_rate 100, pay_rate 80, hours 100 -> fee = 100 * (100 - 80) = 2000
  const plcRes = await fetch(`${baseUrl}/api/v1/placements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      submission_id: subData.id,
      start_date: '2026-11-20',
      bill_rate: 100,
      pay_rate: 80,
      hours: 100
    })
  });
  assert.strictEqual(plcRes.status, 201);
  const plcData = await plcRes.json();
  assert.strictEqual(plcData.fee_amount, 2000);

  const subCheckRes = await fetch(`${baseUrl}/api/v1/submissions?job_id=${testJobId}&clinician_id=${testClinicianId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const subCheckData = await subCheckRes.json();
  const placedSub = subCheckData.items.find(s => s.id === subData.id);
  assert.ok(placedSub);
  assert.strictEqual(placedSub.stage, 'placed');

  const jobCheckRes = await fetch(`${baseUrl}/api/v1/jobs/${testJobId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const jobCheckData = await jobCheckRes.json();
  assert.strictEqual(jobCheckData.job.filled, 1);
  assert.strictEqual(jobCheckData.job.status, 'filled');
});

test('12. Compliance: Expiring credentials ordering by days_left', async () => {
  const res = await fetch(`${baseUrl}/api/v1/compliance/expiring?days=60`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.items));

  for (let i = 0; i < data.items.length - 1; i++) {
    assert.ok(data.items[i].days_left <= data.items[i + 1].days_left, 'Expiring credentials should be sorted ascending by days_left');
  }
});

test('13. Placement: Update fee status and close-out', async () => {
  const listRes = await fetch(`${baseUrl}/api/v1/placements`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const list = await listRes.json();
  const placement = list.items[0];
  assert.ok(placement, 'Expected at least one placement');

  const invRes = await fetch(`${baseUrl}/api/v1/placements/${placement.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fee_status: 'invoiced' })
  });
  assert.strictEqual(invRes.status, 200);
  assert.strictEqual((await invRes.json()).fee_status, 'invoiced');

  const paidRes = await fetch(`${baseUrl}/api/v1/placements/${placement.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fee_status: 'paid', status: 'completed', end_date: '2027-02-01' })
  });
  assert.strictEqual(paidRes.status, 200);
  const paid = await paidRes.json();
  assert.strictEqual(paid.fee_status, 'paid');
  assert.strictEqual(paid.status, 'completed');
  assert.strictEqual(paid.end_date, '2027-02-01');

  // recomputed fee when hours change: 200 hrs * (100 - 80)
  const hoursRes = await fetch(`${baseUrl}/api/v1/placements/${placement.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours: 200 })
  });
  const recomputed = await hoursRes.json();
  assert.strictEqual(recomputed.fee_amount, 200 * (placement.bill_rate - placement.pay_rate));

  const badRes = await fetch(`${baseUrl}/api/v1/placements/${placement.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fee_status: 'nonsense' })
  });
  assert.strictEqual(badRes.status, 400);

  const missingRes = await fetch(`${baseUrl}/api/v1/placements/999999`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fee_status: 'paid' })
  });
  assert.strictEqual(missingRes.status, 404);
});

test('14. Exports: candidates CSV', async () => {
  const res = await fetch(`${baseUrl}/api/v1/exports/candidates.csv?discipline=RN`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/csv/);
  assert.match(res.headers.get('content-disposition') || '', /attachment; filename="prosurance-candidates-/);
  const text = await res.text();
  const lines = text.trim().split('\r\n');
  assert.match(lines[0], /^id,first_name,last_name,email/);
  assert.ok(lines.length > 1, 'Expected at least one data row');
  const disciplineIndex = lines[0].split(',').indexOf('discipline');
  for (const line of lines.slice(1)) {
    assert.strictEqual(line.split(',')[disciplineIndex], 'RN');
  }
});

test('15. Exports: compliance CSV honours day window', async () => {
  const res = await fetch(`${baseUrl}/api/v1/exports/compliance.csv?days=90`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  const lines = text.trim().split('\r\n');
  assert.match(lines[0], /clinician_name/);
  assert.ok(lines[0].includes('days_left'));
});

test('16. Exports: placements CSV + auth guard', async () => {
  const res = await fetch(`${baseUrl}/api/v1/exports/placements.csv`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.match(text.split('\r\n')[0], /clinician_name,job_title,employer_name/);
  assert.ok(text.trim().split('\r\n').length > 1);

  const guard = await fetch(`${baseUrl}/api/v1/exports/placements.csv`);
  assert.strictEqual(guard.status, 401);
});
