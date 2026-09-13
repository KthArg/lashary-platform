'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '../../actions/auth-actions'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../../constants/auth-strings'
import { sidebarStyles as s } from './AdminSidebar.styles'
import type { AdminSidebarProps } from './AdminSidebar.types'

export function AdminSidebar({ session }: AdminSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()

  const navItems = [
    {
      label: AUTH_LABELS.dashboardNav,
      href: '/admin/dashboard',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: AUTH_LABELS.citasNav,
      href: '/admin/citas',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  return (
    <aside
      className={`${s.aside} ${isExpanded ? s.expandedWidth : s.collapsedWidth}`}
      aria-label="Panel de navegación administrativa"
    >
      <div>
        <div className={s.header}>
          {isExpanded && <span className={s.brandTitle}>LASHARY</span>}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={s.toggleBtn}
            aria-label={isExpanded ? AUTH_LABELS.collapseSidebar : AUTH_LABELS.expandSidebar}
            title={isExpanded ? AUTH_LABELS.collapseSidebar : AUTH_LABELS.expandSidebar}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        <nav className={s.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.navLink} ${isActive ? s.navLinkActive : s.navLinkInactive}`}
                title={!isExpanded ? item.label : undefined}
              >
                {item.icon}
                {isExpanded && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className={s.footer}>
        {isExpanded && (
          <div className={s.userInfo}>
            <p className={s.userEmail} title={session.user.email}>
              {session.user.email}
            </p>
            <span className={s.userRole}>{session.role}</span>
          </div>
        )}
        <form action={signOutAction} className="w-full">
          <button
            type="submit"
            className={s.signOutBtn}
            title={AUTH_BUTTON_TEXTS.signOut}
            aria-label={AUTH_BUTTON_TEXTS.signOut}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isExpanded && <span>{AUTH_BUTTON_TEXTS.signOut}</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
