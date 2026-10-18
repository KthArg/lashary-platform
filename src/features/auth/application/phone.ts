import { clientDisplayName } from './session'
import type { AuthRepository } from './ports'

export type SaveClientPhoneResult = { kind: 'ok' } | { kind: 'unauthenticated' } | { kind: 'failed' }

export async function saveClientPhone(repository: AuthRepository, phone: string): Promise<SaveClientPhoneResult> {
  const user = await repository.getCurrentUser()
  if (!user) return { kind: 'unauthenticated' }

  const saved = await repository.saveClientPhone({
    userId: user.id,
    fullName: clientDisplayName(user),
    email: user.email || '',
    phone,
  })
  return saved.ok ? { kind: 'ok' } : { kind: 'failed' }
}
