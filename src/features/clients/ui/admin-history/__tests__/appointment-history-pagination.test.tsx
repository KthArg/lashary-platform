import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppointmentHistoryPagination } from '../components/AppointmentHistoryPagination'
import { appointmentHistoryUrl, parseHistoryPage } from '../appointment-history-url'
import { HISTORY_PAGINATION_TEXTS } from '../constants/history-strings'
import { clientAppointmentsPath } from '../../client-routes'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const PAGE_SIZE = 25

describe('appointmentHistoryUrl y parseHistoryPage — la página del historial vive en la URL', () => {
  it('la primera página no lleva ?page y las demás sí', () => {
    expect(appointmentHistoryUrl(CLIENT_ID, 0)).toBe(clientAppointmentsPath(CLIENT_ID))
    expect(appointmentHistoryUrl(CLIENT_ID, 2)).toBe(`${clientAppointmentsPath(CLIENT_ID)}?page=2`)
  })

  it.each([
    [undefined, 0],
    ['3', 3],
    [['4', '9'], 4],
    ['-1', 0],
    ['1.5', 0],
    ['abc', 0],
  ])('?page=%j se lee como la página %i', (rawPage, expectedPage) => {
    expect(parseHistoryPage(rawPage)).toBe(expectedPage)
  })
})

describe('AppointmentHistoryPagination', () => {
  it('en una página del medio muestra dónde está y enlaza a la anterior y a la siguiente', () => {
    render(<AppointmentHistoryPagination clientId={CLIENT_ID} page={1} pageSize={PAGE_SIZE} total={60} />)

    expect(screen.getByRole('navigation', { name: HISTORY_PAGINATION_TEXTS.navLabel }).textContent).toContain(
      `${HISTORY_PAGINATION_TEXTS.pageStatus(2, 3)} · ${HISTORY_PAGINATION_TEXTS.totalCount(60)}`,
    )
    expect(screen.getByRole('link', { name: HISTORY_PAGINATION_TEXTS.previous }).getAttribute('href')).toBe(
      appointmentHistoryUrl(CLIENT_ID, 0),
    )
    expect(screen.getByRole('link', { name: HISTORY_PAGINATION_TEXTS.next }).getAttribute('href')).toBe(
      appointmentHistoryUrl(CLIENT_ID, 2),
    )
  })

  it('en la primera y en la última página el paso que no aplica es texto, no un enlace muerto', () => {
    const { unmount } = render(<AppointmentHistoryPagination clientId={CLIENT_ID} page={0} pageSize={PAGE_SIZE} total={30} />)
    expect(screen.queryByRole('link', { name: HISTORY_PAGINATION_TEXTS.previous })).toBeNull()
    expect(screen.getByText(HISTORY_PAGINATION_TEXTS.previous).getAttribute('aria-disabled')).toBe('true')
    unmount()

    render(<AppointmentHistoryPagination clientId={CLIENT_ID} page={1} pageSize={PAGE_SIZE} total={30} />)
    expect(screen.queryByRole('link', { name: HISTORY_PAGINATION_TEXTS.next })).toBeNull()
  })

  it('una sola cita se cuenta en singular', () => {
    render(<AppointmentHistoryPagination clientId={CLIENT_ID} page={0} pageSize={PAGE_SIZE} total={1} />)
    expect(screen.getByText(new RegExp(HISTORY_PAGINATION_TEXTS.totalCount(1)))).toBeTruthy()
  })
})
