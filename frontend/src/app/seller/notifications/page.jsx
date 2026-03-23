'use client'

import { useMemo, useState } from 'react'
import { TbAlertTriangle, TbBell, TbCheck, TbCircleCheck, TbSpeakerphone } from 'react-icons/tb'
import styles from './notifications.module.css'

const INITIAL_NOTIFICATIONS = [
  {
    id: 'N1',
    title: 'Campaign budget threshold reached',
    body: 'Spring Beauty Push has consumed 80% of the planned ad budget. Review spend settings to avoid overrun.',
    type: 'alerts',
    priority: 'high',
    timestampLabel: '15 minutes ago',
    createdAt: '2026-03-23T09:15:00Z',
    read: false,
    resolved: false,
  },
  {
    id: 'N2',
    title: 'Voucher blast underperforming',
    body: 'Weekend voucher blast conversion is below target by 22%. Consider revising audience segment or discount depth.',
    type: 'marketing',
    priority: 'medium',
    timestampLabel: '2 hours ago',
    createdAt: '2026-03-23T07:25:00Z',
    read: false,
    resolved: false,
  },
  {
    id: 'N3',
    title: 'Seller payout successfully released',
    body: 'Payout P-00817 has been transferred to your linked account and should reflect within one business day.',
    type: 'system',
    priority: 'low',
    timestampLabel: 'Yesterday',
    createdAt: '2026-03-22T11:40:00Z',
    read: true,
    resolved: false,
  },
  {
    id: 'N4',
    title: 'Discount schedule conflict detected',
    body: 'Two active discounts overlap on Standard Service package. Resolve to prevent unexpected checkout pricing.',
    type: 'alerts',
    priority: 'high',
    timestampLabel: 'Yesterday',
    createdAt: '2026-03-22T08:50:00Z',
    read: false,
    resolved: false,
  },
  {
    id: 'N5',
    title: 'New analytics snapshot is available',
    body: 'Your weekly marketing performance report has been refreshed and is ready for review in Analytics.',
    type: 'system',
    priority: 'low',
    timestampLabel: '2 days ago',
    createdAt: '2026-03-21T13:30:00Z',
    read: true,
    resolved: true,
  },
  {
    id: 'N6',
    title: 'Campaign approved and now active',
    body: 'Campaign “Weekend Flash” passed review and is now running on your selected channels.',
    type: 'marketing',
    priority: 'medium',
    timestampLabel: '3 days ago',
    createdAt: '2026-03-20T10:20:00Z',
    read: true,
    resolved: false,
  },
]

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'system', label: 'System' },
  { key: 'marketing', label: 'Marketing' },
]

