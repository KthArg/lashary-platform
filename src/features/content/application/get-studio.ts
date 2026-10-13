import { err, ok, type Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  CREDENTIAL_KINDS,
  CREDENTIALS_KEY,
  MAX_CREDENTIALS,
  MAX_REASONS,
  REASONS_KEY,
  STUDIO_KEY,
  type Credential,
  type CredentialKind,
  type Reason,
  type StudioContent,
  type StudioProfile,
} from '../domain/studio'
import { field, image, integer, paragraphsOf, text } from './cms-values'
import { studioFallback } from './fallback-messages'
import type { CmsReader } from './ports'

// Lo que devolvió el CMS por cada tipo de El estudio, sin validar.
export type RawStudioContent = {
  profile: unknown
  credentials: unknown[]
  reasons: unknown[]
}

// Lee los tres tipos en paralelo. Si uno falla, falla la lectura entera: una respuesta a medias
// nunca llega a la caché (docs/contracts/cms-api.md § Invalidación).
export async function readRawStudio(
  reader: CmsReader,
): Promise<Result<RawStudioContent, CmsUnavailable>> {
  const [profile, credentials, reasons] = await Promise.all([
    reader.readSingleton(STUDIO_KEY),
    reader.readCollection(CREDENTIALS_KEY),
    reader.readCollection(REASONS_KEY),
  ])
  if (!profile.ok) return err(profile.error)
  if (!credentials.ok) return err(credentials.error)
  if (!reasons.ok) return err(reasons.error)
  return ok({ profile: profile.value, credentials: credentials.value, reasons: reasons.value })
}

function toProfile(source: unknown, mediaBaseUrl: string): StudioProfile {
  const name = text(field(source, 'nombre'), 80)
  const body = text(field(source, 'texto'), 1200)
  // Sin nombre ni texto, `estudio` nunca se publicó: se usa el respaldo entero.
  if (name === null && body === null) return studioFallback.profile

  return {
    name,
    role: text(field(source, 'rol'), 60) ?? studioFallback.profile.role,
    portrait: image(field(source, 'retrato'), mediaBaseUrl),
    paragraphs: body === null ? studioFallback.profile.paragraphs : paragraphsOf(body),
    yearsOfExperience: integer(field(source, 'anosExperiencia'), 0, 60),
  }
}

const isCredentialKind = (value: unknown): value is CredentialKind =>
  typeof value === 'string' && (CREDENTIAL_KINDS as readonly string[]).includes(value)

function toCredentials(items: unknown[]): Credential[] {
  const credentials: Credential[] = []
  for (const item of items) {
    if (credentials.length === MAX_CREDENTIALS) break
    const title = text(field(item, 'titulo'), 120)
    const kind = field(item, 'tipo')
    if (title === null || !isCredentialKind(kind)) continue
    credentials.push({
      title,
      kind,
      issuer: text(field(item, 'entidad'), 120),
      year: integer(field(item, 'anio'), 1970, 2100),
    })
  }
  return credentials
}

function toReasons(items: unknown[]): Reason[] {
  const reasons: Reason[] = []
  for (const item of items) {
    if (reasons.length === MAX_REASONS) break
    const title = text(field(item, 'titulo'), 60)
    const body = text(field(item, 'texto'), 240)
    if (title === null || body === null) continue
    reasons.push({ title, text: body })
  }
  // Por qué acá no queda vacía: sin ninguna razón válida, las del diseño.
  return reasons.length > 0 ? reasons : studioFallback.reasons
}

// Valida la forma cruda contra el contrato y completa con el respaldo. Con `raw` null (CMS no
// disponible o sin configurar) devuelve el respaldo entero. Nunca lanza.
export function toStudioContent(raw: RawStudioContent | null, mediaBaseUrl: string): StudioContent {
  if (raw === null) return studioFallback
  return {
    profile: toProfile(raw.profile, mediaBaseUrl),
    credentials: toCredentials(raw.credentials),
    reasons: toReasons(raw.reasons),
  }
}
