# 05 — Admin portal

**URL prefix:** `/admin/*`  
**Gate / login surface:** `/administrator` (non-admins and anonymous users redirected here from `/admin/**`).

## Main areas (`src/app/admin/`)

| Area | Paths |
|------|-------|
| Dashboard / analytics | `/admin`, `/admin/analytics` |
| Buyers · Sellers | `/admin/buyers`, `/admin/sellers` |
| Listings | `/admin/listings/browse`, `/admin/listings/approvals` |
| Disputes | `/admin/disputes`, `/admin/disputes/[id]` |
| Payouts | `/admin/payouts` — escrow release, commission, holds, ledger adjustment, stuck refunds |
| Notifications | `/admin/notifications` |
| Settings | `/admin/settings/*` — account, password, notifications, billing, site-content |
| Help | `/admin/help` — static operational guidance (not ticketing) |
| Profile | `/admin/profile` |

Permanent redirects (e.g. `/admin/settings/profile` → account) are in `next.config.ts`.

## Authorization

- Middleware: session + `public.admins` row for `/admin/**`.
- APIs: `requireAdminApiUser()` on `src/app/api/admin/**`.

## Admin APIs (representative)

| Area | Routes |
|------|--------|
| Sellers | Status, documents, commission, featured, search |
| Listings | Browse, approve, reject |
| Orders / money | Refund, payouts release (single/batch), hold/unhold, commission, disbursement config |
| Disputes | List, detail, events, attention count |
| Ops | Metrics, platform billing, site content, notification prefs, stuck refunds |
