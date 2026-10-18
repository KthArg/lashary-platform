'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { landingMessages } from '../../../constants/landing-strings'
import { HOME_ANCHOR, LOGIN_ROUTE, RESERVE_ROUTE, anchorBaseFor } from '../../../routes'
import { siteHeaderStyles as STYLES } from './SiteHeader.styles'
import { SiteMenu } from '../SiteMenu'
import type { SiteHeaderProps } from './SiteHeader.types'

export function SiteHeader({ sections, productsHref, cartHref }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const hasSections = sections.length > 0
  const anchorBase = anchorBaseFor(usePathname())

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  return (
    <>
      <header className={STYLES.header}>
        <div className={STYLES.inner}>
          <a href={`${anchorBase}${HOME_ANCHOR}`} className={STYLES.brand}>
            <span className={STYLES.brandName}>{landingMessages.brand.name}</span>
            <span className={STYLES.brandTagline}>{landingMessages.brand.tagline}</span>
          </a>
          <div className={STYLES.actions}>
            {hasSections && (
              <nav aria-label={landingMessages.header.sectionsNav} className={STYLES.desktopNav}>
                {sections.map((section) => (
                  <a key={section.id} href={`${anchorBase}#${section.id}`} className={STYLES.navLink}>
                    {section.label}
                  </a>
                ))}
              </nav>
            )}
            {productsHref && (
              <Link href={productsHref} className={hasSections ? STYLES.productsDesktop : STYLES.products}>
                {landingMessages.header.products}
              </Link>
            )}
            <Link href={LOGIN_ROUTE} className={hasSections ? STYLES.loginDesktop : STYLES.login}>
              {landingMessages.header.login}
            </Link>
            <Link href={RESERVE_ROUTE} className={STYLES.reserve}>
              {landingMessages.header.reserve}
            </Link>
            {cartHref && (
              <Link
                href={cartHref}
                aria-label={landingMessages.header.cart}
                className={hasSections ? STYLES.cartDesktop : STYLES.cart}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className={STYLES.cartIcon}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </Link>
            )}
            {hasSections && (
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={landingMessages.header.openMenu}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className={STYLES.menuButton}
              >
                <span aria-hidden="true" className={STYLES.menuBar} />
                <span aria-hidden="true" className={STYLES.menuBar} />
              </button>
            )}
          </div>
        </div>
      </header>
      {menuOpen && (
        <SiteMenu
          sections={sections}
          anchorBase={anchorBase}
          productsHref={productsHref}
          cartHref={cartHref}
          onClose={closeMenu}
        />
      )}
    </>
  )
}
