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

- [ ] **Automated tests** — **Partial.** Payment, PayMongo, ratings, auth middleware gate, and wallet ledger idempotency tests exist under `src/lib/`; broader route and UI coverage is still limited.
- [ ] **Client Supabase list reads** — **Partial.** Many buyer, seller, and admin tables still load via browser Supabase + RLS while mutations use `src/app/api/*` (see portal sections below). Admin sellers and listings directory reads now use `GET /api/admin/sellers` and `GET /api/admin/listings`.

---

## Buyer and public marketplace

### Shop, compare, and ratings

- [ ] **Shop catalog provider ratings merge** — **Partial.** `mergeShopListings` leaves `provider.rating` null (`src/lib/shop-listings/client.js`); the shop page merges live scores via `/api/ratings/aggregates`. Compare and favorites now merge live aggregates on their pages; other screens that skip that merge may still lack real scores.
- [ ] **Shop listing page** — Largely wired (reviews + aggregates on `src/app/(main)/shop/[id]/page.jsx`); favorite rows saved from shop cards may still store null ratings until refreshed.

### Cart and checkout

- [ ] **Cart coupons** — **UI only.** Coupon `vision10` applies 10% in local state only (`src/app/(main)/cart/page.jsx`). Checkout create (`src/app/api/checkout/create/route.js`) has no discount/coupon fields; discount does not reach payment.
- [ ] **Cart print receipt** — **UI only.** Print layout uses generated invoice id, status “Pending”, and generic payment/contact copy, not a placed order (`src/app/(main)/cart/page.jsx`).

### Profile and account

- [ ] **Purchases post-checkout actions** — Cancel, dispute, review, receipt, and payment retry are wired to buyer/admin APIs and `/api/checkout/pay`.

### Auth (buyer)

- [ ] **OAuth providers beyond Google/Facebook** — **UI only.** Unknown social providers show a toast: “authentication would be implemented here” (`src/app/(auth)/buyer/login/page.jsx`, `src/app/(auth)/buyer/signup/page.jsx`). Google and Facebook use Supabase OAuth.

### Public seller profile and contact

- [ ] **Storefront hero banner** — **Intentional.** Static `SELLER_PROFILE_BANNER_URL`, not from DB (`src/app/(main)/seller-profile/page.jsx`, `MOCK_SELLER_PROFILE_FIELDS`).
- [ ] **In-app buyer–seller messaging** — **Unwired.** `ContactSellerModal` uses external `social_links` only; no messaging API (`src/components/ui/Modal/ContactSellerModal.jsx`).
- [ ] **Seller profile without `?seller=`** — Redirects to `/partners` (`src/app/(main)/seller-profile/page.jsx`).

### Marketing site (home, about, how-it-works, partners, navbar, footer)

- [ ] **Homepage static copy and assets** — **Partial / intentional.** Hero and how-it-works blocks are static; categories and partner carousel use live RPCs; some slides and image fallbacks are hardcoded (`src/app/(main)/page.jsx`).
- [ ] **About page mixed CMS + static** — Narrative/testimonials from site content; strip icons and `/sample/about-us/` assets remain static (`src/app/(main)/about/page.jsx`).
- [ ] **How it works** — Fully static step content, not CMS-driven (`src/app/(main)/how-it-works/page.jsx`).
- [ ] **Partners directory** — **Ops.** Depends on Supabase RPCs (migrations ~087–091); UI surfaces migration hints when RPCs are missing (`src/app/(main)/partners/page.jsx`).
- [ ] **Public navbar social links** — Generic `https://facebook.com` (and similar) placeholders in top bar (`src/components/layout/PublicNavbar/PublicNavbar.jsx`).
- [ ] **Public footer contact fallbacks** — **Partial / intentional.** Footer reads CMS via `useSiteContent` (`src/components/layout/PublicFooter/PublicFooter.jsx`); missing `footer.supportPhone` / `footer.supportEmail` fall back to `+1 (234) 567-890` and `support@lavisionario.com`.

---

## Seller portal

### Auth and onboarding

- [ ] **Phone reclaim / duplicate account signup** — **Unwired.** `StepPhoneReclaim`, `Step4AccountCheck`, and `existingAccount` exist in `src/app/(auth)/seller/signup/page.jsx` but the rendered flow skips them; `handleReclaimProceed` only toasts and advances with no API.
- [ ] **Extra OAuth providers** — Same toast fallback as buyer for non-Google/Facebook providers (`src/app/(auth)/seller/login/page.jsx`, `src/app/(auth)/seller/signup/page.jsx`).
- [ ] **Pre-auth seller help** — **UI only / intentional.** `src/app/(auth)/seller/need_help/page.jsx` uses in-file `categoriesWithArticles` and static popular questions; not CMS-backed like signed-in seller help.

### Dashboard
- [ ] **Quick action “Create Promotion”** — Routes into marketing hub mock data (`src/app/seller/page.jsx` → `/seller/marketing/campaign`).

