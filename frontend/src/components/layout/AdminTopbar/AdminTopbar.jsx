"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import styles from "./AdminTopbar.module.css"
import { MdNotificationsNone } from "react-icons/md"
import { IoSearch } from "react-icons/io5"
import { FaUser } from "react-icons/fa6"
import { LuLogOut } from "react-icons/lu"
import { RxHamburgerMenu } from "react-icons/rx"
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/api'

const ROUTE_TITLES = [
  { match: "/admin/payments", title: "Payments", subtitle: "Approve and transfer payments to sellers" },
  { match: "/admin/sellers", title: "Sellers", subtitle: "Manage registered sellers" },
  { match: "/admin/users", title: "Users", subtitle: "View and manage user accounts" },
  { match: "/admin/disputes", title: "Disputes", subtitle: "Review and resolve issues" },
  { match: "/admin/content", title: "Content", subtitle: "Manage platform content" },
  { match: "/admin/settings", title: "Settings", subtitle: "Manage your account information and security" },
  { match: "/admin/help", title: "Help Center", subtitle: "CEO essentials: approvals, disputes, policies, and platform health." },
]

export default function AdminTopbar({ onLogout, onToggleSidebar }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()

  const [adminProfile, setAdminProfile] = useState(null)

  const [open, setOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  const menuRef = useRef(null)
  const btnRef = useRef(null)

  const current = useMemo(() => {
    const found = ROUTE_TITLES.find((item) => pathname?.startsWith(item.match))
    return (
      found || {
        title: "Dashboard",
        subtitle: "Overview & quick actions",
      }
    )
  }, [pathname])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!open) return
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close dropdown on Esc
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  const handleLogout = async () => {
    setOpen(false)

    if (typeof onLogout === "function") {
      await onLogout()
      return
    }

    localStorage.clear()
    router.push("/administrator")
  }

  const onClickLogout = () => {
    setOpen(false)
    setShowLogout(true)
  }

  const onCancelLogout = () => {
    setShowLogout(false)
  }

  const onConfirmLogout = async () => {
    setShowLogout(false)
    await handleLogout()
  }

  // Load admins row so avatar/name/email come from admins table.
  useEffect(() => {
    let cancelled = false

    const loadAdmin = async () => {
      try {
        const data = await fetchCurrentAdminProfile()
        if (!cancelled) {
          setAdminProfile(data)
        }
      } catch {
        // ignore; fall back to AuthContext profile
      }
    }

    loadAdmin()

    return () => {
      cancelled = true
    }
  }, [])

  const avatarUrl = adminProfile?.avatarUrl || profile?.avatar_url || ""

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Toggle sidebar"
            onClick={() => onToggleSidebar && onToggleSidebar()}
          >
            <RxHamburgerMenu />
          </button>

          <div className={styles.titleWrap}>
            <p className={styles.title}>{current.title}</p>
            <p className={styles.subtitle}>{current.subtitle}</p>
          </div>
        </div>

        <div className={styles.center}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <IoSearch />
            </span>
            <input
              type="text"
              className={styles.search}
              placeholder="Search..."
              aria-label="Search admin panel"
            />
          </div>
        </div>

        <div className={styles.right}>
          <button className={styles.iconBtn} type="button" aria-label="Notifications">
            <MdNotificationsNone />
          </button>

          <div className={styles.profileWrap}>
            <button
              ref={btnRef}
              type="button"
              className={styles.profileAvatar}
              aria-label="Admin menu"
              aria-expanded={open}
              onClick={() => setOpen((p) => !p)}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Admin avatar"
                  width={32}
                  height={32}
                  className={styles.profileAvatarImg}
                  unoptimized
                />
              ) : (
                <FaUser />
              )}
            </button>

            {open && (
              <div ref={menuRef} className={styles.profileDropdown}>
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={onClickLogout}
                >
                  <LuLogOut />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Logout open={showLogout} onCancel={onCancelLogout} onConfirm={onConfirmLogout} />
    </>
  )
}