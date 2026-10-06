'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'
import { isStaffRole } from '../domain/roles'
import { loadAuthSession } from '../application/session'
import { createSupabaseAuthRepository } from '../db/auth-repository'

export async function signInWithGoogleAction() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/portal/citas`,
    },
  })

  if (error) {
    throw new Error(AUTH_ERROR_MESSAGES.googleOAuthError)
  }

  if (data.url) {
    redirect(data.url)
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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password,
  })

  if (error || !data?.user) {
    return { error: AUTH_ERROR_MESSAGES.invalidCredentials }
  }

  const role = await createSupabaseAuthRepository(supabase).findRole(data.user.id)

  if (!isStaffRole(role)) {
    await supabase.auth.signOut()
    return { error: AUTH_ERROR_MESSAGES.accessDenied }
  }

  revalidatePath('/', 'layout')
  redirect('/admin/dashboard')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getAuthSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return loadAuthSession(createSupabaseAuthRepository(supabase), user)
}

export async function requireAdminSession() {
  const session = await getAuthSession()
  if (!session?.user || !isStaffRole(session.role)) {
    redirect('/admin')
  }
  return session
}
