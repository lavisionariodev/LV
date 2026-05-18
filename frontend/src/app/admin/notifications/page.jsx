'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TbBellOff, TbBellRinging, TbCheck, TbTrash, TbAlertTriangle, TbDots } from 'react-icons/tb'
import styles from './notifications.module.css'
import { relativeNotificationTime } from '@/lib/notifications/useInAppNotificationFeed'
import { usePortalInAppNotificationFeed } from '@/contexts/PortalInAppNotificationFeedContext'
import { adminNotificationFilterBucket, ADMIN_NOTIFICATION_FILTER_TABS } from '@/lib/notifications/types'
import { getNotificationDisplay } from '@/lib/notifications/notificationDisplay'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import { useMediaQuery } from '@/shared/hooks'

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

function HeaderMenu({ onMarkAll, onRequestClearAll, hasUnread, hasNotifs }) {
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
              onClick={() => { onRequestClearAll(); setOpen(false) }}
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

function NotificationsLoadingSkeleton({ variant }) {
  const count = variant === 'mobile' ? 5 : 7
  const rows = Array.from({ length: count })
  if (variant === 'mobile') {
    return (
      <div className={styles.mobileList} role="status" aria-live="polite" aria-busy="true" aria-label="Loading notifications">
        {rows.map((_, i) => (
          <div key={`nsk-m-${i}`} className={`${styles.mobileNotifItem} ${styles.notifSkRow}`} aria-hidden>
            <div className={`${styles.notifIconWrap} ${styles.icon_blue}`}>
              <span className={styles.notifSkBar} style={{ width: 20, height: 20, borderRadius: 6 }} />
            </div>
            <div className={styles.notifBody}>
              <div className={styles.notifTop}>
                <span className={styles.notifSkBar} style={{ height: 13, width: '62%', maxWidth: 200 }} />
              </div>
              <span className={styles.notifSkBar} style={{ height: 11, width: '100%', marginTop: 6 }} />
              <span className={styles.notifSkBar} style={{ height: 11, width: '80%', marginTop: 5 }} />
              <span className={styles.notifSkBar} style={{ height: 10, width: 56, marginTop: 6 }} />
            </div>
            <span className={styles.notifSkBar} style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={styles.notifList} role="status" aria-live="polite" aria-busy="true" aria-label="Loading notifications">
      {rows.map((_, i) => (
        <div
          key={`nsk-d-${i}`}
          className={`${styles.notifItem} ${styles.notifSkRow} ${i < rows.length - 1 ? styles.notifBorder : ''}`}
          aria-hidden
        >
          <div className={`${styles.notifIconWrap} ${styles.icon_blue}`}>
            <span className={styles.notifSkBar} style={{ width: 22, height: 22, borderRadius: 6 }} />
          </div>
          <div className={styles.notifBody}>
            <div className={styles.notifTop}>
              <span className={styles.notifSkBar} style={{ height: 13, width: '48%', maxWidth: 240 }} />
              <span className={styles.notifSkBar} style={{ height: 10, width: 52 }} />
            </div>
            <span className={styles.notifSkBar} style={{ height: 11, width: '94%', marginTop: 6 }} />
            <span className={styles.notifSkBar} style={{ height: 11, width: '72%', marginTop: 5 }} />
          </div>
          <div className={styles.notifActions}>
            <span className={styles.notifSkBar} style={{ width: 30, height: 30, borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function NotifMenu({ notifId, isRead, onMarkRead, onRequestDelete }) {
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
            onClick={(e) => { e.stopPropagation(); onRequestDelete(notifId); setOpen(false) }}
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
  const isMobile = useMediaQuery('(max-width: 860px)')
  const {
    notifications: apiRows,
    loading,
    unreadCount,
    markRead: markReadApi,
    markAllRead,
    deleteOne,
    clearAll,
  } = usePortalInAppNotificationFeed()

  const [activeFilter, setActiveFilter] = useState('all')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)

  const notifications = useMemo(
    () =>
      apiRows.map((row) => {
        const bucket = adminNotificationFilterBucket(row.type)
        const { Icon, color: iconColor } = getNotificationDisplay(row.type, bucket)
        return {
          id: row.id,
          filterBucket: bucket,
          title: row.title,
          message: row.body || '',
          time: relativeNotificationTime(row.createdAt),
          read: Boolean(row.readAt),
          icon: Icon,
          iconColor,
        }
      }),
    [apiRows],
  )

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'unread') return !n.read
      return n.filterBucket === activeFilter
    })
  }, [notifications, activeFilter])

  const markRead = (id) => {
    markReadApi(id)
  }

  return (
    <div className={styles.page} {...(isMobile ? { 'data-portal-inner-page': '' } : {})}>

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
            onRequestClearAll={() => setClearAllOpen(true)}
          />
        </div>

        <div className={styles.filterRow}>
          {ADMIN_NOTIFICATION_FILTER_TABS.map((tab) => (
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
          {loading && notifications.length === 0 ? (
            <NotificationsLoadingSkeleton variant="desktop" />
          ) : filtered.length === 0 ? (
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
                        onRequestDelete={setDeleteConfirmId}
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
            onRequestClearAll={() => setClearAllOpen(true)}
          />
        </div>

        <div className={styles.mobileFilterScroll}>
          {ADMIN_NOTIFICATION_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.mobileFilterChip} ${activeFilter === tab.id ? styles.mobileFilterChipActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && notifications.length === 0 ? (
          <NotificationsLoadingSkeleton variant="mobile" />
        ) : filtered.length === 0 ? (
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
                    onRequestDelete={setDeleteConfirmId}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteConfirmId != null}
        variant="danger"
        title="Delete notification?"
        message="This notification will be removed from your inbox."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteOne(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />

      <ConfirmModal
        open={clearAllOpen}
        variant="danger"
        title="Clear all notifications?"
        message={
          notifications.length > 0
            ? `This will remove all ${notifications.length} notification${notifications.length > 1 ? 's' : ''} from your inbox. This cannot be undone.`
            : 'Remove every notification from your inbox? This cannot be undone.'
        }
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        onCancel={() => setClearAllOpen(false)}
        onConfirm={() => {
          clearAll()
          setClearAllOpen(false)
        }}
      />
    </div>
  )
}