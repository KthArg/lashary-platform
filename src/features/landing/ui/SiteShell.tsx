import { LANDING_STRINGS } from '../constants/landing-strings'
import { siteShellStyles as s } from './SiteShell.styles'

/**
 * Cascarón del sitio público: encabezado con la marca, contenido y pie. Reutilizable — las
 * secciones de US-LAND-02/03/04/07 se montan como `children` entre el mismo encabezado y pie.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.root}>
      <a href="#contenido" className={s.skipLink}>
        {LANDING_STRINGS.skipToContent}
      </a>
      <header className={s.header}>
        <a href="/" className={s.brand} aria-label={LANDING_STRINGS.homeNavLabel}>
          <span className={s.brandName}>{LANDING_STRINGS.brandName}</span>
          <span className={s.brandTagline}>{LANDING_STRINGS.brandTagline}</span>
        </a>
      </header>
      <main id="contenido" className={s.main}>
        {children}
      </main>
      <footer className={s.footer}>
        <p>
          &copy; {LANDING_STRINGS.brandName} {LANDING_STRINGS.brandTagline}.{' '}
          {LANDING_STRINGS.footerRights}
        </p>
      </footer>
    </div>
  )
}
