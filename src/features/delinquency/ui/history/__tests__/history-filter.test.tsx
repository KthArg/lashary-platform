import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { HISTORY_FILTERS, HISTORY_PAGE_SIZES } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH, historyMessages } from '@/features/delinquency/ui/history/constants/history-strings'
import { HistoryFilter } from '@/features/delinquency/ui/history/components/HistoryFilter'

afterEach(cleanup)

const form = () => screen.getByRole('form', { name: historyMessages.filter.formLabel })

describe('HistoryFilter', () => {
  it('ofrece los ocho filtros en español con una etiqueta asociada al selector', () => {
    render(<HistoryFilter filter="all" pageSize={HISTORY_PAGE_SIZES[1]} />)

    const select = screen.getByLabelText(historyMessages.filter.selectLabel) as HTMLSelectElement
    expect([...select.options].map((option) => option.value)).toEqual([...HISTORY_FILTERS])
    expect([...select.options].map((option) => option.textContent)).toEqual(
      HISTORY_FILTERS.map((filter) => historyMessages.filters[filter]),
    )
  })

  it('es un formulario GET hacia el historial, con botón Filtrar y sin parámetro de página', () => {
    render(<HistoryFilter filter="all" pageSize={HISTORY_PAGE_SIZES[1]} />)

    expect(form().getAttribute('method')).toBe('get')
    expect(form().getAttribute('action')).toBe(HISTORY_PATH)
    expect(within(form()).getByRole('button', { name: historyMessages.filter.submit })).toBeTruthy()
    expect(form().querySelector('[name="page"]')).toBeNull()
  })

  it('deja seleccionado el filtro de la URL y conserva el tamaño de página', () => {
    const pageSize = HISTORY_PAGE_SIZES[2]
    render(<HistoryFilter filter="lifted" pageSize={pageSize} />)

    expect((screen.getByLabelText(historyMessages.filter.selectLabel) as HTMLSelectElement).value).toBe('lifted')
    expect((form().querySelector('[name="pageSize"]') as HTMLInputElement).value).toBe(String(pageSize))
  })
})
