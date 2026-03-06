'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AppTopbar.module.css'
import { IoSearch } from 'react-icons/io5'
import { TbBell } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut } from 'react-icons/lu'
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/api'

const TOPBAR_CONFIG = {
  admin: {
    searchPlaceholder: 'Search…',
    searchAriaLabel: 'Search admin panel',
    notificationsHref: '/admin/notifications',
    defaultDisplayName: 'Admin',
    avatarAlt: 'Admin avatar',
  },
  seller: {
    searchPlaceholder: 'Search…',
    searchAriaLabel: 'Search seller centre',
    notificationsHref: '/seller/notifications',
    defaultDisplayName: 'Seller',
    avatarAlt: 'Seller avatar',
  },
}

export default function AppTopbar({ variant, onLogout }) {
  const { user, profile } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)

  const config = TOPBAR_CONFIG[variant]
  if (!config) return null

  const isAdmin = variant === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchCurrentAdminProfile()
        if (!cancelled) setAdminProfile(data)
      } catch {
        // ignore; fall back to AuthContext profile
      }
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  const avatarUrl = isAdmin
    ? (adminProfile?.avatarUrl || profile?.avatar_url || '')
    : (profile?.avatar_url || '')

  const displayName = isAdmin
    ? (adminProfile?.fullName?.trim() || profile?.full_name?.trim() || user?.email?.split('@')[0] || config.defaultDisplayName)
    : (profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || config.defaultDisplayName)

  const onClickLogout = () => setShowLogout(true)
  const onCancelLogout = () => setShowLogout(false)
  const onConfirmLogout = async () => {
    setShowLogout(false)
    if (typeof onLogout === 'function') await onLogout()
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <IoSearch />
          </span>
          <input
            type="text"
            className={styles.search}
            placeholder={config.searchPlaceholder}
            aria-label={config.searchAriaLabel}
          />
        </div>

        <div className={styles.right}>
          <Link
            href={config.notificationsHref}
            className={styles.iconBtn}
            aria-label="Notifications"
          >
            <TbBell />
          </Link>

          <div
            className={styles.profileWrap}
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
            data-hover={dropdownOpen ? 'true' : undefined}
          >
            <div className={styles.profileTrigger}>
              <div className={styles.profileAvatar}>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={config.avatarAlt}
                    width={36}
                    height={36}
                    className={styles.profileAvatarImg}
                    unoptimized
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <span className={styles.profileName}>{displayName}</span>
            </div>

            <div className={styles.profileDropdown}>
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={onClickLogout}
              >
                <LuLogOut />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <Logout open={showLogout} onCancel={onCancelLogout} onConfirm={onConfirmLogout} />
    </>
  )
}
