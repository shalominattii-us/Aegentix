CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT CHECK(role IN ('recruiter', 'admin', 'employer', 'clinician')) NOT NULL DEFAULT 'recruiter',
  full_name TEXT,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS clinicians (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  discipline TEXT CHECK(discipline IN ('RN','LPN','NP','PA','MD','DO','CRNA','CNA','Therapist','Allied')),
  specialty TEXT,
  years_experience INTEGER DEFAULT 0,
  city TEXT,
  state TEXT,
  willing_to_travel INTEGER DEFAULT 0,
  remote_ok INTEGER DEFAULT 0,
  availability_date TEXT,
  rate_min REAL,
  rate_max REAL,
  rate_basis TEXT CHECK(rate_basis IN ('hour','week','year')) DEFAULT 'hour',
  employment_types TEXT DEFAULT '[]',
  status TEXT CHECK(status IN ('active','passive','placed','do_not_contact')) DEFAULT 'active',
  source TEXT,
  tags TEXT DEFAULT '[]',
  bio TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('license','certification','dea','bls','acls','tb','immunization','background','drug_screen')) NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT,
  number TEXT,
  state TEXT,
  issued_on TEXT,
  expires_on TEXT,
  status TEXT CHECK(status IN ('verified','pending','expired','rejected')) DEFAULT 'pending',
  verified_by TEXT,
  verified_at TEXT,
  document_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('hospital','clinic','staffing','ltc','home_health','telehealth')) DEFAULT 'hospital',
  city TEXT,
  state TEXT,
  ehr TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  baa_signed_at TEXT,
  contract_status TEXT CHECK(contract_status IN ('prospect','active','paused')) DEFAULT 'prospect',
  fee_pct REAL DEFAULT 0.20,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  specialty TEXT,
  city TEXT,
  state TEXT,
  setting TEXT,
  shift TEXT,
  shift_hours REAL DEFAULT 12,
  start_date TEXT,
  duration_weeks INTEGER DEFAULT 13,
  rate_min REAL,
  rate_max REAL,
  rate_basis TEXT DEFAULT 'hour',
  openings INTEGER DEFAULT 1,
  filled INTEGER DEFAULT 0,
  status TEXT CHECK(status IN ('draft','open','on_hold','filled','closed')) DEFAULT 'open',
  priority TEXT CHECK(priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  required_certs TEXT DEFAULT '[]',
  required_states TEXT DEFAULT '[]',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  stage TEXT CHECK(stage IN ('sourced','screened','submitted','client_review','interview','offer','placed','rejected','withdrawn')) DEFAULT 'submitted',
  match_score INTEGER DEFAULT 0,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  stage_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  rejection_reason TEXT,
  offer_rate REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  clinician_id INTEGER NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  recruiter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_date TEXT,
  end_date TEXT,
  hours REAL DEFAULT 0,
  pay_rate REAL DEFAULT 0,
  bill_rate REAL DEFAULT 0,
  fee_amount REAL DEFAULT 0,
  fee_status TEXT CHECK(fee_status IN ('pending','invoiced','paid')) DEFAULT 'pending',
  status TEXT CHECK(status IN ('active','completed','cancelled')) DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_key TEXT NOT NULL,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  clinician_id INTEGER REFERENCES clinicians(id) ON DELETE SET NULL,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  mode TEXT CHECK(mode IN ('phone', 'video', 'onsite')) DEFAULT 'video',
  interviewer TEXT,
  notes TEXT,
  outcome TEXT CHECK(outcome IN ('scheduled', 'completed', 'no_show', 'cancelled')) DEFAULT 'scheduled',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_interviews_submission ON interviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled ON interviews(scheduled_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  summary TEXT,
  meta TEXT DEFAULT '{}',
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
