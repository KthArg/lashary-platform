import { describe, it, expect } from 'vitest'
import { systemClock } from '../clock'

describe('systemClock', () => {
  it('devuelve un Date cercano a la hora real, no fijo', () => {
    const before = Date.now()
    const now = systemClock()
    const after = Date.now()

    expect(now).toBeInstanceOf(Date)
    expect(now.getTime()).toBeGreaterThanOrEqual(before)
    expect(now.getTime()).toBeLessThanOrEqual(after)
  })

  it('cada llamada puede devolver un instante distinto (no memoiza)', async () => {
    const first = systemClock()
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = systemClock()

    expect(second.getTime()).toBeGreaterThan(first.getTime())
  })
})
