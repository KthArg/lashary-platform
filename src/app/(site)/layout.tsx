import { siteDisplay, siteSans } from './fonts'

// Todo lo que cuelga de (site) usa el tema `lashary-site` (tailwind.config.js). El resto de la
// app conserva el tema `lashary` que pone el layout raíz.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="lashary-site"
      className={`${siteDisplay.variable} ${siteSans.variable} min-h-screen bg-site-paper font-site-sans text-site-ink antialiased`}
    >
      {children}
    </div>
  )
}