### Marketing (largest seller gap)

- [ ] **Marketing hub data** — **UI only.** `MarketingHub.jsx` uses in-memory seeded metrics, promotions, vouchers, segments, and charts; no `fetch` and no `src/app/api/seller/marketing/*` routes (`src/app/seller/marketing/`).
- [ ] **Discounts and vouchers** — Drawer saves update React state and toasts only; scope fields are free text, not tied to seller listings (`src/app/seller/marketing/MarketingHub.jsx`).
- [ ] **Campaign create/edit** — Campaign drawer save does not append or update campaign lists (`campaignsData` read-only `useMemo`; `managementCampaigns` only toggled/deleted locally).
- [ ] **Navigation exposure** — Sidebar and More hub still link to marketing as a product area (`src/components/layout/AppSidebar/AppSidebar.jsx`, `src/app/seller/more/page.jsx`).

### Seller areas largely integrated (spot-check)

Orders (mutations), products/listings (mutations), analytics, customers (aggregates), reviews (`/api/seller/reviews`), settings (profile, shop, payouts, documents, password), payout requests, and seller notification preferences are wired to Supabase and `src/app/api/seller/*` in the current review. Re-verify when adding new seller screens.

---

## Admin portal

### Listings moderation

- [ ] **Listings browse** — Read-only filters over approved/archived listings; no archive or moderation actions on this screen (`src/app/admin/listings/browse/page.jsx`). Approve/reject live on approvals flow + admin listing APIs.

### Disputes

- [ ] **Bulk dispute status** — **Partial.** Bulk resolve/close sends `outcome: 'no_financial_change'`; refunds and financial outcomes require per-dispute detail (`src/app/admin/disputes/page.jsx`, `src/app/api/admin/disputes/[id]/route.js` + `src/lib/disputes/applyDisputeOutcome.js`).

### Payouts and billing

- [ ] **Payout request approval vs money movement** — **Partial.** Approve updates request status, writes a `withdrawal` ledger entry, and notifies the seller (`src/app/api/admin/payout-requests/[id]/review/route.js`, `src/app/admin/payouts/PayoutRequestsStrip.jsx`); copy and flow still send admins to Payouts for release, with `approvedRequestId` only on the deep link.
- [ ] **Platform billing singleton** — `platform-billing` assumes row `id = 1`; GET falls back to **10%** commission when row missing (`src/app/api/admin/platform-billing/route.js`).

### Help and static admin content

- [ ] **Admin help center** — **UI only.** Topics, FAQs, playbooks, and quick links are in-file constants (`src/app/admin/help/page.jsx`).

### Admin areas largely integrated (spot-check)

Dashboard metrics, buyers, seller status/compliance/documents, listing approve/reject, disputes detail, payouts hold/unhold/commission/release, stuck refunds, billing settings, admin notification preferences, and in-app notifications are wired to `src/app/api/admin/*` in the current review.

---

## Payments (PayMongo) and money movement

- [ ] **Refunds** — PayMongo refund client in `src/lib/paymongo/client.js`; reconciliation in `src/lib/payments/refundReconcile.js`; admin stuck-refund and dispute outcomes can call PayMongo when `paymongo_payment_id` exists.
- [ ] **Webhook dependency** — Paid/failed checkout, refunds, and transfer/disbursement settlement depend on `src/app/api/payments/paymongo/webhook/route.js` and `PAYMONGO_WEBHOOK_SECRET`.

---

## Notifications and email

- [ ] **In-app feed** — Shared `GET/PATCH/DELETE /api/notifications` (`src/app/api/notifications/route.js`); buyer exposure is thinner than seller/admin (see cross-cutting).
- [ ] **Email delivery** — **Ops.** Nodemailer in `src/lib/email/mailTransport.js` requires SMTP env; `sendNotificationEmail.js` skips when `smtp_not_configured`. Seller approve/reject have dedicated templates; most events use generic HTML.
- [ ] **Dispute/payout/refund email templates** — No dedicated templates beyond generic notification email and seller approve/reject.

---

## Database and operations dependencies

- [ ] **Partners spotlight/directory RPCs** — Required for homepage carousel, `/partners`, and seller-profile badges; UI hints if migrations ~087–091 are not applied.
- [ ] **Seller `turnaround` and social links** — Used when migrations 082+ / 097+ are applied (shop + public profile RPCs).
- [ ] **Supabase env** — App expects Supabase URL/keys; admin middleware fails closed without public Supabase env (see cross-cutting).

---

## Suggested tracking order (optional)

1. Marketing hub backend + checkout coupon integration if promotions are in scope. 
2. Phone reclaim, pre-auth seller help CMS parity, and non-Google/Facebook OAuth if required for launch.

---

## Maintenance

When closing a gap, check the box, add the PR or commit reference inline, and move a one-line summary to a “Completed” section at the bottom of this file if you want history without deleting context.
