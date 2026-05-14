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

- [x] **Guest commerce (buyer account required)** — **Intentional / wired.** Guests cannot add to cart or favorites; shop and listing flows redirect to buyer login/signup with return URL (`src/lib/cart/bookNow.js`, `src/app/(main)/shop/page.jsx`, `src/app/(main)/shop/[id]/page.jsx`, `src/app/(main)/favorites/page.jsx`). Cart and favorites persist in Supabase only for signed-in buyers (`src/contexts/CartContext.jsx`, `src/contexts/FavoritesContext.jsx`). No guest/localStorage cart is planned unless product policy changes.
- [x] **Buyer notification preferences** — **Wired.** `profiles.notification_preferences` (migration `108_buyer_notification_prefs_commission_log.sql`), `GET/PATCH /api/buyer/notification-preferences`, buyer settings at `/profile/notifications/preferences`, and server preference checks in `src/lib/notifications/preferencesServer.js`.
- [x] **Buyer notification inbox actions** — **Wired.** Buyer inbox uses `useInAppNotificationFeed` with delete and clear-all actions (`src/app/(main)/profile/notifications/page.jsx`).
- [x] **Ratings API surface** — **Wired.** Service-only aggregates are served via `services` on `GET /api/ratings/aggregates` (`src/lib/ratings/ratingsAggregatesServer.js`); the standalone `service-aggregates` route was removed.
- [ ] **Automated tests** — **Partial.** Payment, PayMongo, ratings, auth middleware gate, and wallet ledger idempotency tests exist under `src/lib/`; broader route and UI coverage is still limited.
- [x] **Root README vs app** — `frontend/README.md` documents required env vars, migrations, PayMongo webhook setup, and links to `docs/integration-gap-tracker.md`.
- [x] **Middleware admin gate bypass** — `middleware.js` redirects `/admin/**` to `/administrator` when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing (`src/lib/auth/adminRouteGate.js`). `/api/admin/*` still checks auth per route via `requireAdminApiUser()`.
- [ ] **Client Supabase list reads** — **Partial.** Many buyer, seller, and admin tables still load via browser Supabase + RLS while mutations use `src/app/api/*` (see portal sections below). Admin sellers and listings directory reads now use `GET /api/admin/sellers` and `GET /api/admin/listings`.

---

## Buyer and public marketplace

### Shop, compare, and ratings

- [ ] **Shop catalog provider ratings merge** — **Partial.** `mergeShopListings` leaves `provider.rating` null (`src/lib/shop-listings/client.js`); the shop page merges live scores via `/api/ratings/aggregates`. Compare and favorites now merge live aggregates on their pages; other screens that skip that merge may still lack real scores.
- [x] **Compare page ratings** — **Wired.** Compare merges `/api/ratings/aggregates` via `src/lib/ratings/listingRatingAggregates.js` (`src/app/(main)/shop/compare/page.jsx`).
- [x] **Favorites rating snapshot** — **Wired.** Favorites page refreshes live aggregates via `/api/ratings/aggregates`; the hardcoded **4.8** fallback was removed from `src/lib/favorites/supabaseFavorites.js`. Saved rows may still store null ratings at insert time (`src/lib/favorites/fromListing.js`).
- [ ] **Shop listing page** — Largely wired (reviews + aggregates on `src/app/(main)/shop/[id]/page.jsx`); favorite rows saved from shop cards may still store null ratings until refreshed.

### Cart and checkout

- [ ] **Cart coupons** — **UI only.** Coupon `vision10` applies 10% in local state only (`src/app/(main)/cart/page.jsx`). Checkout create (`src/app/api/checkout/create/route.js`) has no discount/coupon fields; discount does not reach payment.
- [ ] **Cart print receipt** — **UI only.** Print layout uses generated invoice id, status “Pending”, and generic payment/contact copy, not a placed order (`src/app/(main)/cart/page.jsx`).
- [x] **Checkout payment retry** — **Wired.** Purchases shows **Pay now** for unpaid, failed, or expired orders and reuses `/api/checkout/pay` (`src/lib/profile/mapBuyerOrderCard.js`, `src/app/(main)/profile/purchases/page.jsx`). Checkout still stashes pay errors in `sessionStorage` for the dismissible banner (`src/app/(main)/checkout/page.jsx`). Orders with `payment_status: pending` (open PayMongo session) still cannot retry until that session clears.
- [x] **Checkout outcome pages** — **Wired.** `checkout/success` and `checkout/failed` poll `GET /api/checkout/payments/[paymentId]/status` while PayMongo settlement remains webhook-driven (`src/app/api/payments/paymongo/webhook/route.js`).

