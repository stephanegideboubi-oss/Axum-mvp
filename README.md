# AXUM (Phase 1 MVP)

A trust-first crowdfunding platform: every dollar raised is tied to a specific, itemized
budget line, and funds only move to a vendor after proof of work is uploaded and an admin
releases them. Contributors can track a project's line-by-line progress at any time — even
without an account — using the tracking number (UIN) they receive when they contribute.

This is a **Phase 1 MVP** per the project specification: donation-based only, no real money
movement, and escrow is simulated by a human admin instead of a real bank integration. See
**Assumptions & what's stubbed** below before treating anything here as production-ready.

## Status — Phase 1 complete

All six Phase 1 slices are built and manually verified end-to-end:

1. **Auth** — register/login for entrepreneur, contributor, and vendor; admin accounts are
   promoted manually (see below). Vendors additionally submit business registration info and
   start out "pending" until an admin verifies them.
2. **Entrepreneur portal** — create a project (title, description, location, funding goal),
   build its budget line by line (description, category, location, quantity, unit cost — the
   line's dollar amount is computed automatically), then publish it. A project can be
   cancelled at any point before it closes, which refunds any contributions.
3. **Contributor portal** — browse public projects, contribute a simulated amount to any
   "open" project (no real payment gateway), and receive a UIN. A project flips to "funded"
   automatically once contributions reach its goal. Contributors have a "My contributions"
   page, and **anyone** can look up a project's live status by UIN at `/track` with no login
   at all — this is the "log back in via UIN" flow from the spec.
4. **Vendor portal** — once a project is funded, verified vendors can bid on its open line
   items; the entrepreneur who owns the project selects a winning bid (auto-rejecting the
   rest) or rejects bids individually.
5. **Escrow simulation** — an admin manually marks a line item's funds "held" once a vendor is
   selected, the selected vendor uploads proof of work (invoice / payment proof / delivery
   photo), and the admin manually marks the funds "released." No bank or payment API is
   involved — this validates the workflow ahead of a real integration in Phase 2.
6. **Disputes** — any contributor to a project can flag one of its line items as suspicious.
   Once contributors representing 10% or more of that project's total funding have flagged the
   same line, disbursement on that line freezes automatically (other lines are unaffected).
   Below that threshold, the flag just notifies admins for a lighter-touch look. Admins resolve
   flags from `/admin/disputes`, optionally unfreezing the line.

**Not built (explicitly Phase 2+ per the spec):** AI vendor-matching/market-rate suggestions,
real payment processing (Stripe/Flutterwave), a real bank/escrow partner integration, vendor
reputation scoring, contributor voting on budget changes, and the public transparency
dashboard. See "Explicitly out of scope" below.

## Architecture

- `backend/` — Node.js + TypeScript + Express, `pg` for Postgres (no ORM, raw SQL), JWT auth.
- `frontend/` — React + TypeScript + Vite + Tailwind.
- `postgres` — schema loaded from `backend/src/db/init/001_schema.sql` on first container start.
- `docker-compose.yml` — runs all three together for local dev.

## Running locally

### Option A — Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

- Backend: http://localhost:4000/health should return `{"status":"ok"}`
- Frontend: http://localhost:5173

Live-reload for both services uses filesystem polling (`CHOKIDAR_USEPOLLING` / Vite's
`usePolling`) — this is needed because Docker bind mounts on Windows don't reliably deliver
native filesystem change events. If you edit a file and don't see it reflected within a couple
of seconds, restart the relevant container: `docker compose restart backend` or
`docker compose restart frontend`.

### Option B — run natively (requires Node 20+ and a local Postgres 16)

```bash
# 1. Start Postgres and load the schema once (adjust connection details as needed)
psql "postgres://trustfund:trustfund_dev_pw@localhost:5432/trustfund" -f backend/src/db/init/001_schema.sql

# 2. Backend
cd backend
cp .env.example .env   # point DATABASE_URL at your local Postgres
npm install
npm run dev

# 3. Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Testing the auth slice manually

1. Open http://localhost:5173/register, create an account, choosing entrepreneur, contributor,
   or vendor. Choosing vendor requires a business registration info field.
2. You should land on `/dashboard` showing your name, email, role, and — for vendors — a
   "pending" verification status with an explanation that an admin must approve you before you
   can bid.
3. Log out, then log back in at `/login` with the same credentials.
4. Registering with the same email twice should return `409`.

## Testing the entrepreneur slice manually

1. Log in as an **entrepreneur**, click "Start a new project" from the dashboard.
2. Fill in title, description, location, and funding goal — you land on the project page in
   `DRAFT`.
3. Add one or more budget line items (description, category, location, quantity, unit cost) —
   each one's dollar amount is computed for you.
4. Click "Publish project" — status flips to `OPEN` and it becomes visible to everyone at
   `/projects`, including logged-out visitors.
5. As the owner, you can cancel the project at any point before it's closed; if it already has
   contributions, cancelling refunds them (marks them `refunded`).

## Testing the contributor slice manually

1. Log in as a **contributor**, open any project marked `OPEN`, enter an amount, and click
   "Contribute" (simulated — no real payment gateway).
2. You should see a green confirmation with your UIN (e.g. `AXM-7F3K9Q2A1B`) — this persists
   on the page even if the project's status changes as a result of your contribution.
3. If your contribution brings the project's total to its funding goal, its status flips to
   `FUNDED` automatically, unlocking vendor bidding.
4. Visit "My contributions" from the dashboard — every contribution you've made is listed with
   its UIN and status.
5. Log out entirely, go to `/track`, paste in a UIN, and click Track — you should see that
   project's status and line-item progress with no login required.

## Testing the vendor + escrow slices manually

1. Log in as **admin**, go to `/admin`, and approve any vendor still showing "pending" (see
   "Creating the first admin user" below if you don't have an admin account yet).
2. Log in as that vendor, open a **funded** project, and submit a bid (amount + notes) on a
   line item still marked "OPEN FOR BIDS." The line flips to "RECEIVING BIDS."
3. Log in as the entrepreneur who owns that project, click "View bids" on that line, and click
   "Select" on a bid — it flips to "VENDOR SELECTED," and the other bids on that line are
   auto-rejected.
4. Log back in as **admin**, open the same line, and click "Hold $X in escrow" — this simulates
   the bank/escrow step (no real money moves). The line flips to "FUNDS HELD IN ESCROW."
5. Log in as the selected vendor and use the "Upload proof" form (pick a type, paste any URL as
   a stand-in file link, optionally add a description). The line flips to "PROOF UPLOADED," and
   the proof is visible to anyone viewing the project.
6. Log back in as **admin** and click "Release $X to vendor." The line flips to "RELEASED TO
   VENDOR."

## Testing the disputes slice manually

1. Log in as a **contributor** who has funded a project, open it, and click "Flag this line
   item as suspicious" on any line, with a reason.
2. If your contribution is large enough relative to the project's total funding (10%+), the
   line immediately shows "· FLAGGED, DISBURSEMENT FROZEN," and its "Release" button (if
   visible to an admin) becomes disabled with an explanation.
3. Log in as **admin**, go to `/admin/disputes` — the flag appears with its reason and
   timestamp.
4. Write resolution notes, optionally check "Also unfreeze this line item's disbursement," and
   click "Mark resolved" — it disappears from the queue, and if you checked unfreeze, the line
   item's frozen badge clears and its release button works again.

## Demo mode

There's a seed script that populates realistic demo data so you're not presenting an empty app.
It's idempotent (safe to run once) and lives outside the app's runtime code path —
[`backend/src/db/seed.ts`](backend/src/db/seed.ts).

**Run it after `docker compose up --build` is running:**

```bash
docker compose exec backend npm run seed
```

(Running natively instead of Docker? Just `cd backend && npm run seed`.)

This creates 7 demo accounts (all sharing the password `Demo1234!`) and two projects — one
fully funded and mid-flow (one line held with proof uploaded and ready to release live, one
line awarded and ready to hold funds live, one still open for bidding), and one fresh project
still collecting contributions with one vendor sitting "pending" verification, ready to approve
live. See [HOW_TO_DEMO.md](HOW_TO_DEMO.md) for a plain-English walkthrough and the full account
list.

## Deploying to show people (Railway)

This repo has production Dockerfiles (`backend/Dockerfile.prod`, `frontend/Dockerfile.prod`,
distinct from the dev ones `docker-compose.yml` uses) ready for a platform like
[Railway](https://railway.app). Steps:

1. **Push this repo to GitHub** (Railway deploys from a repo — a private repo is fine).
2. **Railway**: create an account → New Project → **Add a Postgres plugin** (gives you a
   `DATABASE_URL` automatically).
3. **Add the backend service**: "Deploy from GitHub repo" → set root directory to `backend/` →
   in service settings, set the Dockerfile path to `Dockerfile.prod`. Environment variables:
   - `DATABASE_URL` → reference the Postgres plugin's variable (Railway lets you link it)
   - `JWT_SECRET` → generate a real one: `openssl rand -hex 32` — do **not** reuse the dev
     placeholder from `.env.example`
   - `JWT_EXPIRES_IN` → `7d` (optional, defaults to that)
4. **Load the schema once**: copy the `DATABASE_URL` Railway shows you for the Postgres plugin,
   then from your machine: `psql "<that DATABASE_URL>" -f backend/src/db/init/001_schema.sql`.
5. **(Optional) seed demo data** the same way: `DATABASE_URL="<that DATABASE_URL>" npm --prefix backend run seed`.
6. **Add the frontend service**: same repo, root directory `frontend/`, Dockerfile path
   `Dockerfile.prod`. Set a **build-time** variable `VITE_API_URL` to the backend service's public
   Railway URL (Railway generates one once the backend service is deployed — grab it first).
   This has to be a build-time variable, not a runtime one, because Vite bakes it into the static
   bundle at build time.
7. Once both services show green, open the frontend's public URL — that's the link to share.

**Before you share the link with anyone**, know what's still a stub in this build (see the table
below): no real payments, no real vendor identity verification beyond an admin's own judgment,
no real bank/escrow integration. Fine for a demo, not for handling real money or real user data.

## Creating the first admin user

Public registration only allows `entrepreneur` / `contributor` / `vendor` (self-registering as
`admin` would defeat the point of admin gating). To create an admin account for local testing,
register normally as any role, then promote the account directly in Postgres:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Log out and back in afterward so a fresh JWT picks up the new role.

## Data model

`users`, `projects`, `budget_line_items`, `bids`, `contributions`, `disbursements`,
`proof_documents`, `disputes`, `audit_log` — full DDL in
[`backend/src/db/init/001_schema.sql`](backend/src/db/init/001_schema.sql).

Key design points:

- **`contributions.uin`** is the unique tracking number given to each contribution — the
  mechanism behind the spec's "log back in via UIN" flow. It requires no account: anyone
  holding it can look up that project's status at `GET /contributions/uin/:uin`.
- **`users.verification_status`** (vendor-only) implements the spec's manual admin
  vendor-verification step — vendors cannot bid until an admin sets it to `verified`.
- **`disbursements`** is one row per line item once a vendor is selected; its `status` moves
  `held → released` via two distinct, explicit admin actions — the manual escrow simulation.
- **`budget_line_items.disputed`** is the automatic freeze flag described in "Testing the
  disputes slice" above — recomputed every time a dispute is raised, based on the combined
  contribution weight of everyone who has flagged that line.
- **`audit_log`** is append-only and hash-chained: each row's `hash` is
  `sha256(row_fields + prev_hash)`. See `backend/src/services/auditLog.ts`. This is the MVP
  stand-in for the spec's "immutable disbursement log" — tamper-evident, not tamper-proof, and
  it can be swapped for a real permissioned ledger later without changing the app-facing API,
  since callers only see `appendAuditLog()` / `verifyAuditChain()`.

## API surface

```
POST   /auth/register                          entrepreneur / contributor / vendor
POST   /auth/login
GET    /users/me

POST   /projects                               entrepreneur only — creates a draft
GET    /projects                               public (?mine=true for your own, incl. drafts)
GET    /projects/:id                           public — includes raised_amount, line items
POST   /projects/:id/line-items                owner only, draft projects only
PATCH  /projects/:id/publish                    owner only — draft -> open
PATCH  /projects/:id/fail                       owner or admin — cancels + refunds contributions
POST   /projects/:id/contributions              contributor only — simulated, issues a UIN

GET    /contributions/mine                      contributor only
GET    /contributions/uin/:uin                  public — the UIN-tracking lookup

POST   /line-items/:id/bids                     verified vendor only, funded projects only
GET    /line-items/:id/bids                     public
PATCH  /bids/:id/select                         project owner only
PATCH  /bids/:id/reject                         project owner only

POST   /line-items/:id/hold                     admin only — manual escrow "hold"
POST   /line-items/:id/proof                    the selected vendor only
GET    /line-items/:id/proof                    public
POST   /line-items/:id/release                  admin only — manual escrow "release"

POST   /line-items/:id/disputes                 contributor to that project only
GET    /disputes                                admin only (?status=)
PATCH  /admin/disputes/:id/resolve              admin only

GET    /admin/vendors                           admin only (?verification_status=)
PATCH  /admin/vendors/:id/verify                admin only

GET    /audit-log/:entityType/:entityId         public
```

## Assumptions & what's stubbed

These are deliberate MVP simplifications. Anything marked **must change before real launch** is
a hard blocker, not a nice-to-have.

| Area | MVP approach | Must change before real launch? |
|---|---|---|
| Funding model | Donation-based, not equity or debt securities | If investment-based contributions are ever added, that needs securities counsel and a separate legal/technical track first — see the spec's Section 6. |
| Contributions / payments | Fully simulated — clicking "Contribute" just records the amount, no payment gateway at all | **Yes** — Phase 2 per the spec: a real US payment processor first, then Cameroon mobile money via a regional aggregator. |
| Escrow | Manual admin "hold" / "release" actions on each line item | **Yes** — Phase 2: a real bank/escrow partnership, formalized legally before any real money moves. |
| Vendor verification | Manual admin approval of a free-text business registration field | **Yes** — needs a real identity/business verification vendor before real launch. |
| AI vendor-matching / market-rate suggestions | Not built | Phase 2 per the spec. |
| Dispute freeze threshold | Contributors representing 10% of a project's total funding auto-freezes one line; below that, admins are just notified | Revisit with product input once real usage data exists. |
| "Immutable disbursement log" | Append-only, hash-chained `audit_log` table in Postgres | Tamper-evident within this one database, not independent of it — swap for a real permissioned ledger if genuine tamper-proof/distributed guarantees are required. |

## Explicitly out of scope for this MVP (Phase 2+)

- Real payment processing (Stripe for US cards/ACH, Flutterwave/mobile money for Cameroon)
- Real bank/escrow partner integration
- AI vendor-matching and market-rate/anomaly-detection engine
- Vendor reputation scoring
- Contributor voting on budget change requests
- Public, platform-wide transparency dashboard
- Automated/mediated dispute resolution

## Security notes

- Passwords hashed with bcrypt (cost 12). JWT secret must be a real secret in any non-local
  environment — `backend/.env.example` ships with a placeholder only.
- No real payment credentials exist anywhere in this repo. Do not add them without explicit
  confirmation, and never commit them.
