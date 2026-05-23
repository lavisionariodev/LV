import {
  TbAlertTriangle,
  TbBellRinging,
  TbCalendarCheck,
  TbCircleCheck,
  TbClipboardList,
  TbEdit,
  TbClock,
  TbCreditCardOff,
  TbFileX,
  TbMail,
  TbClockPlay,
  TbReceiptRefund,
  TbUserCircle,
} from 'react-icons/tb'
import { LuCreditCard, LuMegaphone, LuShoppingBag, LuUserCheck } from 'react-icons/lu'

/** @type {Record<string, { Icon: import('react').ComponentType; color: string }>} */
const NOTIFICATION_TYPE_DISPLAY = {
  payment_success: { Icon: LuCreditCard, color: 'green' },
  payment_failed: { Icon: TbCreditCardOff, color: 'red' },
  payment_refund: { Icon: TbReceiptRefund, color: 'gold' },
  service_confirmed: { Icon: TbCalendarCheck, color: 'blue' },
  service_inprogress: { Icon: TbClockPlay, color: 'blue' },
  service_completed: { Icon: TbCircleCheck, color: 'green' },
  service_alert: { Icon: TbAlertTriangle, color: 'red' },
  listing_approval: { Icon: LuUserCheck, color: 'green' },
  listing_rejected: { Icon: TbFileX, color: 'red' },
  listing_pending_review: { Icon: TbClipboardList, color: 'gold' },
  listing_staged_update: { Icon: TbEdit, color: 'blue' },
  alerts: { Icon: TbBellRinging, color: 'red' },
  reminder: { Icon: TbClock, color: 'gold' },
  system: { Icon: LuMegaphone, color: 'gold' },
  account: { Icon: TbUserCircle, color: 'blue' },
  message: { Icon: TbMail, color: 'blue' },
}

/** Filter-bucket fallbacks when `type` is unknown or legacy. */
const BUCKET_DISPLAY = {
  order: { Icon: LuShoppingBag, color: 'blue' },
  approval: { Icon: LuUserCheck, color: 'green' },
  alert: { Icon: TbAlertTriangle, color: 'red' },
  announcement: { Icon: LuMegaphone, color: 'gold' },
  payment: { Icon: TbReceiptRefund, color: 'gold' },
  listing: { Icon: TbClipboardList, color: 'green' },
  system: { Icon: LuMegaphone, color: 'gold' },
}

const DEFAULT_DISPLAY = { Icon: TbAlertTriangle, color: 'red' }

/**
 * Icon + accent color for an in-app notification row (admin / seller portals).
 * @param {string} apiType from user_notifications.type
 * @param {string} [fallbackBucket] from adminNotificationFilterBucket / sellerNotificationFilterBucket
 */
export function getNotificationDisplay(apiType, fallbackBucket) {
  const t = String(apiType || '').trim()
  if (NOTIFICATION_TYPE_DISPLAY[t]) return NOTIFICATION_TYPE_DISPLAY[t]

  if (t.startsWith('payment')) {
    return t.includes('fail')
      ? NOTIFICATION_TYPE_DISPLAY.payment_failed
      : t.includes('refund')
        ? NOTIFICATION_TYPE_DISPLAY.payment_refund
        : NOTIFICATION_TYPE_DISPLAY.payment_success
  }

  if (t.startsWith('service_')) {
    if (t.includes('complete')) return NOTIFICATION_TYPE_DISPLAY.service_completed
    if (t.includes('progress') || t.includes('inprogress')) return NOTIFICATION_TYPE_DISPLAY.service_inprogress
    if (t.includes('confirm')) return NOTIFICATION_TYPE_DISPLAY.service_confirmed
    if (t.includes('alert')) return NOTIFICATION_TYPE_DISPLAY.service_alert
    return NOTIFICATION_TYPE_DISPLAY.service_inprogress
  }

  if (t.startsWith('listing_')) {
    if (t.includes('reject')) return NOTIFICATION_TYPE_DISPLAY.listing_rejected
    if (t.includes('staged')) return NOTIFICATION_TYPE_DISPLAY.listing_staged_update
    if (t.includes('pending')) return NOTIFICATION_TYPE_DISPLAY.listing_pending_review
    return NOTIFICATION_TYPE_DISPLAY.listing_approval
  }

  const bucket = String(fallbackBucket || '').trim()
  if (bucket && BUCKET_DISPLAY[bucket]) return BUCKET_DISPLAY[bucket]

  return DEFAULT_DISPLAY
}