### Profile and account

- [x] **Buyer password change in profile** — **Wired.** `/profile/password` uses `changePasswordWithReauth` and `inferCanChangePassword` (`src/app/(main)/profile/password/page.jsx`, `src/lib/auth/inferCanChangePassword.js`).
- [x] **Purchases list data path** — **Wired.** Purchases load via `GET /api/buyer/orders` (`src/lib/profile/listBuyerOrdersForApi.js`); cancel, dispute, review, receipt, and pay retry still use existing buyer/profile APIs.
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

- [x] **QR login** — **Wired.** Seller login QR mode creates challenges via `/api/auth/qr/challenge`, polls `/api/auth/qr/challenge/[id]`, and completes with Supabase `verifyOtp`; phone approval uses `/api/auth/qr/approve` and `/api/auth/qr/deny` from `/seller/login/qr/confirm` and `/seller/login/qr/scan` (`src/app/(auth)/seller/login/page.jsx`, migration `105_seller_qr_login_challenges.sql`).
- [ ] **Phone reclaim / duplicate account signup** — **Unwired.** `StepPhoneReclaim`, `Step4AccountCheck`, and `existingAccount` exist in `src/app/(auth)/seller/signup/page.jsx` but the rendered flow skips them; `handleReclaimProceed` only toasts and advances with no API.
- [ ] **Extra OAuth providers** — Same toast fallback as buyer for non-Google/Facebook providers (`src/app/(auth)/seller/login/page.jsx`, `src/app/(auth)/seller/signup/page.jsx`).
- [ ] **Pre-auth seller help** — **UI only / intentional.** `src/app/(auth)/seller/need_help/page.jsx` uses in-file `categoriesWithArticles` and static popular questions; not CMS-backed like signed-in seller help.

### Dashboard

- [x] **Alert “Resolve” persistence** — **Wired.** Resolve persists through `PATCH /api/seller/dashboard-alerts` with notification upsert by `metadata.alertId` (`src/app/seller/page.jsx`).
- [ ] **Quick action “Create Promotion”** — Routes into marketing hub mock data (`src/app/seller/page.jsx` → `/seller/marketing/campaign`).

### Marketing (largest seller gap)

- [ ] **Marketing hub data** — **UI only.** `MarketingHub.jsx` uses in-memory seeded metrics, promotions, vouchers, segments, and charts; no `fetch` and no `src/app/api/seller/marketing/*` routes (`src/app/seller/marketing/`).
- [ ] **Discounts and vouchers** — Drawer saves update React state and toasts only; scope fields are free text, not tied to seller listings (`src/app/seller/marketing/MarketingHub.jsx`).
- [ ] **Campaign create/edit** — Campaign drawer save does not append or update campaign lists (`campaignsData` read-only `useMemo`; `managementCampaigns` only toggled/deleted locally).
- [ ] **Navigation exposure** — Sidebar and More hub still link to marketing as a product area (`src/components/layout/AppSidebar/AppSidebar.jsx`, `src/app/seller/more/page.jsx`).

### Help

- [x] **Seller help FAQs** — **Wired.** CMS `sellerHelpFaq` groups merge with static `FAQ_BY_TAB` per category (`src/app/seller/help/page.jsx`). Support tickets remain on `/api/seller/support`.

### Seller data loading (list screens)

- [x] **Orders list reads** — **Wired.** `OrdersContent.jsx` loads via `GET /api/seller/orders` with realtime refresh; mutations use `/api/seller/orders/*` and `/api/seller/disputes/*`.
- [x] **Customers list reads** — **Wired.** Customers load via `GET /api/seller/customers` (`src/app/seller/customers/page.jsx`).
- [x] **Products/listings list reads** — **Wired.** Products load via `GET /api/seller/listings`; listing mutations go through `/api/seller/listings/*`.

### Wallet, payouts, and revenue reporting

