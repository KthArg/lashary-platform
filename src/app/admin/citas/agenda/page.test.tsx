import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { ClientLinks } from '@/features/scheduling'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({ DailyAgendaPage: vi.fn((_props: { clientLinks: ClientLinks }) => null) }))

vi.mock('@/features/scheduling', () => ({ DailyAgendaPage: mocks.DailyAgendaPage }))

import AdminDailyAgendaRoute from './page'
import { clientAppointmentsPath, clientRecordPath } from '@/features/clients'

describe('/admin/citas/agenda: enlaces a la ficha de la clienta', () => {
  it('cada cita de la agenda lleva al historial de citas de su clienta (US-CLI-02, criterio 3) y a su expediente', async () => {
    render(await AdminDailyAgendaRoute({ searchParams: Promise.resolve({}) }))

    const { clientLinks } = mocks.DailyAgendaPage.mock.calls[0][0]
    expect(clientLinks(CLIENT_ID).appointments).toBe(clientAppointmentsPath(CLIENT_ID))
    expect(clientLinks(CLIENT_ID).record).toBe(clientRecordPath(CLIENT_ID))
  })
})
