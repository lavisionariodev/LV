# Admin Analytics — SQL Queries & Metric Glossary

Platform-wide analyst KPIs on `/admin/analytics` are computed from paid orders only (`payment_status = 'paid'`). All calendar months use **UTC**.

See also: [Analytics case study](./analytics-case-study.md).

---

## Metric glossary

| Metric | Definition | Filter |
|---|---|---|
| Total paid orders | Count of all paid orders | `payment_status = 'paid'` |
| Bookings this month | Paid orders created in the current UTC calendar month | `created_at` in current month |
| Revenue this month | Sum of `subtotal` for paid orders this month | Same as above |
| New customers this month | Buyers whose **first** paid order was created this month | First `created_at` per `buyer_id` |
| Booking growth rate | Month-over-month change in paid order count | `(this_month - prev_month) / prev_month` |
| Monthly bookings (chart) | Paid order count per UTC month | Last 12 months |
| Revenue trend (chart) | Sum of `subtotal` per UTC month | Last 12 months |
| Revenue mix (pie) | Line-item revenue share | Top 4 names + Other, last 12 months |

---

## Total paid orders

```sql
SELECT COUNT(*) AS total_paid_orders
FROM public.orders
WHERE payment_status = 'paid';
```

---

## Bookings this month

```sql
SELECT COUNT(*) AS bookings_this_month
FROM public.orders
WHERE payment_status = 'paid'
  AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
  AND created_at < date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month';
```

---

## Revenue this month

```sql
SELECT COALESCE(SUM(subtotal), 0) AS revenue_this_month
FROM public.orders
WHERE payment_status = 'paid'
  AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
  AND created_at < date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month';
```

---

## New customers this month

A “new customer” is a buyer whose earliest paid order falls in the current UTC month.

```sql
WITH first_paid AS (
  SELECT
    buyer_id,
    MIN(created_at) AS first_paid_at
  FROM public.orders
  WHERE payment_status = 'paid'
  GROUP BY buyer_id
)
SELECT COUNT(*) AS new_customers_this_month
FROM first_paid
WHERE first_paid_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')
  AND first_paid_at < date_trunc('month', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 month';
```

---

## Monthly bookings (last 12 months)

```sql
SELECT
  to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
  COUNT(*) AS bookings
FROM public.orders
WHERE payment_status = 'paid'
  AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months'
GROUP BY 1
ORDER BY 1;
```

---

## Monthly revenue (last 12 months)

```sql
SELECT
  to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
  COALESCE(SUM(subtotal), 0) AS revenue_php
FROM public.orders
WHERE payment_status = 'paid'
  AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months'
GROUP BY 1
ORDER BY 1;
```

---

## Booking growth rate (month over month)

```sql
WITH monthly AS (
  SELECT
    date_trunc('month', created_at AT TIME ZONE 'UTC') AS month_start,
    COUNT(*) AS bookings
  FROM public.orders
  WHERE payment_status = 'paid'
  GROUP BY 1
),
ranked AS (
  SELECT
    month_start,
    bookings,
    LAG(bookings) OVER (ORDER BY month_start) AS prev_bookings
  FROM monthly
)
SELECT
  month_start,
  bookings,
  prev_bookings,
  CASE
    WHEN prev_bookings IS NULL OR prev_bookings = 0 THEN NULL
    ELSE ROUND(((bookings - prev_bookings)::numeric / prev_bookings) * 100, 1)
  END AS growth_pct
FROM ranked
ORDER BY month_start DESC
LIMIT 2;
```

---

## Revenue mix by line item (last 12 months)

```sql
SELECT
  oi.name,
  SUM(oi.price * oi.quantity) AS line_revenue
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.payment_status = 'paid'
  AND o.created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '11 months'
GROUP BY oi.name
ORDER BY line_revenue DESC;
```

---

## Export report columns

CSV and Excel exports (`/api/admin/metrics/export`) include:

| Column | Description |
|---|---|
| `month` | `YYYY-MM` (UTC) |
| `bookings` | Paid order count |
| `revenue_php` | Sum of subtotals |
| `new_customers` | First-time buyers that month |

Implementation: [`frontend/src/lib/admin/adminAnalystMetrics.js`](../src/lib/admin/adminAnalystMetrics.js).
