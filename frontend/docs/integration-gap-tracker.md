# Integration gap tracker

**Project:** Lavisionario (`frontend/`)  
**Last reviewed:** 2026-05-14  
**Purpose:** Track incomplete, mock, or not-yet-integrated features before finalization. Use this as a working checklist; items are grouped by portal and cross-cutting concern.

## How to read this document

| Label | Meaning |
| --- | --- |
| **UI only** | Screen or control exists; no durable backend or payment integration |
| **Partial** | Some real APIs or data paths exist, but the end-to-end flow is incomplete |
| **Unwired** | Backend or API exists on one side but is not connected to the other |
| **Ops / env** | Depends on migrations, secrets, or deployment configuration |
| **Intentional** | Documented placeholder or static content by design (still worth tracking if product should change) |

Paths are relative to `frontend/` unless noted.

---

## Cross-cutting

- [ ] **Guest commerce** — Cart and favorites require a signed-in buyer (`src/contexts/CartContext.jsx`, `src/contexts/FavoritesContext.jsx`). Guests cannot persist cart or favorites.
- [ ] **Buyer notification preferences** — Server defaults buyers to allow all channels; no buyer preference API, DB column, or settings UI (`src/lib/notifications/preferencesServer.js`; compare seller/admin under `src/app/api/*/notification-preferences/`).
- [ ] **Buyer notification inbox actions** — Buyer profile notifications support read / mark-all-read only (`src/app/(main)/profile/notifications/page.jsx`). Delete/clear helpers exist in `src/lib/notifications/useInAppNotificationFeed.js` but are not exposed in buyer UI (seller/admin inboxes are richer).
- [ ] **Ratings API surface** — `GET /api/ratings/service-aggregates` exists (`src/app/api/ratings/service-aggregates/route.js`) but no UI calls it; shop and seller profile use `/api/ratings/aggregates` instead.
- [ ] **Automated tests** — No `*.test.*` / `*.spec.*` files under `frontend/`.
- [ ] **Root README vs app** — `README.md` lists generic stack/features; it does not document required env vars, Supabase migrations, PayMongo, or SMTP setup.
- [ ] **Middleware admin gate bypass** — If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, `middleware.js` skips admin protection (`frontend/middleware.js`). `/api/admin/*` still checks auth per route via `requireAdminApiUser()`.

---

## Buyer and public marketplace

### Shop, compare, and ratings

- [ ] **Compare page ratings** — **Partial.** Compare loads listings via `fetchActiveShopListings` / `mergeShopListings` only (`src/app/(main)/shop/compare/page.jsx`). It does not call `/api/ratings/aggregates`, so provider rating rows and “Highest rated” / “Best value” highlights often lack real scores (catalog merge leaves `provider.rating` null in `src/lib/shop-listings/client.js`).
- [ ] **Favorites rating snapshot** — **Partial.** Favorites persist `seller_rating` from listing provider data at save time (`src/lib/favorites/fromListing.js`). When null, UI falls back to hardcoded **4.8** (`src/lib/favorites/supabaseFavorites.js`), affecting sort and display; favorites page does not refresh live aggregates.
- [ ] **Shop listing page** — Largely wired (reviews + aggregates on `src/app/(main)/shop/[id]/page.jsx`); favorite rows saved from shop cards may still store null ratings until refreshed.

### Cart and checkout

- [ ] **Cart coupons** — **UI only.** Coupon `vision10` applies 10% in local state only (`src/app/(main)/cart/page.jsx`). Checkout create (`src/app/api/checkout/create/route.js`) has no discount/coupon fields; discount does not reach payment.
- [ ] **Cart print receipt** — **UI only.** Print layout uses generated invoice id, status “Pending”, and generic payment/contact copy, not a placed order (`src/app/(main)/cart/page.jsx`).
- [ ] **Checkout payment retry** — **Partial.** Checkout posts to `/api/checkout/create` and `/api/checkout/pay` (`src/app/(main)/checkout/page.jsx`). Pay failures stash a message in `sessionStorage` and purchases shows a dismissible banner (`src/app/(main)/profile/purchases/page.jsx`); there is no “Pay now” / retry for unpaid or failed orders.
- [ ] **Checkout outcome pages** — **Partial.** `checkout/success` and `checkout/failed` are static; payment confirmation is webhook-driven (`src/app/api/payments/paymongo/webhook/route.js`), not client-verified on success.

### Profile and account

- [ ] **Buyer password change in profile** — No password settings under buyer profile routes (`src/app/(main)/profile/`). Reset flow lives under auth (`src/app/(auth)/auth/reset-password/page.jsx`).
- [ ] **Purchases** — Cancel, dispute, review, and receipt flows are wired to buyer/admin APIs; gap is payment retry (above).

### Auth (buyer)

- [ ] **OAuth providers beyond Google/Facebook** — **UI only.** Unknown social providers show a toast: “authentication would be implemented here” (`src/app/(auth)/buyer/login/page.jsx`, `src/app/(auth)/buyer/signup/page.jsx`). Google and Facebook use Supabase OAuth.

