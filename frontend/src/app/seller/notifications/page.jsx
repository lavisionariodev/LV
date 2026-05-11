'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TbAlertTriangle,
  TbBell,
  TbCircleCheck,
  TbExternalLink,
  TbSpeakerphone,
  TbX,
} from 'react-icons/tb'
import { supabase } from '@/lib/supabase/client'
import styles from './notifications.module.css'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'system', label: 'System' },
  { key: 'marketing', label: 'Marketing' },
]

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'priority', label: 'Priority' },
]

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
]

const TYPE_OPTIONS = [
  { id: 'all', label: 'All types' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'payment', label: 'Payments' },
  { id: 'system', label: 'System' },
  { id: 'marketing', label: 'Marketing' },
]

function relativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day > 1 ? 's' : ''} ago`
}

function buildInsight(type, payload) {
  if (type === 'marketing') {
    const convDrop = payload.conversionDropPct
    if (convDrop) return `Conversion rate is down by ${convDrop}% against target, which triggered this alert.`
    return 'Marketing performance moved outside its expected threshold and triggered an automated alert.'
  }
  if (type === 'alerts') {
    if (payload.conflictField) return `A conflict was detected in ${payload.conflictField}, requiring manual review.`
    return 'System validation detected a critical mismatch that needs action.'
  }
  if (type === 'system') {
    if (payload.payoutStatus) return `Payout status changed to ${payload.payoutStatus}, so this system update was generated.`
    return 'A platform-level system event triggered this notification.'
  }
  return 'An automated rule detected a condition that requires your attention.'
}

function getContextActions(notification) {
  const payload = notification?.payload || {}
  if (notification?.type === 'marketing') {
    return [
      { id: 'adjust-budget', label: 'Adjust Budget', href: '/seller/marketing/centre?tab=campaigns' },
      { id: 'pause-campaign', label: 'Pause Campaign', href: '/seller/marketing/centre?tab=campaigns' },
      payload.voucherId
        ? { id: 'edit-voucher', label: 'Edit Voucher', href: '/seller/marketing/centre?tab=vouchers' }
        : null,
    ].filter(Boolean)
  }

  if (notification?.type === 'alerts') {
    return [{ id: 'fix-conflict', label: 'Fix Conflict', href: '/seller/marketing/centre?tab=discounts' }]
  }

  return [{ id: 'view-module', label: 'Open Relevant Module', href: '/seller/marketing/centre' }]
}

function mapUserNotificationsFromApi(rows) {
  const list = Array.isArray(rows) ? rows : []
  return list.map((r) => ({
    id: String(r.id),
    title: r.title || 'Notification',
    body: r.body || '',
    type: String(r.type || 'system'),
    priority: 'low',
    timestampLabel: relativeTime(r.createdAt),
    createdAt: r.createdAt,
    read: Boolean(r.readAt),
    resolved: false,
    payload: r.metadata && typeof r.metadata === 'object' ? r.metadata : {},
  }))
}

function TabsDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  const selectedLabel = TABS.find((t) => t.key === value)?.label || 'All'

  return (
    <div
      className={`${styles.tabDropdownWrap} ${open ? styles.tabDropdownOpen : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={styles.tabDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.tabDropdownLabel}>{selectedLabel}</span>
        <span className={styles.tabDropdownChevron} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.tabDropdownPanel} role="listbox" aria-label="Notification category">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="option"
              aria-selected={value === t.key}
              className={`${styles.tabDropdownOption} ${value === t.key ? styles.tabDropdownOptionSelected : ''}`}
              onClick={() => {
                onChange(t.key)
                setOpen(false)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterDropdown({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  const selectedLabel = options.find((opt) => opt.id === value)?.label || label || ''

  return (
    <div
      className={`${styles.tabDropdownWrap} ${open ? styles.tabDropdownOpen : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={styles.tabDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label} filter` : 'Filter'}
      >
        <span className={styles.tabDropdownLabel}>{selectedLabel}</span>
        <span className={styles.tabDropdownChevron} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.tabDropdownPanel} role="listbox" aria-label={`${label ?? 'Filter'} options`}>
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={value === opt.id}
              className={`${styles.tabDropdownOption} ${value === opt.id ? styles.tabDropdownOptionSelected : ''}`}
              onClick={() => {
                onChange(opt.id)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BulkActionsDropdown({ onMarkAllRead, onClearResolved }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  return (
    <div
      className={`${styles.bulkDropdownWrap} ${open ? styles.bulkDropdownOpen : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={styles.bulkDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.bulkDropdownLabel}>Bulk Actions</span>
        <span className={styles.bulkDropdownChevron} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.bulkDropdownPanel} role="menu" aria-label="Bulk actions">
          <button
            type="button"
            role="menuitem"
            className={styles.bulkDropdownOption}
            onClick={() => {
              onMarkAllRead()
              setOpen(false)
            }}
          >
            Mark All as Read
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.bulkDropdownOption}
            onClick={() => {
              onClearResolved()
              setOpen(false)
            }}
          >
            Clear Resolved
          </button>
        </div>
      )}
    </div>
  )
}

export default function SellerNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [detailsData, setDetailsData] = useState(null)

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
      if (activeTab === 'alerts') {
        data = data.filter(
          (n) =>
            n.type === 'alerts' ||
            String(n.type).startsWith('service') ||
            n.type === 'reminder' ||
            n.type === 'listing_approval' ||
            n.type === 'listing_rejected' ||
            n.type === 'payment_refund',
        )
      } else {
        data = data.filter((n) => n.type === activeTab)
      }
    }

    if (statusFilter === 'read') data = data.filter((n) => n.read)
    if (statusFilter === 'unread') data = data.filter((n) => !n.read)

    if (typeFilter !== 'all') {
      if (typeFilter === 'payment') {
        data = data.filter((n) => String(n.type).startsWith('payment'))
      } else {
        data = data.filter((n) => n.type === typeFilter)
      }
    }

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

  useEffect(() => {
    let cancelled = false
    let channel = null

    async function refreshFromApi() {
      try {
        const res = await fetch('/api/notifications?limit=100', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load')
        if (!cancelled) {
          setNotifications(mapUserNotificationsFromApi(body?.notifications))
        }
      } catch {
        // ignore load errors
      }
    }

    async function setup() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const uid = session?.user?.id
      await refreshFromApi()

      if (!uid || cancelled) return

      channel = supabase
        .channel(`user_notifications:${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            refreshFromApi()
          },
        )
        .subscribe()
    }

    setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const selectedNotification = useMemo(
    () => notifications.find((n) => String(n.id) === String(selectedId)) || null,
    [notifications, selectedId],
  )

  const fetchNotificationDetails = async (id) => {
    setDetailsLoading(true)
    setDetailsError('')
    const fallback = notifications.find((n) => String(n.id) === String(id)) || null
    if (fallback) {
      setDetailsData(fallback)
      setDetailsLoading(false)
      return
    }
    setDetailsError('Notification not found.')
    setDetailsData(null)
    setDetailsLoading(false)
  }

  const openDetails = (id) => {
    setSelectedId(String(id))
    fetchNotificationDetails(id)
  }

  const closeDetails = () => {
    setSelectedId(null)
    setDetailsData(null)
    setDetailsError('')
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearResolved = async () => {
    setNotifications((prev) => prev.filter((n) => !n.resolved))
  }

  const markAsRead = async (id) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: String(id) }),
    })
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const resolveItem = async (id) => {
    await markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, resolved: true, read: true } : n)))
  }

  const dismissItem = async (id) => {
    await markAsRead(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (selectedId && String(selectedId) === String(id)) closeDetails()
  }

  return (
    <div className={styles.pageWrap}>
      <section className={styles.overviewSection}>
        <div className={styles.overviewTopRow}>
          <div className={styles.filtersBar}>
            <div className={styles.panelTopRow}>
              <div className={styles.filtersRight}>
                <label className={styles.controlGroup}>
                  <span className={styles.controlLabel}>Actions</span>
                  <BulkActionsDropdown onMarkAllRead={markAllAsRead} onClearResolved={clearResolved} />
                </label>
                <label className={styles.controlGroup}>
                  <span className={styles.controlLabel}>Category</span>
                  <TabsDropdown value={activeTab} onChange={setActiveTab} />
                </label>

                <div className={styles.controlRow}>
                  <label className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Sort by</span>
                    <FilterDropdown
                      value={sortBy}
                      onChange={setSortBy}
                      label="Sort by"
                      options={SORT_OPTIONS}
                    />
                  </label>

                  <label className={styles.controlGroup}>
                    <span className={styles.controlLabel}>Status</span>
                    <FilterDropdown
                      value={statusFilter}
                      onChange={setStatusFilter}
                      label="Status"
                      options={STATUS_OPTIONS}
                    />
                  </label>

                  <label className={`${styles.controlGroup} ${styles.controlGroupFull}`}>
                    <span className={styles.controlLabel}>Type</span>
                    <FilterDropdown
                      value={typeFilter}
                      onChange={setTypeFilter}
                      label="Type"
                      options={TYPE_OPTIONS}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.overviewGrid}>
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
        </div>
      </section>

      <section className={styles.panel}>

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
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDetails}`}
                        onClick={() => openDetails(item.id)}
                      >
                        View Details
                      </button>
                      {!item.resolved && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnResolve}`}
                          onClick={() => resolveItem(item.id)}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>

      {selectedId && (
        <div className={styles.detailsOverlay} role="dialog" aria-modal="true" onClick={closeDetails}>
          <aside className={styles.detailsDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <div>
                <div className={styles.detailsTitleRow}>
                  <h3 className={styles.detailsTitle}>
                    {detailsData?.title || selectedNotification?.title || 'Notification details'}
                  </h3>
                  <span className={styles.detailsPriorityBadge}>
                    {(detailsData?.priority || selectedNotification?.priority || 'low').toUpperCase()}
                  </span>
                </div>
              </div>
              <button type="button" className={styles.detailsClose} onClick={closeDetails} aria-label="Close">
                <TbX size={18} />
              </button>
            </div>

            <div className={styles.detailsBody}>
              {detailsLoading ? (
                <div
                  className={styles.notifDetailsSkRoot}
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  aria-label="Loading notification details"
                >
                  <div className={styles.notifDetailsSkPanel} aria-hidden>
                    <span className={styles.notifDetailsSkBar} style={{ width: '100%', height: 13 }} />
                    <span className={styles.notifDetailsSkBar} style={{ width: '92%', height: 11 }} />
                    <span className={styles.notifDetailsSkBar} style={{ width: '78%', height: 11 }} />
                  </div>
                  <div className={styles.notifDetailsSkPanel} aria-hidden>
                    <span className={styles.notifDetailsSkBar} style={{ width: '42%', height: 10, marginBottom: 2 }} />
                    <span className={styles.notifDetailsSkBar} style={{ width: '100%', height: 10 }} />
                    <span className={styles.notifDetailsSkBar} style={{ width: '96%', height: 10 }} />
                    <span className={styles.notifDetailsSkBar} style={{ width: '88%', height: 10 }} />
                  </div>
                  <div className={styles.notifDetailsSkGrid} aria-hidden>
                    {[0, 1, 2, 3].map((k) => (
                      <div key={k} className={styles.notifDetailsSkGridCell}>
                        <span className={styles.notifDetailsSkBar} style={{ width: '45%', height: 9 }} />
                        <span className={styles.notifDetailsSkBar} style={{ width: '88%', height: 10 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {!detailsLoading ? (
                <>
                  {detailsError ? <p className={styles.detailsError}>{detailsError}</p> : null}

                  <div className={styles.detailsSection}>
                    <div className={styles.detailsSectionTitle}>Expanded explanation</div>
                    <p className={styles.detailsText}>
                      {detailsData?.body || selectedNotification?.body || 'No expanded details available.'}
                    </p>
                  </div>

                  <div className={styles.detailsSection}>
                    <div className={styles.detailsSectionTitle}>System-generated insight</div>
                    <p className={styles.detailsText}>
                      {buildInsight(
                        detailsData?.type || selectedNotification?.type,
                        detailsData?.payload || selectedNotification?.payload || {},
                      )}
                    </p>
                  </div>

                  <div className={styles.detailsSection}>
                    <div className={styles.detailsSectionTitle}>Key details</div>
                    <div className={styles.detailsGrid}>
                      {Object.entries(detailsData?.payload || selectedNotification?.payload || {})
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key} className={styles.detailsItem}>
                            <span className={styles.detailsKey}>{key}</span>
                            <span className={styles.detailsVal}>{String(value)}</span>
                          </div>
                        ))}
                      {Object.keys(detailsData?.payload || selectedNotification?.payload || {}).length === 0 && (
                        <div className={styles.detailsEmpty}>No additional payload details found.</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailsSection}>
                    <div className={styles.detailsSectionTitle}>Metadata</div>
                    <div className={styles.metaRow}>
                      <span className={`${styles.metaChip} ${styles.metaChipTime}`}>
                        Time: {detailsData?.timestampLabel || selectedNotification?.timestampLabel || '—'}
                      </span>
                      <span className={`${styles.metaChip} ${styles.metaChipPriority}`}>
                        Priority: {detailsData?.priority || selectedNotification?.priority || 'low'}
                      </span>
                      <span className={`${styles.metaChip} ${styles.metaChipStatus}`}>
                        Status: {(detailsData?.read ?? selectedNotification?.read) ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailsSection}>
                    <div className={styles.detailsSectionTitle}>Context actions</div>
                    <div className={styles.contextActions}>
                      {getContextActions(detailsData || selectedNotification || {}).map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDetails}`}
                          onClick={() => router.push(action.href)}
                        >
                          {action.label}
                          <TbExternalLink size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className={styles.detailsFooter}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnResolve}`}
                onClick={() => resolveItem(String(selectedId))}
              >
                Resolve
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnRead}`}
                onClick={() => markAsRead(String(selectedId))}
              >
                Mark as Read
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDismiss}`}
                onClick={() => dismissItem(String(selectedId))}
              >
                Dismiss
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function getTypeIcon(type) {
  const t = String(type || '')
  if (t === 'alerts' || t === 'service_alert') return TbAlertTriangle
  if (t === 'marketing') return TbSpeakerphone
  if (t.startsWith('payment')) return TbBell
  if (t.startsWith('service')) return TbBell
  if (t === 'listing_approval' || t === 'listing_rejected') return TbBell
  if (t === 'reminder') return TbBell
  return TbBell
}

