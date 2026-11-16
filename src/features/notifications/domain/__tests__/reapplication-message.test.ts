import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDate } from '@/shared/studio-time'
import { REAPPLICATION_MESSAGE_TEXTS, buildReapplicationMessage, buildReapplicationTemplateVariables } from '../reapplication-message'

const DUE_AT = fixedDate('2026-11-13T18:00:00Z')

describe('buildReapplicationMessage', () => {
  it('incluye la técnica y la fecha estimada, sin hora (criterios 1 y 2)', () => {
    const message = buildReapplicationMessage({ techniqueName: 'Lifting de pestañas', dueAt: DUE_AT, now: fixedDate('2026-11-01T00:00:00Z') })

    expect(message).toContain('Lifting de pestañas')
    expect(message).toContain(formatStudioDate(DUE_AT))
    expect(message).not.toMatch(/\d{1,2}:\d{2}/)
  })

  it('con la fecha estimada todavía por venir, usa el texto de "se acerca"', () => {
    const message = buildReapplicationMessage({ techniqueName: 'Lifting de pestañas', dueAt: DUE_AT, now: fixedDate('2026-11-01T00:00:00Z') })

    expect(message).toContain(REAPPLICATION_MESSAGE_TEXTS.introUpcoming)
  })

  it('con la fecha estimada ya pasada, usa el texto de "ya pasó"', () => {
    const message = buildReapplicationMessage({ techniqueName: 'Lifting de pestañas', dueAt: DUE_AT, now: fixedDate('2026-11-20T00:00:00Z') })

    expect(message).toContain(REAPPLICATION_MESSAGE_TEXTS.introOverdue)
  })
})

describe('buildReapplicationTemplateVariables', () => {
  it('da la técnica y la fecha estimada en ese orden, para una plantilla de WhatsApp aprobada por Meta', () => {
    expect(buildReapplicationTemplateVariables({ techniqueName: 'Lifting de pestañas', dueAt: DUE_AT, now: fixedDate('2026-11-01T00:00:00Z') })).toEqual([
      'Lifting de pestañas',
      formatStudioDate(DUE_AT),
    ])
  })
})