### Public seller profile and contact

- [ ] **Storefront hero banner** — **Intentional.** Static `SELLER_PROFILE_BANNER_URL`, not from DB (`src/app/(main)/seller-profile/page.jsx`, `MOCK_SELLER_PROFILE_FIELDS`).
- [ ] **In-app buyer–seller messaging** — **Unwired.** `ContactSellerModal` uses external `social_links` only; no messaging API (`src/components/ui/Modal/ContactSellerModal.jsx`).
- [ ] **Seller profile without `?seller=`** — Redirects to `/partners` (`src/app/(main)/seller-profile/page.jsx`).

### Marketing site (home, about, how-it-works, partners, navbar)

- [ ] **Homepage static copy and assets** — **Partial / intentional.** Hero and how-it-works blocks are static; categories and partner carousel use live RPCs; some slides and image fallbacks are hardcoded (`src/app/(main)/page.jsx`).
- [ ] **About page mixed CMS + static** — Narrative/testimonials from site content; strip icons and `/sample/about-us/` assets remain static (`src/app/(main)/about/page.jsx`).
- [ ] **How it works** — Fully static step content, not CMS-driven (`src/app/(main)/how-it-works/page.jsx`).
- [ ] **Partners directory** — **Ops.** Depends on Supabase RPCs (migrations ~087–091); UI surfaces migration hints when RPCs are missing (`src/app/(main)/partners/page.jsx`).
- [ ] **Public navbar social links** — Generic `https://facebook.com` (and similar) placeholders in top bar (`src/components/layout/PublicNavbar/PublicNavbar.jsx`).

---

## Seller portal

### Auth and onboarding

- [x] **QR login** — **Wired.** Seller login QR mode creates challenges via `/api/auth/qr/challenge`, polls `/api/auth/qr/challenge/[id]`, and completes with Supabase `verifyOtp`; phone approval uses `/api/auth/qr/approve` and `/api/auth/qr/deny` from `/seller/login/qr/confirm` and `/seller/login/qr/scan` (`src/app/(auth)/seller/login/page.jsx`, migration `105_seller_qr_login_challenges.sql`).
- [ ] **Phone reclaim / duplicate account signup** — **Unwired.** `StepPhoneReclaim`, `Step4AccountCheck`, and `existingAccount` exist in `src/app/(auth)/seller/signup/page.jsx` but the rendered flow skips them; `handleReclaimProceed` only toasts and advances with no API.
- [ ] **Extra OAuth providers** — Same toast fallback as buyer for non-Google/Facebook providers (`src/app/(auth)/seller/login/page.jsx`, `src/app/(auth)/seller/signup/page.jsx`).

### Dashboard

- [ ] **Alert “Resolve” persistence** — **Partial.** Alerts sync via `/api/seller/dashboard-alerts`; resolve PATCHes `/api/notifications` only when a synced row exists, and always adds id to `dismissedAlertIds` (session dismiss) (`src/app/seller/page.jsx`).
- [ ] **Quick action “Create Promotion”** — Routes into marketing hub mock data (`src/app/seller/page.jsx` → `/seller/marketing/campaign`).

### Marketing (largest seller gap)

- [ ] **Marketing hub data** — **UI only.** `MarketingHub.jsx` uses in-memory seeded metrics, promotions, vouchers, segments, and charts; no `fetch` and no `src/app/api/seller/marketing/*` routes (`src/app/seller/marketing/`).
- [ ] **Discounts and vouchers** — Drawer saves update React state and toasts only; scope fields are free text, not tied to seller listings (`src/app/seller/marketing/MarketingHub.jsx`).
- [ ] **Campaign create/edit** — Campaign drawer save does not append or update campaign lists (`campaignsData` read-only `useMemo`; `managementCampaigns` only toggled/deleted locally).
- [ ] **Navigation exposure** — Sidebar and More hub still link to marketing as a product area (`src/components/layout/AppSidebar/AppSidebar.jsx`, `src/app/seller/more/page.jsx`).

### Help

- [ ] **Seller help FAQs** — **Partial.** Default FAQ copy is static when CMS groups are missing (`FAQ_BY_TAB` in `src/app/seller/help/page.jsx`). Support tickets load/post via `/api/seller/support` (wired).

### Seller areas largely integrated (spot-check)

Orders, products/listings, analytics, customers, reviews, settings (profile, shop, payouts, documents, password), and seller notification preferences are wired to Supabase and `src/app/api/seller/*` in the current review. Re-verify when adding new seller screens.

---

## Admin portal

### Data loading pattern

- [ ] **Sellers and listings list reads** — **Partial.** Many tables load via browser Supabase clients and RLS (`src/lib/sellers/client.js`, `src/lib/seller-listings/client.js`), not dedicated `GET /api/admin/sellers` or listings list APIs. Mutations often go through `src/app/api/admin/*`.
- [ ] **Site content load vs save** — Read via client Supabase (`src/lib/siteContent/client.js`); writes via `POST /api/admin/site-content` (`src/app/api/admin/site-content/route.js`).

