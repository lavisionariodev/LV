'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  TbAlertTriangle,
  TbBellOff,
  TbBellRinging,
  TbCheck,
  TbDots,
  TbFileText,
  TbMessage2,
  TbReceiptRefund,
  TbTrash,
} from 'react-icons/tb'
import { LuMegaphone, LuShoppingBag } from 'react-icons/lu'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import {
  relativeNotificationTime,
  useInAppNotificationFeed,
} from '@/lib/notifications/useInAppNotificationFeed'
import {
  SELLER_NOTIFICATION_FILTER_TABS,
  sellerNotificationFilterBucket,
} from '@/lib/notifications/types'
import styles from '@/app/admin/notifications/notifications.module.css'

const ICON_BY_BUCKET = {
  order: LuShoppingBag,
  payment: TbReceiptRefund,
  listing: TbFileText,
  message: TbMessage2,
  alert: TbAlertTriangle,
  system: LuMegaphone,
}

const COLOR_BY_BUCKET = {
  order: 'blue',
  payment: 'gold',
  listing: 'green',
  message: 'blue',
  alert: 'red',
  system: 'gold',
}

function notificationHref(row) {
  const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const orderId = meta.orderId || meta.order_id
  const listingId = meta.listingId || meta.listing_id
  const disputeId = meta.disputeId || meta.dispute_id
  const bucket = sellerNotificationFilterBucket(row?.type)

  if (orderId) {
    const params = new URLSearchParams({ orderId: String(orderId), action: 'view' })
    if (disputeId) params.set('tab', 'all')
    return `/seller/orders?${params.toString()}`
  }
  if (listingId || bucket === 'listing') return '/seller/products/catalog'
  if (bucket === 'payment') return '/seller/analytics/revenue-reports'
  if (bucket === 'message') return '/seller/customers'
  if (bucket === 'alert') return '/seller/orders'
  return '/seller/marketing/centre'
}

