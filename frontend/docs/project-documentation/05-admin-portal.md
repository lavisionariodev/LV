# 05 — Admin portal

**URL prefix:** `/admin/*`  
**Gate / login surface:** `/administrator` (non-admins and anonymous users redirected here from `/admin/**`).

## Main areas (`src/app/admin/`)

| Area | Example paths |
|------|----------------|
| Dashboard / analytics | `/admin`, `/admin/analytics` |
| Buyers · Sellers | `/admin/buyers`, `/admin/sellers` |
| Listings | `/admin/listings/browse`, `/admin/listings/approvals` |
| Disputes | `/admin/disputes`, `/admin/disputes/[id]` |
| Payouts | `/admin/payouts` |
| Notifications | `/admin/notifications` |
| Settings | `/admin/settings/*` (account, password, notifications, billing, site-content) |
| Help | `/admin/help` — **static UI** (gap tracker) |
| Profile | `/admin/profile` |

## Authorization

- Middleware: session + `public.admins` row for `/admin/**`.
- APIs: `requireAdminApiUser()` on `src/app/api/admin/**`.