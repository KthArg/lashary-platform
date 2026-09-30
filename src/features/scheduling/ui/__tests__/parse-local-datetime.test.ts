import { describe, expect, it } from 'vitest'
import { parseCostaRicaLocalDateTime } from '../parse-local-datetime'

describe('parseCostaRicaLocalDateTime', () => {
  it('interpreta "YYYY-MM-DDTHH:mm" como hora de Costa Rica (UTC-6), no UTC', () => {
    const result = parseCostaRicaLocalDateTime('2026-10-01T14:00')
    expect(result.toISOString()).toBe('2026-10-01T20:00:00.000Z')
  })

  it('acepta el valor con segundos sin duplicarlos', () => {
    const result = parseCostaRicaLocalDateTime('2026-10-01T14:00:30')
    expect(result.toISOString()).toBe('2026-10-01T20:00:30.000Z')
  })
})
