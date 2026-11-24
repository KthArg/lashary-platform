import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate, formatStudioDateTime } from '@/shared/studio-time'
import type { CaseDetail } from '@/features/delinquency/domain/case-detail'
import { HISTORY_PATH, historyDetailPath } from '@/features/delinquency/ui/history/constants/history-strings'
import { caseDetailMessages } from '@/features/delinquency/ui/case-detail/constants/case-detail-strings'
import type { CaseDetailViewModel } from '@/features/delinquency/ui/case-detail/services/case-detail-service'
import { CaseDetailView } from '@/features/delinquency/ui/case-detail/components/CaseDetailView'

const money = (colones: number): string => formatMoney(moneyFromColones(colones)).replace(/\s/g, ' ')

const APPOINTMENT_START_MS = Date.UTC(2026, 10, 5, 16, 0)
const DETECTED_AT = new Date('2026-11-12T18:00:00Z')
const SETTLED_AT = new Date('2026-11-14T03:30:00Z')
const CASE_ID = '0b9c7f0e-6f2b-4c7e-8d57-6a1f3a2b9c10'

const detail = (overrides: Partial<CaseDetail> = {}): CaseDetail => ({
  caseId: CASE_ID,
  clientId: 'cliente-1',
  clientName: 'Ana Pérez',
  pending: 20000,
  pendingToday: 5000,
  state: 'settled',
  detectedAt: DETECTED_AT,
  decidedAt: null,
  settledAt: null,
  exceptionReason: null,
  exceptionAmount: null,
  requests: [],
  appointment: { startsAtMs: APPOINTMENT_START_MS, serviceName: 'Volumen ruso' },
  appointmentUnavailable: false,
  timeline: [],
  timelineUnavailable: false,
  ...overrides,
})

const renderDetail = (overrides: Partial<CaseDetail> = {}) =>
  render(<CaseDetailView model={{ status: 'ready', detail: detail(overrides) }} />)

const valueOf = (label: string): string | undefined =>
  screen.getByText(label).nextElementSibling?.textContent?.replace(/\s/g, ' ')

afterEach(cleanup)

describe('CaseDetailView: los datos', () => {
  it('muestra la clienta, el estado y los datos con montos en colones y fechas en hora del estudio', () => {
    renderDetail({ settledAt: SETTLED_AT })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ana Pérez')
    expect(screen.getByText(caseDetailMessages.states.settled)).toBeTruthy()
    expect(valueOf(caseDetailMessages.labels.originAmount)).toBe(money(20000))
    expect(valueOf(caseDetailMessages.labels.balanceToday)).toBe(money(5000))
    expect(valueOf(caseDetailMessages.labels.appointment)).toBe(
      `${formatStudioDateTime(new Date(APPOINTMENT_START_MS))} · Volumen ruso`,
    )
    expect(valueOf(caseDetailMessages.labels.detectedAt)).toBe(formatStudioDate(DETECTED_AT))
    expect(valueOf(caseDetailMessages.labels.settledAt)).toBe(formatStudioDate(SETTLED_AT))
    expect(screen.queryByText(caseDetailMessages.labels.decidedAt)).toBeNull()
  })

  it('con excepción muestra la fecha de decisión, el motivo y el monto condonado; sin ella, ninguno', () => {
    renderDetail({ state: 'forgiven', decidedAt: SETTLED_AT, exceptionReason: 'Falla del estudio', exceptionAmount: 12000 })

    expect(valueOf(caseDetailMessages.labels.decidedAt)).toBe(formatStudioDate(SETTLED_AT))
    expect(valueOf(caseDetailMessages.labels.exceptionReason)).toBe('Falla del estudio')
    expect(valueOf(caseDetailMessages.labels.exceptionAmount)).toBe(money(12000))
    cleanup()

    renderDetail()
    expect(screen.queryByText(caseDetailMessages.labels.exceptionReason)).toBeNull()
    expect(screen.queryByText(caseDetailMessages.labels.exceptionAmount)).toBeNull()
  })

  it('sin nombre o sin cita usa los textos por defecto, y avisa si la cita no se pudo leer', () => {
    renderDetail({ clientName: null, appointment: null, appointmentUnavailable: true })

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(caseDetailMessages.clientFallback)
    expect(valueOf(caseDetailMessages.labels.appointment)).toBe(caseDetailMessages.appointmentMissing)
    expect(screen.getByRole('status').textContent).toBe(caseDetailMessages.appointmentUnavailable)
  })

  it('el enlace Volver al historial lleva al listado', () => {
    renderDetail()

    const link = screen.getByRole('link', { name: caseDetailMessages.backToHistory })
    expect(link.getAttribute('href')).toBe(HISTORY_PATH)
  })
})

describe('CaseDetailView: no encontrada y error', () => {
  it('una morosidad inexistente lo dice y ofrece volver al historial', () => {
    render(<CaseDetailView model={{ status: 'not_found' }} />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(caseDetailMessages.notFound.title)
    expect(screen.getByText(caseDetailMessages.notFound.body)).toBeTruthy()
    expect(screen.getByRole('link', { name: caseDetailMessages.backToHistory }).getAttribute('href')).toBe(HISTORY_PATH)
    expect(screen.queryByRole('definition')).toBeNull()
  })

  it('si falla la lectura muestra la alerta con Reintentar hacia el mismo detalle', () => {
    const model: CaseDetailViewModel = { status: 'error', caseId: CASE_ID }
    render(<CaseDetailView model={model} />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(caseDetailMessages.loadError)
    expect(within(alert).getByRole('link', { name: caseDetailMessages.retry }).getAttribute('href')).toBe(
      historyDetailPath(CASE_ID),
    )
  })
})
