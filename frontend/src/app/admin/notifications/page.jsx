'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TbBellOff, TbBellRinging, TbCheck, TbTrash, TbAlertTriangle, TbDots } from 'react-icons/tb'
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

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

function HeaderMenu({ onMarkAll, onClearAll, hasUnread, hasNotifs }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)

  if (!hasNotifs && !hasUnread) return null

  return (
    <div ref={ref} className={styles.menuWrap}>
      <button
        type="button"
        className={styles.dotsBtn}
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
      >
        <TbDots />
      </button>
      {open && (
        <div className={styles.menuDropdown}>
          {hasUnread && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => { onMarkAll(); setOpen(false) }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Mark all as read
            </button>
          )}
          {hasNotifs && (
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={() => { onClearAll(); setOpen(false) }}
            >
              <TbTrash className={styles.menuItemIcon} />
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function NotifMenu({ notifId, isRead, onMarkRead, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)

  return (
    <div ref={ref} className={styles.menuWrap}>
      <button
        type="button"
        className={styles.dotsBtn}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-label="Notification options"
      >
        <TbDots />
      </button>
      {open && (
        <div className={`${styles.menuDropdown} ${styles.menuDropdownLeft}`}>
          {!isRead && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={(e) => { e.stopPropagation(); onMarkRead(notifId); setOpen(false) }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Mark as read
            </button>
          )}
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={(e) => { e.stopPropagation(); onDelete(notifId); setOpen(false) }}
          >
            <TbTrash className={styles.menuItemIcon} />
            Delete notification
          </button>
        </div>
      )}
    </div>
  )
}

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

        <div className={styles.headerBanner}>
          <div className={styles.headerBannerLeft}>
            <div className={styles.headerIconWrap}>
              <TbBellRinging />
            </div>
            <p className={styles.headerSub}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} waiting for your attention.`
                : `You're all caught up — no new notifications.`}
            </p>
          </div>
          <HeaderMenu
            hasUnread={unreadCount > 0}
            hasNotifs={notifications.length > 0}
            onMarkAll={markAllRead}
            onClearAll={clearAll}
          />
        </div>

        <div className={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
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
                      <NotifMenu
                        notifId={notif.id}
                        isRead={notif.read}
                        onMarkRead={markRead}
                        onDelete={deleteNotification}
                      />
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
        <div className={styles.headerBanner}>
          <div className={styles.headerBannerLeft}>
            <div className={styles.headerIconWrap}>
              <TbBellRinging />
            </div>
            <p className={styles.headerSub}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
                : `You're all caught up.`}
            </p>
          </div>
          <HeaderMenu
            hasUnread={unreadCount > 0}
            hasNotifs={notifications.length > 0}
            onMarkAll={markAllRead}
            onClearAll={clearAll}
          />
        </div>

        <div className={styles.mobileFilterScroll}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.mobileFilterChip} ${activeFilter === tab.id ? styles.mobileFilterChipActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
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
                  <NotifMenu
                    notifId={notif.id}
                    isRead={notif.read}
                    onMarkRead={markRead}
                    onDelete={deleteNotification}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}