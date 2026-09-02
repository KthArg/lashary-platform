import { describe, it, expect } from 'vitest'
import { DomainError } from '@/shared/domain-error'

class SampleError extends DomainError {
  readonly code = 'SAMPLE'
}

describe('DomainError — DOM-006: error base de dominio con subtipos', () => {
  it('es una instancia de Error y de DomainError, con nombre y código', () => {
    const e = new SampleError('algo pasó')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(DomainError)
    expect(e.name).toBe('SampleError')
    expect(e.code).toBe('SAMPLE')
    expect(e.message).toBe('algo pasó')
  })
})
