import { TbBulb } from 'react-icons/tb'
import analyticsStyles from './analytics.module.css'

/**
 * @param {{ insights?: string[] }} props
 */
export default function InsightsPanel({ insights = [] }) {
  if (!insights.length) {
    return (
      <div className={analyticsStyles.insightsPanel} role="status">
        <p className={analyticsStyles.insightsEmpty}>No insights available yet — add paid orders to see trends.</p>
      </div>
    )
  }

  return (
    <div className={analyticsStyles.insightsPanel} role="region" aria-label="Analytics insights">
      <div className={analyticsStyles.insightsHeader}>
        <TbBulb size={18} aria-hidden className={analyticsStyles.insightsIcon} />
        <p className={analyticsStyles.insightsTitle}>Key insights</p>
      </div>
      <ul className={analyticsStyles.insightsList}>
        {insights.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
