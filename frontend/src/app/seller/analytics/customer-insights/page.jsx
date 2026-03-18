'use client'

import { TbUsers } from 'react-icons/tb'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from '../analytics.module.css'

const CUSTOMER_BAR_COLORS = {
  returning: '#1f312b',
  fresh: '#9ca3af',
}

const CUSTOMER_DATA = [
  { label: 'Oct', returning: 26, fresh: 48 },
  { label: 'Nov', returning: 24, fresh: 52 },
  { label: 'Dec', returning: 30, fresh: 46 },
  { label: 'Jan', returning: 32, fresh: 50 },
  { label: 'Feb', returning: 25, fresh: 47 },
  { label: 'Mar', returning: 28, fresh: 49 },
]

export default function SellerAnalyticsCustomerInsightsPage() {
  return (
    <div className={styles.pageWrap}>
      <section aria-label="Customer summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Families supported (12 months)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>72</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +6 this month
            </span>
          </div>
          <p className={styles.summaryHint}>Unique families you&apos;ve helped</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Returning rate</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>28%</p>
          </div>
          <p className={styles.summaryHint}>Families with more than one booking</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Average time between visits</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>11.4 months</p>
          </div>
          <p className={styles.summaryHint}>Measured across returning families</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>In‑app engagement</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>63%</p>
          </div>
          <p className={styles.summaryHint}>Families who read messages in Lavisionario</p>
        </article>
      </section>

      <section aria-label="Customer charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>New vs returning customers</h2>
              <p className={styles.chartSubtitle}>
                Stacked bars showing the mix of new and returning families each month.
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbUsers size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 6 months
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={CUSTOMER_DATA}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barSize={26}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={36}
                />
                <Tooltip
                  formatter={(value, name) =>
                    [`${value}%`, name === 'returning' ? 'Returning families' : 'New families']
                  }
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar
                  dataKey="fresh"
                  stackId="customers"
                  fill={CUSTOMER_BAR_COLORS.fresh}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="returning"
                  stackId="customers"
                  fill={CUSTOMER_BAR_COLORS.returning}
                  radius={[0, 0, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: CUSTOMER_BAR_COLORS.returning }}
                />
                <span className={styles.legendLabel}>Returning families</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: CUSTOMER_BAR_COLORS.fresh }}
                />
                <span className={styles.legendLabel}>New families</span>
              </div>
            </div>
          </footer>
        </article>
      </section>
    </div>
  )
}
