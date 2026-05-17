'use client'

import { useEffect, useMemo, useState } from 'react'
import { FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'
import { DOCUMENT_TYPE_OPTIONS, SellerPortalSelect, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

const ROWS_PER_PAGE = 10

function buildVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return []
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
}

function DocumentsPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1 || totalItems === 0) return null
  const start = (currentPage - 1) * ROWS_PER_PAGE + 1
  const end = Math.min(currentPage * ROWS_PER_PAGE, totalItems)

  return (
    <div className={styles.settingsPagination}>
      <div className={styles.settingsPaginationControls} role="navigation" aria-label="Documents list pagination">
        <button
          type="button"
          className={`${styles.settingsPageBtn} ${currentPage === 1 ? styles.settingsPageBtnDisabled : ''}`}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ‹ Previous
        </button>
        {buildVisiblePages(currentPage, totalPages).map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className={styles.settingsPageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${styles.settingsPageBtn} ${currentPage === p ? styles.settingsPageBtnActive : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={currentPage === p ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${styles.settingsPageBtn} ${currentPage === totalPages ? styles.settingsPageBtnDisabled : ''}`}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next ›
        </button>
      </div>
      <p className={styles.settingsPaginationInfo}>
        Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong> documents
      </p>
    </div>
  )
}

export default function Page() {
  const ctx = useSellerSettings()
  const {
    documentsTabId,
    documentsPanelId,
    documentType,
    setDocumentType,
    documentFileRef,
    handleUploadDocument,
    documentUploading,
    documents,
    handleDeleteDocument,
  } = ctx

  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(documents.length / ROWS_PER_PAGE) || 1
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return documents.slice(start, start + ROWS_PER_PAGE)
  }, [documents, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [documents.length])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <section
      id={documentsPanelId}
      role="tabpanel"
      aria-labelledby={documentsTabId}
      className={`${styles.card} ${styles.full}`}
    >
      <div className={styles.tabDetailHead}>
        <div className={styles.tabDetailHeadRow}>
          <div className={styles.tabDetailHeadText}>
            <h2 className={styles.tabDetailTitle}>Compliance documents</h2>
            <p className={styles.tabDetailSubtitle}>
              Upload permits, IDs, and payout verification files.
            </p>
          </div>
        </div>
      </div>
      <form className={styles.form} onSubmit={handleUploadDocument}>
        <label className={styles.field}>
          <span className={styles.label}>Document type</span>
          <SellerPortalSelect
            label="Document type"
            value={documentType}
            options={DOCUMENT_TYPE_OPTIONS}
            onChange={setDocumentType}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>File</span>
          <input ref={documentFileRef} className={styles.input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" />
        </label>
        <div className={styles.headActions}>
          <button type="submit" className={styles.primaryBtn} disabled={documentUploading}>
            <FaUpload /> {documentUploading ? 'Uploading...' : 'Upload document'}
          </button>
        </div>
      </form>
      <div className={styles.profileDetails} style={{ marginTop: 18 }}>
        {documents.length === 0 ? (
          <p className={styles.loadingText}>No documents uploaded yet.</p>
        ) : (
          <>
            {paginatedDocuments.map((doc) => (
              <div key={doc.id} className={styles.settingsRow}>
                <div className={styles.settingsRowMeta}>
                  <div className={styles.settingsRowTitleRow}>
                    <h3 className={styles.settingsRowTitle}>{doc.displayName}</h3>
                  </div>
                  <p className={styles.settingsRowDesc}>
                    {doc.documentType.replace(/_/g, ' ')} · {doc.status}
                    {doc.status === 'rejected' && doc.rejectionReason
                      ? ` · ${doc.rejectionReason}`
                      : ''}
                  </p>
                </div>
                <div className={`${styles.settingsRowControl} ${styles.headActions}`}>
                  {doc.previewUrl && (
                    <a
                      className={styles.secondaryBtn}
                      href={doc.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                  )}
                  {doc.status !== 'approved' && (
                    <button type="button" className={styles.dangerBtn} onClick={() => handleDeleteDocument(doc.id)}>
                      <TbTrash /> Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <DocumentsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={documents.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </section>
  )
}
