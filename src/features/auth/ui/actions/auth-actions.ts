'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AUTH_ERROR_MESSAGES, ADMIN_PORTAL_ROUTES, CLIENT_PORTAL_ROUTES } from '../constants/auth-strings'
import { signInStaff, signOutUser, startGoogleSignIn } from '../../application/sign-in'
import { createSupabaseAuthRepository } from '../../db/auth-repository'

const DEFAULT_SITE_URL = 'http://localhost:3000'
const OAUTH_CALLBACK_PATH = '/auth/callback'

function buildGoogleRedirectUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
  return `${siteUrl}${OAUTH_CALLBACK_PATH}?next=${CLIENT_PORTAL_ROUTES.citas}`
}

export async function signInWithGoogleAction() {
  const repository = createSupabaseAuthRepository(await createClient())
  const start = await startGoogleSignIn(repository, buildGoogleRedirectUrl())

  if (start.failed) {
    throw new Error(AUTH_ERROR_MESSAGES.googleOAuthError)
  }

  if (start.url) {
    redirect(start.url)
  }
}

export async function signInAdminAction(
  prevStateOrFormData: { error?: string } | FormData | null,
  formDataOrUndefined?: FormData
): Promise<{ error?: string } | void> {
  const formData =
    formDataOrUndefined instanceof FormData
      ? formDataOrUndefined
      : prevStateOrFormData instanceof FormData
      ? prevStateOrFormData
      : new FormData()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password || !email.trim()) {
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials }
  }

  const repository = createSupabaseAuthRepository(await createClient())
  const result = await signInStaff(repository, { email: email.trim(), password })

  if (result.kind === 'invalid-credentials') {
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials }
  }
  if (result.kind === 'access-denied') {
    return { error: AUTH_ERROR_MESSAGES.accessDenied }
  }

  revalidatePath('/', 'layout')
  redirect(ADMIN_PORTAL_ROUTES.dashboard)
}

export async function signOutAction() {
  await signOutUser(createSupabaseAuthRepository(await createClient()))
  redirect('/')
}
