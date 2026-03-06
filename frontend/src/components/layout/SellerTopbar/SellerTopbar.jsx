'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './SellerTopbar.module.css'
import { IoSearch } from 'react-icons/io5'
import { TbBell } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut } from 'react-icons/lu'
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

export default function SellerTopbar({ onLogout }) {
  const { user, profile } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const avatarUrl = profile?.avatar_url || ''
  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Seller'

  const onClickLogout = () => {
    setShowLogout(true)
  }

  const onCancelLogout = () => {
    setShowLogout(false)
  }

  const onConfirmLogout = async () => {
    setShowLogout(false)
    if (typeof onLogout === 'function') {
      await onLogout()
    }
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
            placeholder="Search…"
            aria-label="Search seller centre"
          />
        </div>

        <div className={styles.right}>
          <Link
            href="/seller/notifications"
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
                    alt="Seller avatar"
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
