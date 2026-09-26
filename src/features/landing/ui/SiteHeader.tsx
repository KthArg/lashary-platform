'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import { landingMessages } from './messages'
import { HOME_ANCHOR, RESERVE_ROUTE } from './routes'
import type { SiteSection } from './sections'
import { siteHeaderStyles as styles } from './SiteHeader.styles'
import { SiteMenu } from './SiteMenu'

type SiteHeaderProps = {
  sections: readonly SiteSection[]
}

// Cabecera fija del sitio. Con `mix-blend-difference` el texto blanco se invierte sobre el
// fondo claro o la foto, así que se lee en las dos. Sin secciones no hay nada que navegar: ni
// menú ni barra de enlaces.
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
      <header className={styles.header}>
        <div className={styles.inner}>
          <a href={HOME_ANCHOR} className={styles.brand}>
            <span className={styles.brandName}>{landingMessages.brand.name}</span>
            <span className={styles.brandTagline}>{landingMessages.brand.tagline}</span>
          </a>
          <div className={styles.actions}>
            {hasSections && (
              <nav aria-label={landingMessages.header.sectionsNav} className={styles.desktopNav}>
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className={styles.navLink}>
                    {section.label}
                  </a>
                ))}
              </nav>
            )}
            <Link href={RESERVE_ROUTE} className={styles.reserve}>
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
                className={styles.menuButton}
              >
                <span aria-hidden="true" className={styles.menuBar} />
                <span aria-hidden="true" className={styles.menuBar} />
              </button>
            )}
          </div>
        </div>
      </header>
      {menuOpen && <SiteMenu sections={sections} onClose={closeMenu} />}
    </>
  )
}
