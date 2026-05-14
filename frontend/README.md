# Lavisionario frontend

Next.js App Router application for the Lavisionario marketplace (buyer, seller, and admin portals).

## Prerequisites

- Node.js 18+
- npm
- Supabase project with migrations applied from `supabase/migrations/`

## Setup

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

## Environment variables

Create `frontend/.env.local` (or configure the same keys in your host). Public keys are safe for the browser; server-only keys must never be exposed to client bundles.

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | Supabase project URL for browser and server clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | Supabase anon key for authenticated browser/server sessions |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Server | Service role for admin APIs, webhooks, and ledger writes |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public | Canonical app URL for email links and redirects |
| `PAYMONGO_SECRET_KEY` | Checkout / refunds | Server | PayMongo API secret for checkout, refunds, and disbursements |
| `PAYMONGO_WEBHOOK_SECRET` | Payments | Server | Verifies `POST /api/payments/paymongo/webhook` signatures |
| `PAYMONGO_DISBURSEMENT_ENABLED` | Payout automation | Server | Set to `true` to enable automated PayMongo disbursements |
| `PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER` | Disbursements | Server | PayMongo wallet source account number |
| `PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME` | Disbursements | Server | PayMongo wallet source account name |
| `PAYMONGO_WALLET_SOURCE_BIC` | Disbursements | Server | Source BIC (optional; defaults in code) |
| `PAYMONGO_DEFAULT_DESTINATION_BIC` | Disbursements | Server | Default destination BIC for seller payouts |
| `SMTP_HOST` | Email | Server | SMTP host for transactional email |
| `SMTP_PORT` | Email | Server | SMTP port (default 587) |
| `SMTP_USER` / `SMTP_PASS` | Email | Server | SMTP credentials |
| `SMTP_FROM` | Email | Server | From address (falls back to `SMTP_USER`) |
| `SMTP_SECURE` | Email | Server | `true` for TLS on port 465 |
| `ADMIN_NOTIFY_EVERY_PAID_ORDER` | Ops | Server | When `true`, notifies admins on each paid order webhook |

Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `/admin/**` routes redirect to `/administrator` (fail closed). Admin API routes still enforce `requireAdminApiUser()`.

## Database migrations

SQL migrations live in `supabase/migrations/`. Apply them to your Supabase project in order (filename prefix). Notable recent migrations:

- `107_wallet_ledger_disbursements.sql` — `payout_disbursements`, `seller_wallet_ledger`
- `108_buyer_notification_prefs_commission_log.sql` — buyer notification preferences, commission change log

Wallet summaries, disbursement automation, and admin payout flows depend on migration 107 and service-role access.

## PayMongo webhook

Configure PayMongo to send events to:

`https://<your-host>/api/payments/paymongo/webhook`

Set `PAYMONGO_WEBHOOK_SECRET` to the signing secret from PayMongo. Checkout payment confirmation, refunds, and disbursement settlement are driven by this webhook, not by client-side success pages.

## Integration gap tracker

Open [docs/integration-gap-tracker.md](docs/integration-gap-tracker.md) for a working checklist of partial, unwired, and ops-dependent features across portals.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm start` — production server
- `npm run lint` — ESLint
- `npm test` — Node test runner (`src/lib/**` unit tests)
