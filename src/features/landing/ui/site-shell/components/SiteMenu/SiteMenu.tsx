'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { landingMessages } from '../../../constants/landing-strings'
import { LOGIN_ROUTE, RESERVE_ROUTE } from '../../../routes'
import { siteMenuStyles as styles } from './SiteMenu.styles'
import { useFocusTrap } from '../../hooks/use-focus-trap'
import type { SiteMenuProps } from './SiteMenu.types'

export function SiteMenu({ sections, onClose }: SiteMenuProps) {
  const containerRef = useFocusTrap<HTMLDivElement>()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={landingMessages.menu.dialogLabel}
      className={styles.overlay}
    >
      <div className={styles.top}>
        <button type="button" onClick={onClose} className={styles.close}>
          {landingMessages.menu.close}
        </button>
      </div>
      <nav aria-label={landingMessages.header.sectionsNav} className={styles.nav}>
        {sections.map((section, index) => (
          <a key={section.id} href={`#${section.id}`} onClick={onClose} className={styles.link}>
            <span aria-hidden="true" className={styles.number}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.label}
          </a>
        ))}
      </nav>
      <div className={styles.footer}>
        <Link href={RESERVE_ROUTE} onClick={onClose} className={styles.reserve}>
          {landingMessages.menu.reserve}
        </Link>
        <Link href={LOGIN_ROUTE} onClick={onClose} className={styles.login}>
          {landingMessages.menu.login}
        </Link>
      </div>
    </div>
  )
}
