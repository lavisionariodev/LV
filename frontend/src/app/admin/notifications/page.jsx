'use client'

import { useState } from 'react'
import { TbBellOff, TbCheck, TbTrash, TbAlertTriangle } from 'react-icons/tb'
import { LuShoppingBag, LuUserCheck, LuMegaphone } from 'react-icons/lu'
import styles from './notifications.module.css'

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    type: 'order',
    title: 'New order received',
    message: 'You have a new booking from Maria Santos for Hair & Makeup Package.',
    time: '2 min ago',
    read: false,
    icon: LuShoppingBag,
    iconColor: 'blue',
  },
  {
    id: 2,
    type: 'approval',
    title: 'Seller account approved',
    message: 'Bloom Beauty Studio has been approved and is now active on the platform.',
    time: '1 hr ago',
    read: false,
    icon: LuUserCheck,
    iconColor: 'green',
  },
  {
    id: 3,
    type: 'alert',
    title: 'Dispute opened',
    message: 'A dispute has been filed for Order #10482. Please review within 48 hours.',
    time: '3 hr ago',
    read: false,
    icon: TbAlertTriangle,
    iconColor: 'red',
  },
  {
    id: 4,
    type: 'announcement',
    title: 'Platform maintenance scheduled',
    message: 'Scheduled downtime on March 15, 2:00–4:00 AM for system upgrades.',
    time: 'Yesterday',
    read: true,
    icon: LuMegaphone,
    iconColor: 'gold',
  },
  {
    id: 5,
    type: 'order',
    title: 'Order completed',
    message: 'Order #10479 by Juan dela Cruz has been marked as completed.',
    time: 'Yesterday',
    read: true,
    icon: LuShoppingBag,
    iconColor: 'blue',
  },
  {
    id: 6,
    type: 'approval',
    title: 'New seller registration',
    message: 'Glow Lab PH has submitted their seller application and is awaiting review.',
    time: '2 days ago',
    read: true,
    icon: LuUserCheck,
    iconColor: 'green',
  },
  {
    id: 7,
    type: 'alert',
    title: 'Payout flagged',
    message: 'Payout #PP-2041 has been flagged for manual review due to unusual activity.',
    time: '3 days ago',
    read: true,
    icon: TbAlertTriangle,
    iconColor: 'red',
  },
  {
    id: 8,
    type: 'announcement',
    title: 'New feature: Vouchers',
    message: 'Sellers can now create and manage discount vouchers from their dashboard.',
    time: '5 days ago',
    read: true,
    icon: LuMegaphone,
    iconColor: 'gold',
  },
]

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order', label: 'Orders' },
  { id: 'approval', label: 'Approvals' },
  { id: 'alert', label: 'Alerts' },
  { id: 'announcement', label: 'Announcements' },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS)
  const [activeFilter, setActiveFilter] = useState('all')

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.read
    return n.type === activeFilter
  })

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const markRead = (id) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

  const deleteNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id))

  const clearAll = () => setNotifications([])

  return (
    <div className={styles.page}>

      {/* ── DESKTOP LAYOUT ── */}
      <div className={styles.desktopLayout}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            {unreadCount > 0 && (
              <span className={styles.unreadBadge}>{unreadCount} unread</span>
            )}
          </div>
          <div className={styles.pageHeaderActions}>
            {unreadCount > 0 && (
              <button className={styles.ghostBtn} onClick={markAllRead}>
                <TbCheck /> Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button className={styles.ghostBtnDanger} onClick={clearAll}>
                <TbTrash /> Clear all
              </button>
            )}
          </div>
        </div>

        <div className={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className={styles.filterBadge}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.card}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <TbBellOff className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No notifications</p>
              <p className={styles.emptyText}>You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className={styles.notifList}>
              {filtered.map((notif, i) => {
                const Icon = notif.icon
                return (
                  <div
                    key={notif.id}
                    className={`${styles.notifItem} ${!notif.read ? styles.notifUnread : ''} ${i < filtered.length - 1 ? styles.notifBorder : ''}`}
                    onClick={() => markRead(notif.id)}
                  >
                    <div className={`${styles.notifIconWrap} ${styles[`icon_${notif.iconColor}`]}`}>
                      <Icon />
                    </div>
                    <div className={styles.notifBody}>
                      <div className={styles.notifTop}>
                        <p className={styles.notifTitle}>{notif.title}</p>
                        <span className={styles.notifTime}>{notif.time}</span>
                      </div>
                      <p className={styles.notifMessage}>{notif.message}</p>
                    </div>
                    <div className={styles.notifActions}>
                      {!notif.read && <span className={styles.unreadDot} />}
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                        aria-label="Delete notification"
                      >
                        <TbTrash />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className={styles.mobileLayout}>
        <div className={styles.mobileTopRow}>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount} unread</span>
          )}
          <div className={styles.mobileTopActions}>
            {unreadCount > 0 && (
              <button className={styles.ghostBtn} onClick={markAllRead}>
                <TbCheck /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className={styles.ghostBtnDanger} onClick={clearAll}>
                <TbTrash />
              </button>
            )}
          </div>
        </div>

        <div className={styles.mobileFilterScroll}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.mobileFilterChip} ${activeFilter === tab.id ? styles.mobileFilterChipActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className={styles.filterBadge}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <TbBellOff className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No notifications</p>
            <p className={styles.emptyText}>You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className={styles.mobileList}>
            {filtered.map((notif) => {
              const Icon = notif.icon
              return (
                <div
                  key={notif.id}
                  className={`${styles.mobileNotifItem} ${!notif.read ? styles.notifUnread : ''}`}
                  onClick={() => markRead(notif.id)}
                >
                  <div className={`${styles.notifIconWrap} ${styles[`icon_${notif.iconColor}`]}`}>
                    <Icon />
                  </div>
                  <div className={styles.notifBody}>
                    <div className={styles.notifTop}>
                      <p className={styles.notifTitle}>{notif.title}</p>
                      {!notif.read && <span className={styles.unreadDot} />}
                    </div>
                    <p className={styles.notifMessage}>{notif.message}</p>
                    <span className={styles.notifTime}>{notif.time}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                    aria-label="Delete"
                  >
                    <TbTrash />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}