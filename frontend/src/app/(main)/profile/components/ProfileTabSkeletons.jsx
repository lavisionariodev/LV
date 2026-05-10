'use client';

import styles from '../profile.module.css';
import sk from './ProfileSkeleton.module.css';
import purchaseStyles from '../purchases/purchases.module.css';
import notifStyles from '../notifications/notifications.module.css';

const SK_NAV_KEYS = ['nav1', 'nav2', 'nav3'];
const SK_ACCOUNT_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const SK_PURCHASE_CARD_KEYS = ['p1', 'p2', 'p3'];
const SK_NOTIF_ROW_KEYS = ['n1', 'n2', 'n3', 'n4'];

/** Full-page shell while auth resolves (matches sidebar + main chrome). */
export function ProfileAuthLayoutSkeleton() {
  return (
    <main className={styles.profilePage} aria-busy="true" aria-describedby="profile-auth-skel-hint">
      <p id="profile-auth-skel-hint" role="status" className={sk.visuallyHidden}>
        Loading your profile. Navigation and tab content will appear shortly.
      </p>
      <div className={styles.profileLayout}>
        <aside className={styles.profileSidebar} aria-hidden="true">
          <div className={sk.skLayoutIdentity}>
            <div className={`${sk.skBlock} ${sk.skLayoutAvatar}`} />
            <div className={sk.skLayoutMeta}>
              <div className={`${sk.skBlock} ${sk.skLayoutName}`} />
              <div className={`${sk.skBlock} ${sk.skLayoutEdit}`} />
            </div>
          </div>
          {SK_NAV_KEYS.map((k) => (
            <div key={k} className={`${sk.skBlock} ${sk.skLayoutNavItem}`} />
          ))}
        </aside>
        <div className={styles.profileMain}>
          <div className={styles.profileCard}>
            <div className={styles.profileAccentBar} />
            <div className={sk.skLayoutMainInner}>
              <div className={`${sk.skBlock} ${sk.skLayoutEyebrow}`} />
              <div className={`${sk.skBlock} ${sk.skLayoutSub}`} />
              <div className={`${sk.skBlock} ${sk.skLayoutLine}`} />
              <div className={`${sk.skBlock} ${sk.skLayoutLine} ${sk.skLayoutLineShort}`} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Desktop account tab — mirrors form + avatar panel. */
export function AccountTabSkeleton() {
  return (
    <div
      className={styles.profileCard}
      aria-busy="true"
      aria-describedby="profile-account-skel-hint"
    >
      <p id="profile-account-skel-hint" role="status" className={sk.visuallyHidden}>
        Loading account settings. Your profile fields and photo panel will appear shortly.
      </p>
      <div className={styles.profileAccentBar} />
      <header className={styles.profileHeader} aria-hidden="true">
        <div className={styles.profileHeaderLeft}>
          <div className={`${sk.skBlock} ${sk.skAccountHeaderEyebrow}`} />
          <div className={`${sk.skBlock} ${sk.skLayoutSub}`} />
        </div>
      </header>
      <div className={styles.profileCardBody}>
        <div className={styles.profileFormSection} aria-hidden="true">
          <div className={styles.form}>
            {SK_ACCOUNT_ROW_KEYS.map((k, i) => (
              <div key={k} className={styles.formRow}>
                <div className={`${sk.skBlock} ${sk.skFormLabel}`} />
                <div className={styles.formRowField}>
                  <div className={`${sk.skBlock} ${sk.skInput}`} />
                  {i === 0 ? <div className={`${sk.skBlock} ${sk.skHint}`} /> : null}
                  {i === 5 ? (
                    <div className={sk.skAddressStack}>
                      <div className={`${sk.skBlock} ${sk.skInput}`} />
                      <div className={`${sk.skBlock} ${sk.skInput}`} />
                      <div className={`${sk.skBlock} ${sk.skInput} ${sk.skInputShort}`} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <div className={styles.formRow}>
              <span className={styles.formRowLabel} />
              <div className={styles.formRowField}>
                <div className={`${sk.skBlock} ${sk.skSaveBtnStub}`} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.avatarPanel} aria-hidden="true">
          <div className={styles.avatarDivider} />
          <div className={styles.avatarPanelInner}>
            <div className={`${sk.skBlock} ${sk.skAvatarCircle}`} />
            <div className={`${sk.skBlock} ${sk.skAvatarBtn}`} />
            <div className={`${sk.skBlock} ${sk.skAvatarHint}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseCardSkeleton() {
  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <div className={`${sk.skBlock} ${sk.skPurOrderId}`} />
            <div className={`${sk.skBlock} ${sk.skPurTitle}`} />
            <div className={`${sk.skBlock} ${sk.skPurProvider}`} />
          </div>
          <div className={purchaseStyles.badgeColumn}>
            <div className={`${sk.skBlock} ${sk.skPurBadge}`} />
            <div className={`${sk.skBlock} ${sk.skPurBadgeSub}`} />
          </div>
        </div>
        <div className={`${sk.skBlock} ${sk.skPurPaymentLine}`} />
        <div className={purchaseStyles.cardMeta}>
          <div className={`${sk.skBlock} ${sk.skPurMetaChip}`} />
          <div className={`${sk.skBlock} ${sk.skPurMetaChip}`} />
          <div className={`${sk.skBlock} ${sk.skPurMetaPrice}`} />
        </div>
      </div>
    </div>
  );
}

/** Purchases tab — toolbar + stacked order cards. */
export function PurchasesTabSkeleton() {
  return (
    <div
      className={styles.profileCard}
      aria-busy="true"
      aria-describedby="profile-purchases-skel-hint"
    >
      <p id="profile-purchases-skel-hint" role="status" className={sk.visuallyHidden}>
        Loading your purchases. Search, filters, and order cards will appear shortly.
      </p>
      <div className={styles.profileAccentBar} />
      <header className={`${styles.profileHeader} ${purchaseStyles.desktopOnlyHeader}`} aria-hidden="true">
        <div className={styles.profileHeaderLeft}>
          <div className={`${sk.skBlock} ${sk.skPurchHeaderTitle}`} />
          <div className={`${sk.skBlock} ${sk.skLayoutSub} ${sk.skPurchHeaderSub}`} />
        </div>
      </header>
      <div className={purchaseStyles.purchasesBody}>
        <div className={purchaseStyles.toolbar} aria-hidden="true">
          <div className={`${sk.skBlock} ${sk.skPurchSearch}`} />
          <div className={sk.skPurchFilters}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`${sk.skBlock} ${sk.skPurchFilterPill} ${i % 2 ? sk.skPurchFilterPillAlt : ''}`}
              />
            ))}
          </div>
        </div>
        <div className={`${sk.skBlock} ${sk.skPurchMeta}`} />
        <div className={purchaseStyles.cardList}>
          {SK_PURCHASE_CARD_KEYS.map((k) => (
            <PurchaseCardSkeleton key={k} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Notifications tab — filter row + feed list. */
export function NotificationsTabSkeleton() {
  return (
    <div
      className={styles.profileCard}
      aria-busy="true"
      aria-describedby="profile-notifications-skel-hint"
    >
      <p id="profile-notifications-skel-hint" role="status" className={sk.visuallyHidden}>
        Loading notifications. Filters and your activity feed will appear shortly.
      </p>
      <div className={styles.profileAccentBar} />
      <header className={styles.profileHeader} aria-hidden="true">
        <div className={notifStyles.headerWrap}>
          <div className={notifStyles.headerTop}>
            <div className={notifStyles.headerText}>
              <div className={`${sk.skBlock} ${sk.skNotifHeaderTitle}`} />
              <div className={`${sk.skBlock} ${sk.skLayoutSub} ${sk.skNotifHeaderSub}`} />
            </div>
            <div className={notifStyles.headerActions}>
              <div className={`${sk.skBlock} ${sk.skHeaderBadge}`} />
            </div>
          </div>
          <div className={notifStyles.filterRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`${sk.skBlock} ${sk.skFilterBtn} ${i % 2 ? sk.skFilterBtnWide : sk.skFilterBtnNarrow}`}
              />
            ))}
          </div>
        </div>
      </header>
      <div className={notifStyles.feed} aria-hidden="true">
        <div className={`${sk.skBlock} ${sk.skNotifDay}`} />
        {SK_NOTIF_ROW_KEYS.map((k) => (
          <div key={k} className={sk.skNotifRow}>
            <div className={`${sk.skBlock} ${sk.skNotifIcon}`} />
            <div className={sk.skNotifBody}>
              <div className={`${sk.skBlock} ${sk.skNotifTitle}`} />
              <div className={`${sk.skBlock} ${sk.skNotifText}`} />
              <div className={`${sk.skBlock} ${sk.skNotifText} ${sk.skNotifText2}`} />
              <div className={`${sk.skBlock} ${sk.skNotifTime}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
