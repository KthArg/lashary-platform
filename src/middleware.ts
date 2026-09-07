import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const isProtectedAdminRoute =
    request.nextUrl.pathname.startsWith('/admin') &&
    request.nextUrl.pathname !== '/admin'

  if (isProtectedAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
