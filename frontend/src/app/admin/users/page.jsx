'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiRotateCcw } from 'react-icons/fi'
import styles from './users.module.css'
import { supabase } from '@/lib/supabase/client'
import { Dropdown } from '@/components/ui'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
]

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

const AVATAR_COLORS = [
  { bg: '#e2e8f0', text: '#334155' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffedd5', text: '#9a3412' },
]

function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name, src }) {
  const [imgError, setImgError] = useState(false)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        className={styles.avatar}
        onError={() => setImgError(true)}
      />
    )
  }

  if (name) {
    const initials = getInitials(name)
    const { bg, text } = avatarColor(name)
    return (
      <div className={styles.avatar} style={{ background: bg, color: text }}>
        {initials}
      </div>
    )
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarDefault}`}>
      <svg viewBox="0 0 24 24" fill="none" className={styles.avatarIcon}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRows, setSelectedRows] = useState(() => new Set())

  useEffect(() => {
    let isMounted = true

    async function loadBuyers() {
      setIsLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          created_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('role', 'buyer')
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (loadError) {
        console.error('Failed to load buyers from Supabase:', loadError.message)
        setError(loadError)
        setUsers([])
        setIsLoading(false)
        return
      }

      const next = (data || []).map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const name = profile?.full_name || row.email || '—'
        const joinedAt = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : '—'

        return {
          id: row.id,
          name,
          email: row.email || '—',
          role: row.role || 'buyer',
          joinedAt,
          status: 'active',
          avatarUrl: profile?.avatar_url || null,
        }
      })

      setUsers(next)
      setIsLoading(false)
    }

    loadBuyers()

    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
      )
    })
  }, [users, search, statusFilter])

  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              <div className={styles.toolbarSearchWrap}>
                <Icon.Search />
                <input
                  className={styles.toolbarSearchInput}
                  type="search"
                  placeholder="Search name, email, or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Account status"
                options={STATUS_FILTER_OPTIONS}
                placeholder="All statuses"
              />
            </div>

            <button
              type="button"
              className={styles.toolbarClearAll}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
              Clear All
            </button>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading users…</p>
            </div>
          )}

          {error && !isLoading && (
            <p className={styles.loadError}>
              Could not load users from Supabase. Check RLS policies for `users` / `profiles`.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colUser} />
                <col className={styles.colEmail} />
                <col className={styles.colJoined} />
                <col className={styles.colRole} />
                <col className={styles.colStatus} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((u) => selectedRows.has(u.id))
                      }
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) {
                            filtered.forEach((u) => next.add(u.id))
                          } else {
                            filtered.forEach((u) => next.delete(u.id))
                          }
                          return next
                        })
                      }}
                      aria-label="Select all users in view"
                    />
                  </th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className={styles.primaryRow}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.rowCheckbox}
                        checked={selectedRows.has(user.id)}
                        onChange={(e) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(user.id)
                            else next.delete(user.id)
                            return next
                          })
                        }}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>

                    <td>
                      <div className={styles.userCell}>
                        <Avatar name={user.name} src={user.avatarUrl} />
                        <div className={styles.userText}>
                          <p className={styles.userName}>{user.name}</p>
                          <p className={styles.userId} title={user.id}>
                            {user.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.email} title={user.email}>
                        {user.email}
                      </span>
                    </td>

                    <td>
                      <span className={styles.meta}>{user.joinedAt}</span>
                    </td>

                    <td>
                      <span className={styles.badge}>{user.role}</span>
                    </td>

                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${user.status}`]}`}>
                        <span className={styles.statusDot} />
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.emptyTitle}>No users found</p>
              <p className={styles.emptyText}>No users match your current filters.</p>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { clearFilters() }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {!isLoading && !error && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users
          </div>
        )}
      </section>
    </div>
  )
}
