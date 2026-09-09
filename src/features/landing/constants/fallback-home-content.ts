import type { HomeContent } from '@/features/content'

// Contenido de respaldo de la sección de inicio: se sirve cuando el CMS no entrega contenido
// —flag `landing_cms_content` apagado, CMS caído o respuesta inválida— para que la landing
// degrade con gracia y nunca se vea rota (ADR-0001).
//
// PROVISIONAL: el copy y la imagen definitivos llegan del CMS (US-LAND-01, criterio 3). La
// imagen de respaldo es un motivo de marca decorativo (alt vacío, UI-004), no una foto de
// trabajos — esa la aporta el CMS con su propio alt significativo.
export const FALLBACK_HOME_CONTENT: HomeContent = {
  heroImage: {
    url: '/landing/hero-fallback.svg',
    alt: '',
  },
  welcomeText:
    'Realzamos tu mirada con técnicas de pestañas y diseño de cejas, en un espacio pensado para vos.',
  ctaLabel: 'Agendar cita',
}
