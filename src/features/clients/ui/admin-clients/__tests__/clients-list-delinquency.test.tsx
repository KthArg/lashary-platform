import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { ClientsList, CLIENTS_TABLE_TEXTS } from '@/features/clients'
import { CLIENT_LIST_FIXTURES } from '../../../__tests__/client-fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

afterEach(cleanup)

// El formato de colones usa un espacio de no separación; testing-library normaliza los espacios del texto del DOM.
const normalized = (text: string): string => text.replace(/\s/g, ' ')

const [maria, ana] = CLIENT_LIST_FIXTURES

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

describe('ClientsList: columna de morosidad', () => {
  it('una clienta con morosidad activa muestra «Activa» con lo que debe', () => {
    render(
      <ClientsList
        clients={CLIENT_LIST_FIXTURES}
        delinquency={{ [maria.id]: { state: 'active', pending: 20000 } }}
        delinquencyAvailable
      />,
    )

    const expected = normalized(CLIENTS_TABLE_TEXTS.delinquencyActive(formatMoney(moneyFromColones(20000))))
    expect(normalized(rowOf(maria.fullName).textContent ?? '')).toContain(expected)
  })

  it('una morosidad por revisar se muestra como «Por revisar», no como activa', () => {
    render(
      <ClientsList
        clients={CLIENT_LIST_FIXTURES}
        delinquency={{ [maria.id]: { state: 'pending_review', pending: 5000 } }}
        delinquencyAvailable
      />,
    )

    const row = rowOf(maria.fullName)
    expect(within(row).getByText(CLIENTS_TABLE_TEXTS.delinquencyToReview)).toBeTruthy()
    expect(row.textContent).not.toContain('Activa')
  })

  it('una clienta sin morosidad dice «Sin morosidad» cuando el dato está disponible', () => {
    render(<ClientsList clients={CLIENT_LIST_FIXTURES} delinquency={{}} delinquencyAvailable />)

    expect(within(rowOf(ana.fullName)).getByText(CLIENTS_TABLE_TEXTS.noDelinquency)).toBeTruthy()
  })

  it('si el dato no está disponible, la columna dice «Sin dato» y no inventa «Sin morosidad»', () => {
    render(<ClientsList clients={CLIENT_LIST_FIXTURES} delinquencyAvailable={false} />)

    expect(screen.queryByText(CLIENTS_TABLE_TEXTS.noDelinquency)).toBeNull()
    expect(screen.getAllByText(CLIENTS_TABLE_TEXTS.pendingColumnValue)).toHaveLength(CLIENT_LIST_FIXTURES.length)
  })
})
