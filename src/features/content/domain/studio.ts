import type { CmsImage } from './landing-content'

export const STUDIO_KEY = 'estudio'
export const CREDENTIALS_KEY = 'credenciales'
export const REASONS_KEY = 'razones'

export type StudioSingletonKey = typeof STUDIO_KEY

export const MAX_CREDENTIALS = 12
export const MAX_REASONS = 6

export const CREDENTIAL_KINDS = ['formacion', 'certificacion'] as const
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]

export type StudioProfile = {
  name: string | null
  role: string
  portrait: CmsImage | null
  paragraphs: string[]
  yearsOfExperience: number | null
}

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
