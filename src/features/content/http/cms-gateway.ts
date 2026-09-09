import { LANDING_CMS_CONTENT } from '../flags'
import { parseHomeContent, type HomeContent } from '../domain/home-content'
import type { CmsGateway } from '../application/ports'

// SEC-004: `CMS_API_TOKEN` es un secreto de servidor. Este módulo solo se importa desde el
// entry point de servidor de la feature (index.ts); el token jamás llega al cliente.
const HOME_ENDPOINT = '/api/public/home' // docs/contracts/cms-api.md § "Sección inicio" (ASUMIDO)
const REQUEST_TIMEOUT_MS = 3000

async function fetchHomeContent(): Promise<HomeContent | null> {
  // INT-004: la integración no está verificada — no se llama al CMS hasta confirmar el contrato.
  if (!LANDING_CMS_CONTENT) return null

  const baseUrl = process.env.CMS_API_URL
  const token = process.env.CMS_API_TOKEN
  if (!baseUrl || !token) return null

  try {
    const response = await fetch(`${baseUrl}${HOME_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Garantía 6 del contrato: la invalidación (webhook o TTL) actúa sobre este tag.
      next: { tags: ['cms:home'] },
    })
    if (!response.ok) return null
    return parseHomeContent(await response.json())
  } catch {
    // Red caída, timeout o JSON inválido: se degrada con gracia (ADR-0001).
    return null
  }
}

export const cmsGateway: CmsGateway = { fetchHomeContent }
