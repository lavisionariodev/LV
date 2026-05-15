'use client'

import { FiSave } from 'react-icons/fi'
import SellerWithdrawPanel from '@/app/seller/analytics/SellerWithdrawPanel'
import { PAYOUT_METHOD_OPTIONS, SellerPortalSelect, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

export default function Page() {
  const ctx = useSellerSettings()
  const {
    payoutsTabId,
    payoutsPanelId,
    payoutForm,
    onPayoutFieldChange,
    handleSavePayout,
    payoutSaving,
  } = ctx

  return (
                  <section
            id={payoutsPanelId}
            role="tabpanel"
            aria-labelledby={payoutsTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Payout settings</h2>
                  <p className={styles.tabDetailSubtitle}>
                    Bank or GCash details used when you withdraw from your seller wallet.
                  </p>
                </div>
              </div>
            </div>
            <form className={styles.form} onSubmit={handleSavePayout}>
              <div className={styles.payoutFieldRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Payout method</span>
                  <SellerPortalSelect
                    label="Payout method"
                    value={payoutForm.payoutMethod}
                    options={PAYOUT_METHOD_OPTIONS}
                    onChange={(value) => onPayoutFieldChange('payoutMethod', value)}
                  />
                </label>
                {payoutForm.payoutMethod === 'bank' ? (
                  <label className={styles.field}>
                    <span className={styles.label}>Account holder name</span>
                    <input
                      className={styles.input}
                      value={payoutForm.accountHolderName}
                      onChange={(e) => onPayoutFieldChange('accountHolderName', e.target.value)}
                    />
                  </label>
                ) : null}
              </div>
              {payoutForm.payoutMethod === 'bank' && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>Bank name</span>
                    <input className={styles.input} value={payoutForm.bankName} onChange={(e) => onPayoutFieldChange('bankName', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Account number</span>
                    <input
                      className={styles.input}
                      type="password"
                      autoComplete="off"
                      value={payoutForm.accountNumber}
                      onChange={(e) => onPayoutFieldChange('accountNumber', e.target.value)}
                    />
                  </label>
                </>
              )}
              {payoutForm.payoutMethod === 'gcash' && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>GCash account name</span>
                    <input className={styles.input} value={payoutForm.gcashName} onChange={(e) => onPayoutFieldChange('gcashName', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>GCash number</span>
                    <input
                      className={styles.input}
                      type="password"
                      autoComplete="off"
                      value={payoutForm.gcashNumber}
                      onChange={(e) => onPayoutFieldChange('gcashNumber', e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className={styles.field}>
                <span className={styles.label}>Payout email</span>
                <input className={styles.input} type="email" value={payoutForm.payoutEmail} onChange={(e) => onPayoutFieldChange('payoutEmail', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Admin notes</span>
                <textarea className={`${styles.input} ${styles.textarea}`} value={payoutForm.notes} onChange={(e) => onPayoutFieldChange('notes', e.target.value)} />
              </label>
              <div className={styles.headActions}>
                <button type="submit" className={styles.primaryBtn} disabled={payoutSaving}>
                  <FiSave /> {payoutSaving ? 'Saving...' : 'Save payout settings'}
                </button>
              </div>
            </form>
            <SellerWithdrawPanel className={styles.payoutRequestsEmbed} />
          </section>

  )
}
