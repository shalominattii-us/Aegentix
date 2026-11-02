# AEGENTIX Prosurance — Build Specification (authoritative)

Healthcare recruiting workspace for AEGENTIX. Sourced from the upstream medical recruiting spec in
`shalominattii-us/Aegentix-super-agent-wallet-Google-ai-studios/medical-recruiting-platform/README.md`
and the `sovereign-medical-recruiter-engine.js` engine. Rebuilt as a self-contained,
runnable application: one Node service (API + static frontend) with SQLite.

Tagline: **Place clinicians faster, with every credential proven.**

## Stack (fixed — do not substitute)

- Node 24 (system node), ESM (`"type": "module"` in package.json)
- Server: `express@4`, `jsonwebtoken`, `bcryptjs`, `zod`, `cors`
- DB: **`node:sqlite`** (built into Node 24 — `import { DatabaseSync } from 'node:sqlite'`). No native modules, no Prisma, no Postgres.
- Client: React 18 + Vite 5 + Tailwind CSS 3 + react-router-dom 6 + lucide-react
- Tests: `node --test` with plain `fetch` against a server started on a test port.

## Layout

```
aegentix-prosurance/
  package.json          (server deps + scripts; owned by backend worker)
  server/
    index.js            express app, mounts routes, serves client/dist if built
    db.js               DatabaseSync open + schema apply + pragmas
    schema.sql
    auth.js             signToken, authenticate middleware, requireRole
    matching.js         scoreClinicianForJob(job, clinician, credentials) -> {score, reasons[]}
    routes/auth.js  dashboard.js  clinicians.js  employers.js  jobs.js  submissions.js  placements.js  compliance.js  messages.js
    seed.js             idempotent seed (`npm run seed`)
  test/api.test.js
  client/               (owned by frontend worker)
    package.json  vite.config.js  index.html  tailwind.config.js  postcss.config.js
    src/{main.jsx,App.jsx,api.js,auth.jsx,components/*,pages/*}
```

## Conventions

- snake_case everywhere: DB columns, JSON payloads, query params. Dates are ISO strings (`2026-11-01T18:04:00.000Z`); date-only fields are `YYYY-MM-DD`.
- All money in USD as REAL. Rates are per hour unless `rate_basis` says otherwise.
- API base `/api/v1`. JSON only. Auth: `Authorization: Bearer <jwt>`, 7-day expiry, payload `{sub, role, email, name}`.
- Errors: `{ "error": "message" }` with proper status (400 validation, 401 auth, 403 role, 404 not found, 409 conflict).
- Every mutating endpoint writes an `audit_log` row (HIPAA-style).
- SQLite: `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`. DB file path from `DB_PATH` env, default `./data/prosurance.db`.

## Schema (exact column names)

**users** — id INTEGER PK AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT, role TEXT (`recruiter|admin|employer|clinician`), full_name TEXT, phone TEXT, created_at TEXT, last_login_at TEXT

**clinicians** — id, user_id, recruiter_id, first_name, last_name, email, phone, discipline TEXT (`RN|LPN|NP|PA|MD|DO|CRNA|CNA|Therapist|Allied`), specialty TEXT, years_experience INTEGER, city, state TEXT (2-letter), willing_to_travel INTEGER 0/1, remote_ok INTEGER 0/1, availability_date TEXT, rate_min REAL, rate_max REAL, rate_basis TEXT (`hour|week|year`), employment_types TEXT (JSON array string), status TEXT (`active|passive|placed|do_not_contact`), source TEXT, tags TEXT (JSON array string), bio TEXT, created_at, updated_at

**credentials** — id, clinician_id, type TEXT (`license|certification|dea|bls|acls|tb|immunization|background|drug_screen`), name, issuer, number, state, issued_on, expires_on, status TEXT (`verified|pending|expired|rejected`), verified_by, verified_at, document_url, created_at

**employers** — id, name, type TEXT (`hospital|clinic|staffing|ltc|home_health|telehealth`), city, state, ehr, contact_name, contact_email, contact_phone, baa_signed_at, contract_status TEXT (`prospect|active|paused`), fee_pct REAL, notes, created_at

