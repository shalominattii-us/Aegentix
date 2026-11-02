# AEGENTIX Prosurance

Healthcare recruiting workspace for placing clinicians: candidates, credentials and
expiring compliance, client requisitions, ranked matches, submission pipeline, and
placement fees. One Node service serves the API and the React app; data lives in a
local SQLite file.

Built for AEGENTIX from the upstream medical recruiting platform spec
(`medical-recruiting-platform/README.md`) and the recruiter engine in
`shalominattii-us/Aegentix-super-agent-wallet-Google-ai-studios`.

## Run it

```bash
npm install
npm --prefix client install
npm run seed          # creates data/prosurance.db with demo data (safe to rerun)
npm run build         # builds the React app into client/dist
npm start             # http://localhost:8787
```

Development with hot reload:

```bash
npm run dev:api       # API on :8787
npm run dev:web       # Vite dev server on :5173, proxies /api
```

Demo logins (from the seed):

| Role | Email | Password |
| --- | --- | --- |
| Recruiter | recruiter@aegentix.health | Prosurance!2026 |
| Admin | admin@aegentix.health | Prosurance!2026 |
| Employer | talent@mercyhealth.example | Prosurance!2026 |

## What it does

- **Dashboard**: open requisitions, active candidates, submissions this week,
  placements month to date, revenue, credentials expiring in 30 days, pipeline funnel
  and recent audit activity.
- **Candidates**: searchable clinician roster with discipline, state and status
  filters, rate ranges, availability, and per candidate credential tracking with
  verify actions.
- **Requisitions**: employer jobs with shift, start date, rate band, required
  certifications and multi state licensing, plus a ranked match panel.
- **Matching**: a deterministic 100 point score across discipline, specialty, state
  licensure (including compact IMLC/NLC), availability, rate fit, certification
  coverage and travel willingness, with human readable reasons.
- **Pipeline**: nine stage kanban from sourced through placed, with stage advances and
  rejections recorded in the audit log.
- **Placements**: hours, pay and bill rates, margin, and fee status, with a close-out
  workflow (invoice, mark paid, complete) and CSV ledger export.
- **Compliance**: expiring and expired credentials plus a full HIPAA style audit log
  of every mutation.

## API

Base URL `/api/v1`, bearer token auth. Key routes:

```
POST   /auth/login                    GET    /dashboard/summary
GET    /clinicians                    GET    /clinicians/:id
POST   /clinicians                    PATCH  /clinicians/:id
GET    /clinicians/:id/credentials    POST   /clinicians/:id/credentials
PATCH  /credentials/:id               GET    /jobs
GET    /jobs/:id                      POST   /jobs
GET    /jobs/:id/matches              GET    /employers
POST   /employers                     GET    /submissions
POST   /submissions                   PATCH  /submissions/:id
GET    /placements                    POST   /placements
PATCH  /placements/:id                (fee_status, status, end_date, hours, rates)
GET    /compliance/expiring           GET    /compliance/audit
GET    /exports/candidates.csv        GET    /exports/compliance.csv
GET    /exports/placements.csv        (respect filters, audited downloads)
```

The full contract, schema and matching weights are in [SPEC.md](SPEC.md).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | HTTP port |
| `DB_PATH` | `./data/prosurance.db` | SQLite file |
| `JWT_SECRET` | dev value | Token signing secret, set in production |

## Docker

```bash
docker compose up --build
```

## Tests

```bash
npm test
```

Covers auth, roster filtering, candidate detail, match ordering, submission
duplicate guards, stage changes, placement side effects, compliance ordering and the
dashboard summary.

## Notes

- HIPAA-oriented controls here are application level: audit logging of every
  mutation, credential verification state, and role separation. A production
  deployment still needs a signed BAA, encryption at rest, network isolation and
  key management.
- The SQLite file is single node. For multi tenant production use, move the data
  layer to a managed Postgres instance.