function HeaderMenu({
  onMarkAll,
  onMarkAllResolved,
  onRequestClearResolved,
  onRequestClearAll,
  hasUnread,
  hasUnresolved,
  hasResolved,
  hasNotifs,
}) {
  const [open, setOpen] = useState(false)

  if (!hasNotifs && !hasUnread && !hasUnresolved) return null

  return (
    <div className={styles.menuWrap}>
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
              onClick={() => {
                onMarkAll()
                setOpen(false)
              }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Mark all as read
            </button>
          )}
          {hasUnresolved && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onMarkAllResolved()
                setOpen(false)
              }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Resolve all
            </button>
          )}
          {hasResolved && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onRequestClearResolved()
                setOpen(false)
              }}
            >
              <TbTrash className={styles.menuItemIcon} />
              Clear resolved
            </button>
          )}
          {hasNotifs && (
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={() => {
                onRequestClearAll()
                setOpen(false)
              }}
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
  const rowClass = variant === 'mobile' ? styles.mobileNotifItem : styles.notifItem

  return (
    <div
      className={variant === 'mobile' ? styles.mobileList : styles.notifList}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {rows.map((_, i) => (
        <div
          key={`seller-nsk-${variant}-${i}`}
          className={`${rowClass} ${styles.notifSkRow} ${variant !== 'mobile' && i < rows.length - 1 ? styles.notifBorder : ''}`}
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
        </div>
      ))}
    </div>
  )
}

function NotifMenu({ notifId, isRead, isResolved, onMarkRead, onResolve, onRequestDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.menuWrap}>
      <button
        type="button"
        className={styles.dotsBtn}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
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
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead(notifId)
                setOpen(false)
              }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Mark as read
            </button>
          )}
          {!isResolved && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={(e) => {
                e.stopPropagation()
                onResolve(notifId)
                setOpen(false)
              }}
            >
              <TbCheck className={styles.menuItemIcon} />
              Mark resolved
            </button>
          )}
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={(e) => {
              e.stopPropagation()
              onRequestDelete(notifId)
              setOpen(false)
            }}
          >
            <TbTrash className={styles.menuItemIcon} />
            Delete notification
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationRow({ notif, variant, isLast, onMarkRead, onResolve, onRequestDelete }) {
  const Icon = notif.icon || TbAlertTriangle
  const className =
    variant === 'mobile'
      ? `${styles.mobileNotifItem} ${!notif.read ? styles.notifUnread : ''}`
      : `${styles.notifItem} ${!notif.read ? styles.notifUnread : ''} ${!isLast ? styles.notifBorder : ''}`

  return (
    <div className={className} onClick={() => onMarkRead(notif.id)}>
      <div className={`${styles.notifIconWrap} ${styles[`icon_${notif.iconColor}`]}`}>
        <Icon />
      </div>
      <div className={styles.notifBody}>
        <div className={styles.notifTop}>
          <p className={styles.notifTitle}>{notif.title}</p>
          {variant === 'desktop' ? <span className={styles.notifTime}>{notif.time}</span> : null}
          {variant === 'mobile' && !notif.read ? <span className={styles.unreadDot} /> : null}
        </div>
        <p className={styles.notifMessage}>{notif.message}</p>
        {notif.resolved ? (
          <p className={styles.notifMessage} style={{ marginTop: 4, color: '#16a34a', fontWeight: 700 }}>
            Resolved
          </p>
        ) : null}
        {variant === 'mobile' ? <span className={styles.notifTime}>{notif.time}</span> : null}
      </div>
      <div className={styles.notifActions}>
        {variant === 'desktop' && !notif.read ? <span className={styles.unreadDot} /> : null}
        <Link
          href={notif.href}
          className={styles.menuItem}
          style={{ borderRadius: 8, padding: '6px 8px', textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          Open
        </Link>
        <NotifMenu
          notifId={notif.id}
          isRead={notif.read}
          isResolved={notif.resolved}
          onMarkRead={onMarkRead}
          onResolve={onResolve}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </div>
  )
}

export default function SellerNotificationsPage() {
  const {
    notifications: apiRows,
    loading,
    unreadCount,
    unresolvedCount,
    markRead,
    markAllRead,
    resolveOne,
    markAllResolved,
    deleteOne,
    clearAll,
    clearResolved,
  } = useInAppNotificationFeed({ limit: 100, enabled: true })

  const [activeFilter, setActiveFilter] = useState('all')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearResolvedOpen, setClearResolvedOpen] = useState(false)

  const notifications = useMemo(
    () =>
      apiRows.map((row) => {
        const bucket = sellerNotificationFilterBucket(row.type)
        const Icon = ICON_BY_BUCKET[bucket] || TbAlertTriangle
        return {
          id: row.id,
          filterBucket: bucket,
          title: row.title || 'Notification',
          message: row.body || '',
          time: relativeNotificationTime(row.createdAt),
          read: Boolean(row.readAt),
          resolved: Boolean(row.resolvedAt),
          icon: Icon,
          iconColor: COLOR_BY_BUCKET[bucket] || 'red',
          href: notificationHref(row),
        }
      }),
    [apiRows],
  )

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'all') return true
      if (activeFilter === 'unread') return !n.read
      if (activeFilter === 'unresolved') return !n.resolved
      return n.filterBucket === activeFilter
    })
  }, [notifications, activeFilter])

  const resolvedCount = notifications.filter((n) => n.resolved).length

  return (
    <div className={styles.page}>
      <div className={styles.desktopLayout}>
        <div className={styles.headerBanner}>
          <div className={styles.headerBannerLeft}>
            <div className={styles.headerIconWrap}>
              <TbBellRinging />
            </div>
            <p className={styles.headerSub}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread seller notification${unreadCount > 1 ? 's' : ''}.`
                : unresolvedCount > 0
                  ? `${unresolvedCount} notification${unresolvedCount > 1 ? 's' : ''} still need resolution.`
                  : `You're all caught up.`}
            </p>
          </div>
          <HeaderMenu
            hasUnread={unreadCount > 0}
            hasUnresolved={unresolvedCount > 0}
            hasResolved={resolvedCount > 0}
            hasNotifs={notifications.length > 0}
            onMarkAll={markAllRead}
            onMarkAllResolved={markAllResolved}
            onRequestClearResolved={() => setClearResolvedOpen(true)}
            onRequestClearAll={() => setClearAllOpen(true)}
          />
        </div>

        <div className={styles.filterRow}>
          {SELLER_NOTIFICATION_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
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
              {filtered.map((notif, i) => (
                <NotificationRow
                  key={notif.id}
                  notif={notif}
                  variant="desktop"
                  isLast={i === filtered.length - 1}
                  onMarkRead={markRead}
                  onResolve={resolveOne}
                  onRequestDelete={setDeleteConfirmId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.mobileLayout}>
        <div className={styles.headerBanner}>
          <div className={styles.headerBannerLeft}>
            <div className={styles.headerIconWrap}>
              <TbBellRinging />
            </div>
            <p className={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : `You're all caught up.`}
            </p>
          </div>
          <HeaderMenu
            hasUnread={unreadCount > 0}
            hasUnresolved={unresolvedCount > 0}
            hasResolved={resolvedCount > 0}
            hasNotifs={notifications.length > 0}
            onMarkAll={markAllRead}
            onMarkAllResolved={markAllResolved}
            onRequestClearResolved={() => setClearResolvedOpen(true)}
            onRequestClearAll={() => setClearAllOpen(true)}
          />
        </div>

        <div className={styles.mobileFilterScroll}>
          {SELLER_NOTIFICATION_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
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
            {filtered.map((notif) => (
              <NotificationRow
                key={notif.id}
                notif={notif}
                variant="mobile"
                isLast={false}
                onMarkRead={markRead}
                onResolve={resolveOne}
                onRequestDelete={setDeleteConfirmId}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteConfirmId != null}
        variant="danger"
        title="Delete notification?"
        message="This notification will be removed from your seller inbox."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteOne(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />

      <ConfirmModal
        open={clearResolvedOpen}
        variant="danger"
        title="Clear resolved notifications?"
        message="Resolved seller notifications will be removed from your inbox."
        confirmLabel="Clear resolved"
        cancelLabel="Cancel"
        onCancel={() => setClearResolvedOpen(false)}
        onConfirm={() => {
          clearResolved()
          setClearResolvedOpen(false)
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
