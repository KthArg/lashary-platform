import { getContact } from '@/features/content'
import { SiteFooter, SiteHeader, landingSections } from '@/features/landing'
import { siteDisplay, siteSans } from './fonts'

// Todo lo que cuelga de (site) usa el tema `lashary-site` (tailwind.config.js). El resto de la
// app conserva el tema `lashary` que pone el layout raíz.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Nunca lanza: con el CMS caído el pie muestra solo lo que no depende de él. La lectura es la
  // misma entrada de caché que usa la página, así que no pide dos veces al CMS.
  const contact = await getContact()

  return (
    <div
      data-theme="lashary-site"
      className={`${siteDisplay.variable} ${siteSans.variable} min-h-screen bg-site-paper font-site-sans text-site-ink antialiased`}
    >
      <SiteHeader sections={landingSections} />
      {children}
      <SiteFooter contact={contact} year={new Date().getFullYear()} />
    </div>
  )
}
