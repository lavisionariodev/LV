import styles from './admin.module.css'

export default function AdminDashboardPage() {
  return (
    <div className={styles.dashWrap}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Sellers</p>
          <p className={styles.statValue}>128</p>
          <p className={styles.statHint}>Active this month</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Users</p>
          <p className={styles.statValue}>4,392</p>
          <p className={styles.statHint}>Registered accounts</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Transactions</p>
          <p className={styles.statValue}>₱ 1.24M</p>
          <p className={styles.statHint}>Last 30 days</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Open Disputes</p>
          <p className={styles.statValue}>7</p>
          <p className={styles.statHint}>Needs review</p>
        </div>
      </section>

      <section className={styles.lowerGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Recent activity</p>
            <button className={styles.smallBtn} type="button">
              View all
            </button>
          </div>

          <div className={styles.table}>
            <div className={styles.rowHead}>
              <span>Date</span>
              <span>Type</span>
              <span>Status</span>
            </div>

            {[
              { date: 'Today', type: 'Seller registration', status: 'Pending' },
              { date: 'Yesterday', type: 'Transaction review', status: 'Resolved' },
              { date: 'Jan 19', type: 'Dispute opened', status: 'Open' },
            ].map((x, idx) => (
              <div className={styles.row} key={idx}>
                <span>{x.date}</span>
                <span>{x.type}</span>
                <span className={styles.badge}>{x.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Quick actions</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionBtn} type="button">
              Add Seller
            </button>
            <button className={styles.actionBtn} type="button">
              Manage Content
            </button>
            <button className={styles.actionBtn} type="button">
              Review Disputes
            </button>
            <button className={styles.actionBtn} type="button">
              Settings
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}