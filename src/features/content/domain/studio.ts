import type { CmsImage } from './landing-content'

// El estudio y Por qué acá (docs/contracts/cms-api.md v1.3, US-LAND-04).
export const STUDIO_KEY = 'estudio'
export const CREDENTIALS_KEY = 'credenciales'
export const REASONS_KEY = 'razones'

export type StudioSingletonKey = typeof STUDIO_KEY

// Cuántas filas de cada colección muestra la landing, en el orden del editor.
export const MAX_CREDENTIALS = 12
export const MAX_REASONS = 6

export const CREDENTIAL_KINDS = ['formacion', 'certificacion'] as const
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]

// Quién es la dueña. Sin retrato publicado, `portrait` es null; sin nombre, `name` también.
export type StudioProfile = {
  name: string | null
  role: string
  portrait: CmsImage | null
  paragraphs: string[]
  yearsOfExperience: number | null
}

// Un curso o una certificación de la trayectoria de la dueña.
export type Credential = {
  title: string
  kind: CredentialKind
  issuer: string | null
  year: number | null
}

export type Reason = {
  title: string
  text: string
}

export type StudioContent = {
  profile: StudioProfile
  credentials: Credential[]
  reasons: Reason[]
}