**jobs** — id, employer_id, recruiter_id, title, discipline, specialty, city, state, setting, shift, shift_hours REAL, start_date, duration_weeks INTEGER, rate_min REAL, rate_max REAL, rate_basis TEXT, openings INTEGER, filled INTEGER DEFAULT 0, status TEXT (`draft|open|on_hold|filled|closed`), priority TEXT (`low|normal|high|urgent`), required_certs TEXT (JSON array), required_states TEXT (JSON array), description, created_at, updated_at

**submissions** — id, job_id, clinician_id, recruiter_id, stage TEXT (`sourced|screened|submitted|client_review|interview|offer|placed|rejected|withdrawn`), match_score INTEGER, submitted_at, stage_updated_at, notes, rejection_reason, offer_rate REAL, created_at

**placements** — id, submission_id, clinician_id, job_id, employer_id, recruiter_id, start_date, end_date, hours REAL, pay_rate REAL, bill_rate REAL, fee_amount REAL, fee_status TEXT (`pending|invoiced|paid`), status TEXT (`active|completed|cancelled`), created_at

**interviews** — id, submission_id, clinician_id, job_id, scheduled_at TEXT (ISO datetime), duration_minutes INTEGER, mode TEXT (`phone|video|onsite`), interviewer, notes, outcome TEXT (`scheduled|completed|no_show|cancelled`), created_by, created_at, updated_at

**messages** — id, thread_key, sender_id, recipient_id, body, read_at, created_at

**audit_log** — id, actor_id, actor_email, action, entity, entity_id, summary, meta TEXT (JSON), ip, created_at

## REST API (exact shapes)

Auth
- `POST /api/v1/auth/login` `{email,password}` → `{token, user:{id,email,role,full_name}}`
- `POST /api/v1/auth/register` `{email,password,full_name,role?}` → same
- `GET /api/v1/auth/me` → `{user}`

Dashboard
- `GET /api/v1/dashboard/summary` → `{kpis:{open_jobs, active_candidates, submissions_this_week, placements_mtd, revenue_mtd, expiring_credentials_30d, avg_time_to_submit_days}, pipeline:[{stage,count}], jobs_by_status:[{status,count}], expiring_credentials:[{id, name, type, expires_on, clinician_id, clinician_name, days_left}], recent_activity:[{id,action,summary,actor_email,created_at}]}`

Clinicians
- `GET /api/v1/clinicians?query&discipline&state&status&page=1&limit=25` → `{items:[clinician + {open_submissions, credentials_verified, credentials_expiring}], total, page, limit}`
- `GET /api/v1/clinicians/:id` → `{clinician, credentials:[...], submissions:[{id, job_id, job_title, employer_name, stage, match_score, submitted_at}], matches:[{job_id, title, employer_name, score, reasons:[string]}]}`
- `POST /api/v1/clinicians` (recruiter/admin) → created clinician
- `PATCH /api/v1/clinicians/:id` → updated clinician
- `DELETE /api/v1/clinicians/:id` (admin only)
- `GET /api/v1/clinicians/:id/credentials` → `{items}`
- `POST /api/v1/clinicians/:id/credentials` → created credential
- `PATCH /api/v1/credentials/:id` `{status}` → updated credential (sets verified_by/verified_at when verified)

Employers
- `GET /api/v1/employers?query&contract_status` → `{items:[employer + {open_jobs, active_placements}], total}`
- `GET /api/v1/employers/:id` → `{employer, jobs:[...], summary:{open_jobs, placements_active, revenue_total}}`
- `POST /api/v1/employers`, `PATCH /api/v1/employers/:id`

Jobs
- `GET /api/v1/jobs?status&priority&query&discipline&state` → `{items:[job + {employer_name, submissions_count, shortlisted_count}], total}`
- `GET /api/v1/jobs/:id` → `{job, employer, pipeline:[{stage,count}], submissions:[{id, clinician_id, clinician_name, discipline, specialty, stage, match_score, submitted_at}]}`
- `POST /api/v1/jobs`, `PATCH /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/matches?limit=10` → `{matches:[{clinician_id, name, discipline, specialty, state, years_experience, rate_min, rate_max, availability_date, score, reasons:[string]}]}`

