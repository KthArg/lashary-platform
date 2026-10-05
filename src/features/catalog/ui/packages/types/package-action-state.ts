export type PackageActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialPackageActionState: PackageActionState = { status: 'idle' }
