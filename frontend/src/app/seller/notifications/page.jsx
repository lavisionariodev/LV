'use client'

import { useMemo } from 'react'
import layoutStyles from '../seller.module.css'

const MOCK_NOTIFICATIONS = [
  {
    id: 'N1',
    date: 'Today',
    title: 'New booking request',
    body: 'You received a new booking request for Memorial Floral Package A.',
    type: 'booking',
    read: false,
  },
  {
    id: 'N2',
    date: 'Yesterday',
    title: 'Payout update',
    body: 'Payout for TXN-003 has been transferred to your linked account.',
    type: 'payout',
    read: true,
  },
  {
    id: 'N3',
    date: 'This week',
    title: 'Account under review',
    body: 'Our team is currently reviewing your submitted business documents.',
    type: 'admin',
    read: true,
  },
]

export default function SellerNotificationsPage() {
  const groups = useMemo(() => {
    const byDate = new Map()
    for (const n of MOCK_NOTIFICATIONS) {
      if (!byDate.has(n.date)) byDate.set(n.date, [])
      byDate.get(n.date).push(n)
    }
    return Array.from(byDate.entries())
  }, [])

  return (
    <div className={layoutStyles.pageWrap}>
      <header className={layoutStyles.pageHeader}>
        <h1 className={layoutStyles.pageTitle}>Notifications</h1>
        <p className={layoutStyles.pageSubtitle}>
          Booking alerts, payout updates, and important messages from La Visionario.
        </p>
      </header>

      <section className={layoutStyles.panel}>
        {groups.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            You don&apos;t have any notifications yet.
          </p>
        ) : (
          groups.map(([date, items]) => (
            <div key={date} style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  fontWeight: 500,
                  marginBottom: '0.5rem',
                }}
              >
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((n) => (
                  <article
                    key={n.id}
                    style={{
                      borderRadius: '0.5rem',
                      padding: '0.75rem 0.9rem',
                      backgroundColor: n.read ? '#f9fafb' : '#e0f2fe',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{n.title}</h2>
                      <span style={badgeStyle(n.type)}>{n.type}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>{n.body}</p>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function badgeStyle(type) {
  let background = '#e5e7eb'
  let color = '#374151'

  if (type === 'booking') {
    background = '#dcfce7'
    color = '#166534'
  } else if (type === 'payout') {
    background = '#fef3c7'
    color = '#92400e'
  } else if (type === 'admin') {
    background = '#e0f2fe'
    color = '#075985'
  }

  return {
    fontSize: '0.7rem',
    padding: '0.15rem 0.45rem',
    borderRadius: '999px',
    textTransform: 'capitalize',
    backgroundColor: background,
    color,
  }
}