Submissions
- `GET /api/v1/submissions?stage&job_id&clinician_id&limit` → `{items:[submission + {clinician_name, discipline, specialty, job_title, employer_name}]}`
- `POST /api/v1/submissions` `{job_id, clinician_id, notes?}` → 201 submission (computes match_score, stage `submitted`, `submitted_at` now; 409 if an open submission already exists for that pair)
- `PATCH /api/v1/submissions/:id` `{stage?, notes?, offer_rate?, rejection_reason?}` → updated; sets `stage_updated_at`
- `DELETE /api/v1/submissions/:id`

Placements
- `GET /api/v1/placements` → `{items:[placement + {clinician_name, job_title, employer_name}], totals:{active, hours, revenue, fees_pending}}`
- `POST /api/v1/placements` `{submission_id, start_date, bill_rate, pay_rate, hours?}` → 201 placement; submission → `placed`; job `filled += 1` (and `status='filled'` when filled >= openings); `fee_amount = hours * (bill_rate - pay_rate)` when hours>0 else `bill_rate * 0.2 * 160`

Compliance
- `GET /api/v1/compliance/expiring?days=30` → `{items:[credential + {clinician_name, days_left}]}`
- `GET /api/v1/compliance/audit?limit=50` → `{items}`

Interviews
- `GET /api/v1/interviews?job_id&clinician_id&submission_id&outcome&upcoming=true&limit` → `{items:[interview + {clinician_name, job_title, employer_name, submission_stage}], total}`
- `POST /api/v1/interviews` `{submission_id, scheduled_at, duration_minutes?, mode?, interviewer?, notes?}` → 201 interview; advances a pre-interview submission to `interview`
- `PATCH /api/v1/interviews/:id` `{outcome?, scheduled_at?, mode?, duration_minutes?, interviewer?, notes?}` → updated interview

Exports (audited, `text/csv` attachments)
- `GET /api/v1/exports/candidates.csv?query&discipline&state&status`
- `GET /api/v1/exports/compliance.csv?days`
- `GET /api/v1/exports/placements.csv`

Messages
- `GET /api/v1/messages/thread/:threadKey` → `{items}` ; `POST /api/v1/messages` `{thread_key, recipient_id?, body}` → created

## Matching algorithm (implement exactly — tested)

`scoreClinicianForJob(job, clinician, credentials)` returns `{score, reasons}`:

| Component | Points |
|---|---|
| discipline equals job.discipline | 20 |
| specialty equals (case-insensitive trim) | 25, else if either contains the other 15 |
| licensed in job state: verified license credential with `state == job.state` | 20; else if clinician has compact license (`IMLC`/`NLC` in name) or `job.required_states` empty | 12; else 0 |
| availability: `availability_date <= job.start_date` 10; within 30 days of it 6; else 2 |
| rate: `clinician.rate_min <= job.rate_max` 15; else 0 if more than 15% over, else 8 |
| required_certs coverage: 10 × covered/total (10 when list empty) |
| willing_to_travel when clinician.state != job.state | +5 |

Clamp final score to 0–100, round to integer. `reasons` are short human strings such as
`"RN matches requisition discipline"`, `"Licensed in CA"`, `"Available before Nov 15"`,
`"Rate within bill range"`, `"3 of 4 certifications"`, `"Willing to travel"`.

## Seed data (idempotent; `npm run seed`)

