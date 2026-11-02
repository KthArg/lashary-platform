import { describe, it, expect } from 'vitest'
import { hasSupabaseSessionCookie, supabaseSessionCookieName } from '../session-cookie'

const PROJECT_URL = 'https://proyecto.supabase.co'
const SESSION_COOKIE = supabaseSessionCookieName(PROJECT_URL)

describe('supabaseSessionCookieName', () => {
  it('arma el nombre con el identificador del proyecto, como lo hace Supabase', () => {
    expect(SESSION_COOKIE).toBe('sb-proyecto-auth-token')
    expect(supabaseSessionCookieName('http://localhost:54321')).toBe('sb-localhost-auth-token')
  })
})

describe('hasSupabaseSessionCookie', () => {
  it('reconoce la cookie de sesión del proyecto por su nombre', () => {
    expect(hasSupabaseSessionCookie(`${SESSION_COOKIE}=valor`, PROJECT_URL)).toBe(true)
  })

  it('reconoce la cookie partida en trozos numerados', () => {
    expect(hasSupabaseSessionCookie(`tema=claro; ${SESSION_COOKIE}.0=parte; ${SESSION_COOKIE}.1=resto`, PROJECT_URL)).toBe(true)
  })

  it('la cookie que quedó de otro proyecto no cuenta como sesión', () => {
    expect(hasSupabaseSessionCookie('sb-localhost-auth-token=sesion-vieja', PROJECT_URL)).toBe(false)
    expect(hasSupabaseSessionCookie('sb-localhost-auth-token.0=sesion-vieja', PROJECT_URL)).toBe(false)
  })

  it('no confunde el verificador de Google con una sesión iniciada', () => {
    expect(hasSupabaseSessionCookie(`${SESSION_COOKIE}-code-verifier=valor`, PROJECT_URL)).toBe(false)
  })

  it('sin cookies, o con cookies ajenas, no hay sesión', () => {
    expect(hasSupabaseSessionCookie('', PROJECT_URL)).toBe(false)
    expect(hasSupabaseSessionCookie('tema=claro; idioma=es', PROJECT_URL)).toBe(false)
  })

  it('decide solo por el nombre: un valor con el nombre de la cookie no cuenta', () => {
    expect(hasSupabaseSessionCookie(`nota=${SESSION_COOKIE}`, PROJECT_URL)).toBe(false)
  })

  it('sin URL de Supabase configurada, no hay sesión en vez de romper la cabecera', () => {
    expect(hasSupabaseSessionCookie(`${SESSION_COOKIE}=valor`, '')).toBe(false)
  })
})
