import bcrypt from 'bcryptjs';
import { db, writeAuditLog } from './db.js';

export function seedDatabase() {
  console.log('Seeding database...');

  db.exec('PRAGMA foreign_keys = OFF;');

  db.exec('DELETE FROM placements;');
  db.exec('DELETE FROM submissions;');
  db.exec('DELETE FROM credentials;');
  db.exec('DELETE FROM messages;');
  db.exec('DELETE FROM jobs;');
  db.exec('DELETE FROM employers;');
  db.exec('DELETE FROM clinicians;');
  db.exec('DELETE FROM audit_log;');
  db.exec('DELETE FROM users;');

  db.exec('PRAGMA foreign_keys = ON;');

  const passHash = bcrypt.hashSync('Prosurance!2026', 10);
  const now = new Date('2026-11-01T18:00:00.000Z').toISOString();

  // 1. Seed Users
  const usersData = [
    { email: 'recruiter@aegentix.health', password_hash: passHash, role: 'recruiter', full_name: 'Dana Whitfield', phone: '303-555-0101' },
    { email: 'admin@aegentix.health', password_hash: passHash, role: 'admin', full_name: 'AEGENTIX Admin', phone: '303-555-0100' },
    { email: 'talent@mercyhealth.example', password_hash: passHash, role: 'employer', full_name: 'Mercy Health Talent', phone: '314-555-0199' },
    { email: 'sarah.jenkins@example.com', password_hash: passHash, role: 'clinician', full_name: 'Sarah Jenkins', phone: '303-555-0120' },
    { email: 'marcus.vance@example.com', password_hash: passHash, role: 'clinician', full_name: 'Marcus Vance', phone: '214-555-0145' }
  ];

  const userIds = [];
  const userInsert = db.prepare(`
    INSERT INTO users (email, password_hash, role, full_name, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const u of usersData) {
    const res = userInsert.run(u.email, u.password_hash, u.role, u.full_name, u.phone, now);
    userIds.push(Number(res.lastInsertRowid));
  }

  const recruiterId = userIds[0];
  const adminId = userIds[1];

  // 2. Seed Employers (10 employers)
  const employersData = [
    { name: 'Mercy Medical Center', type: 'hospital', city: 'Denver', state: 'CO', ehr: 'Epic', contact_name: 'Laura Vance', contact_email: 'l.vance@mercymed.example', contact_phone: '303-555-0180', baa_signed_at: '2026-01-15T00:00:00.000Z', contract_status: 'active', fee_pct: 0.20, notes: 'Level 1 trauma center in central Denver.' },
    { name: 'St. Jude Healthcare System', type: 'hospital', city: 'Dallas', state: 'TX', ehr: 'Cerner', contact_name: 'Robert Miller', contact_email: 'rmiller@stjudehealth.example', contact_phone: '214-555-0112', baa_signed_at: '2026-02-10T00:00:00.000Z', contract_status: 'active', fee_pct: 0.22, notes: 'High volume surgical suites.' },
    { name: 'Valley Childrens Hospital', type: 'hospital', city: 'Phoenix', state: 'AZ', ehr: 'Epic', contact_name: 'Elena Rostova', contact_email: 'erostova@valleychildrens.example', contact_phone: '602-555-0134', baa_signed_at: '2026-03-01T00:00:00.000Z', contract_status: 'active', fee_pct: 0.20, notes: 'Pediatric specialty facility.' },
    { name: 'Summit View Regional', type: 'hospital', city: 'Salt Lake City', state: 'UT', ehr: 'Meditech', contact_name: 'David Wright', contact_email: 'dwright@summitview.example', contact_phone: '801-555-0156', baa_signed_at: '2026-04-12T00:00:00.000Z', contract_status: 'active', fee_pct: 0.18, notes: 'Regional acute care hospital.' },
    { name: 'Pinecrest Senior Care', type: 'ltc', city: 'Colorado Springs', state: 'CO', ehr: 'PointClickCare', contact_name: 'Karen Davis', contact_email: 'kdavis@pinecrest.example', contact_phone: '719-555-0178', baa_signed_at: '2026-05-20T00:00:00.000Z', contract_status: 'active', fee_pct: 0.15, notes: 'Long term memory care facility.' },
    { name: 'Apex Telehealth Alliance', type: 'telehealth', city: 'Austin', state: 'TX', ehr: 'Athenahealth', contact_name: 'Brian Chen', contact_email: 'bchen@apextelehealth.example', contact_phone: '512-555-0190', baa_signed_at: '2026-06-15T00:00:00.000Z', contract_status: 'active', fee_pct: 0.20, notes: 'Multi-state virtual care provider.' },
    { name: 'Cascade Health Clinic', type: 'clinic', city: 'Seattle', state: 'WA', ehr: 'Epic', contact_name: 'Rachel Adams', contact_email: 'radams@cascadeclinic.example', contact_phone: '206-555-0123', baa_signed_at: '2026-07-01T00:00:00.000Z', contract_status: 'prospect', fee_pct: 0.20, notes: 'Outpatient community clinics.' },
    { name: 'Sunbelt Home Health Services', type: 'home_health', city: 'Tampa', state: 'FL', ehr: 'Homecare Homebase', contact_name: 'Thomas Brooks', contact_email: 'tbrooks@sunbelthome.example', contact_phone: '813-555-0145', baa_signed_at: '2026-08-10T00:00:00.000Z', contract_status: 'active', fee_pct: 0.18, notes: 'Post-acute home health agency.' },
    { name: 'Midwest Staffing Partners', type: 'staffing', city: 'Chicago', state: 'IL', ehr: 'Custom', contact_name: 'Megan Taylor', contact_email: 'mtaylor@mwstaffing.example', contact_phone: '312-555-0167', baa_signed_at: '2026-09-01T00:00:00.000Z', contract_status: 'paused', fee_pct: 0.25, notes: 'Partner agency vendor pool.' },
    { name: 'Highland Care Center', type: 'ltc', city: 'Albuquerque', state: 'NM', ehr: 'PointClickCare', contact_name: 'Carlos Mendez', contact_email: 'cmendez@highlandcare.example', contact_phone: '505-555-0189', baa_signed_at: '2026-10-05T00:00:00.000Z', contract_status: 'prospect', fee_pct: 0.18, notes: 'Sub-acute rehabilitation center.' }
  ];

  const empInsert = db.prepare(`
    INSERT INTO employers (name, type, city, state, ehr, contact_name, contact_email, contact_phone, baa_signed_at, contract_status, fee_pct, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const empIds = [];
  for (const e of employersData) {
    const res = empInsert.run(e.name, e.type, e.city, e.state, e.ehr, e.contact_name, e.contact_email, e.contact_phone, e.baa_signed_at, e.contract_status, e.fee_pct, e.notes, now);
    empIds.push(Number(res.lastInsertRowid));
  }

  // 3. Seed Clinicians (24 clinicians)
  const cliniciansData = [
    { first_name: 'Sarah', last_name: 'Jenkins', email: 'sarah.jenkins@example.com', phone: '303-555-0120', discipline: 'RN', specialty: 'ICU', years_experience: 8, city: 'Denver', state: 'CO', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-10', rate_min: 85.00, rate_max: 105.00, rate_basis: 'hour', employment_types: ['contract', 'full_time'], status: 'active', source: 'Direct Application', tags: ['Trauma', 'ECMO'], bio: 'Experienced CCRN certified ICU nurse with 8 years in Level 1 trauma.' },
    { first_name: 'Marcus', last_name: 'Vance', email: 'marcus.vance@example.com', phone: '214-555-0145', discipline: 'RN', specialty: 'Emergency Room', years_experience: 6, city: 'Dallas', state: 'TX', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-05', rate_min: 80.00, rate_max: 100.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Referral', tags: ['TNCC', 'ENPC'], bio: 'ER nurse specialized in high volume urban emergency departments.' },
    { first_name: 'Elena', last_name: 'Rostova', email: 'elena.rostova@example.com', phone: '602-555-0133', discipline: 'NP', specialty: 'Acute Care', years_experience: 10, city: 'Phoenix', state: 'AZ', willing_to_travel: 0, remote_ok: 1, availability_date: '2026-11-15', rate_min: 120.00, rate_max: 145.00, rate_basis: 'hour', employment_types: ['full_time', 'part_time'], status: 'active', source: 'LinkedIn', tags: ['AGACNP', 'Prescriptive Authority'], bio: 'Board certified acute care nurse practitioner.' },
    { first_name: 'David', last_name: 'Kim', email: 'david.kim@example.com', phone: '801-555-0177', discipline: 'PA', specialty: 'Orthopedics', years_experience: 5, city: 'Salt Lake City', state: 'UT', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-12-01', rate_min: 110.00, rate_max: 135.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Job Board', tags: ['Surgical First Assist'], bio: 'Physician assistant with extensive orthopedic surgery experience.' },
    { first_name: 'Rachel', last_name: 'Torres', email: 'rachel.torres@example.com', phone: '719-555-0188', discipline: 'RN', specialty: 'Med-Surg', years_experience: 4, city: 'Colorado Springs', state: 'CO', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 65.00, rate_max: 80.00, rate_basis: 'hour', employment_types: ['full_time'], status: 'active', source: 'Career Fair', tags: ['Telemetry', 'Orthopedics'], bio: 'Med-Surg telemetry nurse devoted to patient-centered care.' },
    { first_name: 'James', last_name: 'O\'Connor', email: 'james.oconnor@example.com', phone: '206-555-0199', discipline: 'CRNA', specialty: 'Anesthesia', years_experience: 12, city: 'Seattle', state: 'WA', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-20', rate_min: 210.00, rate_max: 250.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Referral', tags: ['Obstetrics', 'Regional Anesthesia'], bio: 'Certified Registered Nurse Anesthetist for surgical procedures.' },
    { first_name: 'Amanda', last_name: 'Foster', email: 'amanda.foster@example.com', phone: '813-555-0111', discipline: 'RN', specialty: 'Labor & Delivery', years_experience: 7, city: 'Tampa', state: 'FL', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-08', rate_min: 82.00, rate_max: 98.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Direct Application', tags: ['C-EFM', 'High Risk OB'], bio: 'L&D nurse skilled in high risk deliveries and fetal monitoring.' },
    { first_name: 'Michael', last_name: 'Chen', email: 'michael.chen@example.com', phone: '312-555-0144', discipline: 'MD', specialty: 'Hospitalist', years_experience: 9, city: 'Chicago', state: 'IL', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-12-15', rate_min: 190.00, rate_max: 230.00, rate_basis: 'hour', employment_types: ['contract', 'locum'], status: 'active', source: 'Locums Network', tags: ['Board Certified', 'Internal Medicine'], bio: 'Board certified internal medicine hospitalist.' },
    { first_name: 'Jessica', last_name: 'Taylor', email: 'jessica.taylor@example.com', phone: '505-555-0155', discipline: 'LPN', specialty: 'Long Term Care', years_experience: 3, city: 'Albuquerque', state: 'NM', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 42.00, rate_max: 52.00, rate_basis: 'hour', employment_types: ['full_time', 'part_time'], status: 'active', source: 'Walk-in', tags: ['IV Certified', 'Geri-Psych'], bio: 'Compassionate LPN with long term care and sub-acute experience.' },
    { first_name: 'Brandon', last_name: 'Hayes', email: 'brandon.hayes@example.com', phone: '303-555-0166', discipline: 'RN', specialty: 'Operating Room', years_experience: 9, city: 'Denver', state: 'CO', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-12', rate_min: 88.00, rate_max: 108.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Recruiter Outreach', tags: ['Scrub', 'Circulate', 'CNOR'], bio: 'OR nurse skilled in scrub and circulating roles across specialties.' },
    { first_name: 'Samantha', last_name: 'Reed', email: 'samantha.reed@example.com', phone: '214-555-0177', discipline: 'CNA', specialty: 'Med-Surg', years_experience: 2, city: 'Dallas', state: 'TX', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 24.00, rate_max: 30.00, rate_basis: 'hour', employment_types: ['part_time'], status: 'active', source: 'Job Board', tags: ['BLS', 'Aromatherapy'], bio: 'Certified Nursing Assistant committed to patient comfort.' },
    { first_name: 'Daniel', last_name: 'Martinez', email: 'daniel.martinez@example.com', phone: '602-555-0188', discipline: 'Therapist', specialty: 'Physical Therapy', years_experience: 6, city: 'Phoenix', state: 'AZ', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-25', rate_min: 75.00, rate_max: 95.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Referral', tags: ['DPT', 'Outpatient Rehab'], bio: 'Doctor of Physical Therapy specializing in orthopedic rehab.' },
    { first_name: 'Megan', last_name: 'Snyder', email: 'megan.snyder@example.com', phone: '801-555-0199', discipline: 'RN', specialty: 'PACU', years_experience: 5, city: 'Salt Lake City', state: 'UT', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-18', rate_min: 78.00, rate_max: 92.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Direct Application', tags: ['CPAN', 'Airway Management'], bio: 'Post-anesthesia care unit nurse with airway certification.' },
    { first_name: 'Kevin', last_name: 'Patel', email: 'kevin.patel@example.com', phone: '719-555-0110', discipline: 'Allied', specialty: 'Radiology Tech', years_experience: 4, city: 'Colorado Springs', state: 'CO', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-05', rate_min: 60.00, rate_max: 75.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'LinkedIn', tags: ['ARRT', 'CT Scan'], bio: 'Radiologic technologist with CT certification.' },
    { first_name: 'Laura', last_name: 'Gomez', email: 'laura.gomez@example.com', phone: '206-555-0121', discipline: 'NP', specialty: 'Psychiatry', years_experience: 11, city: 'Seattle', state: 'WA', willing_to_travel: 0, remote_ok: 1, availability_date: '2026-11-01', rate_min: 125.00, rate_max: 150.00, rate_basis: 'hour', employment_types: ['full_time', 'telehealth'], status: 'active', source: 'Career Fair', tags: ['PMHNP', 'Telepsychiatry'], bio: 'Psychiatric Mental Health Nurse Practitioner.' },
    { first_name: 'Christopher', last_name: 'Bates', email: 'chris.bates@example.com', phone: '813-555-0132', discipline: 'DO', specialty: 'Family Medicine', years_experience: 14, city: 'Tampa', state: 'FL', willing_to_travel: 0, remote_ok: 0, availability_date: '2027-01-01', rate_min: 175.00, rate_max: 210.00, rate_basis: 'hour', employment_types: ['full_time'], status: 'passive', source: 'Locums Network', tags: ['AOBFP', 'Primary Care'], bio: 'Osteopathic family physician dedicated to community care.' },
    { first_name: 'Stephanie', last_name: 'Long', email: 'stephanie.long@example.com', phone: '312-555-0143', discipline: 'RN', specialty: 'Oncology', years_experience: 7, city: 'Chicago', state: 'IL', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-14', rate_min: 84.00, rate_max: 102.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Referral', tags: ['OCN', 'Chemotherapy'], bio: 'Oncology certified nurse proficient in chemo administration.' },
    { first_name: 'Tyler', last_name: 'Wood', email: 'tyler.wood@example.com', phone: '505-555-0154', discipline: 'RN', specialty: 'Cath Lab', years_experience: 8, city: 'Albuquerque', state: 'NM', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-09', rate_min: 95.00, rate_max: 115.00, rate_basis: 'hour', employment_types: ['contract'], status: 'placed', source: 'Direct Application', tags: ['RCIS', 'STEMI Call'], bio: 'Cardiac Cath Lab nurse experienced in emergency PCI.' },
    { first_name: 'Nicole', last_name: 'Washington', email: 'nicole.washington@example.com', phone: '303-555-0165', discipline: 'RN', specialty: 'Pediatric ICU', years_experience: 6, city: 'Denver', state: 'CO', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-22', rate_min: 86.00, rate_max: 104.00, rate_basis: 'hour', employment_types: ['contract'], status: 'active', source: 'Job Board', tags: ['CCRNPed', 'PALS'], bio: 'Pediatric ICU nurse devoted to critically ill children.' },
    { first_name: 'Eric', last_name: 'Sanders', email: 'eric.sanders@example.com', phone: '214-555-0176', discipline: 'Therapist', specialty: 'Occupational Therapy', years_experience: 5, city: 'Dallas', state: 'TX', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 70.00, rate_max: 88.00, rate_basis: 'hour', employment_types: ['full_time'], status: 'active', source: 'Walk-in', tags: ['OTR/L', 'Hand Therapy'], bio: 'Registered Occupational Therapist with hand rehab expertise.' },
    { first_name: 'Hannah', last_name: 'Morales', email: 'hannah.morales@example.com', phone: '602-555-0187', discipline: 'RN', specialty: 'Telemetry', years_experience: 4, city: 'Phoenix', state: 'AZ', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-03', rate_min: 72.00, rate_max: 86.00, rate_basis: 'hour', employment_types: ['contract'], status: 'placed', source: 'Referral', tags: ['ACLS', 'Cardiac Care'], bio: 'Telemetry step-down nurse with cardiac rhythm expertise.' },
    { first_name: 'Jason', last_name: 'Bennett', email: 'jason.bennett@example.com', phone: '801-555-0198', discipline: 'RN', specialty: 'Psychiatry', years_experience: 3, city: 'Salt Lake City', state: 'UT', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 60.00, rate_max: 75.00, rate_basis: 'hour', employment_types: ['full_time'], status: 'do_not_contact', source: 'Job Board', tags: ['CPI', 'Crisis De-escalation'], bio: 'Inpatient psychiatric nurse.' },
    { first_name: 'Kelly', last_name: 'Hughes', email: 'kelly.hughes@example.com', phone: '719-555-0109', discipline: 'LPN', specialty: 'Clinic', years_experience: 5, city: 'Colorado Springs', state: 'CO', willing_to_travel: 0, remote_ok: 0, availability_date: '2026-11-01', rate_min: 38.00, rate_max: 48.00, rate_basis: 'hour', employment_types: ['full_time'], status: 'active', source: 'Direct Application', tags: ['Phlebotomy', 'EHR'], bio: 'Outpatient clinic LPN managing patient triage and vitals.' },
    { first_name: 'Robert', last_name: 'Nguyen', email: 'robert.nguyen@example.com', phone: '206-555-0110', discipline: 'RN', specialty: 'ICU', years_experience: 10, city: 'Seattle', state: 'WA', willing_to_travel: 1, remote_ok: 0, availability_date: '2026-11-15', rate_min: 90.00, rate_max: 110.00, rate_basis: 'hour', employment_types: ['contract'], status: 'placed', source: 'Referral', tags: ['CRRT', 'IABP'], bio: 'Senior ICU nurse skilled in CRRT and advanced hemodynamics.' }
  ];

  const clinInsert = db.prepare(`
    INSERT INTO clinicians (
      user_id, recruiter_id, first_name, last_name, email, phone, discipline, specialty,
      years_experience, city, state, willing_to_travel, remote_ok, availability_date,
      rate_min, rate_max, rate_basis, employment_types, status, source, tags, bio,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clinIds = [];
  for (let i = 0; i < cliniciansData.length; i++) {
    const c = cliniciansData[i];
    const uId = i < userIds.length ? userIds[i] : null;
    const res = clinInsert.run(
      uId,
      recruiterId,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.discipline,
      c.specialty,
      c.years_experience,
      c.city,
      c.state,
      c.willing_to_travel,
      c.remote_ok,
      c.availability_date,
      c.rate_min,
      c.rate_max,
      c.rate_basis,
      JSON.stringify(c.employment_types),
      c.status,
      c.source,
      JSON.stringify(c.tags),
      c.bio,
      now,
      now
    );
    clinIds.push(Number(res.lastInsertRowid));
  }

  // 4. Seed Credentials
  // Requirements: at least 5 credentials expiring within 30 days of 2026-11-01, expired ones, pending ones, verified ones.
  const credInsert = db.prepare(`
    INSERT INTO credentials (
      clinician_id, type, name, issuer, number, state, issued_on, expires_on, status, verified_by, verified_at, document_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const credentialsData = [
    // Expiring within 30 days of 2026-11-01 (1 to 5)
    { clinician_id: clinIds[0], type: 'license', name: 'RN Registered Nurse License', issuer: 'Colorado Board of Nursing', number: 'RN-1029384', state: 'CO', issued_on: '2024-11-15', expires_on: '2026-11-15', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2024-11-16T10:00:00.000Z' },
    { clinician_id: clinIds[1], type: 'bls', name: 'Basic Life Support (BLS)', issuer: 'American Heart Association', number: 'BLS-99201', state: null, issued_on: '2024-11-10', expires_on: '2026-11-10', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2024-11-11T10:00:00.000Z' },
    { clinician_id: clinIds[2], type: 'license', name: 'APRN Nurse Practitioner License', issuer: 'Arizona State Board of Nursing', number: 'NP-88219', state: 'AZ', issued_on: '2024-11-20', expires_on: '2026-11-20', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2024-11-21T10:00:00.000Z' },
    { clinician_id: clinIds[3], type: 'certification', name: 'NCCPA Board Certification', issuer: 'NCCPA', number: 'PA-33211', state: 'UT', issued_on: '2024-11-05', expires_on: '2026-11-05', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2024-11-06T10:00:00.000Z' },
    { clinician_id: clinIds[4], type: 'acls', name: 'Advanced Cardiac Life Support (ACLS)', issuer: 'American Heart Association', number: 'ACLS-77412', state: null, issued_on: '2024-11-28', expires_on: '2026-11-28', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2024-11-29T10:00:00.000Z' },

    // Expired
    { clinician_id: clinIds[5], type: 'tb', name: 'TB PPD Skin Test', issuer: 'Seattle Health Lab', number: 'TB-1029', state: 'WA', issued_on: '2025-09-01', expires_on: '2026-09-01', status: 'expired', verified_by: null, verified_at: null },
    { clinician_id: clinIds[6], type: 'license', name: 'RN License Compact', issuer: 'Florida Board of Nursing', number: 'RN-90123', state: 'FL', issued_on: '2024-08-01', expires_on: '2026-08-01', status: 'expired', verified_by: null, verified_at: null },

    // Pending
    { clinician_id: clinIds[0], type: 'acls', name: 'Advanced Cardiac Life Support (ACLS)', issuer: 'American Heart Association', number: 'ACLS-99120', state: null, issued_on: '2026-10-01', expires_on: '2028-10-01', status: 'pending', verified_by: null, verified_at: null },
    { clinician_id: clinIds[1], type: 'acls', name: 'ACLS Provider', issuer: 'American Heart Association', number: 'ACLS-88231', state: null, issued_on: '2026-10-15', expires_on: '2028-10-15', status: 'pending', verified_by: null, verified_at: null },
    { clinician_id: clinIds[7], type: 'dea', name: 'DEA Registration', issuer: 'DEA Federal', number: 'BD1234567', state: 'IL', issued_on: '2026-09-10', expires_on: '2029-09-10', status: 'pending', verified_by: null, verified_at: null },

    // Verified
    { clinician_id: clinIds[0], type: 'bls', name: 'Basic Life Support (BLS)', issuer: 'American Red Cross', number: 'BLS-3001', state: null, issued_on: '2025-01-10', expires_on: '2027-01-10', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-01-11T10:00:00.000Z' },
    { clinician_id: clinIds[1], type: 'license', name: 'RN Texas Multi-State License', issuer: 'Texas Board of Nursing', number: 'RN-77120', state: 'TX', issued_on: '2025-02-01', expires_on: '2027-02-01', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-02-02T10:00:00.000Z' },
    { clinician_id: clinIds[9], type: 'license', name: 'RN Colorado State License', issuer: 'Colorado Board of Nursing', number: 'RN-88301', state: 'CO', issued_on: '2025-03-15', expires_on: '2027-03-15', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-03-16T10:00:00.000Z' },
    { clinician_id: clinIds[9], type: 'certification', name: 'Certified Perioperative Nurse (CNOR)', issuer: 'CCI', number: 'CNOR-5541', state: null, issued_on: '2025-04-01', expires_on: '2028-04-01', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-04-02T10:00:00.000Z' },
    { clinician_id: clinIds[17], type: 'license', name: 'RN New Mexico Compact License', issuer: 'New Mexico Board of Nursing', number: 'RN-44102', state: 'NM', issued_on: '2025-05-01', expires_on: '2027-05-01', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-05-02T10:00:00.000Z' },
    { clinician_id: clinIds[20], type: 'license', name: 'RN Arizona Multi-State License', issuer: 'Arizona Board of Nursing', number: 'RN-33190', state: 'AZ', issued_on: '2025-06-01', expires_on: '2027-06-01', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-06-02T10:00:00.000Z' },
    { clinician_id: clinIds[23], type: 'license', name: 'RN Washington License', issuer: 'Washington Nursing Commission', number: 'RN-22019', state: 'WA', issued_on: '2025-07-01', expires_on: '2027-07-01', status: 'verified', verified_by: 'recruiter@aegentix.health', verified_at: '2025-07-02T10:00:00.000Z' }
  ];

  for (const c of credentialsData) {
    credInsert.run(
      c.clinician_id, c.type, c.name, c.issuer, c.number, c.state,
      c.issued_on, c.expires_on, c.status, c.verified_by, c.verified_at, null, now
    );
  }

  // 5. Seed Jobs (12 jobs)
  const jobsData = [
    { employer_id: empIds[0], title: 'ICU Staff RN', discipline: 'RN', specialty: 'ICU', city: 'Denver', state: 'CO', setting: 'Inpatient', shift: 'Night 12hr', shift_hours: 12, start_date: '2026-11-15', duration_weeks: 13, rate_min: 90.00, rate_max: 110.00, rate_basis: 'hour', openings: 3, filled: 1, status: 'open', priority: 'urgent', required_certs: ['BLS', 'ACLS'], required_states: ['CO'], description: '12-hour night shift ICU contract in Level 1 Denver hospital.' },
    { employer_id: empIds[1], title: 'Emergency Room RN', discipline: 'RN', specialty: 'Emergency Room', city: 'Dallas', state: 'TX', setting: 'Inpatient', shift: 'Day 12hr', shift_hours: 12, start_date: '2026-11-10', duration_weeks: 13, rate_min: 85.00, rate_max: 105.00, rate_basis: 'hour', openings: 2, filled: 0, status: 'open', priority: 'high', required_certs: ['BLS', 'ACLS', 'TNCC'], required_states: ['TX'], description: 'Fast-paced ER requisition in downtown Dallas.' },
    { employer_id: empIds[2], title: 'Pediatric ICU NP', discipline: 'NP', specialty: 'Acute Care', city: 'Phoenix', state: 'AZ', setting: 'Inpatient', shift: 'Variable 12hr', shift_hours: 12, start_date: '2026-12-01', duration_weeks: 13, rate_min: 125.00, rate_max: 150.00, rate_basis: 'hour', openings: 1, filled: 0, status: 'open', priority: 'normal', required_certs: ['PALS', 'BLS'], required_states: ['AZ'], description: 'PICU Nurse Practitioner for pediatric acute care unit.' },
    { employer_id: empIds[3], title: 'Orthopedic Physician Assistant', discipline: 'PA', specialty: 'Orthopedics', city: 'Salt Lake City', state: 'UT', setting: 'Outpatient / Surgical', shift: 'Day 8hr', shift_hours: 8, start_date: '2026-12-05', duration_weeks: 26, rate_min: 115.00, rate_max: 140.00, rate_basis: 'hour', openings: 1, filled: 0, status: 'open', priority: 'normal', required_certs: ['NCCPA'], required_states: ['UT'], description: 'Surgical first assist and clinic coverage.' },
    { employer_id: empIds[0], title: 'Operating Room Scrub RN', discipline: 'RN', specialty: 'Operating Room', city: 'Denver', state: 'CO', setting: 'Surgical', shift: 'Day 10hr', shift_hours: 10, start_date: '2026-11-20', duration_weeks: 13, rate_min: 92.00, rate_max: 112.00, rate_basis: 'hour', openings: 2, filled: 0, status: 'open', priority: 'high', required_certs: ['BLS', 'CNOR'], required_states: ['CO'], description: 'Scrub and circulate general and orthopedic cases.' },
    { employer_id: empIds[4], title: 'LTC Charge Nurse LPN', discipline: 'LPN', specialty: 'Long Term Care', city: 'Colorado Springs', state: 'CO', setting: 'LTC', shift: 'Evening 8hr', shift_hours: 8, start_date: '2026-11-05', duration_weeks: 12, rate_min: 44.00, rate_max: 54.00, rate_basis: 'hour', openings: 2, filled: 0, status: 'open', priority: 'normal', required_certs: ['BLS'], required_states: ['CO'], description: 'Evening charge nurse for senior care center.' },
    { employer_id: empIds[5], title: 'Telepsychiatry PMHNP', discipline: 'NP', specialty: 'Psychiatry', city: 'Austin', state: 'TX', setting: 'Remote', shift: 'Day 8hr', shift_hours: 8, start_date: '2026-11-15', duration_weeks: 52, rate_min: 130.00, rate_max: 155.00, rate_basis: 'hour', openings: 1, filled: 0, status: 'open', priority: 'normal', required_certs: ['PMHNP'], required_states: ['TX'], description: 'Virtual psychiatric intake and medication management.' },
    { employer_id: empIds[1], title: 'Cath Lab Specialist RN', discipline: 'RN', specialty: 'Cath Lab', city: 'Dallas', state: 'TX', setting: 'Inpatient', shift: 'Day 10hr + Call', shift_hours: 10, start_date: '2026-11-01', duration_weeks: 13, rate_min: 100.00, rate_max: 120.00, rate_basis: 'hour', openings: 1, filled: 1, status: 'filled', priority: 'high', required_certs: ['BLS', 'ACLS'], required_states: ['TX'], description: 'Cardiac Cath Lab contract with call rotation.' },
    { employer_id: empIds[2], title: 'Telemetry Step-Down RN', discipline: 'RN', specialty: 'Telemetry', city: 'Phoenix', state: 'AZ', setting: 'Inpatient', shift: 'Night 12hr', shift_hours: 12, start_date: '2026-11-01', duration_weeks: 13, rate_min: 75.00, rate_max: 90.00, rate_basis: 'hour', openings: 1, filled: 1, status: 'filled', priority: 'normal', required_certs: ['BLS', 'ACLS'], required_states: ['AZ'], description: 'Telemetry unit night shift.' },
    { employer_id: empIds[3], title: 'Senior ICU Specialist RN', discipline: 'RN', specialty: 'ICU', city: 'Seattle', state: 'WA', setting: 'Inpatient', shift: 'Day 12hr', shift_hours: 12, start_date: '2026-11-01', duration_weeks: 13, rate_min: 95.00, rate_max: 115.00, rate_basis: 'hour', openings: 1, filled: 1, status: 'filled', priority: 'normal', required_certs: ['BLS', 'ACLS'], required_states: ['WA'], description: 'Complex cardiovascular ICU contract.' },
    { employer_id: empIds[6], title: 'Outpatient Clinic RN', discipline: 'RN', specialty: 'Med-Surg', city: 'Seattle', state: 'WA', setting: 'Outpatient', shift: 'Day 8hr', shift_hours: 8, start_date: '2027-01-10', duration_weeks: 26, rate_min: 70.00, rate_max: 85.00, rate_basis: 'hour', openings: 2, filled: 0, status: 'draft', priority: 'low', required_certs: ['BLS'], required_states: ['WA'], description: 'Community outpatient primary care clinic.' },
    { employer_id: empIds[7], title: 'Home Health Visiting Nurse', discipline: 'RN', specialty: 'Med-Surg', city: 'Tampa', state: 'FL', setting: 'Home Health', shift: 'Day 8hr', shift_hours: 8, start_date: '2026-12-01', duration_weeks: 13, rate_min: 72.00, rate_max: 88.00, rate_basis: 'hour', openings: 1, filled: 0, status: 'on_hold', priority: 'low', required_certs: ['BLS'], required_states: ['FL'], description: 'Field visits across Tampa metro area.' }
  ];

  const jobInsert = db.prepare(`
    INSERT INTO jobs (
      employer_id, recruiter_id, title, discipline, specialty, city, state, setting, shift,
      shift_hours, start_date, duration_weeks, rate_min, rate_max, rate_basis,
      openings, filled, status, priority, required_certs, required_states, description,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const jobIds = [];
  for (const j of jobsData) {
    const res = jobInsert.run(
      j.employer_id, recruiterId, j.title, j.discipline, j.specialty, j.city, j.state,
      j.setting, j.shift, j.shift_hours, j.start_date, j.duration_weeks, j.rate_min,
      j.rate_max, j.rate_basis, j.openings, j.filled, j.status, j.priority,
      JSON.stringify(j.required_certs), JSON.stringify(j.required_states),
      j.description, now, now
    );
    jobIds.push(Number(res.lastInsertRowid));
  }

  // 6. Seed Submissions
  // SPEC: 22 submissions across all 9 pipeline stages (sourced, screened, submitted, client_review, interview, offer, placed, rejected, withdrawn)
  const subInsert = db.prepare(`
    INSERT INTO submissions (
      job_id, clinician_id, recruiter_id, stage, match_score, submitted_at, stage_updated_at, notes, rejection_reason, offer_rate, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const submissionsData = [
    // 3 placed
    { job_id: jobIds[7], clinician_id: clinIds[17], stage: 'placed', match_score: 95, notes: 'Placed on Cath Lab contract.', offer_rate: 105.00 },
    { job_id: jobIds[8], clinician_id: clinIds[20], stage: 'placed', match_score: 88, notes: 'Placed on Telemetry contract.', offer_rate: 82.00 },
    { job_id: jobIds[9], clinician_id: clinIds[23], stage: 'placed', match_score: 92, notes: 'Placed on ICU contract in Seattle.', offer_rate: 102.00 },

    // 3 offer
    { job_id: jobIds[0], clinician_id: clinIds[0], stage: 'offer', match_score: 94, notes: 'Client extended offer for $100/hr.', offer_rate: 100.00 },
    { job_id: jobIds[1], clinician_id: clinIds[1], stage: 'offer', match_score: 91, notes: 'Offer pending candidate signature.', offer_rate: 95.00 },
    { job_id: jobIds[4], clinician_id: clinIds[9], stage: 'offer', match_score: 96, notes: 'Offer extended for OR position.', offer_rate: 105.00 },

    // 3 interview
    { job_id: jobIds[2], clinician_id: clinIds[2], stage: 'interview', match_score: 89, notes: 'Interview scheduled for Tuesday.' },
    { job_id: jobIds[3], clinician_id: clinIds[3], stage: 'interview', match_score: 87, notes: 'Phone screen completed, panel interview set.' },
    { job_id: jobIds[0], clinician_id: clinIds[18], stage: 'interview', match_score: 85, notes: 'Interview with ICU director.' },

    // 3 client_review
    { job_id: jobIds[4], clinician_id: clinIds[12], stage: 'client_review', match_score: 82, notes: 'Profile presented to hiring manager.' },
    { job_id: jobIds[5], clinician_id: clinIds[8], stage: 'client_review', match_score: 79, notes: 'Awaiting feedback from LTC unit.' },
    { job_id: jobIds[6], clinician_id: clinIds[14], stage: 'client_review', match_score: 93, notes: 'Telepsych profile under review.' },

    // 3 submitted
    { job_id: jobIds[1], clinician_id: clinIds[10], stage: 'submitted', match_score: 75, notes: 'Submitted via portal.' },
    { job_id: jobIds[2], clinician_id: clinIds[11], stage: 'submitted', match_score: 78, notes: 'Submitted for physical therapy role.' },
    { job_id: jobIds[3], clinician_id: clinIds[13], stage: 'submitted', match_score: 70, notes: 'Submitted for radiology tech role.' },

    // 2 screened
    { job_id: jobIds[0], clinician_id: clinIds[4], stage: 'screened', match_score: 80, notes: 'Recruiter phone screen passed.' },
    { job_id: jobIds[5], clinician_id: clinIds[22], stage: 'screened', match_score: 72, notes: 'Credentials verified during screen.' },

    // 2 sourced
    { job_id: jobIds[1], clinician_id: clinIds[6], stage: 'sourced', match_score: 84, notes: 'Outreach email sent to L&D candidate.' },
    { job_id: jobIds[6], clinician_id: clinIds[15], stage: 'sourced', match_score: 65, notes: 'Sourced from candidate database.' },

    // 2 rejected
    { job_id: jobIds[0], clinician_id: clinIds[16], stage: 'rejected', match_score: 60, notes: 'Candidate declined shift hours.', rejection_reason: 'Shift mismatch' },
    { job_id: jobIds[2], clinician_id: clinIds[19], stage: 'rejected', match_score: 55, notes: 'Lacked required pediatric experience.', rejection_reason: 'Experience requirements' },

    // 1 withdrawn
    { job_id: jobIds[3], clinician_id: clinIds[21], stage: 'withdrawn', match_score: 50, notes: 'Candidate accepted another offer.', rejection_reason: 'Candidate withdrew' }
  ];

  const subIds = [];
  for (const s of submissionsData) {
    const res = subInsert.run(
      s.job_id, s.clinician_id, recruiterId, s.stage, s.match_score,
      now, now, s.notes, s.rejection_reason || null, s.offer_rate || null, now
    );
    subIds.push(Number(res.lastInsertRowid));
  }

  // 7. Seed Placements
  // SPEC: 3 placements
  const plcInsert = db.prepare(`
    INSERT INTO placements (
      submission_id, clinician_id, job_id, employer_id, recruiter_id,
      start_date, end_date, hours, pay_rate, bill_rate, fee_amount, fee_status, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const placementsData = [
    { submission_id: subIds[0], clinician_id: clinIds[17], job_id: jobIds[7], employer_id: empIds[1], recruiter_id: recruiterId, start_date: '2026-11-01', end_date: '2027-01-31', hours: 520, pay_rate: 95.00, bill_rate: 115.00, fee_amount: 10400.00, fee_status: 'paid', status: 'active' },
    { submission_id: subIds[1], clinician_id: clinIds[20], job_id: jobIds[8], employer_id: empIds[2], recruiter_id: recruiterId, start_date: '2026-11-01', end_date: '2027-01-31', hours: 520, pay_rate: 72.00, bill_rate: 90.00, fee_amount: 9360.00, fee_status: 'invoiced', status: 'active' },
    { submission_id: subIds[2], clinician_id: clinIds[23], job_id: jobIds[9], employer_id: empIds[3], recruiter_id: recruiterId, start_date: '2026-11-01', end_date: '2027-01-31', hours: 520, pay_rate: 90.00, bill_rate: 110.00, fee_amount: 10400.00, fee_status: 'pending', status: 'active' }
  ];

  for (const p of placementsData) {
    plcInsert.run(
      p.submission_id, p.clinician_id, p.job_id, p.employer_id, p.recruiter_id,
      p.start_date, p.end_date, p.hours, p.pay_rate, p.bill_rate, p.fee_amount, p.fee_status, p.status, now
    );
  }

  // 8. Seed Messages
  db.prepare(`
    INSERT INTO messages (thread_key, sender_id, recipient_id, body, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('thread_job_1', recruiterId, userIds[2], 'Hi Laura, I submitted Sarah Jenkins for the ICU Staff RN opening.', now);

  // 9. Audit Log Initial Entry
  writeAuditLog(db, {
    actor_id: adminId,
    actor_email: 'admin@aegentix.health',
    action: 'system.seed',
    entity: 'system',
    entity_id: 1,
    summary: 'Database populated with initial seed data'
  });

  console.log('Seeding complete successfully.');
}

// Run direct if called via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
