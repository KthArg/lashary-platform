import { CLIENT_PORTAL_ROUTES } from '@/features/auth'
import { BLOG_ROUTE, getContact } from '@/features/content'
import { SiteFooter, SiteHeader, landingSections } from '@/features/landing'
import { publicDetailRoutes } from '@/features/store/client'
import { siteDisplay, siteSans } from './fonts'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const contact = await getContact()

  return (
    <div
      data-theme="lashary-site"
      className={`${siteDisplay.variable} ${siteSans.variable} min-h-screen bg-site-paper font-site-sans text-site-ink antialiased`}
    >
      <SiteHeader
        sections={landingSections}
        productsHref={publicDetailRoutes.catalog}
        cartHref={CLIENT_PORTAL_ROUTES.carrito}
      />
      {children}
      <SiteFooter contact={contact} year={new Date().getFullYear()} blogHref={BLOG_ROUTE} />
    </div>
  )
}
