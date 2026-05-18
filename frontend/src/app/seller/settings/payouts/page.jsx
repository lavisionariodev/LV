'use client'

import Link from 'next/link'
import { FiSave } from 'react-icons/fi'
import { TbInfoCircle, TbWallet } from 'react-icons/tb'
import { PAYOUT_METHOD_OPTIONS, SellerPortalSelect, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

function PayoutStatusBanner({ payoutForm, payoutDisbursement }) {
  const method = payoutForm.payoutMethod
  const verificationStatus = String(payoutForm.verificationStatus || 'pending_review').toLowerCase()

  if (method === 'manual') {
    return (
      <div className={styles.payoutNotice} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>
          Manual payout is selected. Automated wallet withdrawals require bank or GCash. Admin will follow your
          instructions for manual transfers.
        </p>
      </div>
    )
  }

  if (verificationStatus === 'pending_review') {
    return (
      <div className={styles.payoutNotice} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>
          Your payout details are pending admin review. You can withdraw from your wallet after approval.
        </p>
      </div>
    )
  }

  if (verificationStatus === 'rejected') {
    return (
      <div className={`${styles.payoutNotice} ${styles.payoutNoticeError}`} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>
          {payoutForm.verificationRejectionReason ||
            'Your payout details were rejected. Update them and save to submit again.'}
        </p>
      </div>
    )
  }

  if (payoutDisbursement && payoutDisbursement.ok === false && payoutDisbursement.error) {
    return (
      <div className={styles.payoutNotice} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>{payoutDisbursement.error}</p>
      </div>
    )
  }

  if (payoutDisbursement?.reason === 'disbursement_disabled') {
    return (
      <div className={styles.payoutNotice} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>
          Automated withdrawals are not enabled on the platform yet. Your details are saved; transfers will run when
          PayMongo disbursement is turned on.
        </p>
      </div>
    )
  }

  if (verificationStatus === 'approved') {
    return (
      <div className={`${styles.payoutNotice} ${styles.payoutNoticeSuccess}`} role="status">
        <TbInfoCircle className={styles.payoutNoticeIcon} size={20} aria-hidden />
        <p className={styles.payoutNoticeText}>Payout details approved. You can withdraw when funds are available.</p>
      </div>
    )
  }

  return null
}

export default function Page() {
  const ctx = useSellerSettings()
  const {
    payoutsTabId,
    payoutsPanelId,
    payoutForm,
    payoutDisbursement,
    onPayoutFieldChange,
    handleSavePayout,
    payoutSaving,
    phBankOptions,
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
              Bank or GCash details used when you withdraw from your seller wallet. Account numbers are verified by
              admin before withdrawals are enabled.
            </p>
          </div>
        </div>
      </div>

      <PayoutStatusBanner payoutForm={payoutForm} payoutDisbursement={payoutDisbursement} />

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
              <span className={styles.label}>Bank</span>
              <SellerPortalSelect
                label="Bank"
                value={payoutForm.bankName}
                options={phBankOptions}
                onChange={(value) => onPayoutFieldChange('bankName', value)}
                placeholder="Select bank"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Account number</span>
              <input
                className={styles.input}
                type="password"
                autoComplete="off"
                value={payoutForm.accountNumber}
                onChange={(e) => onPayoutFieldChange('accountNumber', e.target.value)}
                placeholder={
                  payoutForm.hasAccountNumber && payoutForm.maskedAccountNumber
                    ? payoutForm.maskedAccountNumber
                    : 'Enter account number'
                }
              />
              {payoutForm.hasAccountNumber ? (
                <span className={styles.fieldHint}>Leave blank to keep your current account number.</span>
              ) : null}
            </label>
          </>
        )}
        {payoutForm.payoutMethod === 'gcash' && (
          <>
            <label className={styles.field}>
              <span className={styles.label}>GCash account name</span>
              <input
                className={styles.input}
                value={payoutForm.gcashName}
                onChange={(e) => onPayoutFieldChange('gcashName', e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>GCash number</span>
              <input
                className={styles.input}
                type="password"
                autoComplete="off"
                inputMode="numeric"
                value={payoutForm.gcashNumber}
                onChange={(e) => onPayoutFieldChange('gcashNumber', e.target.value)}
                placeholder={
                  payoutForm.hasGcashNumber && payoutForm.maskedGcashNumber
                    ? payoutForm.maskedGcashNumber
                    : '09XXXXXXXXX'
                }
              />
              {payoutForm.hasGcashNumber ? (
                <span className={styles.fieldHint}>Leave blank to keep your current GCash number.</span>
              ) : (
                <span className={styles.fieldHint}>Philippine mobile format: 09XXXXXXXXX</span>
              )}
            </label>
          </>
        )}
        <label className={styles.field}>
          <span className={styles.label}>Payout email</span>
          <input
            className={styles.input}
            type="email"
            value={payoutForm.payoutEmail}
            onChange={(e) => onPayoutFieldChange('payoutEmail', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            {payoutForm.payoutMethod === 'manual' ? 'Payout instructions' : 'Notes (optional)'}
          </span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={payoutForm.notes}
            onChange={(e) => onPayoutFieldChange('notes', e.target.value)}
            placeholder={
              payoutForm.payoutMethod === 'manual'
                ? 'Describe how you want to receive payouts (required for manual method)'
                : 'Any special instructions for payouts, if needed'
            }
          />
        </label>
        <div className={styles.headActions}>
          <button type="submit" className={styles.primaryBtn} disabled={payoutSaving}>
            <FiSave /> {payoutSaving ? 'Saving...' : 'Save payout settings'}
          </button>
        </div>
      </form>

      <div className={styles.walletCtaBox} aria-label="Seller wallet">
        <p className={styles.walletCtaText}>
          Manage balances, view transaction history, and withdraw funds after admin release.
        </p>
        <Link href="/seller/wallet" className={styles.walletCtaBtn}>
          <TbWallet size={18} aria-hidden />
          Open wallet
        </Link>
      </div>
    </section>
  )
}
