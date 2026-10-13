'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import { landingMessages } from '../../../constants/landing-strings'
import { HOME_ANCHOR, LOGIN_ROUTE, RESERVE_ROUTE } from '../../../routes'
import { siteHeaderStyles as STYLES } from './SiteHeader.styles'
import { SiteMenu } from '../SiteMenu'
import type { SiteHeaderProps } from './SiteHeader.types'

export function SiteHeader({ sections }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const hasSections = sections.length > 0

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  return (
    <>
      <header className={STYLES.header}>
        <div className={STYLES.inner}>
          <a href={HOME_ANCHOR} className={STYLES.brand}>
            <span className={STYLES.brandName}>{landingMessages.brand.name}</span>
            <span className={STYLES.brandTagline}>{landingMessages.brand.tagline}</span>
          </a>
          <div className={STYLES.actions}>
            {hasSections && (
              <nav aria-label={landingMessages.header.sectionsNav} className={STYLES.desktopNav}>
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className={STYLES.navLink}>
                    {section.label}
                  </a>
                ))}
              </nav>
            )}
            <Link href={LOGIN_ROUTE} className={hasSections ? STYLES.loginDesktop : STYLES.login}>
              {landingMessages.header.login}
            </Link>
            <Link href={RESERVE_ROUTE} className={STYLES.reserve}>
              {landingMessages.header.reserve}
            </Link>
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
      {menuOpen && <SiteMenu sections={sections} onClose={closeMenu} />}
    </>
  )
}
