import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate, formatStudioDateTime } from '@/shared/studio-time'
import { HISTORY_DEFAULT_PAGE_SIZE } from '@/features/delinquency/domain/case-history'
import type { CaseHistoryPage, HistoryItem, HistoryQuery } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH, historyDetailPath, historyMessages } from '@/features/delinquency/ui/history/constants/history-strings'
import type { HistoryViewModel } from '@/features/delinquency/ui/history/services/history-service'
import { HistoryView } from '@/features/delinquency/ui/history/components/HistoryView'
import { HistoryLoading } from '@/features/delinquency/ui/history/components/HistoryLoading'
import { HistoryError } from '@/features/delinquency/ui/history/components/HistoryError'

const money = (colones: number): string => formatMoney(moneyFromColones(colones)).replace(/\s/g, ' ')

const APPOINTMENT_START_MS = Date.UTC(2026, 10, 5, 16, 0)
const DETECTED_AT = new Date('2026-11-12T18:00:00Z')

const item = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  caseId: 'caso-1',
  clientName: 'Ana Pérez',
  pending: 20000,
  appointment: { startsAtMs: APPOINTMENT_START_MS, serviceName: 'Volumen ruso' },
  detectedAt: DETECTED_AT,
  state: 'settled',
  ...overrides,
})

const defaultQuery: HistoryQuery = { filter: 'all', page: 0, pageSize: HISTORY_DEFAULT_PAGE_SIZE }

const ready = (overrides: Partial<CaseHistoryPage> = {}): HistoryViewModel => ({
  status: 'ready',
  page: {
    items: [item()],
    total: 1,
    page: 0,
    pageSize: HISTORY_DEFAULT_PAGE_SIZE,
    appointmentsUnavailable: false,
    ...overrides,
  },
})

const renderView = (model: HistoryViewModel, query: HistoryQuery = defaultQuery) =>
  render(<HistoryView model={model} query={query} />)

afterEach(cleanup)

describe('HistoryView: la tabla', () => {
  it('muestra los encabezados y, en cada fila, la clienta, el monto de origen, la cita, la fecha de origen y el estado', () => {
    renderView(ready())

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(
      Object.values(historyMessages.headers),
    )
    const row = screen.getByRole('row', { name: new RegExp('Ana Pérez') })
    expect(within(row).getByText(money(20000))).toBeTruthy()
    expect(within(row).getByText(`${formatStudioDateTime(new Date(APPOINTMENT_START_MS))} · Volumen ruso`)).toBeTruthy()
    expect(within(row).getByText(formatStudioDate(DETECTED_AT))).toBeTruthy()
    expect(within(row).getByText(historyMessages.states.settled)).toBeTruthy()
  })

  it('el enlace Ver detalle lleva al detalle de esa morosidad y nombra a la clienta', () => {
    renderView(ready())

    const link = screen.getByRole('link', { name: historyMessages.detailLinkLabel('Ana Pérez') })
    expect(link.getAttribute('href')).toBe(historyDetailPath('caso-1'))
    expect(link.textContent).toBe(historyMessages.detailLink)
  })

  it('sin nombre, sin cita o sin servicio muestra los textos por defecto o solo la fecha', () => {
    const startsAtMs = APPOINTMENT_START_MS
    renderView(
      ready({
        items: [
          item({ caseId: 'a', clientName: null }),
          item({ caseId: 'b', appointment: null }),
          item({ caseId: 'c', appointment: { startsAtMs, serviceName: null } }),
        ],
      }),
    )

    expect(screen.getByText(historyMessages.clientFallback)).toBeTruthy()
    expect(screen.getByText(historyMessages.appointmentMissing)).toBeTruthy()
    expect(screen.getByText(formatStudioDateTime(new Date(startsAtMs)))).toBeTruthy()
  })

  it('avisa cuando las citas no se pudieron leer y deja ver el resto', () => {
    renderView(ready({ items: [item({ appointment: null })], appointmentsUnavailable: true }))

    expect(screen.getByRole('status').textContent).toBe(historyMessages.appointmentsUnavailable)
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
  })
})

describe('HistoryView: vacío, carga y error', () => {
  it('sin morosidades dice que no hay, con otro texto si hay un filtro puesto', () => {
    renderView(ready({ items: [], total: 0 }))
    expect(screen.getByText(historyMessages.emptyAll)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    cleanup()

    renderView(ready({ items: [], total: 0 }), { ...defaultQuery, filter: 'forgiven' })
    expect(screen.getByText(historyMessages.emptyFiltered)).toBeTruthy()
    expect(screen.queryByText(historyMessages.emptyAll)).toBeNull()
  })

  it('si falla la lectura muestra la alerta con Reintentar hacia la misma consulta y sin tabla', () => {
    renderView({ status: 'error' }, { filter: 'settled', page: 1, pageSize: HISTORY_DEFAULT_PAGE_SIZE })

    expect(screen.getByRole('alert').textContent).toContain(historyMessages.loadError)
    expect(screen.getByRole('link', { name: historyMessages.retry }).getAttribute('href')).toBe(
      `${HISTORY_PATH}?filter=settled&page=1`,
    )
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('la pantalla de carga anuncia que está cargando y la de error llama a reset', () => {
    render(<HistoryLoading />)
    expect(screen.getByRole('status').textContent).toContain(historyMessages.loading)
    cleanup()

    let resets = 0
    render(<HistoryError reset={() => (resets += 1)} />)
    expect(screen.getByRole('alert').textContent).toContain(historyMessages.error.title)
    screen.getByRole('button', { name: historyMessages.retry }).click()
    expect(resets).toBe(1)
  })
})
