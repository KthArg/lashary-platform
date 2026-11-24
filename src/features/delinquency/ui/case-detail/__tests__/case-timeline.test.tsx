import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatStudioDateTime } from '@/shared/studio-time'
import { TIMELINE_ACTIONS } from '@/features/delinquency/domain/case-detail'
import type { TimelineEvent } from '@/features/delinquency/domain/case-detail'
import { caseDetailMessages } from '@/features/delinquency/ui/case-detail/constants/case-detail-strings'
import { CaseTimeline } from '@/features/delinquency/ui/case-detail/components/CaseTimeline'

const FIRST_AT = new Date('2026-11-12T18:00:00Z')
const SECOND_AT = new Date('2026-11-15T03:30:00Z')

const event = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'evento-1',
  action: TIMELINE_ACTIONS.caseConfirmed,
  actorId: 'actor-1',
  createdAt: FIRST_AT,
  entityType: 'delinquency_case',
  ...overrides,
})

const KNOWN_ACTIONS = Object.values(TIMELINE_ACTIONS)

afterEach(cleanup)

describe('CaseTimeline: la bitácora de cambios', () => {
  it.each(KNOWN_ACTIONS)('la acción %s muestra su texto en español y quién la hizo', (action) => {
    render(<CaseTimeline events={[event({ action })]} unavailable={false} />)

    const item = screen.getByRole('listitem')
    const expectedActor =
      action === TIMELINE_ACTIONS.requestSubmitted
        ? caseDetailMessages.timeline.actors.client
        : caseDetailMessages.timeline.actors.administration
    expect(within(item).getByText(caseDetailMessages.timeline.actions[action])).toBeTruthy()
    expect(item.textContent).toContain(caseDetailMessages.timeline.actorLabel + expectedActor)
    expect(within(item).queryByText(action)).toBeNull()
  })

  it('lista los eventos en el orden recibido, con fecha y hora en hora del estudio', () => {
    render(
      <CaseTimeline
        events={[
          event({ id: 'a', action: TIMELINE_ACTIONS.caseConfirmed, createdAt: FIRST_AT }),
          event({ id: 'b', action: TIMELINE_ACTIONS.requestSubmitted, createdAt: SECOND_AT }),
        ]}
        unavailable={false}
      />,
    )

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain(caseDetailMessages.timeline.actions[TIMELINE_ACTIONS.caseConfirmed])
    expect(items[1].textContent).toContain(caseDetailMessages.timeline.actions[TIMELINE_ACTIONS.requestSubmitted])
    expect(items[0].textContent).toContain(formatStudioDateTime(FIRST_AT))
    expect(items[1].textContent).toContain(formatStudioDateTime(SECOND_AT))
  })

  it('una acción desconocida se muestra con el texto genérico y la acción tal cual, sin romper', () => {
    render(<CaseTimeline events={[event({ action: 'delinquency.case.otra' })]} unavailable={false} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByText(caseDetailMessages.timeline.unknownAction)).toBeTruthy()
    expect(within(item).getByText('delinquency.case.otra')).toBeTruthy()
  })

  it('una acción con el nombre de una propiedad heredada también se trata como desconocida', () => {
    render(<CaseTimeline events={[event({ action: 'toString' })]} unavailable={false} />)

    expect(screen.getByText(caseDetailMessages.timeline.unknownAction)).toBeTruthy()
    expect(screen.getByText('toString')).toBeTruthy()
  })

  it('sin eventos dice que todavía no hay cambios registrados', () => {
    render(<CaseTimeline events={[]} unavailable={false} />)

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(caseDetailMessages.timeline.title)
    expect(screen.getByText(caseDetailMessages.timeline.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('si la bitácora no se pudo leer, avisa con role status y no muestra lista ni el texto de vacío', () => {
    render(<CaseTimeline events={[]} unavailable />)

    expect(screen.getByRole('status').textContent).toBe(caseDetailMessages.timeline.unavailable)
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByText(caseDetailMessages.timeline.empty)).toBeNull()
  })
})
