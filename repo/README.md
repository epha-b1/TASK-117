# ForgeOps Fulfillment & Planning Console

An offline-first, single-page web application for a fabrication-and-delivery team: lead intake with round-robin assignment, BOM-based plan management with versioning and share links, delivery scheduling with freight calculation and proof-of-delivery capture, an internal escrow ledger with invoice/voucher printing, in-app notifications with DND and retry, an append-only audit log, encrypted backup/restore, a pluggable delivery-API adapter with exportable local queue, and Web Worker-backed async jobs with checkpoint persistence. No backend. All persistence is via IndexedDB + LocalStorage in the browser.

## Architecture & Tech Stack

* **Frontend:** Svelte 4 + TypeScript, bundled with Vite 5
* **Backend:** None — the app is a fully client-side SPA
* **Database:** IndexedDB (via `idb`) + LocalStorage in the user's browser
* **Async Jobs:** Dedicated Web Workers (BOM compare, bulk delivery generation, ledger reconciliation) with checkpointed pause/resume
* **Crypto:** WebCrypto (PBKDF2 for password hashing, AES-256-GCM for encrypted backups)
* **Testing:** Vitest + jsdom + fake-indexeddb, Testing Library for Svelte components
* **Containerization:** Docker & Docker Compose (Required)

## Project Structure

```text
.
├── src/
│   ├── components/         # Reusable Svelte components (layout, common, per-feature)
│   ├── routes/             # Route-level pages (LeadInbox, PlanWorkspace, DeliveryCalendar, ...)
│   ├── services/           # Business-logic services (authz, leads, plans, deliveries, ledger, jobs, ...)
│   ├── workers/            # Web Worker entry points + main↔worker protocol
│   ├── stores/             # Svelte stores (session, toasts)
│   ├── guards/             # Route guards (defence-in-depth over service-layer RBAC)
│   ├── types/              # Shared TypeScript types incl. IndexedDB schema
│   └── utils/              # Crypto, BOM diff, distance, formatting, sanitize, uid
├── tests/
│   ├── unit/               # Pure-function unit tests
│   ├── integration/        # Service + DB + RBAC integration tests
│   └── component/          # Svelte component tests
├── public/                 # Static assets served as-is
├── scripts/                # Build / tooling scripts
├── Dockerfile              # Multi-stage build (runtime + test targets) — MANDATORY
├── docker-compose.yml      # Multi-container orchestration — MANDATORY
├── run_tests.sh            # Standardized test execution script — MANDATORY
└── README.md               # Project documentation — MANDATORY
```

## Prerequisites

To ensure a consistent environment, this project is designed to run entirely within containers. You must have the following installed:
* [Docker](https://docs.docker.com/get-docker/)
* [Docker Compose **v2**](https://docs.docker.com/compose/install/) — invoked as `docker compose` (space, not hyphen)

> **Note:** The legacy Python `docker-compose` v1 has a known `KeyError: 'ContainerConfig'` bug when recreating containers built with BuildKit. Use the v2 plugin (`docker compose`) instead. If you only have v1, upgrade per the link above.

No `.env` file is required — the app has no backend and makes no network calls, so there are no secrets or API keys to configure.

## Running the Application

1. **Build and Start Containers:**
   Use Docker Compose to build the image and spin up the app in detached mode.
   ```bash
   docker compose up --build -d forgeops
   ```

2. **Access the App:**
   * Frontend: `http://localhost:5000`

   The container serves the static Vite build via `serve`. There is no separate backend API or docs endpoint — all domain logic runs in the browser.

3. **Stop the Application:**
   ```bash
   docker compose down -v
   ```

## Testing

All unit, integration, and component tests are executed via a single, standardized shell script. The script runs the full Vitest suite (jsdom + fake-indexeddb) inside the `test` compose target so the test environment matches the runtime environment.

Make sure the script is executable, then run it:

```bash
chmod +x run_tests.sh
./run_tests.sh
```

*Note: The `run_tests.sh` script outputs a standard exit code (`0` for success, non-zero for failure) to integrate smoothly with CI/CD validators.*

## Seeded Credentials

On first run, the app seeds a single administrator account so the console is usable out of the box. A first-run banner prompts the administrator to change the password immediately. Additional users (sales coordinators, planners, dispatchers, auditors) are created from the **Users** page.

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@12345` | Full access: user admin, permissions, backup/restore, audit log. Change on first login. |

### Role reference

| Role | Capabilities |
| :--- | :--- |
| **Administrator** | Full access; manages users, permissions, backup/restore, audit log |
| **Sales Coordinator** | Captures leads, receives round-robin assignments |
| **Planner** | Creates / copies / versions build plans, runs BOM diff, shares read-only links |
| **Dispatcher** | Schedules deliveries, captures proof-of-delivery, logs exceptions |
| **Auditor** | Read-only access to Audit Log and Ledger |

RBAC is enforced in the service layer (`src/services/authz.service.ts`) at the top of every mutating call — route guards are kept as defence-in-depth but the service-layer check is authoritative. The action → permitted roles map lives in `ACTION_PERMISSIONS` in the same file.

## Feature Highlights

* **Lead Inbox** — Capture leads; round-robin assignment to active Sales Coordinators fires an in-app notification.
* **Plan Workspace** — BOM items, versioning with required change notes, rollback, side-by-side version compare (enqueues a `bom_compare` async job), share links (1–90 days) at `#/share/<token>`.
* **Delivery Calendar** — ZIP-coverage check, Haversine freight calc ($45 base + $1.25/mi after 20 mi, +$75 oversize), 30-minute scheduling slots (08:00–17:30), POD capture with signature + optional photo, exceptions (reschedule / refused / loss-damage), bulk draft generation (enqueues a `bulk_delivery` async job).
* **Ledger** — Accounts, deposit / freeze / settle (one-time or milestone) / refund / withdraw, masked bank refs (`****NNNN`), print invoice / voucher, reconciliation (enqueues a `ledger_reconcile` async job).
* **Notification Center** — Inbox, retry queue for DND-queued / failed notifications, DND quiet hours, per-event subscriptions. Job alerts (long-running > 30 s, rolling-50 error rate > 2 %) are dispatched to all active administrators, planners, and dispatchers.
* **Audit Log** — Append-only; entries older than 180 days are purged on app load.
* **Backup & Restore** — Plain JSON (SHA-256 fingerprint) or AES-256-GCM encrypted (PBKDF2 passphrase).
* **Async Jobs** — Web Worker-backed with progress reporting, pause/resume, cancel, and **checkpoint persistence**: intermediate state is written to the `job_checkpoints` IndexedDB store during progress and on pause, so jobs can resume from the latest checkpoint after a reload.
* **Delivery API adapter** — `OfflineStubAdapter` logs every schedule/cancel/status call to `delivery_api_queue`; **Delivery Calendar → "Export Delivery API Queue"** downloads the queue as JSON for later replay. RBAC-gated and audit-logged.

## Offline Guarantees

No network calls are made in any code path. The delivery API adapter ships as `OfflineStubAdapter` that returns mock responses and logs every call to `delivery_api_queue`. The queue can be exported as JSON for later integration testing against a real backend.

## Submission Notes

* `node_modules/` and `dist/` are git-ignored and are not part of the ZIP.
* No `.env` files are committed or required.
* The seeded administrator credential is disclosed above — change immediately on first login.