### Listings moderation

- [ ] **Listings browse** — Read-only filters over approved/archived listings; no archive or moderation actions on this screen (`src/app/admin/listings/browse/page.jsx`). Approve/reject live on approvals flow + admin listing APIs.

### Disputes

- [ ] **Bulk dispute status** — **Partial.** Bulk resolve/close sends `outcome: 'no_financial_change'`; refunds and financial outcomes require per-dispute detail (`src/app/admin/disputes/page.jsx`, `src/app/api/admin/disputes/[id]/route.js` + `src/lib/disputes/applyDisputeOutcome.js`).

### Payouts and billing

- [ ] **Escrow release vs PayMongo payout** — **Partial.** Admin release updates `order_escrows` in DB; no PayMongo transfer/disbursement API in the repo (`src/app/api/admin/payouts/release/route.js`).
- [ ] **Payout request approval** — Approving a seller payout request does not move money automatically; copy directs admins to Payouts UI (`src/app/api/admin/payout-requests/[id]/review/route.js`).
- [ ] **Payouts commission change log** — **UI only.** `changeLog` is React session state, not persisted (`src/app/admin/payouts/page.jsx`).
- [ ] **Platform billing singleton** — `platform-billing` assumes row `id = 1`; GET falls back to **10%** commission when row missing (`src/app/api/admin/platform-billing/route.js`).

### Help and static admin content

- [ ] **Admin help center** — **UI only.** Topics, FAQs, playbooks, and quick links are in-file constants (`src/app/admin/help/page.jsx`).

### Admin areas largely integrated (spot-check)

Dashboard metrics, buyers, seller status/compliance/documents, listing approve/reject, disputes detail, payouts hold/unhold/commission/release, stuck refunds, billing settings, admin notification preferences, and in-app notifications are wired to `src/app/api/admin/*` in the current review.

---

## Payments (PayMongo) and money movement

- [ ] **Checkout PayMongo session** — Create/pay logic lives in route handlers with duplicated centavos/auth helpers (`src/app/api/checkout/create/route.js`, `src/app/api/checkout/pay/route.js`), not a shared `lib/payments` checkout module.
- [ ] **Refunds** — PayMongo refund client in `src/lib/paymongo/client.js`; reconciliation in `src/lib/payments/refundReconcile.js`; admin stuck-refund and dispute outcomes can call PayMongo when `paymongo_payment_id` exists.
- [ ] **Seller disbursement** — **Missing.** No PayMongo payout/transfer integration for releasing escrow to sellers; admin release is ledger-only.
- [ ] **Webhook dependency** — Paid/failed checkout and escrow creation depend on `src/app/api/payments/paymongo/webhook/route.js` and `PAYMONGO_WEBHOOK_SECRET`.

---

## Notifications and email

- [ ] **In-app feed** — Shared `GET/PATCH/DELETE /api/notifications` (`src/app/api/notifications/route.js`); buyer exposure is thinner than seller/admin (see cross-cutting).
- [ ] **Email delivery** — **Ops.** Nodemailer in `src/lib/email/mailTransport.js` requires SMTP env; `sendNotificationEmail.js` skips when `smtp_not_configured`. Seller approve/reject have dedicated templates; most events use generic HTML.
- [ ] **SMS** — Admin profile can store `sms_phone` (`src/features/admin/settings/adminProfile.js`); notification preference schema is in-app + email only (`src/lib/notifications/notificationPreferenceChannels.js`).
- [ ] **Dispute/payout/refund email templates** — No dedicated templates beyond generic notification email and seller approve/reject.

---

## Database and operations dependencies

- [ ] **Partners spotlight/directory RPCs** — Required for homepage carousel, `/partners`, and seller-profile badges; UI hints if migrations ~087–091 are not applied.
- [ ] **Seller `turnaround` and social links** — Used when migrations 082+ / 097+ are applied (shop + public profile RPCs).
- [ ] **Supabase env** — App expects Supabase URL/keys; admin middleware gate is weakened without them (see cross-cutting).

---

## Suggested tracking order (optional)

1. Marketing hub backend + checkout coupon integration if promotions are in scope.  
2. Compare/favorites ratings wired to `/api/ratings/aggregates` (and retire 4.8 fallback).  
3. Checkout payment retry and guest-cart policy.  
4. PayMongo seller disbursement vs manual escrow release.  
5. Buyer notification preferences and richer inbox parity.  
6. Admin list APIs vs client Supabase reads; persisted payout commission audit log.  
7. QR login, phone reclaim, and non-Google/Facebook OAuth if required for launch.

---

## Maintenance

When closing a gap, check the box, add the PR or commit reference inline, and move a one-line summary to a “Completed” section at the bottom of this file if you want history without deleting context.
