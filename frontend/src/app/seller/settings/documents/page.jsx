'use client'

import { FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'
import { DOCUMENT_TYPE_OPTIONS, SellerPortalSelect, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

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
                documents.map((doc) => (
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
                ))
              )}
            </div>
          </section>

  )
}
