import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createClient as createBrowserClient } from '@/shared/lib/supabase/client'
import { updateSession } from '@/shared/lib/supabase/middleware'
import { NextRequest } from 'next/server'

describe('Platform Foundation & Shared Helpers', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key-for-unit-tests',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('Instancia el cliente navegador de Supabase correctamente', () => {
    const client = createBrowserClient()
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  it('updateSession maneja peticiones sin sesión retornando supabaseResponse', async () => {
    const request = new NextRequest('http://localhost:3000/')
    const { supabaseResponse, user } = await updateSession(request)

    expect(supabaseResponse).toBeDefined()
    expect(user).toBeNull()
  })
})