- Users: `recruiter@aegentix.health` / `Prosurance!2026` (recruiter, "Dana Whitfield"), `admin@aegentix.health` / `Prosurance!2026` (admin, "AEGENTIX Admin"), `talent@mercyhealth.example` / `Prosurance!2026` (employer, "Mercy Health Talent").
- 24 clinicians across RN, LPN, NP, PA, MD, CRNA, CNA, Allied with real specialties (ICU, ER, Med-Surg, L&D, OR, PACU, Telemetry, Behavioral Health, Primary Care, Radiology Tech, Physical Therapist, Respiratory Therapist), 12 states, mix of `active`/`passive`/`placed`, realistic rate ranges (RN 55–95/hr, NP 95–140/hr, MD 160–260/hr).
- 8 employers (Mercy Health Sacramento, Cedars-Sinai Los Angeles, Houston Methodist, Denver Health, Ascension Austin, Kindred LTAC Phoenix, BayCare Tampa, TeleHealth Now) with contract_status and BAA dates.
- 16 jobs across those employers: title, discipline, specialty, shift (Day/Night/3x12/EOW), start dates Nov 2026–Jan 2027, rate ranges, required certs (BLS, ACLS, PALS, TNCC, NIHSS), priorities.
- ~18 credentials spread across clinicians, including at least 5 expiring within 30 days and some expired, some pending verification.
- 22 submissions spread across every pipeline stage, plus 3 placements (one paid, one invoiced, one pending) with hours.
- Audit rows for each seeded mutation (action/entity/summary).
- Seed must be safe to run twice (delete+insert inside a transaction or `INSERT OR IGNORE` by unique natural keys).

## Frontend requirements

React SPA, dark professional UI ("clinical ops room"): near-black slate background `#0B1220`, panels `#111A2C`, hairline borders `#1E2A44`, text `#E6EDF7` / muted `#8A9AB4`, single accent teal `#2DD4BF` (plus amber for expiring, rose for rejected/urgent, emerald for verified/placed). Inter/system sans, tabular numbers for metrics. No emoji. No gradients on data. Compact density, 12–14px body, 24–28px page padding, cards with 12px radius and 1px borders.

Routes: `/login`, `/` dashboard, `/candidates`, `/candidates/:id`, `/jobs`, `/jobs/:id`, `/pipeline`, `/employers`, `/compliance`, `/placements`.

Required behavior:
- `api.js`: `request(path, {method, body, query})` prefixing `/api/v1`, attaching bearer token from `localStorage.prosurance_token`, throwing `Error(message)` on `!res.ok` from `{error}`.
- Auth context: login, logout, persisted token, `/auth/me` bootstrap, redirect to `/login` when unauthenticated, 401 → logout.
- App shell: fixed left sidebar (AEGENTIX wordmark + PROSURANCE tag, nav with icons and active state, user block with sign out), top bar with page title, global search box (routes to `/candidates?query=`), "New submission" primary button.
- Dashboard: 6 KPI tiles, pipeline funnel bars, jobs-by-status list, expiring-credentials table (days-left pill colored by urgency), recent activity feed (relative time).
- Candidates: searchable/filterable table (discipline, state, status), row click → detail; pagination; "Add candidate" modal form (first/last name, discipline, specialty, state, rate range, availability, status).
- Candidate detail: header with name/discipline/specialty/status, contact block, rate and availability, credential list with status pills and "Verify" action for pending, "Add credential" modal, top matched requisitions with score + reasons, submission history.
- Jobs: filterable list with priority chips and fill progress (`filled/openings`); detail with employer card, requirements, pipeline counts, submissions table with stage advance dropdown, and a "Top matches" panel with score bars and a "Submit" action per match.
- Pipeline: kanban columns for the 9 stages, cards showing candidate, job, employer, score, days in stage; each card has advance/reject controls that PATCH the submission and refresh.
- Employers: cards/table with contract status, open jobs, placements; detail optional (list only is acceptable).
- Compliance: expiring credentials (days filter 30/60/90) and audit log table.
- Placements: table with hours, bill/pay, margin, fee status; totals row.
- Every page: loading skeleton/rows, empty state with an action, and readable error banner on API failure.

## Definition of done

1. `npm install` (root) and `npm --prefix client install` succeed.
2. `npm run seed` creates `data/prosurance.db` with the seed rows (rerunnable).
3. `npm test` passes all API tests (auth, list/filter, create, matching ordering, submission guard, placement side effects, compliance ordering).
4. `npm run build` produces `client/dist` and `npm start` serves the SPA at `http://localhost:8787` with the API live.
5. `docker-compose.yml` + `Dockerfile` present and coherent with the above.
6. `README.md` documents local run, env vars, seeded logins, and API surface.
