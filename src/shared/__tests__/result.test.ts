import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr, type Result } from '@/shared/result'

describe('Result — DOM-006: los resultados de negocio esperados se retornan, no se lanzan', () => {
  it('ok envuelve un valor', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toBe(42)
  })

  it('err envuelve un error', () => {
    const r = err('no encontrado')
    expect(isErr(r)).toBe(true)
    if (isErr(r)) expect(r.error).toBe('no encontrado')
  })

  it('isOk e isErr son mutuamente excluyentes', () => {
    const good: Result<number, string> = ok(1)
    const bad: Result<number, string> = err('x')
    expect(isOk(good)).toBe(!isErr(good))
    expect(isOk(bad)).toBe(!isErr(bad))
  })
})
