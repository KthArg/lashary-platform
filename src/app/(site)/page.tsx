import { getLandingContent } from '@/features/content'
import { listTechniques } from '@/features/catalog'
import type { Metadata } from 'next'
import { LandingHome, landingMessages, toLandingTechnique } from '@/features/landing'

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

// El catálogo caído no tumba la landing: la sección de técnicas queda en su estado vacío, igual
// que el contenido del CMS cae al respaldo. La página pública nunca es la que falla.
async function readTechniques() {
  try {
    const page = await listTechniques({ activeOnly: true })
    return page.items.map(toLandingTechnique)
  } catch (error) {
    console.warn('[landing] catálogo no disponible; la sección de técnicas queda vacía', error)
    return []
  }
}

export default async function HomePage() {
  const [content, techniques] = await Promise.all([getLandingContent(), readTechniques()])
  return <LandingHome content={content} techniques={techniques} />
}
