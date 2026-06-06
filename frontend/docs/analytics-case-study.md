# Marketplace Analytics — Case Study

One-page summary for portfolio and data analyst assessments.

Related: [SQL queries & metric glossary](./analytics-queries.md) · Admin UI: `/admin/analytics`

---

## 1. Business question

**How is the funeral marketplace performing month over month?**

Stakeholders need to know whether bookings and revenue are growing, which services drive revenue, and how many new families are using the platform.

---

## 2. Data sources

| Source | Table | Role |
|---|---|---|
| Orders | `public.orders` | Bookings, revenue (`subtotal`), payment status, buyer ID, timestamps |
| Line items | `public.order_items` | Service/package names and line-level revenue |
| Escrows | `public.order_escrows` | GMV and commission (legacy marketplace section below analyst dashboard) |

All analyst KPIs filter to **paid orders** (`payment_status = 'paid'`).

---

## 3. KPI definitions

| KPI | Formula (plain language) |
|---|---|
| Total paid orders | Count of all paid orders |
| Bookings this month | Paid orders in current UTC month |
| Revenue this month | Sum of order subtotals this month |
| New customers | Buyers with first paid order this month |
| Booking growth | % change in monthly bookings vs previous month |

Full SQL versions: [analytics-queries.md](./analytics-queries.md).

---

## 4. Dashboard

The **Analyst dashboard** section at the top of `/admin/analytics` includes:

- **5 KPI cards** — snapshot metrics with growth indicator
- **Key insights** — rule-based narrative (bookings, revenue, top service, new customers)
- **Monthly bookings** — bar chart (12 months)
- **Revenue trend** — area chart (12 months)
- **Revenue mix** — donut chart by line item
- **Export CSV / Excel** — downloadable monthly summary + KPI snapshot

> _Screenshot placeholder: capture `/admin/analytics` after seeding or with production-like data._

Existing **Marketplace trends**, **breakdown**, and **Recent activity** sections remain below for operational GMV and commission monitoring.

---

## 5. Sample interpretation

Example insights the dashboard may surface:

1. *Paid bookings this month: 24 (+14.3% vs last month).*
2. *Revenue this month is ₱1,240,000 (+8.2% vs last month).*
3. *Premium Wake Package accounts for about 42% of line-item revenue in the last 12 months.*
4. *New customers this month: 18 (3 up vs last month).*

These are generated from live aggregates — not hardcoded copy.

---

## 6. Recommendation (example)

If bookings grow but new customers flatline, acquisition may be driven by repeat families rather than new buyers — consider marketing to first-time users. If one package dominates revenue mix, bundle or promote complementary services to diversify income.

---

## 7. Technical notes

- Aggregations: [`adminAnalystMetrics.js`](../src/lib/admin/adminAnalystMetrics.js)
- API: `GET /api/admin/metrics`, export `GET /api/admin/metrics/export?format=csv|xlsx`
- Charts: Recharts with admin theme colors (`#1F312B` palette)
- Tests: `npm test` includes `adminAnalystMetrics.test.js`
