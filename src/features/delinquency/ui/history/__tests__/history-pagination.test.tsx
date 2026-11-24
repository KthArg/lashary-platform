import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
import {
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_PAGE_SIZES,
  type HistoryQuery,
} from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH, historyMessages } from '@/features/delinquency/ui/history/constants/history-strings'
import { HistoryPagination } from '@/features/delinquency/ui/history/components/HistoryPagination'

afterEach(() => {
  cleanup()
  mockPush.mockClear()
})

const query = (overrides: Partial<HistoryQuery> = {}): HistoryQuery => ({
  filter: 'all',
  page: 0,
  pageSize: HISTORY_DEFAULT_PAGE_SIZE,
  ...overrides,
})

const pagination = () => screen.getByRole('navigation', { name: historyMessages.pagination.navLabel })
const hrefOf = (name: string) => screen.getByRole('link', { name }).getAttribute('href')

describe('HistoryPagination', () => {
  it('anuncia la página y el total', () => {
    render(<HistoryPagination query={query({ page: 1 })} total={80} />)

    expect(pagination().textContent).toContain(historyMessages.pagination.status(2, 4))
    expect(pagination().textContent).toContain(historyMessages.pagination.total(80))
  })

  it('el total va en singular cuando hay una sola morosidad', () => {
    expect(historyMessages.pagination.total(1)).toBe('1 morosidad')
    expect(historyMessages.pagination.total(2)).toBe('2 morosidades')
  })

  it('en la primera página no hay enlace Anterior y Siguiente lleva a la segunda', () => {
    render(<HistoryPagination query={query()} total={80} />)

    expect(screen.queryByRole('link', { name: historyMessages.pagination.previous })).toBeNull()
    expect(hrefOf(historyMessages.pagination.next)).toBe(`${HISTORY_PATH}?page=1`)
  })

  it('en el medio los enlaces conservan el filtro y el tamaño', () => {
    const pageSize = HISTORY_PAGE_SIZES[0]
    render(<HistoryPagination query={query({ filter: 'active', page: 2, pageSize })} total={80} />)

    const base = `${HISTORY_PATH}?filter=active`
    expect(hrefOf(historyMessages.pagination.previous)).toBe(`${base}&page=1&pageSize=${pageSize}`)
    expect(hrefOf(historyMessages.pagination.next)).toBe(`${base}&page=3&pageSize=${pageSize}`)
  })

  it('en la última página no hay enlace Siguiente', () => {
    render(<HistoryPagination query={query({ page: 3 })} total={80} />)

    expect(screen.queryByRole('link', { name: historyMessages.pagination.next })).toBeNull()
  })

  it('una página más allá del total sigue ofreciendo volver con Anterior', () => {
    render(<HistoryPagination query={query({ page: 9 })} total={30} />)

    expect(screen.getByRole('link', { name: historyMessages.pagination.previous })).toBeTruthy()
  })

  it('ofrece solo los tamaños permitidos, con el actual marcado, y no tiene botón Aplicar', () => {
    render(<HistoryPagination query={query({ filter: 'dismissed' })} total={80} />)

    const select = within(pagination()).getByLabelText(historyMessages.pagination.sizeLabel) as HTMLSelectElement
    expect([...select.options].map((option) => Number(option.value))).toEqual([...HISTORY_PAGE_SIZES])
    expect(select.value).toBe(String(HISTORY_DEFAULT_PAGE_SIZE))
    expect(within(pagination()).queryByRole('button')).toBeNull()
  })

  it('al elegir otra cantidad navega enseguida a la primera página conservando el filtro', () => {
    const pageSize = HISTORY_PAGE_SIZES[0]
    render(<HistoryPagination query={query({ filter: 'dismissed', page: 2 })} total={80} />)

    fireEvent.change(within(pagination()).getByLabelText(historyMessages.pagination.sizeLabel), {
      target: { value: String(pageSize) },
    })

    expect(mockPush).toHaveBeenCalledWith(`${HISTORY_PATH}?filter=dismissed&pageSize=${pageSize}`)
  })
})
