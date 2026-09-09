import { afterEach, describe, expect, it, vi } from 'vitest'

const VALID_PAYLOAD = {
  heroImage: { url: 'https://cms.test/hero.jpg', alt: 'Estudio LASHARY' },
  welcomeText: 'Bienvenida a LASHARY.',
  ctaLabel: 'Agendar cita',
}

// El flag vive en un módulo aparte; se remockea por test con resetModules + import dinámico.
async function loadGateway(flagOn: boolean) {
  vi.resetModules()
  vi.doMock('../flags', () => ({ LANDING_CMS_CONTENT: flagOn }))
  return (await import('../http/cms-gateway')).cmsGateway
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.doUnmock('../flags')
})

describe('cmsGateway.fetchHomeContent', () => {
  it('con el flag apagado devuelve null sin llamar al CMS', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const gateway = await loadGateway(false)

    expect(await gateway.fetchHomeContent()).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('con el flag encendido pero sin CMS_API_URL/TOKEN devuelve null', async () => {
    vi.stubEnv('CMS_API_URL', '')
    vi.stubEnv('CMS_API_TOKEN', '')
    const gateway = await loadGateway(true)

    expect(await gateway.fetchHomeContent()).toBeNull()
  })

  it('con flag y credenciales, parsea la respuesta del CMS', async () => {
    vi.stubEnv('CMS_API_URL', 'https://cms.test')
    vi.stubEnv('CMS_API_TOKEN', 'ro-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => VALID_PAYLOAD }))
    const gateway = await loadGateway(true)

    expect(await gateway.fetchHomeContent()).toEqual(VALID_PAYLOAD)
  })

  it('ante respuesta HTTP no-OK devuelve null', async () => {
    vi.stubEnv('CMS_API_URL', 'https://cms.test')
    vi.stubEnv('CMS_API_TOKEN', 'ro-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    const gateway = await loadGateway(true)

    expect(await gateway.fetchHomeContent()).toBeNull()
  })

  it('ante error de red (fetch lanza) devuelve null', async () => {
    vi.stubEnv('CMS_API_URL', 'https://cms.test')
    vi.stubEnv('CMS_API_TOKEN', 'ro-token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const gateway = await loadGateway(true)

    expect(await gateway.fetchHomeContent()).toBeNull()
  })
})
