import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import type { ReviewViewModel } from '@/features/delinquency/ui/review/services/review-service'
import { reviewMessages } from '@/features/delinquency/ui/review/constants/review-strings'
import { ACTIVE_LIST_LIMIT, REVIEW_LIST_LIMIT } from '@/features/delinquency/domain/active-client'
import { ReviewView } from '@/features/delinquency/ui/review/components/ReviewView'
import { ReviewLoading } from '@/features/delinquency/ui/review/components/ReviewLoading'
import { ReviewError } from '@/features/delinquency/ui/review/components/ReviewError'

const decideCaseAction = vi.fn()
const setGraceDaysAction = vi.fn()
vi.mock('@/features/delinquency/ui/review/actions/review-actions', () => ({
  decideCaseAction: (...args: unknown[]) => decideCaseAction(...args),
  setGraceDaysAction: (...args: unknown[]) => setGraceDaysAction(...args),
}))

// El formato de colones usa un espacio de no separación; testing-library normaliza los espacios del texto del DOM.
const money = (colones: number): string => formatMoney(moneyFromColones(colones)).replace(/\s/g, ' ')

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const ready: ReviewViewModel = {
  status: 'ready',
  graceDays: 7,
  view: {
    toReview: [
      { caseId: CASE_ID, clientId: 'c1', clientName: 'Ana Pérez', pending: 20000, detectedAt: new Date('2026-11-01T18:00:00Z') },
      { caseId: 'caso-2', clientId: 'c2', clientName: null, pending: 7500, detectedAt: new Date('2026-11-02T18:00:00Z') },
    ],
    active: [{ clientId: 'c3', clientName: 'Lucía Mora', pending: 9000, since: new Date('2026-10-20T18:00:00Z') }],
    moreToReview: false,
    moreActive: false,
  },
}

beforeEach(() => {
  decideCaseAction.mockReset()
  setGraceDaysAction.mockReset()
})
afterEach(cleanup)

describe('ReviewView', () => {
  it('explica las morosidades por revisar con el texto que aprobó el PO', () => {
    render(<ReviewView model={ready} />)

    expect(
      screen.getByText(
        'Pago sin registrar pasado el plazo de gracia. Confirme si la morosidad procede o descártela si la clienta sí pagó.',
      ),
    ).toBeTruthy()
  })

  it('lista lo que debe cada clienta por revisar y las activas, con el monto en colones', () => {
    render(<ReviewView model={ready} />)

    expect(screen.getByRole('heading', { level: 1, name: reviewMessages.title })).toBeTruthy()
    expect(screen.getByText('Ana Pérez')).toBeTruthy()
    expect(screen.getByText(money(20000))).toBeTruthy()
    expect(screen.getByText('Lucía Mora')).toBeTruthy()
    expect(screen.getByText(money(9000))).toBeTruthy()
  })

  it('una clienta sin nombre visible se muestra con el nombre por defecto', () => {
    render(<ReviewView model={ready} />)

    expect(screen.getByText(reviewMessages.clientFallback)).toBeTruthy()
  })

  it('si hay más de lo que se muestra, lo avisa en cada lista y no lo calla', () => {
    render(<ReviewView model={{ ...ready, view: { ...ready.view, moreToReview: true, moreActive: true } }} />)

    expect(screen.getByText(reviewMessages.toReview.more(REVIEW_LIST_LIMIT))).toBeTruthy()
    expect(screen.getByText(reviewMessages.active.more(ACTIVE_LIST_LIMIT))).toBeTruthy()
  })

  it('si no hay más de lo que se muestra, no pone el aviso', () => {
    render(<ReviewView model={ready} />)

    expect(screen.queryByText(reviewMessages.toReview.more(REVIEW_LIST_LIMIT))).toBeNull()
    expect(screen.queryByText(reviewMessages.active.more(ACTIVE_LIST_LIMIT))).toBeNull()
  })

  it('cada morosidad por revisar tiene sus botones de confirmar y descartar; las activas no', () => {
    render(<ReviewView model={ready} />)

    expect(screen.getAllByRole('button', { name: reviewMessages.confirm })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: reviewMessages.dismiss })).toHaveLength(2)
  })

  it('sin morosidades dice que no hay ninguna en cada sección', () => {
    render(<ReviewView model={{ status: 'ready', graceDays: 7, view: { toReview: [], active: [], moreToReview: false, moreActive: false } }} />)

    expect(screen.getByText(reviewMessages.toReview.empty)).toBeTruthy()
    expect(screen.getByText(reviewMessages.active.empty)).toBeTruthy()
  })

  it('si no se pudo leer, avisa con un enlace para reintentar', () => {
    render(<ReviewView model={{ status: 'error' }} />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(reviewMessages.loadError)).toBeTruthy()
    expect(within(alert).getByRole('link', { name: reviewMessages.retry }).getAttribute('href')).toBe('/admin/morosidades')
  })
})