- [x] **Wallet ledger transaction feed** — **Wired.** `GET /api/seller/escrow-summary` returns paginated `ledgerEntries`; revenue reports show recent ledger rows (`src/app/seller/analytics/revenue-reports/page.jsx`).
- [x] **Legacy manual release visibility** — **Wired.** Revenue reports surface `legacyReleasedCount` / `legacyReleasedNet` from `sellerWalletSummary`.

### Seller areas largely integrated (spot-check)

Orders (mutations), products/listings (mutations), analytics, customers (aggregates), reviews (`/api/seller/reviews`), settings (profile, shop, payouts, documents, password), payout requests, and seller notification preferences are wired to Supabase and `src/app/api/seller/*` in the current review. Re-verify when adding new seller screens.

---

## Admin portal

### Data loading pattern

- [x] **Sellers and listings list reads** — **Wired.** Admin sellers load via `GET /api/admin/sellers` (`src/lib/sellers/client.js`); listings browse, approvals, and dashboard counts load via `GET /api/admin/listings` (`src/lib/seller-listings/client.js` → `src/lib/admin/listSellerListingsForAdmin.js`). Mutations still go through `src/app/api/admin/*`.
- [x] **Site content load vs save** — Admin editor reads via `GET /api/admin/site-content` and writes via `POST /api/admin/site-content` (`src/lib/siteContent/client.js` → `useAdminSiteContent`). Public pages still use browser Supabase via `useSiteContent`.

### Listings moderation

- [ ] **Listings browse** — Read-only filters over approved/archived listings; no archive or moderation actions on this screen (`src/app/admin/listings/browse/page.jsx`). Approve/reject live on approvals flow + admin listing APIs.

### Disputes

- [ ] **Bulk dispute status** — **Partial.** Bulk resolve/close sends `outcome: 'no_financial_change'`; refunds and financial outcomes require per-dispute detail (`src/app/admin/disputes/page.jsx`, `src/app/api/admin/disputes/[id]/route.js` + `src/lib/disputes/applyDisputeOutcome.js`).

### Payouts and billing

- [x] **Escrow release vs PayMongo disbursement** — **Wired.** Admin release and bulk release call `releaseEscrowWithDisbursement` with env gating, seller payout settings validation, and manual override (`src/lib/payments/releaseEscrowWithDisbursement.js`, `src/lib/payments/disbursementConfig.js`, `GET /api/admin/payouts/disbursement-config`, admin payouts banner).
- [x] **Manual disbursement override in UI** — **Wired.** Single-order and bulk release modals pass `manualOverride` to `/api/admin/payouts/release` and `/api/admin/payouts/release-batch` (`src/app/admin/payouts/page.jsx`).
- [ ] **Payout request approval vs money movement** — **Partial.** Approve updates request status, writes a `withdrawal` ledger entry, and notifies the seller (`src/app/api/admin/payout-requests/[id]/review/route.js`, `src/app/admin/payouts/PayoutRequestsStrip.jsx`); copy and flow still send admins to Payouts for release, with `approvedRequestId` only on the deep link.
- [x] **Payouts commission change log** — **Wired.** `platform_commission_change_log` (migration `108_buyer_notification_prefs_commission_log.sql`) with writes from platform billing, seller override, and per-order commission APIs; payouts UI loads `GET /api/admin/payouts/commission-change-log`.
- [ ] **Platform billing singleton** — `platform-billing` assumes row `id = 1`; GET falls back to **10%** commission when row missing (`src/app/api/admin/platform-billing/route.js`).

### Help and static admin content

- [ ] **Admin help center** — **UI only.** Topics, FAQs, playbooks, and quick links are in-file constants (`src/app/admin/help/page.jsx`).

### Admin areas largely integrated (spot-check)

Dashboard metrics, buyers, seller status/compliance/documents, listing approve/reject, disputes detail, payouts hold/unhold/commission/release, stuck refunds, billing settings, admin notification preferences, and in-app notifications are wired to `src/app/api/admin/*` in the current review.

---

## Payments (PayMongo) and money movement

