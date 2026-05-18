'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'
import { FiEdit, FiPlus, FiSave } from 'react-icons/fi'
import { MdErrorOutline } from 'react-icons/md'
import { SELLER_BUSINESS_TYPE_OTHER, normalizeSellerSpecialties } from '@/lib/sellers/client'
import {
  MAX_MB,
  SellerPortalSelect,
  SHOP_BUSINESS_TYPE_OPTIONS,
  shopStatusPillClass,
  specialtiesFormStringToLines,
  useSellerSettings,
} from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

export default function Page() {
  const ctx = useSellerSettings()
  const {
    shopTabId,
    shopPanelId,
    profile,
    seller,
    isEditingShop,
    onCancelShopEdit,
    onClickEditSaveShop,
    shopSaving,
    canEditShop,
    shopSubTab,
    setShopSubTab,
    shopForm,
    onShopFieldChange,
    onBusinessTypeChoiceChange,
    coverFileRef,
    onPickShopCover,
    onRemoveShopCover,
    coverLoading,
    shopId,
  } = ctx

  return (
                  <section
            id={shopPanelId}
            role="tabpanel"
            aria-labelledby={shopTabId}
            className={`${styles.card} ${styles.full}`}
          >
          <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Shop information</h2>
                <p className={styles.tabDetailSubtitle}>
                  Manage your public shop profile.
                  {profile?.id ? (
                    <>
                      {' '}
                      <Link href={`/seller-profile?seller=${encodeURIComponent(profile.id)}`} className={styles.inlineLink}>
                        View public shop
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <div className={styles.headActions}>
                {isEditingShop && (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={onCancelShopEdit}
                    disabled={shopSaving}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={onClickEditSaveShop}
                  disabled={shopSaving || !canEditShop}
                >
                  {isEditingShop ? (
                    <>
                      <FiSave /> {shopSaving ? 'Saving…' : 'Save Changes'}
                    </>
                  ) : (
                    <>
                      <FiEdit /> Edit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {!seller && (
            <p className={styles.shopHelper}>
              Shop details are not saved yet. Enter them here or finish{' '}
              <Link href="/seller/onboarding" className={styles.inlineLink}>
                onboarding
              </Link>
              .
            </p>
          )}

          {seller && (
            <div className={styles.shopStatusRow}>
              <span className={styles.shopStatusLabel}>Account status</span>
              <span className={`${styles.statusPill} ${shopStatusPillClass(seller.status)}`}>
                {seller.status || '—'}
              </span>
            </div>
          )}

          {!canEditShop && (
            <div className={styles.msgError} role="status">
              <MdErrorOutline aria-hidden />
              <span>Account suspended. Contact support to edit shop details.</span>
            </div>
          )}

          <div className={styles.shopSubTabsShell}>
            <nav className={styles.shopSubTabBar} aria-label="Shop information categories">
              {[
                { id: 'storefront', label: 'Storefront' },
                { id: 'business', label: 'Business details' },
                { id: 'publicContact', label: 'Public contact' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.shopSubTab} ${shopSubTab === t.id ? styles.shopSubTabActive : ''}`}
                  onClick={() => setShopSubTab(t.id)}
                  aria-current={shopSubTab === t.id ? 'page' : undefined}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.shopBody}>
            {shopSubTab === 'storefront' && (
              <>
                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Shop identity</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('business')} className={styles.shopGridLabel}>
                        Shop name <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('business')}
                        value={shopForm.businessName}
                        onChange={(e) => onShopFieldChange('businessName', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. Peaceful Rest Funeral Home"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('username')} className={styles.shopGridLabel}>
                        Username
                      </label>
                      <input
                        id={shopId('username')}
                        value={shopForm.shopUsername}
                        onChange={(e) => onShopFieldChange('shopUsername', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="your_shop_handle"
                        autoComplete="nickname"
                        spellCheck={false}
                      />
                      <p className={styles.shopGridHint}>
                        Public @handle. Letters, numbers, and underscores; 3-30 characters.
                      </p>
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('started')} className={styles.shopGridLabel}>
                        Operating since <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('started')}
                        type="date"
                        value={shopForm.businessStartedAt}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onShopFieldChange('businessStartedAt', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <p className={styles.shopGridHint}>Shown on your public profile.</p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('tagline')} className={styles.shopGridLabel}>
                        Shop tagline
                      </label>
                      <textarea
                        id={shopId('tagline')}
                        rows={3}
                        value={shopForm.shopTagline}
                        onChange={(e) => onShopFieldChange('shopTagline', e.target.value)}
                        className={`${styles.input} ${styles.textarea} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Short line under your shop stats"
                        maxLength={500}
                      />
                      <p className={styles.shopGridHint}>Max 500 characters.</p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('turnaround')} className={styles.shopGridLabel}>
                        Response time
                      </label>
                      <input
                        id={shopId('turnaround')}
                        type="text"
                        value={shopForm.shopTurnaround}
                        onChange={(e) => onShopFieldChange('shopTurnaround', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder='e.g. "Within 24 hours"'
                        maxLength={160}
                      />
                      <p className={styles.shopGridHint}>Optional average reply time.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Type and specialties</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('biz-type')} className={styles.shopGridLabel}>
                        Business type
                      </label>
                      <SellerPortalSelect
                        label="Business type"
                        value={shopForm.shopBusinessTypeChoice}
                        options={SHOP_BUSINESS_TYPE_OPTIONS}
                        onChange={onBusinessTypeChoiceChange}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Not set (optional)"
                      />
                      {shopForm.shopBusinessTypeChoice === SELLER_BUSINESS_TYPE_OTHER && (
                        <div className={styles.businessTypeOtherWrap}>
                          <input
                            id={shopId('biz-type-other')}
                            aria-label="Specify your business type"
                            value={shopForm.shopBusinessTypeOtherSpecify}
                            onChange={(e) =>
                              onShopFieldChange('shopBusinessTypeOtherSpecify', e.target.value)
                            }
                            className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                            disabled={!isEditingShop || !canEditShop}
                            placeholder="Describe your business type"
                            maxLength={80}
                            autoComplete="off"
                          />
                        </div>
                      )}
                      <p className={styles.shopGridHint}>Shown in the Partners directory.</p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <span id={shopId('specialties-label')} className={styles.shopGridLabel}>
                        Specialties
                      </span>
                      <div
                        className={styles.shopSpecialtyList}
                        role="group"
                        aria-labelledby={shopId('specialties-label')}
                      >
                        <div className={styles.shopSpecialtyGrid}>
                        {specialtiesFormStringToLines(shopForm.shopSpecialties).map((line, index) => (
                          <div key={`spec-${index}`} className={styles.shopSpecialtyCell}>
                            <div className={styles.shopSpecialtyRow}>
                            <input
                              type="text"
                              id={index === 0 ? shopId('specialties') : undefined}
                              value={line}
                              onChange={(e) => {
                                const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                                lines[index] = e.target.value
                                onShopFieldChange('shopSpecialties', lines.join('\n'))
                              }}
                              className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                              disabled={!isEditingShop || !canEditShop}
                              placeholder="e.g. Traditional Catholic rites"
                              maxLength={120}
                              spellCheck={true}
                              aria-label={`Speciality ${index + 1}`}
                            />
                            {isEditingShop && canEditShop ? (
                              <button
                                type="button"
                                className={styles.shopSpecialtyRemoveBtn}
                                onClick={() => {
                                  const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                                  lines.splice(index, 1)
                                  onShopFieldChange('shopSpecialties', lines.join('\n'))
                                }}
                                aria-label={`Remove speciality ${index + 1}`}
                              >
                                <TbTrash aria-hidden />
                              </button>
                            ) : null}
                            </div>
                          </div>
                        ))}
                        </div>
                        {isEditingShop && canEditShop ? (
                          <button
                            type="button"
                            className={`${styles.primaryBtn} ${styles.shopSpecialtyAddBtn}`}
                            onClick={() => {
                              const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                              lines.push('')
                              onShopFieldChange('shopSpecialties', lines.join('\n'))
                            }}
                            disabled={normalizeSellerSpecialties(shopForm.shopSpecialties ?? '').length >= 24}
                          >
                            <FiPlus aria-hidden /> Add speciality
                          </button>
                        ) : null}
                      </div>
                      <p className={styles.shopGridHint}>Up to 24 items, 120 characters each.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Location and cover</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('address')} className={styles.shopGridLabel}>
                        Business address
                      </label>
                      <input
                        id={shopId('address')}
                        value={shopForm.address}
                        onChange={(e) => onShopFieldChange('address', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Street, city, province"
                      />
                      <p className={styles.shopGridHint}>Shown on your public shop.</p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <span className={styles.shopGridLabel}>Shop cover photo</span>
                      <p className={styles.shopGridHint}>
                        PNG, JPG, or WEBP. Max {MAX_MB}MB.
                      </p>
                      {seller?.cover_photo_url ? (
                        <div className={styles.shopCoverPreview}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={seller.cover_photo_url}
                            alt="Shop cover preview"
                            className={styles.shopCoverImg}
                          />
                        </div>
                      ) : (
                        <p className={styles.shopGridHint}>No cover image yet.</p>
                      )}
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className={styles.fileInput}
                        onChange={onPickShopCover}
                        aria-label="Upload shop cover photo"
                      />
                      {isEditingShop && canEditShop ? (
                        <div className={styles.shopCoverToolbar}>
                          <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={coverLoading}
                            onClick={() => coverFileRef.current?.click()}
                          >
                            <FaUpload aria-hidden />
                            {seller?.cover_photo_url ? 'Replace cover' : 'Upload cover'}
                          </button>
                          {seller?.cover_photo_url ? (
                            <button
                              type="button"
                              className={styles.dangerBtn}
                              disabled={coverLoading}
                              onClick={onRemoveShopCover}
                            >
                              <TbTrash aria-hidden />
                              Remove cover
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}

            {shopSubTab === 'business' && (
              <>
                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>About your business</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('info')} className={styles.shopGridLabel}>
                        About
                      </label>
                      <textarea
                        id={shopId('info')}
                        rows={4}
                        value={shopForm.businessInfo}
                        onChange={(e) => onShopFieldChange('businessInfo', e.target.value)}
                        className={`${styles.input} ${styles.textarea} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Services, coverage, and what sets you apart."
                      />
                      <p className={styles.shopGridHint}>Shown on your public shop.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Contact</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('contact')} className={styles.shopGridLabel}>
                        Contact name <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('contact')}
                        value={shopForm.contactName}
                        onChange={(e) => onShopFieldChange('contactName', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Contact person"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('email')} className={styles.shopGridLabel}>
                        Email <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('email')}
                        type="email"
                        value={shopForm.email}
                        onChange={(e) => onShopFieldChange('email', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('phone')} className={styles.shopGridLabel}>
                        Phone
                      </label>
                      <input
                        id={shopId('phone')}
                        type="tel"
                        value={shopForm.phone}
                        onChange={(e) => onShopFieldChange('phone', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="+63 9XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {shopSubTab === 'publicContact' && (
              <div className={styles.shopInfoCard}>
                <h3 className={styles.shopInfoCardTitle}>Public contact methods</h3>
                <p className={styles.shopGridHint} style={{ marginBottom: 12 }}>
                  Choose how buyers can contact you from your public shop.
                </p>
                <div className={styles.shopFieldGrid}>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialPhoneEnabled)}
                        onChange={(e) => onShopFieldChange('socialPhoneEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Phone (Call / SMS)</span>
                    </label>
                    {shopForm.socialPhoneEnabled && (
                      <input
                        value={shopForm.socialPhone}
                        onChange={(e) => onShopFieldChange('socialPhone', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. +63 917 123 4567"
                        aria-label="Phone for Call or SMS"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialWhatsappEnabled)}
                        onChange={(e) => onShopFieldChange('socialWhatsappEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>WhatsApp</span>
                    </label>
                    {shopForm.socialWhatsappEnabled && (
                      <input
                        value={shopForm.socialWhatsapp}
                        onChange={(e) => onShopFieldChange('socialWhatsapp', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Phone number for WhatsApp (digits or +63…)"
                        aria-label="WhatsApp number"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialEmailEnabled)}
                        onChange={(e) => onShopFieldChange('socialEmailEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Email</span>
                    </label>
                    {shopForm.socialEmailEnabled && (
                      <input
                        type="email"
                        value={shopForm.socialEmail}
                        onChange={(e) => onShopFieldChange('socialEmail', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. inquiries@yourshop.com"
                        aria-label="Public contact email"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialFacebookEnabled)}
                        onChange={(e) => onShopFieldChange('socialFacebookEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Facebook</span>
                    </label>
                    {shopForm.socialFacebookEnabled && (
                      <input
                        value={shopForm.socialFacebook}
                        onChange={(e) => onShopFieldChange('socialFacebook', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="https://facebook.com/yourpage"
                        aria-label="Facebook URL"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialMessengerEnabled)}
                        onChange={(e) => onShopFieldChange('socialMessengerEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Messenger</span>
                    </label>
                    {shopForm.socialMessengerEnabled && (
                      <input
                        value={shopForm.socialMessenger}
                        onChange={(e) => onShopFieldChange('socialMessenger', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="m.me/yourpage or yourpage"
                        aria-label="Messenger link or handle"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

  )
}