describe('CaseDecisionButtons', () => {
  it('confirmar manda la decisión de esa morosidad y avisa que quedó confirmada', async () => {
    decideCaseAction.mockResolvedValue({ ok: true, state: 'active' })
    render(<ReviewView model={ready} />)

    fireEvent.click(screen.getAllByRole('button', { name: reviewMessages.confirm })[0])

    await waitFor(() => expect(screen.getByText(reviewMessages.confirmedNotice)).toBeTruthy())
    expect(decideCaseAction).toHaveBeenCalledWith({ caseId: CASE_ID, decision: 'confirm' })
  })

  it('descartar manda la decisión y avisa que quedó descartada', async () => {
    decideCaseAction.mockResolvedValue({ ok: true, state: 'dismissed' })
    render(<ReviewView model={ready} />)

    fireEvent.click(screen.getAllByRole('button', { name: reviewMessages.dismiss })[0])

    await waitFor(() => expect(screen.getByText(reviewMessages.dismissedNotice)).toBeTruthy())
    expect(decideCaseAction).toHaveBeenCalledWith({ caseId: CASE_ID, decision: 'dismiss' })
  })

  it('si la acción falla, muestra el motivo junto a esa morosidad', async () => {
    decideCaseAction.mockResolvedValue({ ok: false, error: 'No se pudo guardar la decisión. Inténtelo nuevamente.' })
    render(<ReviewView model={ready} />)

    fireEvent.click(screen.getAllByRole('button', { name: reviewMessages.confirm })[0])

    await waitFor(() => expect(screen.getByText('No se pudo guardar la decisión. Inténtelo nuevamente.')).toBeTruthy())
  })
})

describe('periodo de gracia', () => {
  const field = () => screen.getByLabelText(reviewMessages.grace.label) as HTMLInputElement
  const save = () => fireEvent.click(screen.getByRole('button', { name: reviewMessages.grace.save }))

  it('muestra la gracia que tiene el estudio y explica que rige solo para las detecciones nuevas', () => {
    render(<ReviewView model={ready} />)

    expect(screen.getByRole('heading', { level: 2, name: reviewMessages.grace.title })).toBeTruthy()
    expect(screen.getByText(reviewMessages.grace.hint)).toBeTruthy()
    expect(field().value).toBe('7')
    expect(field().min).toBe('1')
    expect(field().max).toBe('90')
  })

  it('guarda la gracia nueva como número y lo confirma', async () => {
    setGraceDaysAction.mockResolvedValue({ ok: true, graceDays: 14 })
    render(<ReviewView model={ready} />)

    fireEvent.change(field(), { target: { value: '14' } })
    save()

    await waitFor(() => expect(screen.getByText(reviewMessages.grace.saved)).toBeTruthy())
    expect(setGraceDaysAction).toHaveBeenCalledWith({ graceDays: 14 })
    expect(field().value).toBe('14')
  })

  it('si el campo está vacío no inventa un valor: manda un número inválido y muestra el error', async () => {
    setGraceDaysAction.mockResolvedValue({ ok: false, error: 'Ingrese un número entero de 1 a 90.' })
    render(<ReviewView model={ready} />)

    fireEvent.change(field(), { target: { value: '' } })
    save()

    await waitFor(() => expect(screen.getByText('Ingrese un número entero de 1 a 90.')).toBeTruthy())
    expect(setGraceDaysAction).toHaveBeenCalledWith({ graceDays: Number.NaN })
  })

  it('si no se pudo guardar, muestra el motivo y conserva lo escrito', async () => {
    setGraceDaysAction.mockResolvedValue({ ok: false, error: 'No se pudo guardar el periodo de gracia. Inténtelo nuevamente.' })
    render(<ReviewView model={ready} />)

    fireEvent.change(field(), { target: { value: '30' } })
    save()

    await waitFor(() =>
      expect(screen.getByText('No se pudo guardar el periodo de gracia. Inténtelo nuevamente.')).toBeTruthy(),
    )
    expect(field().value).toBe('30')
  })

  it('si no se pudo leer la gracia, lo dice y no muestra un formulario con un valor inventado', () => {
    render(<ReviewView model={{ ...ready, graceDays: null } as ReviewViewModel} />)

    expect(screen.getByText(reviewMessages.grace.unavailable)).toBeTruthy()
    expect(screen.queryByLabelText(reviewMessages.grace.label)).toBeNull()
  })
})

describe('estados de la pantalla', () => {
  it('mientras carga muestra un aviso de carga', () => {
    render(<ReviewLoading />)

    expect(screen.getByRole('status').textContent).toContain(reviewMessages.loading)
  })

  it('si falla la página muestra el error con su botón para reintentar', () => {
    const reset = vi.fn()
    render(<ReviewError reset={reset} />)

    expect(screen.getByRole('alert').textContent).toContain(reviewMessages.error.title)
    fireEvent.click(screen.getByRole('button', { name: reviewMessages.error.retry }))
    expect(reset).toHaveBeenCalledOnce()
  })
})
