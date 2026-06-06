import { TbDownload } from 'react-icons/tb'
import earningsStyles from '../earnings/earnings.module.css'
import analyticsStyles from './analytics.module.css'

export default function ExportActions() {
  return (
    <div className={analyticsStyles.exportActions} role="group" aria-label="Export analytics report">
      <a
        href="/api/admin/metrics/export?format=csv"
        className={`${earningsStyles.chartRangeBtn} ${analyticsStyles.exportBtn}`}
        aria-label="Download analytics CSV"
      >
        <TbDownload size={14} aria-hidden />
        <span>Export CSV</span>
      </a>
      <a
        href="/api/admin/metrics/export?format=xlsx"
        className={`${earningsStyles.chartRangeBtn} ${analyticsStyles.exportBtn}`}
        aria-label="Download analytics Excel"
      >
        <TbDownload size={14} aria-hidden />
        <span>Export Excel</span>
      </a>
    </div>
  )
}
