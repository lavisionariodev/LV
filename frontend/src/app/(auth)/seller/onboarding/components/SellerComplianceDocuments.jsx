'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'

const DOCUMENT_TYPES = [
  { value: 'business_permit', label: 'Business permit' },
  { value: 'valid_id', label: 'Valid ID' },
  { value: 'bank_proof', label: 'Bank proof' },
  { value: 'other', label: 'Other' },
]

export default function SellerComplianceDocuments({
  className = '',
  formClassName = '',
  fieldClassName = '',
  labelClassName = '',
  inputClassName = '',
  textareaClassName = '',
  primaryBtnClassName = '',
  secondaryBtnClassName = '',
  dangerBtnClassName = '',
  listClassName = '',
  rowClassName = '',
  rowTitleClassName = '',
  rowDescClassName = '',
  emptyClassName = '',
  actionsClassName = '',
  disabled = false,
  onToast,
}) {
  const fileRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [documentType, setDocumentType] = useState('business_permit')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const notify = useCallback(
    (type, message) => {
      if (typeof onToast === 'function') onToast(type, message)
    },
    [onToast],
  )

  const loadDocuments = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/seller/documents', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setDocuments([])
        setError(body?.error || 'Could not load documents.')
        return
      }
      setDocuments(Array.isArray(body?.documents) ? body.documents : [])
    } catch {
      setDocuments([])
      setError('Could not load documents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleUpload = async (event) => {
    event.preventDefault()
    if (disabled || uploading) return
    const file = fileRef.current?.files?.[0]
    if (!file) {
      notify('error', 'Choose a file to upload.')
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('documentType', documentType)
      form.append('file', file)
      const res = await fetch('/api/seller/documents', { method: 'POST', body: form })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to upload document.')
      notify('success', 'Document uploaded for review.')
      if (fileRef.current) fileRef.current.value = ''
      await loadDocuments()
    } catch (err) {
      notify('error', err?.message || 'Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    if (disabled) return
    try {
      const res = await fetch(`/api/seller/documents?id=${encodeURIComponent(docId)}`, { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to remove document.')
      notify('success', 'Document removed.')
      await loadDocuments()
    } catch (err) {
      notify('error', err?.message || 'Failed to remove document.')
    }
  }

  return (
    <div className={className}>
      <form className={formClassName} onSubmit={handleUpload}>
        <label className={fieldClassName}>
          <span className={labelClassName}>Document type</span>
          <select
            className={inputClassName}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={disabled || uploading}
          >
            {DOCUMENT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClassName}>
          <span className={labelClassName}>File</span>
          <input
            ref={fileRef}
            className={inputClassName}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            disabled={disabled || uploading}
          />
        </label>
        <div className={actionsClassName}>
          <button type="submit" className={primaryBtnClassName} disabled={disabled || uploading}>
            <FaUpload /> {uploading ? 'Uploading…' : 'Upload document'}
          </button>
        </div>
      </form>

      <div className={listClassName}>
        {loading ? (
          <p className={emptyClassName}>Loading documents…</p>
        ) : error ? (
          <p className={emptyClassName}>{error}</p>
        ) : documents.length === 0 ? (
          <p className={emptyClassName}>No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={rowClassName}>
              <div>
                <h3 className={rowTitleClassName}>{doc.displayName}</h3>
                <p className={rowDescClassName}>
                  {String(doc.documentType || '').replace(/_/g, ' ')} · {doc.status}
                </p>
              </div>
              <div className={actionsClassName}>
                {doc.previewUrl ? (
                  <a className={secondaryBtnClassName} href={doc.previewUrl} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                ) : null}
                {doc.status !== 'approved' ? (
                  <button type="button" className={dangerBtnClassName} onClick={() => handleDelete(doc.id)} disabled={disabled}>
                    <TbTrash /> Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
