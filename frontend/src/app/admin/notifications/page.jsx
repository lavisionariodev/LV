'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TbBellOff, TbBellRinging, TbCheck, TbTrash, TbAlertTriangle, TbDots } from 'react-icons/tb'
import { LuShoppingBag, LuUserCheck, LuMegaphone } from 'react-icons/lu'
import styles from './notifications.module.css'
import {
  notificationsPageSampleRows,
  notificationsPageFilterTabs,
} from '@/data/adminSampleData'

const NOTIFICATION_ICON_BY_KEY = {
  LuShoppingBag,
  LuUserCheck,
  TbAlertTriangle,
  LuMegaphone,
}

function hydrateNotificationSamples(rows) {
  return rows.map((n) => ({
    ...n,
    icon: NOTIFICATION_ICON_BY_KEY[n.iconKey] || TbAlertTriangle,
  }))
}

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
  const [notifications, setNotifications] = useState(() => hydrateNotificationSamples(notificationsPageSampleRows))
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
          {notificationsPageFilterTabs.map((tab) => (
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
                const Icon = notif.icon || TbAlertTriangle
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
          {notificationsPageFilterTabs.map((tab) => (
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
              const Icon = notif.icon || TbAlertTriangle
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