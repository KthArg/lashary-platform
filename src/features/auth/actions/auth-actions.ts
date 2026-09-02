'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'

export async function signInWithGoogleAction() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
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

  const { data: roleData } = await supabase
    .from('auth_user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single()

  if (!roleData || !['admin', 'superadmin'].includes(roleData.role)) {
    await supabase.auth.signOut()
    return { error: AUTH_ERROR_MESSAGES.accessDenied }
  }

  revalidatePath('/', 'layout')
  redirect('/')
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

  const { data: roleData } = await supabase
    .from('auth_user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const { data: clientProfile } = await supabase
    .from('clients_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return {
    user,
    role: roleData?.role || 'cliente',
    profile: clientProfile,
  }
}

export async function requireAdminSession() {
  const session = await getAuthSession()
  if (!session?.user || !['admin', 'superadmin'].includes(session.role)) {
    redirect('/admin')
  }
  return session
}
