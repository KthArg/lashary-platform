import { isStaffRole } from '../domain/roles'
import type { AuthRepository, GoogleSignInStart, PasswordCredentials } from './ports'

export type StaffSignInResult =
  | { kind: 'ok' }
  | { kind: 'invalid-credentials' }
  | { kind: 'access-denied' }

export async function signInStaff(
  repository: AuthRepository,
  credentials: PasswordCredentials,
): Promise<StaffSignInResult> {
  const user = await repository.signInWithPassword(credentials)
  if (!user) return { kind: 'invalid-credentials' }

  const role = await repository.findRole(user.id)
  if (!isStaffRole(role)) {
    await repository.signOut()
    return { kind: 'access-denied' }
  }
  return { kind: 'ok' }
}

export function startGoogleSignIn(repository: AuthRepository, redirectTo: string): Promise<GoogleSignInStart> {
  return repository.signInWithGoogle(redirectTo)
}

export function signOutUser(repository: AuthRepository): Promise<void> {
  return repository.signOut()
}
