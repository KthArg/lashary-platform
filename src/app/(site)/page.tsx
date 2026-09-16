import { getLandingContent } from '@/features/content'
import type { Metadata } from 'next'
import { LandingHome, landingMessages } from '@/features/landing'

// Estática con revalidación: el TTL de respaldo del contrato del CMS (10 min). El aviso al
// publicar la renueva antes (POST /api/cms/webhook).
export const revalidate = 600

export const metadata: Metadata = {
  title: landingMessages.metadata.title,
  description: landingMessages.metadata.description,
  openGraph: {
    title: landingMessages.metadata.title,
    description: landingMessages.metadata.description,
    locale: 'es_CR',
    type: 'website',
  },
}

export default async function HomePage() {
  const content = await getLandingContent()
  return <LandingHome content={content} />
}
