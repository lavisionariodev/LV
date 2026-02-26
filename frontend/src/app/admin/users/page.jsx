'use client'

import { useMemo, useState } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './users.module.css'
import { users as initialUsers } from '@/data/adminSampleData'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
]

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return initialUsers.filter((user) => {
      if (statusFilter !== 'all' && user.status !== statusFilter) return false
      if (!search.trim()) return true

      const q = search.trim().toLowerCase()
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
      )
    })
  }, [statusFilter, search])

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Users</p>

          <div className={styles.toolbar}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={layoutStyles.smallBtn}
              aria-label="Filter users by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search by name, email, or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${layoutStyles.searchInput} ${styles.searchInputWrap}`}
            />
          </div>
        </div>

        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>User</span>
            <span>Contact</span>
            <span>Role</span>
            <span>Status</span>
          </div>

          {filtered.map((user) => (
            <div className={layoutStyles.row} key={user.id}>
              <span>
                <strong>{user.name}</strong>
                <br />
                <span className={styles.meta}>ID: {user.id}</span>
              </span>

              <span>
                <span className={styles.email}>{user.email}</span>
                <br />
                <span className={styles.meta}>
                  Joined {user.joinedAt}
                </span>
              </span>

              <span>
                <span className={layoutStyles.badge}>{user.role}</span>
              </span>

              <span>
                <span className={layoutStyles.badge}>{user.status}</span>
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              No users match the current filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

