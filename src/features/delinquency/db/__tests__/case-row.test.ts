import { describe, it, expect } from 'vitest'
import { caseRowSchema, toCase } from '../case-row'

const row = {
  id: '6f1c2b1e-3d4a-4b5c-8d6e-7f8091a2b3c4',
  client_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  appointment_id: '9e8d7c6b-5a49-4382-a716-05f4e3d2c1b0',
  pending: 25000,
  state: 'settled',
  detected_at: '2026-11-01T15:00:00Z',
  decided_at: '2026-11-02T15:00:00Z',
}

describe('caseRowSchema', () => {
  it('lee una morosidad saldada con su estado', () => {
    const parsed = caseRowSchema.safeParse(row)

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(toCase(parsed.data).state).toBe('settled')
  })

  it('un estado que no existe es una fila inesperada', () => {
    expect(caseRowSchema.safeParse({ ...row, state: 'paid' }).success).toBe(false)
  })
})
