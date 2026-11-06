import { describe, it, expect } from 'vitest'
import { MASKED_PHONE_NUMBER, MAX_PROVIDER_ERROR_LENGTH, sanitizeProviderError } from '../provider-error'

describe('sanitizeProviderError', () => {
  it.each([
    ['+50688887777'],
    ['50688887777'],
    ['88887777'],
    ['+506 8888 7777'],
    ['8888-7777'],
    ['(506) 8888-7777'],
  ])('oculta el teléfono %s', (phone) => {
    const sanitized = sanitizeProviderError(`Recipient ${phone} is not valid`)

    expect(sanitized).toContain(MASKED_PHONE_NUMBER)
    expect(sanitized).not.toContain('7777')
  })

  it('oculta todos los teléfonos del mensaje', () => {
    expect(sanitizeProviderError('de 88887777 a 88886666')).toBe(`de ${MASKED_PHONE_NUMBER} a ${MASKED_PHONE_NUMBER}`)
  })

  it('conserva los códigos del proveedor, que no llegan a ocho dígitos', () => {
    const providerError = '(#131026) Message undeliverable, subcode 2494010, status 400'

    expect(sanitizeProviderError(providerError)).toBe(providerError)
  })

  it('corta a 500 caracteres más la elipsis', () => {
    const sanitized = sanitizeProviderError('x'.repeat(MAX_PROVIDER_ERROR_LENGTH + 100))

    expect(sanitized).toHaveLength(MAX_PROVIDER_ERROR_LENGTH + 1)
    expect(sanitized.endsWith('…')).toBe(true)
  })

  it('oculta antes de cortar, para que no quede un teléfono a medias', () => {
    const paddingBeforePhone = 'x'.repeat(MAX_PROVIDER_ERROR_LENGTH - 4)

    expect(sanitizeProviderError(`${paddingBeforePhone}88887777`)).not.toContain('8888')
  })
})
