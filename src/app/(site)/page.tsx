import { getGallery, getLandingContent, getStudio, getTechniqueMedia } from '@/features/content'
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
    // El catálogo manda qué técnicas hay; el CMS solo las ilustra, así que si falla se pintan
    // sin foto en vez de no pintarse.
    const [page, media] = await Promise.all([
      listTechniques({ activeOnly: true }),
      getTechniqueMedia(),
    ])
    return page.items.map((technique) => toLandingTechnique(technique, media))
  } catch (error) {
    console.warn('[landing] catálogo no disponible; la sección de técnicas queda vacía', error)
    return []
  }
}

export default async function HomePage() {
  // getStudio() y getGallery() nunca lanzan: con el CMS caído, El estudio sirve su respaldo y la
  // galería muestra su estado vacío.
  const [content, techniques, studio, gallery] = await Promise.all([
    getLandingContent(),
    readTechniques(),
    getStudio(),
    getGallery(),
  ])
  return <LandingHome content={content} techniques={techniques} studio={studio} gallery={gallery} />
}
