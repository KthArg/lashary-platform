import { describe, it, expect } from 'vitest'
import { exemptClientFormSchema } from '../schema'

describe('exemptClientFormSchema', () => {
  it('acepta datos válidos', () => {
    const result = exemptClientFormSchema.safeParse({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      reason: 'caso especial',
    })
    expect(result.success).toBe(true)
  })

  it('recorta espacios', () => {
    const result = exemptClientFormSchema.safeParse({
      clientId: '  00000000-0000-0000-0000-0000000000c1  ',
      reason: '  caso especial  ',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.reason).toBe('caso especial')
  })

  it('rechaza sin clienta seleccionada', () => {
    const result = exemptClientFormSchema.safeParse({ clientId: '', reason: 'caso especial' })
    expect(result.success).toBe(false)
  })

  it('rechaza razón vacía', () => {
    const result = exemptClientFormSchema.safeParse({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      reason: '   ',
    })
    expect(result.success).toBe(false)
  })
})
