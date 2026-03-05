'use client'

import { useMemo, useState } from 'react'
import { sellerProducts } from '@/data/adminSampleData'

const SELLER_ID = 'SEL-001'

export default function SellerMyServicesPage() {
  const initial = useMemo(
    () => sellerProducts.filter((p) => p.sellerId === SELLER_ID),
    []
  )
  const [services, setServices] = useState(initial)
  const [draft, setDraft] = useState({
    name: '',
    category: '',
    price: '',
    status: 'draft',
    description: '',
  })

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.category.trim()) return
    const price = Number(draft.price) || 0
    setServices((prev) => [
      ...prev,
      {
        id: `LOCAL-${prev.length + 1}`,
        sellerId: SELLER_ID,
        name: draft.name.trim(),
        category: draft.category.trim(),
        price,
        status: draft.status || 'draft',
        description: draft.description.trim(),
      },
    ])
    setDraft({
      name: '',
      category: '',
      price: '',
      status: 'draft',
      description: '',
    })
  }

  const handleDelete = (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  const handleStatusChange = (id, status) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    )
  }

  return (
    <main style={{ padding: '2rem 1.5rem', maxWidth: 1040, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Services</h1>
        <p style={{ fontSize: '0.95rem', color: '#4b5563' }}>
          Manage the funeral services and packages you offer on La Visionario.
        </p>
      </header>

      <section
        style={{
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Add Service</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <input
            type="text"
            placeholder="Service name"
            style={inputStyle}
            value={draft.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
          <input
            type="text"
            placeholder="Category"
            style={inputStyle}
            value={draft.category}
            onChange={(e) => handleChange('category', e.target.value)}
          />
          <input
            type="number"
            placeholder="Price (₱)"
            style={inputStyle}
            value={draft.price}
            onChange={(e) => handleChange('price', e.target.value)}
          />
          <select
            style={inputStyle}
            value={draft.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <textarea
          placeholder="Description"
          rows={3}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
        <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
          <button
            type="button"
            onClick={handleAdd}
            style={primaryButtonStyle}
          >
            Add Service
          </button>
        </div>
      </section>

      <section
        style={{
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#ffffff',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Service list</h2>
        {services.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            You haven&apos;t added any services yet. Start by creating your first listing above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {services.map((service) => (
              <div
                key={service.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.75rem 0',
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{service.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {service.category} • ₱{Number(service.price).toLocaleString('en-PH')}
                  </div>
                  {service.description && (
                    <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.25rem' }}>
                      {service.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', minWidth: 160 }}>
                  <select
                    value={service.status}
                    onChange={(e) => handleStatusChange(service.id, e.target.value)}
                    style={{
                      ...inputStyle,
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#b91c1c',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const inputStyle = {
  width: '100%',
  borderRadius: '0.5rem',
  border: '1px solid #e5e7eb',
  padding: '0.45rem 0.6rem',
  fontSize: '0.85rem',
  outline: 'none',
}

const primaryButtonStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.4rem 1.1rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  backgroundColor: '#204F38',
  color: '#ffffff',
  cursor: 'pointer',
}

