import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate } from '@/shared/studio-time'
import type { DetailRequest } from '@/features/delinquency/domain/case-detail'
import { caseDetailMessages } from '@/features/delinquency/ui/case-detail/constants/case-detail-strings'
import { CaseRequests } from '@/features/delinquency/ui/case-detail/components/CaseRequests'
import { CaseDetailLoading } from '@/features/delinquency/ui/case-detail/components/CaseDetailLoading'
import { CaseDetailError } from '@/features/delinquency/ui/case-detail/components/CaseDetailError'

const money = (colones: number): string => formatMoney(moneyFromColones(colones)).replace(/\s/g, ' ')

const SUBMITTED_AT = new Date('2026-11-15T18:00:00Z')
const REVIEWED_AT = new Date('2026-11-16T03:30:00Z')
const OLDER_AT = new Date('2026-11-13T18:00:00Z')

const request = (overrides: Partial<DetailRequest> = {}): DetailRequest => ({
  id: 'solicitud-1',
  state: 'pending_approval',
  declaredAmount: 8000,
  reference: null,
  approvedAmount: null,
  rejectionReason: null,
  createdAt: SUBMITTED_AT,
  reviewedAt: null,
  ...overrides,
})

const valueIn = (item: HTMLElement, label: string): string | undefined =>
  within(item).getByText(label).nextElementSibling?.textContent?.replace(/\s/g, ' ')

afterEach(cleanup)

describe('CaseRequests: las solicitudes de regularización', () => {
  it('lista las solicitudes en el orden recibido con su estado, montos y fechas en hora del estudio', () => {
    render(
      <CaseRequests
        requests={[
          request({ id: 'a', state: 'approved', approvedAmount: 6000, reference: 'SINPE-123', reviewedAt: REVIEWED_AT }),
          request({ id: 'b', state: 'rejected', rejectionReason: 'Comprobante ilegible', reviewedAt: REVIEWED_AT, createdAt: OLDER_AT }),
          request({ id: 'c', state: 'replaced', createdAt: OLDER_AT }),
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toContain(caseDetailMessages.requests.states.approved)
    expect(items[1].textContent).toContain(caseDetailMessages.requests.states.rejected)
    expect(items[2].textContent).toContain(caseDetailMessages.requests.states.replaced)
    expect(items[0].textContent).toContain(formatStudioDate(SUBMITTED_AT))
    expect(valueIn(items[0], caseDetailMessages.requests.declaredAmount)).toBe(money(8000))
    expect(valueIn(items[0], caseDetailMessages.requests.approvedAmount)).toBe(money(6000))
    expect(valueIn(items[0], caseDetailMessages.requests.reviewedAt)).toBe(formatStudioDate(REVIEWED_AT))
    expect(valueIn(items[0], caseDetailMessages.requests.reference)).toBe('SINPE-123')
    expect(valueIn(items[1], caseDetailMessages.requests.rejectionReason)).toBe('Comprobante ilegible')
    expect(within(items[1]).queryByText(caseDetailMessages.requests.approvedAmount)).toBeNull()
  })

  it('una solicitud pendiente no muestra monto aprobado, motivo, revisión ni referencia', () => {
    render(<CaseRequests requests={[request()]} />)

    expect(screen.getByText(caseDetailMessages.requests.states.pending_approval)).toBeTruthy()
    expect(screen.queryByText(caseDetailMessages.requests.approvedAmount)).toBeNull()
    expect(screen.queryByText(caseDetailMessages.requests.rejectionReason)).toBeNull()
    expect(screen.queryByText(caseDetailMessages.requests.reviewedAt)).toBeNull()
    expect(screen.queryByText(caseDetailMessages.requests.reference)).toBeNull()
  })

  it('sin solicitudes dice que no hay ninguna', () => {
    render(<CaseRequests requests={[]} />)

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(caseDetailMessages.requests.title)
    expect(screen.getByText(caseDetailMessages.requests.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('no muestra ningún enlace ni imagen del comprobante (SEC-006)', () => {
    const { container } = render(<CaseRequests requests={[request({ state: 'approved', approvedAmount: 8000 })]} />)

    expect(screen.queryByRole('link')).toBeNull()
    expect(container.querySelector('img, a, [href], [src]')).toBeNull()
  })
})

describe('Carga y error de la ruta del detalle', () => {
  it('la pantalla de carga anuncia que está cargando y la de error llama a reset', () => {
    render(<CaseDetailLoading />)
    expect(screen.getByRole('status').textContent).toContain(caseDetailMessages.loading)
    cleanup()

    let resets = 0
    render(<CaseDetailError reset={() => (resets += 1)} />)
    expect(screen.getByRole('alert').textContent).toContain(caseDetailMessages.error.title)
    screen.getByRole('button', { name: caseDetailMessages.retry }).click()
    expect(resets).toBe(1)
  })
})