export default function SellerNotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const overview = useMemo(() => {
    const total = notifications.length
    const unread = notifications.filter((n) => !n.read).length
    const highPriority = notifications.filter((n) => n.priority === 'high' && !n.resolved).length
    return { total, unread, highPriority }
  }, [notifications])

  const visibleNotifications = useMemo(() => {
    let data = [...notifications]

    if (activeTab === 'unread') data = data.filter((n) => !n.read)
    if (activeTab === 'alerts' || activeTab === 'system' || activeTab === 'marketing') {
      data = data.filter((n) => n.type === activeTab)
    }

    if (statusFilter === 'read') data = data.filter((n) => n.read)
    if (statusFilter === 'unread') data = data.filter((n) => !n.read)

    if (typeFilter !== 'all') data = data.filter((n) => n.type === typeFilter)

    if (sortBy === 'newest') {
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy === 'oldest') {
      data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    } else if (sortBy === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 }
      data.sort((a, b) => weight[b.priority] - weight[a.priority])
    }

    return data
  }, [notifications, activeTab, sortBy, statusFilter, typeFilter])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearResolved = () => {
    setNotifications((prev) => prev.filter((n) => !n.resolved))
  }

  const markAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const resolveItem = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, resolved: true, read: true } : n)))
  }

  const dismissItem = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className={styles.pageWrap}>
      <header className={styles.pageHeader}>
        <div className={styles.bulkActions}>
          <button type="button" className={styles.secondaryBtn} onClick={markAllAsRead}>
            Mark All as Read
          </button>
          <button type="button" className={styles.ghostBtn} onClick={clearResolved}>
            Clear Resolved
          </button>
        </div>
      </header>

      <section className={styles.overviewGrid}>
        <div className={`${styles.overviewCard} ${styles.totalCard}`}>
          <div className={styles.overviewLabel}>Total Notifications</div>
          <div className={styles.overviewValue}>{overview.total}</div>
          <div className={styles.overviewMeta}>Across all categories</div>
        </div>
        <div className={`${styles.overviewCard} ${styles.unreadCard}`}>
          <div className={styles.overviewLabel}>Unread</div>
          <div className={styles.overviewValue}>{overview.unread}</div>
          <div className={styles.overviewMeta}>Needs your review</div>
        </div>
        <div className={`${styles.overviewCard} ${styles.alertCard}`}>
          <div className={styles.overviewLabel}>High Priority Alerts</div>
          <div className={styles.overviewValue}>{overview.highPriority}</div>
          <div className={styles.overviewMeta}>Immediate attention</div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelFilterHeader}>
          <div className={styles.tabRow}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.controlRow}>
            <label className={styles.controlGroup}>
              <span className={styles.controlLabel}>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.select}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="priority">Priority</option>
              </select>
            </label>
            <label className={styles.controlGroup}>
              <span className={styles.controlLabel}>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>
            <label className={styles.controlGroup}>
              <span className={styles.controlLabel}>Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">All types</option>
                <option value="alerts">Alerts</option>
                <option value="system">System</option>
                <option value="marketing">Marketing</option>
              </select>
            </label>
          </div>
        </div>

        <div className={styles.listWrap}>
          {visibleNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <TbCircleCheck className={styles.emptyIcon} />
              <p>No notifications match the current filters.</p>
            </div>
          ) : (
            visibleNotifications.map((item) => {
              const Icon = getTypeIcon(item.type)
              return (
                <article
                  key={item.id}
                  className={`${styles.notificationRow} ${!item.read ? styles.unreadRow : ''} ${
                    item.resolved ? styles.resolvedRow : ''
                  }`}
                >
                  <div className={styles.iconCol}>
                    <span className={`${styles.typeIcon} ${styles[`typeIcon_${item.type}`]}`}>
                      <Icon size={16} />
                    </span>
                  </div>
                  <div className={styles.contentCol}>
                    <div className={styles.rowTop}>
                      <h2 className={styles.rowTitle}>{item.title}</h2>
                      <div className={styles.rowMeta}>
                        <span className={styles.timestamp}>{item.timestampLabel}</span>
                        <span className={`${styles.priorityBadge} ${styles[`priority_${item.priority}`]}`}>
                          {item.priority}
                        </span>
                        <span className={`${styles.statusBadge} ${item.read ? styles.statusRead : styles.statusUnread}`}>
                          {item.read ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </div>
                    <p className={styles.rowBody}>{item.body}</p>
                    <div className={styles.quickActions}>
                      <button type="button" className={styles.linkBtn}>
                        View Details
                      </button>
                      {!item.resolved && (
                        <button type="button" className={styles.linkBtn} onClick={() => resolveItem(item.id)}>
                          Resolve
                        </button>
                      )}
                      {!item.read && (
                        <button type="button" className={styles.linkBtn} onClick={() => markAsRead(item.id)}>
                          Mark as Read
                        </button>
                      )}
                      <button type="button" className={styles.linkBtnDanger} onClick={() => dismissItem(item.id)}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

function getTypeIcon(type) {
  if (type === 'alerts') return TbAlertTriangle
  if (type === 'marketing') return TbSpeakerphone
  return TbBell
}

