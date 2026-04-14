# ForgeOps Fulfillment & Planning Console

Offline-first Svelte + TypeScript SPA for a fabrication-and-delivery team: lead intake, BOM-based plan management, delivery scheduling, internal escrow ledger, in-app notifications, and async Web Worker jobs. No backend. All persistence is via IndexedDB + LocalStorage.

## Requirements
- Node.js 18+
- npm 9+

## Setup
```
cd repo
npm install
```

## Run dev server
```
npm run dev
```

## Build
```
npm run build
```

## Tests
```
./run_tests.sh
```

## First Run
On first load, a default admin account is seeded:

- **Username:** `admin`
- **Password:** `Admin@12345`

A banner prompts the administrator to change the password immediately. These credentials are for bootstrap only — they are not used in any service logic beyond the one-time first-run seed.

## Roles
- Administrator — full access; manages users, permissions, backups
- Sales Coordinator — captures leads
- Planner — creates / versions build plans
- Dispatcher — schedules deliveries, captures POD
- Auditor — read-only review of Audit Log and Ledger

## Offline Guarantees
No network calls are made. All data lives in the browser's IndexedDB.
