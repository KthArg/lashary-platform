import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

import {
  createTechniqueAction,
  deactivateTechniqueAction,
} from '@/features/catalog/ui/actions'
import { initialActionState } from '@/features/catalog/ui/action-state'

function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

const validFields = {
  name: 'Set volumen',
  family: 'lash_volume',
  priceFirstTime: '32000',
  priceRetouch: '',
  durationFirstTimeMin: '150',
  durationRetouchMin: '',
  bufferMin: '15',
  reapplicationIntervalDays: '',
  deposit: '12000',
  aftercareText: 'Cuidados.',
}

describe('createTechniqueAction', () => {
  it('devuelve status "invalid" con los problemas de Zod ante datos malos', async () => {
    const state = await createTechniqueAction(
      initialActionState,
      form({ ...validFields, name: '', priceFirstTime: '-1' }),
    )
    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(2)
  })

  it('con datos válidos devuelve status "disabled" (flag catalog_admin_write apagado, B1)', async () => {
    const state = await createTechniqueAction(initialActionState, form(validFields))
    expect(state.status).toBe('disabled')
    expect(state.message).toContain('catalog_admin_write')
  })
})

describe('deactivateTechniqueAction', () => {
  it('devuelve status "disabled" mientras el flag está apagado', async () => {
    const state = await deactivateTechniqueAction(
      initialActionState,
      form({ id: 'algo' }),
    )
    expect(state.status).toBe('disabled')
  })
})