- [x] **Checkout PayMongo session** — **Wired.** Checkout pay uses shared `createPaymongoCheckoutSession` / `phpToCentavos` in `src/lib/paymongo/client.js`.
- [ ] **Refunds** — PayMongo refund client in `src/lib/paymongo/client.js`; reconciliation in `src/lib/payments/refundReconcile.js`; admin stuck-refund and dispute outcomes can call PayMongo when `paymongo_payment_id` exists.
- [x] **Seller disbursement automation** — **Wired.** PayMongo batch transfer, `payout_disbursements`, and ledger writes on funding, refund, and payout release (`src/lib/paymongo/client.js`, `src/lib/payments/disbursementReconcile.js`, `src/lib/payments/walletLedgerEvents.js`, PayMongo webhook escrow creation).
- [x] **PayMongo disbursement prerequisites** — **Wired / Ops.** Env readiness is surfaced via `getPaymongoDisbursementEnvStatus()` and `GET /api/admin/payouts/disbursement-config`; production still needs `PAYMONGO_DISBURSEMENT_ENABLED=true`, funded wallet, and `PAYMONGO_WALLET_SOURCE_*` env vars.
- [x] **Wallet ledger entry coverage** — `order_payment`, `held_funds`, `refund`, `payout_release`, `withdrawal`, and `adjustment` are written on payment, refund, release, payout-request approval, and admin adjustment paths (`src/lib/payments/walletLedgerEvents.js`, `src/app/api/admin/payouts/ledger-adjustment/route.js`).
- [x] **Seller withdrawal ledger type** — **Wired.** `withdrawal` entries are written when payout requests are approved (`src/app/api/admin/payout-requests/[id]/review/route.js`) and summed in wallet summaries (`src/lib/payments/sellerWalletSummary.js`).
- [ ] **Webhook dependency** — Paid/failed checkout, refunds, and transfer/disbursement settlement depend on `src/app/api/payments/paymongo/webhook/route.js` and `PAYMONGO_WEBHOOK_SECRET`.

---

## Notifications and email

- [ ] **In-app feed** — Shared `GET/PATCH/DELETE /api/notifications` (`src/app/api/notifications/route.js`); buyer exposure is thinner than seller/admin (see cross-cutting).
- [ ] **Email delivery** — **Ops.** Nodemailer in `src/lib/email/mailTransport.js` requires SMTP env; `sendNotificationEmail.js` skips when `smtp_not_configured`. Seller approve/reject have dedicated templates; most events use generic HTML.
- [ ] **SMS** — Admin profile can store `sms_phone` (`src/features/admin/settings/adminProfile.js`); notification preference schema is in-app + email only (`src/lib/notifications/notificationPreferenceChannels.js`).
- [ ] **Dispute/payout/refund email templates** — No dedicated templates beyond generic notification email and seller approve/reject.

---

## Database and operations dependencies

- [ ] **Wallet ledger and disbursements schema** — Migration `107_wallet_ledger_disbursements.sql` (`payout_disbursements`, `seller_wallet_ledger`); disbursement state and ledger writes depend on this migration and service-role access (`src/lib/payments/walletLedger.js`).
- [ ] **Partners spotlight/directory RPCs** — Required for homepage carousel, `/partners`, and seller-profile badges; UI hints if migrations ~087–091 are not applied.
- [ ] **Seller `turnaround` and social links** — Used when migrations 082+ / 097+ are applied (shop + public profile RPCs).
- [ ] **Supabase env** — App expects Supabase URL/keys; admin middleware fails closed without public Supabase env (see cross-cutting).

---

## Suggested tracking order (optional)

1. Marketing hub backend + checkout coupon integration if promotions are in scope.  
2. ~~PayMongo disbursement env + seller payout settings vs manual escrow release; ledger entry types beyond `payout_release`.~~ **Done (2026-05-14):** disbursement readiness API, seller payout validation, ledger writes for funding/refund/release.  
3. ~~Admin listings list APIs vs client Supabase reads; bulk release manual override parity.~~ **Done (2026-05-14):** `GET /api/admin/listings`; bulk release `manualOverride` checkbox.  
4. Phone reclaim, pre-auth seller help CMS parity, and non-Google/Facebook OAuth if required for launch.

---

## Maintenance

When closing a gap, check the box, add the PR or commit reference inline, and move a one-line summary to a “Completed” section at the bottom of this file if you want history without deleting context.
