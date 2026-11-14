import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDate } from '@/shared/studio-time'
import { buildReapplicationMessage, buildReapplicationTemplateVariables } from '../reapplication-message'

describe('buildReapplicationMessage', () => {
  it('incluye la técnica y la fecha estimada, sin hora (criterios 1 y 2)', () => {
    const message = buildReapplicationMessage({
      techniqueName: 'Lifting de pestañas',
      dueAt: fixedDate('2026-11-13T18:00:00Z'),
    })

    expect(message).toContain('Lifting de pestañas')
    expect(message).toContain(formatStudioDate(fixedDate('2026-11-13T18:00:00Z')))
    expect(message).not.toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('buildReapplicationTemplateVariables', () => {
  it('da la técnica y la fecha estimada en ese orden, para una plantilla de WhatsApp aprobada por Meta', () => {
    const dueAt = fixedDate('2026-11-13T18:00:00Z')
    expect(buildReapplicationTemplateVariables({ techniqueName: 'Lifting de pestañas', dueAt })).toEqual([
      'Lifting de pestañas',
      formatStudioDate(dueAt),
    ])
  })
})
